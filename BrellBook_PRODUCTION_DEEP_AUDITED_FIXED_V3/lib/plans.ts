import { EffectivePlan, PLAN_PRICES, hasPlan } from '@/lib/subscription';
export const PLANS = {
  FREE: { price: 0, bookings: 20, services: 3 },
  STARTER: { price: 15000, bookings: null, services: null },
  PRO: { price: 30000, bookings: null, services: null },
} as const;
export type Plan = EffectivePlan;
export { PLAN_PRICES, hasPlan };
export function planPrice(plan: Plan) { return PLANS[plan].price; }
