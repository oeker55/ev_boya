import crypto from "node:crypto";
import { promisify } from "node:util";
import { getDb } from "./mongodb";

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = "paint_houses_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function getAdminUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "evrenk2026";
}

function getSessionSecret() {
  return process.env.SESSION_SECRET || "local-dev-session-secret";
}

export async function ensureAdminUser() {
  const db = await getDb();
  const users = db.collection("users");
  await users.createIndex({ username: 1 }, { unique: true });

  const count = await users.countDocuments({}, { limit: 1 });
  if (count > 0) return;

  await users.insertOne({
    username: getAdminUsername(),
    passwordHash: await hashPassword(getAdminPassword()),
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function authenticateUser(username, password) {
  await ensureAdminUser();

  const db = await getDb();
  const user = await db.collection("users").findOne({ username: String(username || "") });
  if (!user?.passwordHash) return null;

  const valid = await verifyPassword(String(password || ""), user.passwordHash);
  if (!valid) return null;

  return {
    id: String(user._id),
    username: user.username,
    role: user.role || "admin",
  };
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

export function createSessionToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      username: user.username,
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
