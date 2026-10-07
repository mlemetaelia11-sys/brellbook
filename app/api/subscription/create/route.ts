import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { z } from 'zod';
import { submitPesapalOrder } from '@/lib/pesapal';
import { planPrice } from '@/lib/plans';

const schema = z.object({ businessId: z.string(), plan: z.enum(['STARTER', 'PRO']) });

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = schema.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
  const m = await db.businessMembership.findUnique({ where: { businessId_userId: { userId: s.user.id, businessId: p.data.businessId } }, include: { business: { include: { subscription: true } }, user: true } });
  if (!m || m.role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!m.user.phone || m.user.phone.replace(/\D/g, '').length < 9) return NextResponse.json({ error: 'Add a valid phone number to your profile before paying.' }, { status: 400 });
  if (process.env.PESAPAL_ENVIRONMENT !== 'live') return NextResponse.json({ error: 'Production billing requires PESAPAL_ENVIRONMENT=live.' }, { status: 503 });

  const amount = planPrice(p.data.plan);
  const paymentId = crypto.randomUUID();
  const payment = await db.payment.create({ data: { id: paymentId, merchantReference: paymentId, businessId: m.business.id, subscriptionId: m.business.subscription?.id || null, plan: p.data.plan, amount, currency: 'TZS', status: 'PENDING', provider: 'PESAPAL', description: `BrellBook ${p.data.plan} monthly subscription` } });
  try {
    const name = (m.user.name || 'BrellBook User').trim().split(/\s+/);
    const order = await submitPesapalOrder({ id: payment.id, amount, description: `BrellBook ${p.data.plan} monthly subscription`, email: m.user.email, phone: m.user.phone, firstName: name[0] || 'BrellBook', lastName: name.slice(1).join(' ') || 'User' });
    await db.payment.update({ where: { id: payment.id }, data: { trackingId: order.order_tracking_id, metadata: order } });
    return NextResponse.json({ redirectUrl: order.redirect_url, paymentId: payment.id });
  } catch (e) {
    await db.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', metadata: { error: e instanceof Error ? e.message : 'unknown' } } });
    return NextResponse.json({ error: 'Production Pesapal payment could not be started.' }, { status: 503 });
  }
}
