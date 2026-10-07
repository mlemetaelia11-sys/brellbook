import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
const item = z.object({ dayOfWeek: z.number().int().min(0).max(6), isClosed: z.boolean(), openTime: z.string().regex(/^\d{2}:\d{2}$/), closeTime: z.string().regex(/^\d{2}:\d{2}$/) });
const schema = z.object({ businessId: z.string(), hours: z.array(item).length(7) });
async function access(businessId: string) { const session = await auth(); if (!session?.user?.id) return null; return db.businessMembership.findUnique({ where: { businessId_userId: { userId: session.user.id, businessId } } }); }
export async function GET(req: Request) { const businessId = new URL(req.url).searchParams.get("businessId"); if (!businessId || !(await access(businessId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); return NextResponse.json({ hours: await db.workingHour.findMany({ where: { businessId }, orderBy: { dayOfWeek: "asc" } }) }); }
export async function PUT(req: Request) { const parsed = schema.safeParse(await req.json()); if (!parsed.success || !(await access(parsed.success ? parsed.data.businessId : ""))) return NextResponse.json({ error: "Invalid working hours." }, { status: 400 }); await db.$transaction(parsed.data.hours.map(h => db.workingHour.upsert({ where: { businessId_dayOfWeek: { businessId: parsed.data.businessId, dayOfWeek: h.dayOfWeek } }, update: { isClosed: h.isClosed, openTime: h.openTime, closeTime: h.closeTime }, create: { businessId: parsed.data.businessId, ...h } }))); return NextResponse.json({ ok: true }); }
