import { NextResponse } from 'next/server';
import { requireBusiness, requireUser } from '@/lib/auth';
import { getAvailableSlots } from '@/lib/booking';

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const business = await requireBusiness(user.id);

    const url = new URL(req.url);

    const serviceId = url.searchParams.get('serviceId');
    const date = url.searchParams.get('date');
    const staffId = url.searchParams.get('staffId') || undefined;

    if (!serviceId || !date) {
      return NextResponse.json(
        {
          error: 'serviceId and date are required',
        },
        {
          status: 400,
        },
      );
    }

    const slots = await getAvailableSlots(
      business.id,
      serviceId,
      date,
      staffId,
    );

    return NextResponse.json({
      slots,
    });
  } catch (error) {
    console.error('Calendar availability error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load available slots.',
      },
      {
        status: 400,
      },
    );
  }
}