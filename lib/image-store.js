import crypto from "node:crypto";
import { Readable } from "node:stream";
import { GridFSBucket, ObjectId } from "mongodb";
import { defaultMasks } from "../src/defaultMasks.js";
import { getDb } from "./mongodb";

const DEFAULT_IMAGE_ID = "ev";
const DEFAULT_IMAGE = {
  id: DEFAULT_IMAGE_ID,
  name: "ev.jpg",
  src: "/ev.jpg",
  opacity: 0.4,
  masks: defaultMasks,
};

export async function ensureDefaultImage() {
  const db = await getDb();
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
}

export async function listImages() {
  await ensureDefaultImage();
  const db = await getDb();
  const docs = await db.collection("images").find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(serializeImage);
}

export async function findImage(id) {
  await ensureDefaultImage();
  const db = await getDb();
  const image = await db.collection("images").findOne({ id: String(id || "") });
  return image ? serializeImage(image) : null;
}

export async function updateImage(id, payload) {
  const db = await getDb();
  const updates = {
    updatedAt: new Date(),
  };

  if (typeof payload.name === "string" && payload.name.trim()) {
    updates.name = payload.name.trim().slice(0, 160);
  }
  if (payload.opacity !== undefined) {
    updates.opacity = clamp(Number(payload.opacity), 0.2, 1);
  }
  if (Array.isArray(payload.masks)) {
    updates.masks = sanitizeMasks(payload.masks);
  }

  const result = await db.collection("images").findOneAndUpdate(
    { id: String(id || "") },
    { $set: updates },
    {
      returnDocument: "after",
    }
  );

  return result ? serializeImage(result) : null;
}

export async function createUploadedImage(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw Object.assign(new Error("Resim dosyasi gerekli"), { status: 400 });
  }
  if (!String(file.type || "").startsWith("image/")) {
    throw Object.assign(new Error("Sadece resim yuklenebilir"), { status: 400 });
  }

  const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
  if (Number(file.size || 0) > maxUploadBytes) {
    throw Object.assign(new Error("Dosya cok buyuk"), { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > maxUploadBytes) {
    throw Object.assign(new Error("Dosya cok buyuk"), { status: 413 });
  }

  const db = await getDb();
  const bucket = new GridFSBucket(db, { bucketName: "uploads" });
  const id = crypto.randomBytes(10).toString("hex");
  const originalName = typeof file.name === "string" ? file.name : "resim";
  const extension = getImageExtension(file.type, originalName);
  const baseName = slugify(originalName.replace(/\.[^.]+$/, "")) || "resim";
  const fileName = `${id}-${baseName}${extension}`;
  const fileId = await uploadBuffer(bucket, buffer, fileName, file.type);

  const now = new Date();
  const image = {
    id,
    name: originalName,
    src: `/api/uploads/${fileId.toString()}`,
    fileId,
    opacity: 0.4,
    masks: [],
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("images").insertOne(image);
  return serializeImage(image);
}

export async function getUploadStream(fileId) {
  if (!ObjectId.isValid(fileId)) return null;

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
    opacity: clamp(Number(image.opacity ?? 0.4), 0.2, 1),
    masks: sanitizeMasks(image.masks),
    createdAt: toIso(image.createdAt),
    updatedAt: toIso(image.updatedAt),
  };
}

export function sanitizeMasks(masks) {
  if (!Array.isArray(masks)) return [];

  return masks
    .map((mask, index) => {
      const points = sanitizePointGroup(mask.points);
      if (points.length < 3) return null;
      return {
        id: String(mask.id || `paint-${index + 1}`),
        label: String(mask.label || `Boya alani ${index + 1}`).slice(0, 80),
        enabled: mask.enabled ?? true,
        colorSlot: normalizeColorSlot(mask.colorSlot),
        points,
        holes: Array.isArray(mask.holes)
          ? mask.holes.map(sanitizePointGroup).filter((hole) => hole.length >= 3)
          : [],
      };
    })
    .filter(Boolean);
}

function normalizeColorSlot(slot) {
  return slot === "secondary" ? "secondary" : "primary";
}

function sanitizePointGroup(points) {
  if (!Array.isArray(points)) return [];
  return points
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

function getImageExtension(mimeType, fileName) {
  const known = {
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  if (known[mimeType]) return known[mimeType];
  const ext = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  return [".gif", ".jpg", ".jpeg", ".png", ".webp", ".jfif"].includes(ext) ? ext : ".jpg";
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
