import { NextResponse } from "next/server";
import { authenticateUser, createSessionToken, setSessionCookie } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await authenticateUser(body.username, body.password);

    if (!user) {
      return NextResponse.json({ error: "Giris bilgileri hatali" }, { status: 401 });
    }

    const response = NextResponse.json({
      authenticated: true,
      username: user.username,
    });
    setSessionCookie(response, createSessionToken(user));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Giris yapilamadi" }, { status: 500 });
  }
}
