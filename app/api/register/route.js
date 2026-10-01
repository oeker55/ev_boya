import { NextResponse } from "next/server";
import { createSessionToken, registerUser, setSessionCookie } from "../../../lib/auth";
import { getClientIp, handleRouteError, readJsonBody } from "../../../lib/http";
import { enforceRateLimits } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const limited = await enforceRateLimits([
      { key: `register:ip:${getClientIp(request)}`, limit: 10, windowMs: 60 * 60 * 1000 },
    ]);
    if (limited) return limited;

    const body = await readJsonBody(request);
    const user = await registerUser(body.email, body.password);
    const response = NextResponse.json({ authenticated: true, email: user.email }, { status: 201 });
    setSessionCookie(response, createSessionToken(user));
    return response;
  } catch (error) {
    return handleRouteError(error, "Kayıt oluşturulamadı", "register");
  }
}
