import { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';

export async function hasBookingConflict(params: { businessId:string; staffId?:string|null; startAt:Date; endAt:Date; excludeBookingId?:string }, client: Prisma.TransactionClient | typeof db = db) {
  return client.booking.findFirst({ where: {
    businessId: params.businessId,
    id: params.excludeBookingId ? { not: params.excludeBookingId } : undefined,
    status: { in: ['PENDING','CONFIRMED'] },
    startTime: { lt: params.endAt }, endTime: { gt: params.startAt },
    ...(params.staffId ? { staffId: params.staffId } : {})
  }});
}
export function makeBookingCode(date = new Date()) { return `BB-${date.toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`; }
