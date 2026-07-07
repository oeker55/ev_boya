const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { Readable } = require("node:stream");

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");
const DATA_DIR = path.join(ROOT_DIR, "data");
const STORE_FILE = path.join(DATA_DIR, "images.json");
const DEFAULT_MASKS_FILE = path.join(ROOT_DIR, "src", "defaultMasks.js");
const DEFAULT_IMAGE_ID = "ev";
const MAX_UPLOAD_BYTES = 18 * 1024 * 1024;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "evrenk2026";
const SESSION_SECRET = process.env.SESSION_SECRET || "local-dev-session-secret";
const SESSION_COOKIE = "ev_renk_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  ensureStore();

  const args = parseArgs(process.argv.slice(2));
  const port = Number(args.port || process.env.PORT || 5173);
  const host = args.host || process.env.HOST || "0.0.0.0";
  const useVite = Boolean(args.dev) || !fs.existsSync(path.join(ROOT_DIR, "dist", "index.html"));
  const vite = useVite ? await createViteMiddleware(host) : null;

  const server = http.createServer((req, res) => {
    handleRequest(req, res, vite).catch((error) => {
      console.error(error);
      sendJson(res, 500, { error: "Sunucu hatasi" });
    });
  });

  server.listen(port, host, () => {
    const mode = useVite ? "dev" : "dist";
    console.log(`Ayvatullu Ev Boya ${mode} server: http://localhost:${port}`);
    console.log(`Admin: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  });
}

async function createViteMiddleware(host) {
  const { createServer } = await import("vite");
  return createServer({
    appType: "spa",
    root: ROOT_DIR,
    server: {
      host,
      middlewareMode: true,
    },
  });
}

async function handleRequest(req, res, vite) {
  const requestUrl = new URL(req.url, "http://localhost");

  if (requestUrl.pathname.startsWith("/api/")) {
    await handleApi(req, res, requestUrl);
    return;
  }

  if (servePublicFile(req, res, requestUrl.pathname)) {
    return;
  }

  if (vite) {
    vite.middlewares(req, res, () => {
      sendJson(res, 404, { error: "Bulunamadi" });
    });
    return;
  }

  serveDistFile(req, res, requestUrl.pathname);
}

async function handleApi(req, res, requestUrl) {
  const pathname = requestUrl.pathname;

  if (req.method === "GET" && pathname === "/api/session") {
    sendJson(res, 200, { authenticated: isAuthenticated(req), username: ADMIN_USERNAME });
    return;
  }

  if (req.method === "POST" && pathname === "/api/login") {
    const body = await readJsonBody(req);
    if (body.username === ADMIN_USERNAME && body.password === ADMIN_PASSWORD) {
      setSessionCookie(res, createSessionToken());
      sendJson(res, 200, { authenticated: true, username: ADMIN_USERNAME });
      return;
    }
    sendJson(res, 401, { error: "Giris bilgileri hatali" });
    return;
  }

  if (req.method === "POST" && pathname === "/api/logout") {
    clearSessionCookie(res);
    sendJson(res, 200, { authenticated: false });
    return;
  }

  if (req.method === "POST" && pathname === "/api/images/upload") {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    await handleUpload(req, res);
    return;
  }

  if (req.method === "GET" && pathname === "/api/images") {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    sendJson(res, 200, { images: readStore().images });
    return;
  }

  const imageMatch = pathname.match(/^\/api\/images\/([^/]+)$/);
  if (imageMatch && req.method === "GET") {
    const image = findImage(decodeURIComponent(imageMatch[1]));
    if (!image) {
      sendJson(res, 404, { error: "Resim bulunamadi" });
      return;
    }
    sendJson(res, 200, { image });
    return;
  }

  if (imageMatch && req.method === "PUT") {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    const id = decodeURIComponent(imageMatch[1]);
    const payload = await readJsonBody(req, 3 * 1024 * 1024);
    const updated = updateImage(id, payload);
    if (!updated) {
      sendJson(res, 404, { error: "Resim bulunamadi" });
      return;
    }
    sendJson(res, 200, { image: updated });
    return;
  }

  sendJson(res, 404, { error: "Bulunamadi" });
}

async function handleUpload(req, res) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    sendJson(res, 400, { error: "Gecersiz upload istegi" });
    return;
  }

  const formData = await readMultipartForm(req);
  const file = formData.get("image");
  if (!file || typeof file.arrayBuffer !== "function") {
    sendJson(res, 400, { error: "Resim dosyasi gerekli" });
    return;
  }
  if (!String(file.type || "").startsWith("image/")) {
    sendJson(res, 400, { error: "Sadece resim yuklenebilir" });
    return;
  }
  if (Number(file.size || 0) > MAX_UPLOAD_BYTES) {
    sendJson(res, 413, { error: "Dosya cok buyuk" });
    return;
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const id = crypto.randomBytes(10).toString("hex");
  const originalName = typeof file.name === "string" ? file.name : "resim";
  const extension = getImageExtension(file.type, originalName);
  const baseName = slugify(path.basename(originalName, path.extname(originalName))) || "resim";
  const fileName = `${id}-${baseName}${extension}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const now = new Date().toISOString();
  const image = {
    id,
    name: originalName,
    src: `/uploads/${fileName}`,
    opacity: 0.4,
    masks: [],
    createdAt: now,
    updatedAt: now,
  };

  const store = readStore();
  store.images.unshift(image);
  writeStore(store);
  sendJson(res, 201, { image });
}

function updateImage(id, payload) {
  const store = readStore();
  const image = store.images.find((item) => item.id === id);
  if (!image) return null;

  if (typeof payload.name === "string" && payload.name.trim()) {
    image.name = payload.name.trim().slice(0, 160);
  }
  if (payload.opacity !== undefined) {
    image.opacity = clamp(Number(payload.opacity), 0.2, 1);
  }
  if (Array.isArray(payload.masks)) {
    image.masks = sanitizeMasks(payload.masks);
  }
  image.updatedAt = new Date().toISOString();
  writeStore(store);
  return image;
}

function findImage(id) {
  return readStore().images.find((image) => image.id === id) || null;
}

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    writeStore(createDefaultStore());
    return;
  }

  const store = readStore();
  if (!store.images.some((image) => image.id === DEFAULT_IMAGE_ID)) {
    store.images.push(createDefaultImage());
    writeStore(store);
  }
}

function createDefaultStore() {
  return { images: [createDefaultImage()] };
}

function createDefaultImage() {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_IMAGE_ID,
    name: "ev.jpg",
    src: "/ev.jpg",
    opacity: 0.4,
    masks: loadDefaultMasks(),
    createdAt: now,
    updatedAt: now,
  };
}

function readStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    const images = Array.isArray(parsed.images)
      ? parsed.images.map(normalizeImage).filter(Boolean)
      : [];
    return { images };
  } catch {
    const fallback = createDefaultStore();
    writeStore(fallback);
    return fallback;
  }
}

function writeStore(store) {
  const normalized = {
    images: Array.isArray(store.images) ? store.images.map(normalizeImage).filter(Boolean) : [],
  };
  const tempFile = `${STORE_FILE}.tmp`;
  fs.writeFileSync(tempFile, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  fs.renameSync(tempFile, STORE_FILE);
}

function normalizeImage(image) {
  if (!image || typeof image !== "object") return null;
  const id = String(image.id || "").trim();
  const src = String(image.src || "").trim();
  if (!id || !src || !src.startsWith("/")) return null;
  const now = new Date().toISOString();

  return {
    id,
    name: String(image.name || id).slice(0, 160),
    src,
    opacity: clamp(Number(image.opacity ?? 0.4), 0.2, 1),
    masks: sanitizeMasks(image.masks),
    createdAt: image.createdAt || now,
    updatedAt: image.updatedAt || now,
  };
}

function sanitizeMasks(masks) {
  if (!Array.isArray(masks)) return [];

  return masks
    .map((mask, index) => {
      const points = sanitizePointGroup(mask.points);
      if (points.length < 3) return null;
      return {
        id: String(mask.id || `paint-${index + 1}`),
        label: String(mask.label || `Boya alani ${index + 1}`).slice(0, 80),
        enabled: mask.enabled ?? true,
        points,
        holes: Array.isArray(mask.holes)
          ? mask.holes.map(sanitizePointGroup).filter((hole) => hole.length >= 3)
          : [],
      };
    })
    .filter(Boolean);
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

function loadDefaultMasks() {
  try {
    const source = fs.readFileSync(DEFAULT_MASKS_FILE, "utf8");
    const start = source.indexOf("[");
    const end = source.lastIndexOf("];");
    if (start === -1 || end === -1) return [];
    const masks = Function(`"use strict"; return (${source.slice(start, end + 1)});`)();
    return sanitizeMasks(masks);
  } catch {
    return [];
  }
}

function requireAdmin(req, res) {
  if (!isAuthenticated(req)) {
    sendJson(res, 401, { error: "Yetkisiz" });
  }
}

function isAuthenticated(req) {
  const token = parseCookies(req.headers.cookie || "")[SESSION_COOKIE];
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  if (!safeEqual(signature, expected)) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.user === ADMIN_USERNAME && Number(session.exp) > Date.now();
  } catch {
    return false;
  }
}

function createSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({ user: ADMIN_USERNAME, exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function sign(payload) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000
    )}`
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function parseCookies(cookieHeader) {
  return cookieHeader.split(";").reduce((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

async function readJsonBody(req, limit = 256 * 1024) {
  const body = await readRequestBuffer(req, limit);
  if (!body.length) return {};
  return JSON.parse(body.toString("utf8"));
}

async function readMultipartForm(req) {
  const request = new Request("http://localhost/upload", {
    method: req.method,
    headers: req.headers,
    body: Readable.toWeb(req),
    duplex: "half",
  });
  return request.formData();
}

function readRequestBuffer(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function servePublicFile(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const filePath = resolveStaticPath(PUBLIC_DIR, pathname);
  if (!filePath) return false;
  sendFile(req, res, filePath);
  return true;
}

function serveDistFile(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Metot desteklenmiyor" });
    return;
  }

  const distDir = path.join(ROOT_DIR, "dist");
  const staticFile = resolveStaticPath(distDir, pathname);
  sendFile(req, res, staticFile || path.join(distDir, "index.html"));
}

function resolveStaticPath(root, pathname) {
  const decoded = decodeURIComponent(pathname.split("?")[0]);
  const candidate = path.resolve(root, decoded.replace(/^\/+/, ""));
  if (!candidate.startsWith(path.resolve(root))) return null;
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) return null;
  return candidate;
}

function sendFile(req, res, filePath) {
  const type = CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

function sendJson(res, status, payload) {
  if (res.writableEnded) return;
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function getImageExtension(mimeType, fileName) {
  const known = {
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  if (known[mimeType]) return known[mimeType];
  const ext = path.extname(fileName).toLowerCase();
  return [".gif", ".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
}

function parseArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dev") {
      result.dev = true;
    } else if (arg === "--port") {
      result.port = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--port=")) {
      result.port = arg.slice("--port=".length);
    } else if (arg === "--host") {
      result.host = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--host=")) {
      result.host = arg.slice("--host=".length);
    }
  }
  return result;
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
