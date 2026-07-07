import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getUploadStream } from "../../../../lib/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const { fileId } = await context.params;
  const upload = await getUploadStream(fileId);

  if (!upload) {
    return NextResponse.json({ error: "Dosya bulunamadi" }, { status: 404 });
  }

  return new Response(Readable.toWeb(upload.stream), {
    headers: {
      "Content-Type": upload.file.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
