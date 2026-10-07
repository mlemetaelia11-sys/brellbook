import { NextResponse } from 'next/server';
import { sync } from './sync';

export async function GET(req: Request) {
  const u = new URL(req.url);

  const tracking = u.searchParams.get('OrderTrackingId');
  const ref = u.searchParams.get('OrderMerchantReference');

  try {
    if (tracking && ref) {
      await sync(tracking, ref);
    }
  } catch {
    // Pesapal may retry callbacks.
    // Keep the callback response stable and let the IPN retry.
  }

  return NextResponse.redirect(
    new URL(
      '/dashboard/subscription?payment=returned',
      u.origin
    )
  );
}