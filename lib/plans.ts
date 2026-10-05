export const PLANS = {
  FREE: { name: "Free", price: 0, bookings: 20, services: 3, branding: true, staff: false, analytics: false },
  STARTER: { name: "Starter", price: 15000, bookings: Infinity, services: Infinity, branding: false, staff: false, analytics: false },
  PRO: { name: "Pro", price: 30000, bookings: Infinity, services: Infinity, branding: false, staff: true, analytics: true },
} as const;
export type PlanKey = keyof typeof PLANS;
export function hasFeature(plan: PlanKey, feature: "staff" | "analytics") { return Boolean(PLANS[plan][feature]); }
