import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE_NAME = "admin_session";

function getPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function getSecret() {
  return process.env.ADMIN_JWT_SECRET || "dev-secret-change-me";
}

function key() {
  return new TextEncoder().encode(getSecret());
}

export async function makeSessionToken(): Promise<string> {
  return await new SignJWT({ ok: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
}

export async function verifySessionToken(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  try {
    await jwtVerify(value, key());
    return true;
  } catch {
    return false;
  }
}

export async function adminLogin(password: string): Promise<{ ok: boolean; token?: string }> {
  if (!getPassword()) return { ok: false };
  if (password !== getPassword()) return { ok: false };
  return { ok: true, token: await makeSessionToken() };
}

