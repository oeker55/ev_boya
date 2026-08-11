import { NextResponse } from "next/server";
import { AuthError, createSessionToken, registerUser, setSessionCookie } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await registerUser(body.email, body.password);
    const response = NextResponse.json({ authenticated: true, email: user.email }, { status: 201 });
    setSessionCookie(response, createSessionToken(user));
    return response;
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json(
      { error: status === 500 ? "Kayıt oluşturulamadı" : error.message },
      { status }
    );
  }
}
