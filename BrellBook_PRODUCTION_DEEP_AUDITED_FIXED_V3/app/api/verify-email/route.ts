import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { hashToken } from "@/lib/security";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = z
    .object({ token: z.string().min(64).max(128) })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid verification token." },
      { status: 400 },
    );
  }

  const tokenHash = hashToken(parsed.data.token);
  const now = new Date();

  const row = await db.emailVerificationToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true, userId: true },
  });

  if (!row) {
    return NextResponse.json(
      { error: "Verification link is invalid or expired." },
      { status: 400 },
    );
  }

  const verified = await db.$transaction(async (tx) => {
    const consumed = await tx.emailVerificationToken.updateMany({
      where: {
        id: row.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    if (consumed.count !== 1) {
      return false;
    }

    await tx.user.update({
      where: { id: row.userId },
      data: { emailVerifiedAt: new Date() },
    });

    return true;
  });

  if (!verified) {
    return NextResponse.json(
      { error: "This link has already been used or has expired." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}