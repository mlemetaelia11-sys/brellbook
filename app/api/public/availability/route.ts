import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/prisma';
import { findAvailableSlots } from '@/lib/availability';

const query = z.object({
  slug: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffId: z.string().optional(),
});

export async function GET(req: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid availability request.' }, { status: 400 });

  const business = await db.business.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true, timezone: true },
  });
  if (!business) return NextResponse.json({ error: 'Business not found.' }, { status: 404 });

  const slots = await findAvailableSlots({
    businessId: business.id,
    serviceId: parsed.data.serviceId,
    date: parsed.data.date,
    staffId: parsed.data.staffId,
  });

  return NextResponse.json({ slots, timezone: business.timezone });
}
