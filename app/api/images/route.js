import { NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/auth";
import { handleRouteError, jsonError } from "../../../lib/http";
import { listImages } from "../../../lib/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!requireAdmin(request)) {
    return jsonError("Yetkisiz", 401);
  }

  try {
    return NextResponse.json({ images: await listImages() });
  } catch (error) {
    return handleRouteError(error, "Resimler alınamadı", "images:list");
  }
}
