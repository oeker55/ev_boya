import { NextResponse } from "next/server";
import { createPasswordResetToken, normalizeEmail } from "../../../../lib/auth";
import { sendPasswordResetEmail } from "../../../../lib/email";
import { getClientIp, handleRouteError, readJsonBody } from "../../../../lib/http";
import { enforceRateLimits } from "../../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60 * 60 * 1000;

/**
 * Sıfırlama bağlantısının kökü. Production'da Host başlığına güvenilmez; aksi halde
 * saldırgan sahte Host ile kendi alan adına işaret eden bir bağlantı ürettirebilir.
 */
function getAppOrigin(request) {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.NODE_ENV !== "production") return request.nextUrl.origin;
  throw new Error("APP_URL environment variable is required in production");
}

export async function POST(request) {
  try {
    const body = await readJsonBody(request);
    const limited = await enforceRateLimits([
      { key: `reset-request:ip:${getClientIp(request)}`, limit: 10, windowMs: WINDOW_MS },
      { key: `reset-request:email:${normalizeEmail(body.email)}`, limit: 3, windowMs: WINDOW_MS },
    ]);
    if (limited) return limited;

    const origin = getAppOrigin(request);
    const reset = await createPasswordResetToken(body.email);

    if (reset) {
      const resetUrl = `${origin}/admin?resetToken=${encodeURIComponent(reset.token)}`;
      await sendPasswordResetEmail({ email: reset.email, resetUrl });
    }

    return NextResponse.json({
      message: "Bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi.",
    });
  } catch (error) {
    return handleRouteError(
      Object.assign(error, { status: error?.status || 502 }),
      "Sıfırlama e-postası gönderilemedi",
      "password-reset/request"
    );
  }
}
