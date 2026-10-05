import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./prisma";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-change-me");
const COOKIE = "brell_session";

type SessionPayload = { userId: string };

export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export async function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash); }

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId } satisfies SessionPayload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
  const store = await cookies();
  store.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function clearSession() { (await cookies()).delete(COOKIE); }
export async function getSessionUserId() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try { return (await jwtVerify<SessionPayload>(token, secret)).payload.userId ?? null; } catch { return null; }
}
export async function getCurrentUser() {
  const id = await getSessionUserId();
  if (!id) return null;
  return db.user.findUnique({ where: { id }, include: { memberships: { include: { business: { include: { subscription: true } } } } } });
}
export async function requireUser() { const user = await getCurrentUser(); if (!user) throw new Error("UNAUTHORIZED"); return user; }
export async function getBusinessForUser(userId: string) {
  return db.business.findFirst({ where: { memberships: { some: { userId } } }, include: { subscription: true } });
}
export async function requireBusiness(userId: string) {
  const business = await getBusinessForUser(userId); if (!business) throw new Error("BUSINESS_REQUIRED"); return business;
}
export async function requireAdmin(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.isPlatformAdmin) throw new Error("FORBIDDEN");
  return user;
}
