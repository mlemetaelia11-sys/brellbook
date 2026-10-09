import { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';
import {
  businessDateTimeToUtc,
  businessDayOfWeek,
  formatDateInTimeZone,
  minutesFromTime,
  utcRangeForLocalDate,
} from '@/lib/timezone';

type DbClient = Prisma.TransactionClient | typeof db;
type StaffCandidate = {
  id: string;
  hours: Array<{
    dayOfWeek: number;
    open: boolean;
    openTime: string;
    closeTime: string;
  }>;
};

function localMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

async function businessDayRules(params: {
  businessId: string;
  serviceId: string;
  startTime: Date;
  client: DbClient;
}) {
  const { businessId, serviceId, startTime, client } = params;
  const business = await client.business.findUnique({
    where: { id: businessId },
    select: { timezone: true },
  });
  if (!business) return { error: 'BUSINESS_NOT_FOUND' as const };

  const service = await client.service.findFirst({
    where: { id: serviceId, businessId, active: true },
    select: { durationMin: true },
  });
  if (!service) return { error: 'SERVICE_NOT_FOUND' as const };

  const date = formatDateInTimeZone(startTime, business.timezone);
  const dayOfWeek = businessDayOfWeek(date);
  const startMinutes = localMinutes(startTime, business.timezone);
  const endTime = new Date(startTime.getTime() + service.durationMin * 60_000);
  const endMinutes = localMinutes(endTime, business.timezone);

  if (startTime.getTime() < Date.now() + 30 * 60_000) {
    return { error: 'MINIMUM_NOTICE' as const };
  }
  if (startMinutes % 15 !== 0) return { error: 'INVALID_SLOT' as const };

  const hours = await client.workingHour.findUnique({
    where: { businessId_dayOfWeek: { businessId, dayOfWeek } },
  });
  if (!hours || !hours.open) return { error: 'BUSINESS_CLOSED' as const };
  if (
    startMinutes < minutesFromTime(hours.openTime) ||
    endMinutes > minutesFromTime(hours.closeTime) ||
    endMinutes <= startMinutes
  ) {
    return { error: 'OUTSIDE_HOURS' as const };
  }

  const range = utcRangeForLocalDate(date, business.timezone);
  const holiday = await client.holiday.findFirst({
    where: { businessId, date: { gte: range.start, lt: range.end } },
    select: { id: true },
  });
  if (holiday) return { error: 'HOLIDAY' as const };

  const breaks = await client.break.findMany({
    where: { businessId, dayOfWeek },
    select: { startTime: true, endTime: true },
  });
  if (
    breaks.some(
      (item) =>
        startMinutes < minutesFromTime(item.endTime) &&
        endMinutes > minutesFromTime(item.startTime),
    )
  ) {
    return { error: 'BREAK' as const };
  }

  return {
    error: null,
    timezone: business.timezone,
    date,
    dayOfWeek,
    startMinutes,
    endMinutes,
    endTime,
    serviceDuration: service.durationMin,
  };
}

export async function validateBusinessSlot(params: {
  businessId: string;
  serviceId: string;
  startTime: Date;
  staffId?: string | null;
  client?: DbClient;
}): Promise<string | null> {
  const client = params.client ?? db;
  const rules = await businessDayRules({
    businessId: params.businessId,
    serviceId: params.serviceId,
    startTime: params.startTime,
    client,
  });
  if (rules.error) return rules.error;
  if (!params.staffId) return null;

  const staff = await client.staff.findFirst({
    where: {
      id: params.staffId,
      businessId: params.businessId,
      active: true,
      services: { some: { serviceId: params.serviceId } },
    },
    include: { hours: true },
  });
  if (!staff) return 'STAFF_UNAVAILABLE';

  const staffHours = staff.hours.find((item) => item.dayOfWeek === rules.dayOfWeek);
  // When no staff-specific hours are configured for that day, business hours apply.
  if (staffHours) {
    if (!staffHours.open) return 'STAFF_DAY_OFF';
    if (
      rules.startMinutes < minutesFromTime(staffHours.openTime) ||
      rules.endMinutes > minutesFromTime(staffHours.closeTime)
    ) {
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
}): Promise<Array<{ time: string; staffId: string | null }>> {
  const business = await db.business.findUnique({
    where: { id: params.businessId },
    select: { id: true, timezone: true },
  });
  if (!business) return [];

  const service = await db.service.findFirst({
    where: { id: params.serviceId, businessId: params.businessId, active: true },
    select: { durationMin: true },
  });
  if (!service) return [];

  const dayOfWeek = businessDayOfWeek(params.date);
  const hours = await db.workingHour.findUnique({
    where: { businessId_dayOfWeek: { businessId: params.businessId, dayOfWeek } },
  });
  if (!hours || !hours.open) return [];

  const range = utcRangeForLocalDate(params.date, business.timezone);
  const holiday = await db.holiday.findFirst({
    where: { businessId: params.businessId, date: { gte: range.start, lt: range.end } },
    select: { id: true },
  });
  if (holiday) return [];

  const breaks = await db.break.findMany({ where: { businessId: params.businessId, dayOfWeek } });
  const candidates: StaffCandidate[] = await db.staff.findMany({
    where: {
      businessId: params.businessId,
      active: true,
      ...(params.staffId ? { id: params.staffId } : {}),
      services: { some: { serviceId: params.serviceId } },
    },
    include: { hours: { select: { dayOfWeek: true, open: true, openTime: true, closeTime: true } } },
    orderBy: { name: 'asc' },
  });

  if (params.staffId && candidates.length === 0) return [];

  // Do not offer unassigned slots if the business has active staff but none can perform this service.
  const activeStaffCount = candidates.length === 0
    ? await db.staff.count({ where: { businessId: params.businessId, active: true } })
    : candidates.length;
  if (!candidates.length && activeStaffCount > 0) return [];

  const existing = await db.booking.findMany({
    where: {
      businessId: params.businessId,
      startAt: { lt: range.end },
      endAt: { gt: range.start },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { staffId: true, startAt: true, endAt: true },
  });

  const available: Array<{ time: string; staffId: string | null }> = [];
  for (
    let minute = minutesFromTime(hours.openTime);
    minute + service.durationMin <= minutesFromTime(hours.closeTime);
    minute += 15
  ) {
    const hh = String(Math.floor(minute / 60)).padStart(2, '0');
    const mm = String(minute % 60).padStart(2, '0');
    const start = businessDateTimeToUtc(params.date, `${hh}:${mm}`, business.timezone);
    const end = new Date(start.getTime() + service.durationMin * 60_000);
    if (start.getTime() < Date.now() + 30 * 60_000) continue;

    const endLocalMinutes = minute + service.durationMin;
    if (breaks.some((item) => minute < minutesFromTime(item.endTime) && endLocalMinutes > minutesFromTime(item.startTime))) continue;

    const freeStaff = candidates.find((staff) => {
      const staffHours = staff.hours.find((item) => item.dayOfWeek === dayOfWeek);
      if (staffHours) {
        if (!staffHours.open) return false;
        if (minute < minutesFromTime(staffHours.openTime) || endLocalMinutes > minutesFromTime(staffHours.closeTime)) return false;
      }
      return !existing.some((booking) =>
        (booking.staffId === staff.id || booking.staffId === null) &&
        booking.startAt < end && booking.endAt > start,
      );
    });

    if (candidates.length) {
      if (freeStaff) available.push({ time: `${hh}:${mm}`, staffId: freeStaff.id });
    } else if (!existing.some((booking) =>
      booking.startAt < end && booking.endAt > start,
    )) {
      available.push({ time: `${hh}:${mm}`, staffId: null });
    }
  }

  return available;
}
