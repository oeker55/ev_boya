import { NextResponse } from "next/server";
import { createPasswordResetToken } from "../../../../lib/auth";
import { sendPasswordResetEmail } from "../../../../lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const reset = await createPasswordResetToken(body.email);

    if (reset) {
      const configuredUrl = process.env.APP_URL?.replace(/\/$/, "");
      const origin = configuredUrl || request.nextUrl.origin;
      const resetUrl = `${origin}/admin?resetToken=${encodeURIComponent(reset.token)}`;
      await sendPasswordResetEmail({ email: reset.email, resetUrl });
    }

    return NextResponse.json({
      message: "Bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi.",
    });
  } catch (error) {
    console.error("Password reset email could not be sent", error);
    return NextResponse.json({ error: "Sıfırlama e-postası gönderilemedi" }, { status: 502 });
  }
}
