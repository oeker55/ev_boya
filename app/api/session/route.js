import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = getSessionFromRequest(request);
  return NextResponse.json({
    authenticated: Boolean(session),
    username: session?.username || null,
  });
}
