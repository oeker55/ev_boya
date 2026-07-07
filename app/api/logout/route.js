import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  clearSessionCookie(response);
  return response;
}
