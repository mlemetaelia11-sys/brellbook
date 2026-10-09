import { NextResponse } from 'next/server';
import { sync } from '@/lib/pesapal-sync';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tracking = url.searchParams.get('OrderTrackingId') || '';
  const ref = url.searchParams.get('OrderMerchantReference') || '';

  if (!tracking || !ref) {
    return NextResponse.json({ status: 500 }, { status: 400 });
  }

  try {
    await sync(tracking, ref);

    return NextResponse.json({
      orderNotificationType: 'IPNCHANGE',
      orderTrackingId: tracking,
      orderMerchantReference: ref,
      status: 200,
    });
  } catch (error) {
    console.error('PESAPAL_IPN_SYNC_FAILED', error);
    return NextResponse.json({ status: 500 }, { status: 500 });
  }
}

export const POST = GET;