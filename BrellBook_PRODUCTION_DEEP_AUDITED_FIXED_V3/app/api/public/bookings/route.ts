import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/prisma';
import { hasBookingConflict, makeBookingCode } from '@/lib/booking';
import { getEffectivePlan } from '@/lib/subscription';
import { sendEmail } from '@/lib/email';
import { validateBusinessSlot } from '@/lib/availability';
import { businessDateTimeToUtc, formatDateInTimeZone } from '@/lib/timezone';

const schema = z.object({
  slug: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(30),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
});

function friendlySlotError(code: string | null) {
  const messages: Record<string, string> = {
    BUSINESS_CLOSED: 'The business is closed on this day.',
    HOLIDAY: 'The business is closed on this date.',
    OUTSIDE_HOURS: 'That time is outside business hours.',
    BREAK: 'That time falls within a break.',
    STAFF_UNAVAILABLE: 'That staff member is not available at that time.',
    STAFF_DAY_OFF: 'That staff member is off on this date.',
    STAFF_UNAVAILABLE_CONFLICT: 'That staff member is already booked at that time.',
    CONFLICT: 'That time is no longer available. Please choose another time.',
    MINIMUM_NOTICE: 'Please choose a time at least 30 minutes from now.',
    INVALID_SLOT: 'Please choose one of the available time slots.',
    SERVICE_NOT_FOUND: 'Service not found.',
  };
  return messages[code || ''] || null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please complete all required booking details.' }, { status: 400 });
  }

  const input = parsed.data;
  const business = await db.business.findUnique({ where: { slug: input.slug } });
  if (!business) return NextResponse.json({ error: 'Business not found.' }, { status: 404 });

  let startAt: Date;
  try {
    startAt = businessDateTimeToUtc(input.date, input.time, business.timezone);
  } catch {
    return NextResponse.json({ error: 'Please choose a valid booking time.' }, { status: 400 });
  }
  if (Number.isNaN(startAt.getTime())) {
    return NextResponse.json({ error: 'Please choose a valid booking time.' }, { status: 400 });
  }

  const service = await db.service.findFirst({
    where: { id: input.serviceId, businessId: business.id, active: true },
  });
  if (!service) return NextResponse.json({ error: 'Service not found.' }, { status: 404 });

  const entitlement = await getEffectivePlan(business.id);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

  try {
    const booking = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${business.id + ':booking'}))`;

      const localToday = formatDateInTimeZone(new Date(), business.timezone);
      const monthStart = businessDateTimeToUtc(`${localToday.slice(0, 8)}01`, '00:00', business.timezone);
      const count = await tx.booking.count({
        where: {
          businessId: business.id,
          createdAt: { gte: monthStart },
          status: { not: 'CANCELLED' },
        },
      });
      if (entitlement.plan === 'FREE' && count >= 20) throw new Error('FREE_LIMIT');

      const slotError = await validateBusinessSlot({
        businessId: business.id,
        serviceId: service.id,
        staffId: input.staffId ?? null,
        startTime: startAt,
        client: tx,
      });
      if (slotError) throw new Error(slotError);

      let staffId = input.staffId ?? null;
      if (staffId) {
        if (await hasBookingConflict({ businessId: business.id, staffId, startAt, endAt }, tx)) {
          throw new Error('STAFF_UNAVAILABLE_CONFLICT');
        }
      } else {
        const candidates = await tx.staff.findMany({
          where: {
            businessId: business.id,
            active: true,
            services: { some: { serviceId: service.id } },
          },
          select: { id: true },
          orderBy: { name: 'asc' },
        });

        if (candidates.length > 0) {
          const available: string[] = [];
          for (const candidate of candidates) {
            const error = await validateBusinessSlot({
              businessId: business.id,
              serviceId: service.id,
              staffId: candidate.id,
              startTime: startAt,
              client: tx,
            });
            if (error) continue;
            if (!(await hasBookingConflict({ businessId: business.id, staffId: candidate.id, startAt, endAt }, tx))) {
              available.push(candidate.id);
            }
          }
          staffId = available[0] ?? null;
          if (!staffId) throw new Error('CONFLICT');
        } else {
          const activeStaffCount = await tx.staff.count({ where: { businessId: business.id, active: true } });
          if (activeStaffCount > 0) throw new Error('STAFF_UNAVAILABLE');
          if (await hasBookingConflict({ businessId: business.id, startAt, endAt }, tx)) throw new Error('CONFLICT');
        }
      }

      const customer = await tx.customer.upsert({
        where: { businessId_phone: { businessId: business.id, phone: input.phone } },
        update: { name: input.name, email: input.email || undefined },
        create: {
          businessId: business.id,
          name: input.name,
          phone: input.phone,
          email: input.email || null,
        },
      });

      return tx.booking.create({
        data: {
          code: makeBookingCode(startAt),
          businessId: business.id,
          serviceId: service.id,
          customerId: customer.id,
          staffId,
          startAt,
          endAt,
          price: service.price,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          notes: input.notes || null,
          events: { create: { type: 'CREATED', metadata: { source: 'public' } } },
        },
        include: { service: true, customer: true, staff: true },
      });
    }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 });

    const formattedStart = new Intl.DateTimeFormat('en-GB', {
      timeZone: business.timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(booking.startAt);

    await Promise.allSettled([
      booking.customer.email
        ? sendEmail({
            to: booking.customer.email,
            subject: `Booking received · ${business.name}`,
            html: `<h2>Booking received</h2><p>Hi ${booking.customer.name}, your request for ${booking.service.name} has been received.</p><p>${formattedStart} · Code: <strong>${booking.code}</strong></p>`,
          })
        : Promise.resolve(false),
      business.email
        ? sendEmail({
            to: business.email,
            subject: `New booking · ${booking.code}`,
            html: `<h2>New booking</h2><p>${booking.customer.name} requested ${booking.service.name}.</p><p>${formattedStart} · ${booking.code}</p>`,
          })
        : Promise.resolve(false),
    ]);

    return NextResponse.json({
      booking: {
        code: booking.code,
        startAt: booking.startAt,
        endAt: booking.endAt,
        service: booking.service.name,
        customer: booking.customer.name,
        staff: booking.staff?.name ?? null,
        status: booking.status,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'BOOKING_ERROR';
    if (message === 'FREE_LIMIT') {
      return NextResponse.json({ error: 'This business has reached its Free plan booking limit. Please contact the business.' }, { status: 403 });
    }
    const friendly = friendlySlotError(message);
    if (friendly) return NextResponse.json({ error: friendly }, { status: 409 });
    console.error('Public booking failed:', message);
    return NextResponse.json({ error: 'We could not create the booking. Please try again.' }, { status: 500 });
  }
}
