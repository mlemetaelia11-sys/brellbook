import { addMinutes, format, parseISO, isBefore, isEqual } from "date-fns";
import { db } from "./prisma";

function atTime(date: Date, hhmm: string) { const [h,m] = hhmm.split(":").map(Number); const d = new Date(date); d.setHours(h,m,0,0); return d; }
export async function getAvailableSlots(businessId: string, serviceId: string, dateISO: string, staffId?: string) {
  const date = parseISO(dateISO); const day = date.getDay();
  const [hours, holiday, service, bookings, breaks, staffHours] = await Promise.all([
    db.workingHour.findUnique({ where: { businessId_dayOfWeek: { businessId, dayOfWeek: day } } }),
    db.holiday.findUnique({ where: { businessId_date: { businessId, date: new Date(dateISO + "T00:00:00") } } }),
    db.service.findFirst({ where: { id: serviceId, businessId, active: true } }),
    db.booking.findMany({ where: { businessId, date: new Date(dateISO + "T00:00:00"), status: { in: ["PENDING","CONFIRMED"] }, ...(staffId ? { staffId } : {}) }, select: { startTime: true, endTime: true } }),
    db.break.findMany({ where: { businessId, OR: [{ dayOfWeek: day }, { dayOfWeek: null }] } }),
    staffId ? db.staffWorkingHour.findUnique({ where: { staffId_dayOfWeek: { staffId, dayOfWeek: day } } }) : Promise.resolve(null),
  ]);
  if (!service || !hours || hours.isClosed || holiday) return [];
  const open = staffHours && !staffHours.isClosed ? staffHours.openTime : hours.openTime;
  const close = staffHours && !staffHours.isClosed ? staffHours.closeTime : hours.closeTime;
  if (!open || !close) return [];
  const slots: string[] = []; let cursor = atTime(date, open); const closing = atTime(date, close);
  while (isBefore(cursor, closing)) {
    const end = addMinutes(cursor, service.durationMinutes);
    if (end.getTime() > closing.getTime()) break;
    const inBreak = breaks.some(b => { const bs=atTime(date,b.startTime), be=atTime(date,b.endTime); return cursor < be && end > bs; });
    const conflict = bookings.some(b => cursor < b.endTime && end > b.startTime);
    if (!inBreak && !conflict) slots.push(format(cursor, "HH:mm"));
    cursor = addMinutes(cursor, 30);
  }
  return slots;
}

export async function assertSlotAvailable(businessId: string, serviceId: string, dateISO: string, startHHmm: string, staffId?: string) {
  const slots = await getAvailableSlots(businessId, serviceId, dateISO, staffId);
  if (!slots.includes(startHHmm)) throw new Error("SLOT_UNAVAILABLE");
}
