import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(120),
  type: z.string().optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional()
});

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid business details." }, { status: 400 });
  const base = slugify(parsed.data.name) || "business";
  let slug = base;
  let n = 1;
  while (await db.business.findUnique({ where: { slug } })) slug = `${base}-${++n}`;
  const business = await db.business.create({
    data: {
      ...parsed.data, slug,
      memberships: { create: { userId: session.user.id, role: "OWNER" } },
      subscription: { create: { plan: "FREE", status: "FREE" } }
    }
  });
  return NextResponse.json({ business }, { status: 201 });
}
