import { db } from '@/lib/prisma';

export type EffectivePlan = 'FREE' | 'STARTER' | 'PRO';
export const PLAN_RANK: Record<EffectivePlan, number> = { FREE: 0, STARTER: 1, PRO: 2 };
export const PLAN_PRICES: Record<EffectivePlan, number> = { FREE: 0, STARTER: 15000, PRO: 30000 };

export function hasPlan(plan: EffectivePlan, minimum: EffectivePlan) {
  return PLAN_RANK[plan] >= PLAN_RANK[minimum];
}

export async function getSubscription(businessId: string) {
  return db.subscription.findUnique({ where: { businessId } });
}

export function effectivePlan(subscription: any, now = new Date()): EffectivePlan {
  if (!subscription) return 'FREE';
  if (subscription.status === 'ACTIVE' && subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > now) {
    return subscription.plan === 'PRO' ? 'PRO' : subscription.plan === 'STARTER' ? 'STARTER' : 'FREE';
  }
  if (subscription.status === 'GRACE_PERIOD' && subscription.graceEndsAt && new Date(subscription.graceEndsAt) > now) {
    return subscription.plan === 'PRO' ? 'PRO' : subscription.plan === 'STARTER' ? 'STARTER' : 'FREE';
  }
  return 'FREE';
}

export async function getEffectivePlan(businessId: string, now = new Date()) {
  const subscription = await getSubscription(businessId);
  return { subscription, plan: effectivePlan(subscription, now) };
}

export async function requirePlan(businessId: string, minimum: EffectivePlan) {
  const result = await getEffectivePlan(businessId);
  return { ...result, allowed: hasPlan(result.plan, minimum) };
}

export function nextMonthlyPeriod(start: Date) {
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return end;
}

export async function reconcileSubscriptions(now = new Date()) {
  const expiredActive = await db.subscription.findMany({
    where: { status: 'ACTIVE', currentPeriodEnd: { lte: now } },
  });
  let graceStarted = 0;
  let downgraded = 0;
  for (const s of expiredActive) {
    const pending = await db.payment.findFirst({
      where: { businessId: s.businessId, plan: { not: null }, status: 'PENDING', createdAt: { gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) {
      await db.subscription.update({ where: { id: s.id }, data: { status: 'GRACE_PERIOD', graceEndsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) } });
      graceStarted++;
    } else {
      await db.subscription.update({ where: { id: s.id }, data: { status: 'EXPIRED', plan: 'FREE', currentPeriodStart: null, currentPeriodEnd: null, nextBillingDate: null, graceEndsAt: null } });
      downgraded++;
    }
  }
  const expiredGrace = await db.subscription.findMany({ where: { status: 'GRACE_PERIOD', graceEndsAt: { lte: now } } });
  for (const s of expiredGrace) {
    await db.subscription.update({ where: { id: s.id }, data: { status: 'EXPIRED', plan: 'FREE', currentPeriodStart: null, currentPeriodEnd: null, nextBillingDate: null, graceEndsAt: null } });
    downgraded++;
  }
  return { checked: expiredActive.length + expiredGrace.length, graceStarted, downgraded, expiredGrace: expiredGrace.length };
}
