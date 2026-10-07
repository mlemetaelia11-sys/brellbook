import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ ok: true, service: "BrellBook", timestamp: new Date().toISOString() });
}
