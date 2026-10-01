import { NextResponse } from "next/server";

/** İstek gövdesini her zaman düz bir nesne olarak döndürür; geçersiz JSON boş nesne olur. */
export async function readJsonBody(request) {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body : {};
}

export function jsonError(message, status = 500, headers = undefined) {
  return NextResponse.json({ error: message }, { status, headers });
}

/**
 * Beklenmeyen hataları sunucu loguna yazar, istemciye yalnızca güvenli mesajı döndürür.
 * `error.expose === true` olan hatalar (doğrulama vb.) kendi mesajıyla iletilir.
 */
export function handleRouteError(error, fallbackMessage, context) {
  const rawStatus = Number(error?.status);
  const status = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
  if (status >= 500) {
    console.error(`[${context}]`, error);
  }
  return jsonError(error?.expose ? error.message : fallbackMessage, status);
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.expose = true;
  }
}
