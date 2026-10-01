import crypto from "node:crypto";
import { Readable } from "node:stream";
import { GridFSBucket, ObjectId } from "mongodb";
import { defaultMasks } from "../src/defaultMasks.js";
import { HttpError } from "./http";
import { getDb } from "./mongodb";

const MAX_MASKS = 50;
const MAX_HOLES_PER_MASK = 60;
const MAX_POINTS_PER_POLYGON = 600;
const MAX_OVERLAYS = 20;
const MAX_IMAGE_ID_LENGTH = 120;
const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Yalnızca tarayıcının güvenle <img> olarak gösterebildiği raster biçimlere izin verilir.
// SVG gibi betik içerebilen türler aynı origin'den sunulduğunda XSS'e yol açar.
const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const DEFAULT_IMAGE_ID = "ev";
const DEFAULT_IMAGE = {
  id: DEFAULT_IMAGE_ID,
  name: "ev.jpg",
  src: "/ev.jpg",
  opacity: 0.4,
  masks: defaultMasks,
  overlays: [],
};
const FLAG_SRC = "/bayrak.svg";

let defaultImagePromise;

export async function ensureDefaultImage() {
  const db = await getDb();
  // İndeks ve varsayılan kayıt her istekte değil, sunucu örneği başına bir kez hazırlanır.
  defaultImagePromise ??= (async () => {
    const images = db.collection("images");
    await images.createIndex({ id: 1 }, { unique: true });

    const now = new Date();
    await images.updateOne(
      { id: DEFAULT_IMAGE_ID },
      {
        $setOnInsert: {
          ...DEFAULT_IMAGE,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
  })().catch((error) => {
    defaultImagePromise = undefined;
    throw error;
  });
  await defaultImagePromise;
}

function normalizeImageId(id) {
  const value = String(id || "");
  return value.length <= MAX_IMAGE_ID_LENGTH ? value : "";
}

export async function listImages() {
  await ensureDefaultImage();
  const db = await getDb();
  const docs = await db.collection("images").find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(serializeImage);
}

export async function findImage(id) {
  const imageId = normalizeImageId(id);
  if (!imageId) return null;

  await ensureDefaultImage();
  const db = await getDb();
  const image = await db.collection("images").findOne({ id: imageId });
  return image ? serializeImage(image) : null;
}

export async function updateImage(id, payload) {
  const imageId = normalizeImageId(id);
  if (!imageId || !payload || typeof payload !== "object") return null;

  const db = await getDb();
  const updates = {
    updatedAt: new Date(),
  };

  if (typeof payload.name === "string" && payload.name.trim()) {
    updates.name = payload.name.trim().slice(0, 160);
  }
  if (payload.opacity !== undefined) {
    const opacity = Number(payload.opacity);
    if (Number.isFinite(opacity)) {
      updates.opacity = clamp(opacity, 0.2, 1);
    }
  }
  if (Array.isArray(payload.masks)) {
    updates.masks = sanitizeMasks(payload.masks);
  }
  if (Array.isArray(payload.overlays)) {
    updates.overlays = sanitizeOverlays(payload.overlays);
  }

  const result = await db.collection("images").findOneAndUpdate(
    { id: imageId },
    { $set: updates },
    {
      returnDocument: "after",
    }
  );

  return result ? serializeImage(result) : null;
}

export async function createUploadedImage(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new HttpError("Resim dosyası gerekli", 400);
  }

  const maxUploadBytes = getMaxUploadBytes();
  const tooLargeMessage = `Dosya çok büyük (en fazla ${formatMegabytes(maxUploadBytes)} MB)`;
  if (Number(file.size || 0) > maxUploadBytes) {
    throw new HttpError(tooLargeMessage, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > maxUploadBytes) {
    throw new HttpError(tooLargeMessage, 413);
  }

  // Tarayıcının bildirdiği MIME türüne güvenilmez; dosya imzası (magic bytes) kontrol edilir.
  const contentType = detectImageType(buffer);
  if (!contentType) {
    throw new HttpError("Sadece JPG, PNG, WEBP veya GIF resim yüklenebilir", 415);
  }

  const db = await getDb();
  await ensureDefaultImage();
  const bucket = new GridFSBucket(db, { bucketName: "uploads" });
  const id = crypto.randomBytes(10).toString("hex");
  const originalName =
    typeof file.name === "string" && file.name.trim() ? file.name.trim().slice(0, 160) : "resim";
  const baseName = slugify(originalName.replace(/\.[^.]+$/, "")) || "resim";
  const fileName = `${id}-${baseName}${ALLOWED_IMAGE_TYPES[contentType]}`;
  const fileId = await uploadBuffer(bucket, buffer, fileName, contentType);

  const now = new Date();
  const image = {
    id,
    name: originalName,
    src: `/api/uploads/${fileId.toString()}`,
    fileId,
    opacity: 0.4,
    masks: [],
    overlays: [],
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("images").insertOne(image);
  return serializeImage(image);
}

export async function getUploadStream(fileId) {
  if (typeof fileId !== "string" || !/^[a-f0-9]{24}$/i.test(fileId)) return null;

  const db = await getDb();
  const objectId = new ObjectId(fileId);
  const bucket = new GridFSBucket(db, { bucketName: "uploads" });
  const file = await bucket.find({ _id: objectId }).next();
  if (!file) return null;

  return {
    file,
    stream: bucket.openDownloadStream(objectId),
  };
}

export function serializeImage(image) {
  return {
    id: String(image.id),
    name: String(image.name || image.id),
    src: String(image.src),
    opacity: clamp(finiteOr(image.opacity, 0.4), 0.2, 1),
    masks: sanitizeMasks(image.masks),
    overlays: sanitizeOverlays(image.overlays),
    createdAt: toIso(image.createdAt),
    updatedAt: toIso(image.updatedAt),
  };
}

export function sanitizeMasks(masks) {
  if (!Array.isArray(masks)) return [];

  return masks
    .slice(0, MAX_MASKS)
    .map((mask, index) => {
      if (!mask || typeof mask !== "object") return null;
      const points = sanitizePointGroup(mask.points);
      if (points.length < 3) return null;
      return {
        id: String(mask.id || `paint-${index + 1}`).slice(0, 80),
        label: String(mask.label || `Boya alanı ${index + 1}`).slice(0, 80),
        enabled: mask.enabled !== false,
        colorSlot: normalizeColorSlot(mask.colorSlot),
        points,
        holes: Array.isArray(mask.holes)
          ? mask.holes
              .slice(0, MAX_HOLES_PER_MASK)
              .map(sanitizePointGroup)
              .filter((hole) => hole.length >= 3)
          : [],
      };
    })
    .filter(Boolean);
}

function normalizeColorSlot(slot) {
  return slot === "secondary" ? "secondary" : "primary";
}

export function sanitizeOverlays(overlays) {
  if (!Array.isArray(overlays)) return [];

  return overlays
    .slice(0, MAX_OVERLAYS)
    .map((overlay, index) => {
      if (!overlay || overlay.type !== "flag") return null;
      const width = clamp(finiteOr(overlay.width, 0.1), 0.03, 0.45);
      const height = clamp(finiteOr(overlay.height, width), 0.03, 0.45);
      return {
        id: String(overlay.id || `flag-${index + 1}`).slice(0, 80),
        type: "flag",
        src: FLAG_SRC,
        enabled: overlay.enabled !== false,
        x: clamp(finiteOr(overlay.x, 0.72), 0, 1 - width),
        y: clamp(finiteOr(overlay.y, 0.12), 0, 1 - height),
        width,
        height,
      };
    })
    .filter(Boolean);
}

function finiteOr(value, fallback) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? number : fallback;
}

function sanitizePointGroup(points) {
  if (!Array.isArray(points)) return [];
  return points
    .slice(0, MAX_POINTS_PER_POLYGON)
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const x = Number(point[0]);
      const y = Number(point[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return [clamp(x, 0, 1), clamp(y, 0, 1)];
    })
    .filter(Boolean);
}

function uploadBuffer(bucket, buffer, fileName, contentType) {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(fileName, {
      contentType,
      metadata: {
        uploadedAt: new Date(),
      },
    });

    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    Readable.from(buffer).pipe(uploadStream);
  });
}

export function getMaxUploadBytes() {
  const configured = Number(process.env.MAX_UPLOAD_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_BYTES;
}

function formatMegabytes(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

/** Dosya imzasından resim türünü bulur; desteklenmeyen içerik için null döner. */
export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  const header = buffer.subarray(0, 6).toString("ascii");
  if (header === "GIF87a" || header === "GIF89a") return "image/gif";
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function slugify(value) {
  return String(value)
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function toIso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
