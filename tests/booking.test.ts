import { describe,it,expect } from 'vitest'; import { PLANS } from '../lib/plans';
describe('BrellBook plan rules',()=>{it('has the required TSh prices',()=>{expect(PLANS.FREE.price).toBe(0);expect(PLANS.STARTER.price).toBe(15000);expect(PLANS.PRO.price).toBe(30000)});it('limits Free services and bookings',()=>{expect(PLANS.FREE.services).toBe(3);expect(PLANS.FREE.bookings).toBe(20)})});
