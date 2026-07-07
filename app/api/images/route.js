import { NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/auth";
import { listImages } from "../../../lib/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    return NextResponse.json({ images: await listImages() });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Resimler alinamadi" }, { status: 500 });
  }
}
