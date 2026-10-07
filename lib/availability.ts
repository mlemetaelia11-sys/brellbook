import { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';
import {
  businessDateTimeToUtc,
  businessDayOfWeek,
  formatDateInTimeZone,
  minutesFromTime,
  nextBusinessDate,
} from '@/lib/timezone';

type DbClient = Prisma.TransactionClient | typeof db;

export async function validateBusinessSlot(params: {
  businessId: string;
  serviceId: string;
  startTime: Date;
  staffId?: string | null;
  client?: DbClient;
}) {
  const client = params.client ?? db;
  const business = await client.business.findUnique({
    where: { id: params.businessId },
    select: { timezone: true },
  });
  if (!business) return 'BUSINESS_NOT_FOUND';

  const localDate = formatDateInTimeZone(params.startTime, business.timezone);
  const dayOfWeek = businessDayOfWeek(localDate);
  const service = await client.service.findFirst({
    where: { id: params.serviceId, businessId: params.businessId, active: true },
    select: { durationMin: true },
  });
  if (!service) return 'SERVICE_NOT_FOUND';

  const endTime = new Date(params.startTime.getTime() + service.durationMin * 60_000);
  const localStartMinutes = (() => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: business.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(params.startTime);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return hour * 60 + minute;
  })();
  const localEndMinutes = (() => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: business.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(endTime);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return hour * 60 + minute;
  })();

  if (params.startTime.getTime() < Date.now() + 30 * 60_000) return 'MINIMUM_NOTICE';
  if (localStartMinutes % 15 !== 0) return 'INVALID_SLOT';

  const wh = await client.workingHour.findUnique({
    where: { businessId_dayOfWeek: { businessId: params.businessId, dayOfWeek } },
  });
  if (!wh || wh.isClosed || !wh.openTime || !wh.closeTime) return 'BUSINESS_CLOSED';
  if (localStartMinutes < minutesFromTime(wh.openTime) || localEndMinutes > minutesFromTime(wh.closeTime)) {
    return 'OUTSIDE_HOURS';
  }

  const holiday = await client.holiday.findFirst({
    where: {
      businessId: params.businessId,
      date: {
        gte: new Date(`${localDate}T00:00:00.000Z`),
        lt: new Date(`${nextBusinessDate(localDate)}T00:00:00.000Z`),
      },
    },
  });
  if (holiday) return 'HOLIDAY';

  const breaks = await client.break.findMany({
    where: { businessId: params.businessId, dayOfWeek },
  });
  if (breaks.some((item) => localStartMinutes < minutesFromTime(item.endTime) && localEndMinutes > minutesFromTime(item.startTime))) {
    return 'BREAK';
  }

  if (params.staffId) {
    const staff = await client.staff.findFirst({
      where: {
        id: params.staffId,
        businessId: params.businessId,
        active: true,
        services: { some: { serviceId: params.serviceId } },
      },
      include: { workingHours: true, daysOff: true },
    });
    if (!staff) return 'STAFF_UNAVAILABLE';

    const dayOff = staff.daysOff.some((d) => {
      const dDate = new Date(d.date);
      return dDate.toISOString().slice(0, 10) === localDate;
    });
    if (dayOff) return 'STAFF_DAY_OFF';

    const sh = staff.workingHours.find((item) => item.dayOfWeek === dayOfWeek);
    if (sh?.isClosed) return 'STAFF_UNAVAILABLE';
    if (sh?.openTime && sh?.closeTime && (localStartMinutes < minutesFromTime(sh.openTime) || localEndMinutes > minutesFromTime(sh.closeTime))) {
      return 'STAFF_UNAVAILABLE';
    }
  }

  return null;
}

export async function findAvailableSlots(params: {
  businessId: string;
  serviceId: string;
  date: string;
  staffId?: string;
}) {
  const business = await db.business.findUnique({
    where: { id: params.businessId },
    select: { timezone: true },
  });
  if (!business) return [];

  const dayOfWeek = businessDayOfWeek(params.date);
  const service = await db.service.findFirst({
    where: { id: params.serviceId, businessId: params.businessId, active: true },
    select: { durationMin: true },
  });
  if (!service) return [];

  const wh = await db.workingHour.findUnique({
    where: { businessId_dayOfWeek: { businessId: params.businessId, dayOfWeek } },
  });
  if (!wh || wh.isClosed || !wh.openTime || !wh.closeTime) return [];

  const holiday = await db.holiday.findFirst({
    where: {
      businessId: params.businessId,
      date: {
        gte: new Date(`${params.date}T00:00:00.000Z`),
        lt: new Date(`${nextBusinessDate(params.date)}T00:00:00.000Z`),
      },
    },
  });
  if (holiday) return [];

  const breaks = await db.break.findMany({ where: { businessId: params.businessId, dayOfWeek } });
  const candidates = params.staffId
    ? await db.staff.findMany({
        where: {
          id: params.staffId,
          businessId: params.businessId,
          active: true,
          services: { some: { serviceId: params.serviceId } },
        },
        include: { workingHours: true, daysOff: true },
      })
    : await db.staff.findMany({
        where: {
          businessId: params.businessId,
          active: true,
          services: { some: { serviceId: params.serviceId } },
        },
        include: { workingHours: true, daysOff: true },
      });

  const existing = await db.booking.findMany({
    where: {
      businessId: params.businessId,
      startTime: {
        lt: businessDateTimeToUtc(nextBusinessDate(params.date), '00:00', business.timezone),
      },
      endTime: {
        gt: businessDateTimeToUtc(params.date, '00:00', business.timezone),
      },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { staffId: true, startTime: true, endTime: true },
  });

  const dayOff = new Set(candidates.flatMap((staff) =>
    staff.daysOff
      .filter((item) => new Date(item.date).toISOString().slice(0, 10) === params.date)
      .map(() => staff.id),
  ));

  const available: { time: string; staffId: string | null }[] = [];
  for (let cur = minutesFromTime(wh.openTime); cur + service.durationMin <= minutesFromTime(wh.closeTime); cur += 15) {
    const hour = String(Math.floor(cur / 60)).padStart(2, '0');
    const minute = String(cur % 60).padStart(2, '0');
    const start = businessDateTimeToUtc(params.date, `${hour}:${minute}`, business.timezone);
    const end = new Date(start.getTime() + service.durationMin * 60_000);
    if (start.getTime() < Date.now() + 30 * 60_000) continue;
    const endLocalMinutes = cur + service.durationMin;
    if (breaks.some((item) => cur < minutesFromTime(item.endTime) && endLocalMinutes > minutesFromTime(item.startTime))) continue;

    const freeStaff = candidates.find((staff) => {
      if (dayOff.has(staff.id)) return false;
      const sh = staff.workingHours.find((item) => item.dayOfWeek === dayOfWeek);
      if (sh?.isClosed) return false;
      if (sh?.openTime && sh.closeTime && (cur < minutesFromTime(sh.openTime) || endLocalMinutes > minutesFromTime(sh.closeTime))) return false;
      return !existing.some((booking) => booking.staffId === staff.id && new Date(booking.startTime) < end && new Date(booking.endTime) > start);
    });

    if (candidates.length) {
      if (freeStaff) available.push({ time: `${hour}:${minute}`, staffId: freeStaff.id });
    } else if (!existing.some((booking) => booking.staffId === null && new Date(booking.startTime) < end && new Date(booking.endTime) > start)) {
      available.push({ time: `${hour}:${minute}`, staffId: null });
    }
  }
  return available;
}
