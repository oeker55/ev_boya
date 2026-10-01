import { NextResponse } from "next/server";
import { resetPassword } from "../../../../lib/auth";
import { getClientIp, handleRouteError, readJsonBody } from "../../../../lib/http";
import { enforceRateLimits } from "../../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const limited = await enforceRateLimits([
      { key: `reset-confirm:ip:${getClientIp(request)}`, limit: 20, windowMs: 15 * 60 * 1000 },
    ]);
    if (limited) return limited;

    const body = await readJsonBody(request);
    await resetPassword(body.token, body.password);
    return NextResponse.json({ message: "Şifreniz güncellendi. Giriş yapabilirsiniz." });
  } catch (error) {
    return handleRouteError(error, "Şifre güncellenemedi", "password-reset/confirm");
  }
}
