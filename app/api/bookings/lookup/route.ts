import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const code = u.searchParams.get('code') || '';
    const phone = u.searchParams.get('phone') || '';

    const booking = await db.booking.findFirst({
      where: {
        bookingCode: code,
        customerPhoneSnapshot: phone,
      },
      include: {
        business: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      booking: {
        code: booking.bookingCode,
        business: booking.business.name,
        service: booking.serviceNameSnapshot,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        price: Number(
          booking.finalPriceSnapshot ?? booking.priceSnapshot
        ),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Lookup failed.' },
      { status: 400 }
    );
  }
}