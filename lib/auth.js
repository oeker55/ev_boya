import crypto from "node:crypto";
import { promisify } from "node:util";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = "paint_houses_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

function getSessionSecret() {
  return process.env.SESSION_SECRET || "local-dev-session-secret";
}

export function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function validatePassword(password) {
  return String(password || "").length >= MIN_PASSWORD_LENGTH;
}

async function ensureAuthIndexes() {
  const db = await getDb();
  await Promise.all([
    db.collection("users").createIndex(
      { email: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } },
      }
    ),
    db.collection("passwordResetTokens").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("passwordResetTokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  return db;
}

export async function registerUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new AuthError("Geçerli bir e-posta adresi girin", 400);
  }
  if (!validatePassword(password)) {
    throw new AuthError(`Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı`, 400);
  }

  const db = await ensureAuthIndexes();
  try {
    const result = await db.collection("users").insertOne({
      email: normalizedEmail,
      // Eski kurulumlarda kalan benzersiz username indeksleriyle uyumluluğu korur.
      username: normalizedEmail,
      passwordHash: await hashPassword(password),
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: String(result.insertedId), email: normalizedEmail, role: "admin" };
  } catch (error) {
    if (error?.code === 11000) {
      throw new AuthError("Bu e-posta adresi zaten kayıtlı", 409);
    }
    throw error;
  }
}

export async function authenticateUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail) || !password) return null;

  const db = await ensureAuthIndexes();
  const user = await db.collection("users").findOne({ email: normalizedEmail });
  if (!user?.passwordHash) return null;

  const valid = await verifyPassword(String(password), user.passwordHash);
  if (!valid) return null;

  return {
    id: String(user._id),
    email: user.email,
    role: user.role || "admin",
  };
}

export async function createPasswordResetToken(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) return null;

  const db = await ensureAuthIndexes();
  const user = await db.collection("users").findOne({ email: normalizedEmail });
  if (!user) return null;

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const now = new Date();

  await db.collection("passwordResetTokens").deleteMany({ userId: user._id });
  await db.collection("passwordResetTokens").insertOne({
    userId: user._id,
    email: normalizedEmail,
    tokenHash,
    createdAt: now,
    expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
    usedAt: null,
  });

  return { token, email: normalizedEmail };
}

export async function resetPassword(token, password) {
  if (!token || !validatePassword(password)) {
    throw new AuthError(
      !validatePassword(password)
        ? `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı`
        : "Sıfırlama bağlantısı geçersiz",
      400
    );
  }

  const db = await ensureAuthIndexes();
  const now = new Date();
  const resetRecord = await db.collection("passwordResetTokens").findOne({
    tokenHash: hashResetToken(token),
    usedAt: null,
    expiresAt: { $gt: now },
  });

  if (!resetRecord || !(resetRecord.userId instanceof ObjectId)) {
    throw new AuthError("Sıfırlama bağlantısı geçersiz veya süresi dolmuş", 400);
  }

  const claim = await db
    .collection("passwordResetTokens")
    .updateOne({ _id: resetRecord._id, usedAt: null }, { $set: { usedAt: now } });
  if (claim.modifiedCount !== 1) {
    throw new AuthError("Sıfırlama bağlantısı daha önce kullanılmış", 400);
  }

  const update = await db.collection("users").updateOne(
    { _id: resetRecord.userId },
    {
      $set: {
        passwordHash: await hashPassword(password),
        updatedAt: now,
      },
    }
  );
  if (update.matchedCount !== 1) {
    throw new AuthError("Kullanıcı bulunamadı", 404);
  }
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(String(password), salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, passwordHash) {
  const [method, salt, key] = String(passwordHash).split(":");
  if (method !== "scrypt" || !salt || !key) return false;

  const derivedKey = await scrypt(String(password), salt, 64);
  const storedKey = Buffer.from(key, "hex");
  return storedKey.length === derivedKey.length && crypto.timingSafeEqual(storedKey, derivedKey);
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function createSessionToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + SESSION_TTL_MS,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function getSessionFromRequest(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export function verifySessionToken(token) {
  if (!token) return null;
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (Number(session.exp) <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function setSessionCookie(response, token) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie(response) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function requireAdmin(request) {
  const session = getSessionFromRequest(request);
  return session?.role === "admin" ? session : null;
}

function sign(payload) {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export class AuthError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
