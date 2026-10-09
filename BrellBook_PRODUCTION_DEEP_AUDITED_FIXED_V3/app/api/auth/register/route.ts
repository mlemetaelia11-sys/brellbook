import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/prisma";
import { randomToken, hashToken } from "@/lib/security";
import { sendEmail, emailLayout } from "@/lib/email";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(9).max(30),
  password: z.string().min(8).max(128),
});

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
      { error: "Enter your name, valid email, phone and password of at least 8 characters." },
      { status: 400 },
    );
  }

  const appUrl = getAppUrl();

  if (!appUrl) {
    return NextResponse.json(
      { error: "Registration is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const existing = await db.user.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Try logging in or requesting a new verification email.",
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const token = randomToken();

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: parsed.data.name,
          email,
          phone: parsed.data.phone,
          passwordHash,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: created.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return created;
    });

    let emailSent = false;

    try {
      const result = await sendEmail({
        to: user.email,
        subject: "Verify your BrellBook email",
        text: `Welcome to BrellBook. Verify your email here: ${appUrl}/verify-email?token=${token}`,
        html: emailLayout(
          "Verify your email",
          `<p>Welcome to BrellBook. Confirm your email to secure your account.</p>
          <p><a href="${appUrl}/verify-email?token=${token}"
          style="background:#6C2BFF;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">
          Verify email</a></p>
          <p>This link expires in 24 hours.</p>`,
        ),
      });

      emailSent = result?.id !== "dev-no-send";
    } catch (error) {
      console.error(
        "BrellBook verification email failed:",
        error instanceof Error ? error.message : "Unknown email error",
      );
    }

    // If delivery failed, retire this token so the user can request another.
    if (!emailSent) {
      await db.emailVerificationToken.updateMany({
        where: {
          userId: user.id,
          tokenHash: hashToken(token),
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });
    }

    return NextResponse.json(
      { id: user.id, emailSent },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Try logging in or requesting a new verification email.",
        },
        { status: 409 },
      );
    }

    console.error(
      "BrellBook registration failed:",
      error instanceof Error ? error.message : "Unknown registration error",
    );

    return NextResponse.json(
      { error: "Could not create your account right now. Please try again." },
      { status: 500 },
    );
  }
}