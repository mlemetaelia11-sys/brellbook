import { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';

type BookingConflictParams = {
  businessId: string;
  staffId?: string | null;
  startAt: Date;
  endAt: Date;
  excludeBookingId?: string;
};

function parseDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
    date,
  };
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);

  const result: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      result[part.type] = part.value;
    }
  }

  return {
    year: Number(result.year),
    month: Number(result.month),
    day: Number(result.day),
    hour: Number(result.hour),
    minute: Number(result.minute),
    second: Number(result.second),
  };
}

function zonedTimeToUtc(
  dateString: string,
  timeString: string,
  timeZone: string,
) {
  const parsed = parseDateString(dateString);

  if (!parsed) {
    throw new Error('Invalid date.');
  }

  const [hour, minute] = timeString.split(':').map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(`Invalid time: ${timeString}`);
  }

  const approximate = new Date(
    Date.UTC(
      parsed.year,
      parsed.month - 1,
      parsed.day,
      hour,
      minute,
      0,
      0,
    ),
  );

  const parts = getTimeZoneParts(approximate, timeZone);

  const asLocalUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  const desiredLocalUtc = Date.UTC(
    parsed.year,
    parsed.month - 1,
    parsed.day,
    hour,
    minute,
    0,
  );

  const offset = asLocalUtc - approximate.getTime();

  return new Date(desiredLocalUtc - offset);
}

function formatTimeInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export async function hasBookingConflict(
  params: BookingConflictParams,
  client: Prisma.TransactionClient | typeof db = db,
) {
  return client.booking.findFirst({
    where: {
      businessId: params.businessId,
      ...(params.excludeBookingId
        ? {
            id: {
              not: params.excludeBookingId,
            },
          }
        : {}),
      status: {
        in: ['PENDING', 'CONFIRMED'],
      },
      startTime: {
        lt: params.endAt,
      },
      endTime: {
        gt: params.startAt,
      },
      ...(params.staffId
        ? {
            staffId: params.staffId,
          }
        : {}),
    },
  });
}

export async function getAvailableSlots(
  businessId: string,
  serviceId: string,
  date: string,
  staffId?: string,
) {
  const parsed = parseDateString(date);

  if (!parsed) {
    throw new Error('Invalid date. Expected YYYY-MM-DD.');
  }

  const business = await db.business.findUnique({
    where: {
      id: businessId,
    },
    select: {
      id: true,
      active: true,
      timezone: true,
    },
  });

  if (!business?.active) {
    throw new Error('Business not found or inactive.');
  }

  const service = await db.service.findFirst({
    where: {
      id: serviceId,
      businessId,
      active: true,
    },
    select: {
      id: true,
      durationMin: true,
    },
  });

  if (!service) {
    throw new Error('Service not found.');
  }

  const timeZone = business.timezone || 'Africa/Dar_es_Salaam';

  const dayOfWeek = parsed.date.getUTCDay();

  const dayStart = zonedTimeToUtc(date, '00:00', timeZone);
  const dayEnd = zonedTimeToUtc(date, '23:59', timeZone);

  const [holiday, businessHours, staff, existingBookings] =
    await Promise.all([
      db.holiday.findFirst({
        where: {
          businessId,
          date: {
            gte: dayStart,
            lt: new Date(dayEnd.getTime() + 60_000),
          },
        },
      }),

      db.workingHour.findUnique({
        where: {
          businessId_dayOfWeek: {
            businessId,
            dayOfWeek,
          },
        },
      }),

      staffId
        ? db.staff.findFirst({
            where: {
              id: staffId,
              businessId,
              active: true,
              services: {
                some: {
                  serviceId,
                },
              },
            },
            include: {
              workingHours: {
                where: {
                  dayOfWeek,
                },
              },
              daysOff: {
                where: {
                  date: {
                    gte: dayStart,
                    lt: new Date(dayEnd.getTime() + 60_000),
                  },
                },
              },
            },
          })
        : Promise.resolve(null),

      db.booking.findMany({
        where: {
          businessId,
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
          startTime: {
            lt: new Date(dayEnd.getTime() + 60_000),
          },
          endTime: {
            gt: dayStart,
          },
          ...(staffId
            ? {
                staffId,
              }
            : {}),
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
      }),
    ]);

  if (holiday) {
    return [];
  }

  if (staffId && !staff) {
    throw new Error('Staff member is not available for this service.');
  }

  let openTime: string | null | undefined = businessHours?.openTime;
  let closeTime: string | null | undefined = businessHours?.closeTime;
  let isClosed = businessHours?.isClosed ?? true;

  if (staffId) {
    const staffHours = staff?.workingHours[0];

    if (staffHours) {
      openTime = staffHours.openTime;
      closeTime = staffHours.closeTime;
      isClosed = staffHours.isClosed;
    }

    if (staff?.daysOff.length) {
      return [];
    }
  }

  if (isClosed || !openTime || !closeTime) {
    return [];
  }

  const opening = zonedTimeToUtc(date, openTime, timeZone);
  const closing = zonedTimeToUtc(date, closeTime, timeZone);

  const durationMs = service.durationMin * 60 * 1000;

  if (closing.getTime() <= opening.getTime()) {
    return [];
  }

  const breaks = await db.break.findMany({
    where: {
      businessId,
      dayOfWeek,
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  const breakRanges = breaks.map((item) => ({
    start: zonedTimeToUtc(date, item.startTime, timeZone),
    end: zonedTimeToUtc(date, item.endTime, timeZone),
  }));

  const slots: string[] = [];

  const slotIntervalMs = 30 * 60 * 1000;

  for (
    let cursor = opening.getTime();
    cursor + durationMs <= closing.getTime();
    cursor += slotIntervalMs
  ) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor + durationMs);

    const bookingConflict = existingBookings.some(
      (booking) =>
        booking.startTime.getTime() < slotEnd.getTime() &&
        booking.endTime.getTime() > slotStart.getTime(),
    );

    if (bookingConflict) {
      continue;
    }

    const breakConflict = breakRanges.some(
      (range) =>
        range.start.getTime() < slotEnd.getTime() &&
        range.end.getTime() > slotStart.getTime(),
    );

    if (breakConflict) {
      continue;
    }

    slots.push(formatTimeInZone(slotStart, timeZone));
  }

  return slots;
}

export function makeBookingCode(date = new Date()) {
  return `BB-${date
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '')}-${crypto
    .randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;
}