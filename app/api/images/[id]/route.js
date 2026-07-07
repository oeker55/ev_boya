import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth";
import { findImage, updateImage } from "../../../../lib/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    const { id } = await context.params;
    const image = await findImage(id);

    if (!image) {
      return NextResponse.json({ error: "Resim bulunamadi" }, { status: 404 });
    }

    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Resim alinamadi" }, { status: 500 });
  }
}

export async function PUT(request, context) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));
    const image = await updateImage(id, payload);

    if (!image) {
      return NextResponse.json({ error: "Resim bulunamadi" }, { status: 404 });
    }

    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Resim kaydedilemedi" }, { status: 500 });
  }
}
