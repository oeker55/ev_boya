import { Readable } from "node:stream";
import { handleRouteError, jsonError } from "../../../../lib/http";
import { getUploadStream } from "../../../../lib/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function GET(_request, context) {
  try {
    const { fileId } = await context.params;
    const upload = await getUploadStream(fileId);

    if (!upload) {
      return jsonError("Dosya bulunamadı", 404);
    }

    // Eski kayıtlarda farklı bir tür saklanmış olabilir; betik çalıştırabilecek
    // içerikler (ör. SVG/HTML) asla kendi türüyle sunulmaz.
    const storedType = String(upload.file.contentType || "").toLowerCase();
    const contentType = SAFE_IMAGE_TYPES.has(storedType) ? storedType : "application/octet-stream";

    return new Response(Readable.toWeb(upload.stream), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(upload.file.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleRouteError(error, "Dosya alınamadı", "uploads:get");
  }
}
