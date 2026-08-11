import { NextResponse } from "next/server";
import { AuthError, resetPassword } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    await resetPassword(body.token, body.password);
    return NextResponse.json({ message: "Şifreniz güncellendi. Giriş yapabilirsiniz." });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json(
      { error: status === 500 ? "Şifre güncellenemedi" : error.message },
      { status }
    );
  }
}
