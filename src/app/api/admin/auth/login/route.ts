import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { setAdminSessionCookie, signAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminLoginSchema } from "@/lib/validators";
import { jsonError } from "@/lib/api";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return jsonError(`Demasiados intentos. Intentá de nuevo en ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minutos.`, 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Credenciales inválidas", 400);
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  const admin = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail }
  });

  if (!admin) {
    return jsonError("Email o contraseña incorrectos", 401);
  }

  const isValidPassword = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!isValidPassword) {
    return jsonError("Email o contraseña incorrectos", 401);
  }

  const token = await signAdminSession({
    id: admin.id,
    email: admin.email,
    role: admin.role
  });

  setAdminSessionCookie(token);

  return NextResponse.json({
    ok: true,
    admin: {
      id: admin.id,
      email: admin.email,
      role: admin.role
    }
  });
}
