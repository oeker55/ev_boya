import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth";
import { createUploadedImage } from "../../../../lib/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const image = await createUploadedImage(formData.get("image"));
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Yuklenemedi" },
      { status: error.status || 500 }
    );
  }
}
