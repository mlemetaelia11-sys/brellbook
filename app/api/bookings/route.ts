import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { getEffectivePlan } from '@/lib/subscription';
import { hasBookingConflict, makeBookingCode } from '@/lib/booking';
import { validateBusinessSlot } from '@/lib/availability';

const createSchema = z.object({
  businessId: z.string().min(1), customerId: z.string().min(1), serviceId: z.string().min(1),
  staffId: z.string().nullable().optional(), startTime: z.string().datetime().or(z.string().min(1)), notes: z.string().max(2000).optional()
});

async function access(businessId: string) {
  const s = await auth();
  if (!s?.user?.id) return null;
  return db.businessMembership.findUnique({ where: { businessId_userId: { businessId, userId: s.user.id } } });
}

export async function GET(req: Request) {
  const businessId = new URL(req.url).searchParams.get('businessId');
  if (!businessId || !(await access(businessId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const status = new URL(req.url).searchParams.get('status') as any;
  const bookings = await db.booking.findMany({ where: { businessId, status: status && status !== 'ALL' ? status : undefined }, include: { customer: true, service: true, staff: true }, orderBy: { startTime: 'desc' }, take: 500 });
  return NextResponse.json({ bookings });
}

export async function POST(req: Request) {
  const p = createSchema.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: 'Invalid booking.' }, { status: 400 });
  const m = await access(p.data.businessId);
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const service = await db.service.findFirst({ where: { id: p.data.serviceId, businessId: p.data.businessId, active: true } });
  if (!service) return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
  const customer = await db.customer.findFirst({ where: { id: p.data.customerId, businessId: p.data.businessId } });
  if (!customer) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
  const startTime = new Date(p.data.startTime);
  if (Number.isNaN(startTime.getTime())) return NextResponse.json({ error: 'Invalid booking time.' }, { status: 400 });
  const endTime = new Date(startTime.getTime() + service.durationMin * 60000);
  const entitlement = await getEffectivePlan(p.data.businessId);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const count = await db.booking.count({ where: { businessId: p.data.businessId, createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } } });
  if (entitlement.plan === 'FREE' && count >= 20) return NextResponse.json({ error: 'Free plan booking limit reached.' }, { status: 403 });
  try {
    const slotError = await validateBusinessSlot({
      businessId: p.data.businessId,
      serviceId: service.id,
      staffId: p.data.staffId ?? null,
      startTime,
    });
    if (slotError) throw new Error(slotError);

    const booking = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${p.data.businessId + ':booking'}))`;
      if (await hasBookingConflict({ businessId: p.data.businessId, staffId: p.data.staffId, startAt: startTime, endAt: endTime }, tx)) throw new Error('CONFLICT');
      return tx.booking.create({ data: {
        bookingCode: makeBookingCode(startTime), businessId: p.data.businessId, customerId: customer.id, serviceId: service.id,
        staffId: p.data.staffId || null, serviceNameSnapshot: service.name, priceSnapshot: service.price,
        durationMinutesSnapshot: service.durationMin, customerNameSnapshot: customer.name, customerPhoneSnapshot: customer.phone,
        customerEmailSnapshot: customer.email, date: startTime, startTime, endTime, status: 'PENDING', notes: p.data.notes || null,
        events: { create: { type: 'CREATED', metadata: { source: 'dashboard' } } }
      }, include: { customer: true, service: true, staff: true } });
    }, { isolationLevel: 'Serializable' });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'BOOKING_ERROR';
    const conflict = ['CONFLICT', 'STAFF_UNAVAILABLE', 'STAFF_DAY_OFF', 'BREAK', 'HOLIDAY', 'BUSINESS_CLOSED', 'OUTSIDE_HOURS', 'MINIMUM_NOTICE', 'INVALID_SLOT'].includes(message);
    return NextResponse.json({ error: message === 'MINIMUM_NOTICE' ? 'Please choose a time at least 30 minutes from now.' : conflict ? 'That time is not available.' : 'Unable to create booking.' }, { status: conflict ? 409 : 500 });
  }
}

export async function PATCH(req: Request) {
  const p = z.object({ businessId: z.string(), id: z.string(), status: z.enum(['PENDING','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW']).optional(), startTime: z.string().datetime().optional(), staffId: z.string().nullable().optional(), notes: z.string().max(2000).optional() }).safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  if (!(await access(p.data.businessId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const old = await db.booking.findFirst({ where: { id: p.data.id, businessId: p.data.businessId } });
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const data: any = {};
  if (p.data.status) data.status = p.data.status;
  if (p.data.notes !== undefined) data.notes = p.data.notes;
  const nextStaffId = p.data.staffId !== undefined ? p.data.staffId : old.staffId;
  const nextStart = p.data.startTime ? new Date(p.data.startTime) : old.startTime;
  if (Number.isNaN(nextStart.getTime())) return NextResponse.json({ error: 'Invalid booking time.' }, { status: 400 });
  const durationMs = old.endTime.getTime() - old.startTime.getTime();
  const nextEnd = new Date(nextStart.getTime() + durationMs);

  if (p.data.startTime || p.data.staffId !== undefined) {
    try {
      const slotError = await validateBusinessSlot({
        businessId: p.data.businessId,
        serviceId: old.serviceId,
        staffId: nextStaffId,
        startTime: nextStart,
      });
      if (slotError) return NextResponse.json({ error: 'That time is not available.' }, { status: 409 });
    } catch {
      return NextResponse.json({ error: 'That time is not available.' }, { status: 409 });
    }
  }

  if (p.data.startTime || p.data.staffId !== undefined) {
    const booking = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${p.data.businessId + ':booking'}))`;
      if (await hasBookingConflict({ businessId: p.data.businessId, staffId: nextStaffId, startAt: nextStart, endAt: nextEnd, excludeBookingId: old.id }, tx)) {
        throw new Error('CONFLICT');
      }
      return tx.booking.update({
        where: { id: old.id },
        data: { ...data, staffId: nextStaffId, startTime: nextStart, endTime: nextEnd, date: nextStart, events: { create: { type: p.data.status || 'UPDATED', metadata: { source: 'dashboard' } } } },
        include: { customer: true, service: true, staff: true },
      });
    }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 });
    return NextResponse.json({ booking });
  }

  const booking = await db.booking.update({
    where: { id: old.id },
    data: { ...data, events: { create: { type: p.data.status || 'UPDATED', metadata: { source: 'dashboard' } } } },
    include: { customer: true, service: true, staff: true },
  });
  return NextResponse.json({ booking });
}

export async function DELETE(req: Request) {
  const u = new URL(req.url), businessId = u.searchParams.get('businessId'), id = u.searchParams.get('id');
  if (!businessId || !id || !(await access(businessId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await db.booking.updateMany({ where: { id, businessId }, data: { status: 'CANCELLED' } });
  return NextResponse.json({ ok: true });
}
