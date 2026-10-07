import { NextResponse } from 'next/server';
import { reconcileSubscriptions } from '@/lib/subscription';

export async function POST(req: Request) {
  const authorization = req.headers.get('authorization');
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || authorization !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await reconcileSubscriptions()) });
}
