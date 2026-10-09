import { NextResponse } from 'next/server';
import { sync } from '@/lib/pesapal-sync';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tracking = url.searchParams.get('OrderTrackingId');
  const ref = url.searchParams.get('OrderMerchantReference');

  try {
    if (tracking && ref) {
      await sync(tracking, ref);
    }
  } catch (error) {
    console.error('PESAPAL_CALLBACK_SYNC_FAILED', error);
  }

  return NextResponse.redirect(
    new URL('/dashboard/subscription?payment=returned', url.origin),
  );
}