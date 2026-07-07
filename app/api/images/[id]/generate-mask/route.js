import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth";
import { findImage, getUploadStream, updateImage } from "../../../../../lib/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MASK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["masks", "notes"],
  properties: {
    notes: {
      type: "string",
      description: "Short note about what facade/paintable areas were selected.",
    },
    masks: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "points", "holes"],
        properties: {
          label: {
            type: "string",
            minLength: 1,
            maxLength: 80,
          },
          points: {
            type: "array",
            minItems: 3,
            maxItems: 80,
            items: {
              type: "array",
              minItems: 2,
              maxItems: 2,
              items: {
                type: "number",
                minimum: 0,
                maximum: 1,
              },
            },
          },
          holes: {
            type: "array",
            maxItems: 20,
            items: {
              type: "array",
              minItems: 3,
              maxItems: 30,
              items: {
                type: "array",
                minItems: 2,
                maxItems: 2,
                items: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function POST(request, context) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY ortam degiskeni eksik" }, { status: 500 });
  }

  try {
    const { id } = await context.params;
    const image = await findImage(id);
    if (!image) {
      return NextResponse.json({ error: "Resim bulunamadi" }, { status: 404 });
    }

    const imageData = await loadImageDataUrl(image.src);
    const generated = await generateMasksWithOpenAI(image, imageData);
    const masks = generated.masks.map((mask, index) => ({
      id: `ai-${Date.now()}-${index + 1}`,
      label: mask.label || `AI boya alanı ${index + 1}`,
      enabled: true,
      colorSlot: "primary",
      points: mask.points,
      holes: mask.holes || [],
    }));

    const updated = await updateImage(image.id, {
      masks,
      opacity: image.opacity,
    });

    return NextResponse.json({
      image: updated,
      notes: generated.notes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "AI maske olusturulamadi" },
      { status: error.status || 500 }
    );
  }
}

async function generateMasksWithOpenAI(image, imageData) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: buildSystemPrompt(),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Create paint masks for this house photo: ${image.name}. Return only the JSON schema result.`,
            },
            {
              type: "input_image",
              image_url: imageData,
              detail: "original",
            },
          ],
        },
      ],
      reasoning: {
        effort: "medium",
      },
      text: {
        format: {
          type: "json_schema",
          name: "paint_house_masks",
          strict: true,
          schema: MASK_SCHEMA,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload.error?.message || "OpenAI istegi basarisiz"), {
      status: response.status,
    });
  }

  const text = extractOutputText(payload);
  if (!text) {
    throw new Error("OpenAI bos maske yaniti dondu");
  }

  return JSON.parse(text);
}

function buildSystemPrompt() {
  return [
    "You are an expert facade segmentation assistant for a web paint simulator.",
    "Your task is to create editable polygon masks for paintable exterior wall/facade regions in a house photo.",
    "Return normalized coordinates only: x and y numbers between 0 and 1, relative to the full image width and height.",
    "Trace the outer boundary of paintable wall surfaces. Exclude sky, roof tiles, ground, trees, people, cars, windows, doors, glass, railings, trim, gutters, signs, and existing non-wall objects.",
    "Use holes for windows, doors, and other unpaintable cutouts inside a paintable facade polygon.",
    "Prefer one accurate outer polygon with holes when the facade is continuous. Use multiple masks only for clearly separated paintable wall planes.",
    "Keep polygons practical for manual editing: enough points to follow the facade, but avoid excessive tiny zigzags.",
    "If uncertain, choose conservative masks that avoid painting non-wall areas.",
  ].join("\\n");
}

async function loadImageDataUrl(src) {
  let buffer;
  let contentType = "image/jpeg";

  if (src.startsWith("/api/uploads/")) {
    const fileId = src.split("/").pop();
    const upload = await getUploadStream(fileId);
    if (!upload) {
      throw Object.assign(new Error("Upload dosyasi bulunamadi"), { status: 404 });
    }
    buffer = await streamToBuffer(upload.stream);
    contentType = upload.file.contentType || contentType;
  } else if (src.startsWith("/uploads/") || src === "/ev.jpg") {
    const filePath = path.join(process.cwd(), "public", src.replace(/^\/+/, ""));
    buffer = await fs.readFile(filePath);
    contentType = getContentType(filePath);
  } else {
    throw Object.assign(new Error("Desteklenmeyen resim kaynagi"), { status: 400 });
  }

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "image/jpeg";
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;

  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") return content.text;
    }
  }

  return "";
}
