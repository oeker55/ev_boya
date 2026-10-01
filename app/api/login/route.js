import { NextResponse } from "next/server";
import {
  authenticateUser,
  createSessionToken,
  normalizeEmail,
  setSessionCookie,
} from "../../../lib/auth";
import { getClientIp, handleRouteError, jsonError, readJsonBody } from "../../../lib/http";
import { enforceRateLimits } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request) {
  try {
    const body = await readJsonBody(request);
    const limited = await enforceRateLimits([
      { key: `login:ip:${getClientIp(request)}`, limit: 30, windowMs: WINDOW_MS },
      { key: `login:email:${normalizeEmail(body.email)}`, limit: 10, windowMs: WINDOW_MS },
    ]);
    if (limited) return limited;

    const user = await authenticateUser(body.email, body.password);
    if (!user) {
      return jsonError("E-posta veya şifre hatalı", 401);
    }

    const response = NextResponse.json({
      authenticated: true,
      email: user.email,
    });
    setSessionCookie(response, createSessionToken(user));
    return response;
  } catch (error) {
    return handleRouteError(error, "Giriş yapılamadı", "login");
  }
}
