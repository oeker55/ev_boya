const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");
const { promisify } = require("node:util");
const { GridFSBucket, MongoClient } = require("mongodb");

const scrypt = promisify(crypto.scrypt);
const rootDir = path.resolve(__dirname, "..");

loadEnvFile(path.join(rootDir, ".env.local"));
loadEnvFile(path.join(rootDir, ".env"));

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "painthouses";

if (!uri) {
  console.error("MONGODB_URI gerekli. Once .env.local dosyasini veya ortam degiskenini ayarla.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    await seedAdmin(db);
    await seedImages(db);
    console.log(`MongoDB seed tamamlandi: ${dbName}`);
  } finally {
    await client.close();
  }
}

async function seedAdmin(db) {
  const users = db.collection("users");
  await users.createIndex({ username: 1 }, { unique: true });

  if ((await users.countDocuments({}, { limit: 1 })) > 0) return;

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "evrenk2026";
  await users.insertOne({
    username,
    passwordHash: await hashPassword(password),
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`Admin kullanici olusturuldu: ${username}`);
}

async function seedImages(db) {
  const imagesFile = path.join(rootDir, "data", "images.json");
  if (!fs.existsSync(imagesFile)) {
    console.log("data/images.json bulunamadi, resim seed atlandi.");
    return;
  }

  const store = JSON.parse(fs.readFileSync(imagesFile, "utf8"));
  const images = Array.isArray(store.images) ? store.images : [];
  const bucket = new GridFSBucket(db, { bucketName: "uploads" });
  const collection = db.collection("images");
  await collection.createIndex({ id: 1 }, { unique: true });

  for (const image of images) {
    const existing = await collection.findOne({ id: image.id });
    const next = {
      id: String(image.id),
      name: String(image.name || image.id),
      src: String(image.src || "/ev.jpg"),
      opacity: clamp(Number(image.opacity ?? 0.4), 0.2, 1),
      masks: Array.isArray(image.masks) ? image.masks : [],
      createdAt: image.createdAt ? new Date(image.createdAt) : new Date(),
      updatedAt: new Date(),
    };

    if (next.src.startsWith("/uploads/")) {
      if (existing?.fileId && existing?.src?.startsWith("/api/uploads/")) {
        next.fileId = existing.fileId;
        next.src = existing.src;
      } else {
        const uploadPath = path.join(rootDir, "public", next.src.replace(/^\/+/, ""));
        if (fs.existsSync(uploadPath)) {
          const buffer = fs.readFileSync(uploadPath);
          const fileId = await uploadBuffer(
            bucket,
            buffer,
            path.basename(uploadPath),
            getContentType(uploadPath)
          );
          next.fileId = fileId;
          next.src = `/api/uploads/${fileId.toString()}`;
        }
      }
    }

    await collection.updateOne({ id: next.id }, { $set: next }, { upsert: true });
    console.log(`Resim seed edildi: ${next.id}`);
  }
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(String(password), salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
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

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const raw = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = raw.replace(/^["']|["']$/g, "");
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
