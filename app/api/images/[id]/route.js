import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth";
import { handleRouteError, jsonError, readJsonBody } from "../../../../lib/http";
import { findImage, updateImage } from "../../../../lib/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    const { id } = await context.params;
    const image = await findImage(id);

    if (!image) {
      return jsonError("Resim bulunamadı", 404);
    }

    return NextResponse.json({ image });
  } catch (error) {
    return handleRouteError(error, "Resim alınamadı", "images:get");
  }
}

export async function PUT(request, context) {
  if (!requireAdmin(request)) {
    return jsonError("Yetkisiz", 401);
  }

  try {
    const { id } = await context.params;
    const payload = await readJsonBody(request);
    const image = await updateImage(id, payload);

    if (!image) {
      return jsonError("Resim bulunamadı", 404);
    }

    return NextResponse.json({ image });
  } catch (error) {
    return handleRouteError(error, "Resim kaydedilemedi", "images:update");
  }
}
