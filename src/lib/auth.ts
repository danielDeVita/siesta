import "server-only";

import type { AdminRole } from "@prisma/client";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_SESSION_COOKIE = "siesta_admin_session";

export type AdminSessionPayload = {
  id: string;
  email: string;
  role: AdminRole;
};

function getAuthSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required.");
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminSession(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getAuthSecret());
}

export async function verifyAdminSession(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (!payload.id || !payload.email || payload.role !== "ADMIN") {
      return null;
    }
    return {
      id: String(payload.id),
      email: String(payload.email),
      role: "ADMIN"
    };
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(token: string): void {
  cookies().set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export function clearAdminSessionCookie(): void {
  cookies().set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });
}

export async function getAdminSessionFromCookies(): Promise<AdminSessionPayload | null> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return verifyAdminSession(token);
}

export async function requireAdminSessionApi(): Promise<AdminSessionPayload | null> {
  const session = await getAdminSessionFromCookies();
  if (!session || session.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function requireAdminPageSession(): Promise<AdminSessionPayload> {
  const session = await getAdminSessionFromCookies();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin/login");
  }
  return session;
}
