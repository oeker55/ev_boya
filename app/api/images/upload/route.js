import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth";
import { handleRouteError, jsonError } from "../../../../lib/http";
import { createUploadedImage } from "../../../../lib/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!requireAdmin(request)) {
    return jsonError("Yetkisiz", 401);
  }

  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return jsonError("Geçersiz yükleme isteği", 400);
    }
    const image = await createUploadedImage(formData.get("image"));
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Resim yüklenemedi", "images:upload");
  }
}
