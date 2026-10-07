import { NextResponse } from 'next/server';
import { reconcileSubscriptions } from '@/lib/subscription';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await reconcileSubscriptions()) });
}
