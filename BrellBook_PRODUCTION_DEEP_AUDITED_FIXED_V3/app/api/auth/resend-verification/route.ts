import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { randomToken, hashToken } from "@/lib/security";
import { sendEmail, emailLayout } from "@/lib/email";

const schema = z.object({
  email: z.string().trim().email().max(254),
});

const genericResponse = {
  ok: true,
  message:
    "If this email belongs to an unverified account, a verification link will be sent. Check your inbox and spam folder.",
};

function getAppUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  return null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  // Return the same response for all email addresses if email is unconfigured.
  const hasEmailConfig =
    Boolean(process.env.RESEND_API_KEY) &&
    Boolean(process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM);

  if (!hasEmailConfig || !getAppUrl()) {
    return NextResponse.json(
      {
        error:
          "Email verification is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        passwordHash: true,
      },
    });

    // Do not reveal whether an email is registered.
    if (!user || user.emailVerifiedAt || !user.passwordHash) {
      return NextResponse.json(genericResponse);
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - 60_000);

    // Limit repeated sends to one active request per minute.
    const recentToken = await db.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        createdAt: { gt: cutoff },
      },
      select: { id: true },
    });

    if (recentToken) {
      return NextResponse.json(genericResponse);
    }

    // Retire older links before issuing a fresh one.
    await db.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    });

    const token = randomToken();

    await db.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    const appUrl = getAppUrl()!;
    const verificationUrl =
      `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

    try {
      const result = await sendEmail({
        to: user.email,
        subject: "Your BrellBook verification link",
        text: `Verify your BrellBook email here: ${verificationUrl}`,
        html: emailLayout(
          "Verify your email",
          `<p>Use this link to verify your BrellBook account.</p>
          <p><a href="${verificationUrl}"
          style="background:#6C2BFF;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">
          Verify email</a></p>
          <p>This link expires in 24 hours.</p>`,
        ),
      });

      if (result?.id === "dev-no-send") {
        await db.emailVerificationToken.updateMany({
          where: { userId: user.id, tokenHash: hashToken(token), usedAt: null },
          data: { usedAt: new Date() },
        });
      }
    } catch (error) {
      // Invalidate failed deliveries so the user can retry.
      await db.emailVerificationToken.updateMany({
        where: { userId: user.id, tokenHash: hashToken(token), usedAt: null },
        data: { usedAt: new Date() },
      });

      console.error(
        "BrellBook resend verification failed:",
        error instanceof Error ? error.message : "Unknown email error",
      );
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error(
      "BrellBook resend request failed:",
      error instanceof Error ? error.message : "Unknown resend error",
    );

    return NextResponse.json(
      { error: "Could not process this request right now. Please try again." },
      { status: 500 },
    );
  }
}