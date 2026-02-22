import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSessionApi, signAdminSession, setAdminSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

const changeEmailSchema = z.object({
  type: z.literal("email"),
  newEmail: z.string().email(),
  currentPassword: z.string().min(1)
});

const changePasswordSchema = z.object({
  type: z.literal("password"),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

const bodySchema = z.discriminatedUnion("type", [changeEmailSchema, changePasswordSchema]);

export async function PATCH(request: NextRequest) {
  const session = await requireAdminSessionApi();
  if (!session) {
    return jsonError("No autorizado", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const admin = await prisma.adminUser.findUnique({ where: { id: session.id } });
  if (!admin) {
    return jsonError("Usuario no encontrado", 404);
  }

  const passwordValid = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
  if (!passwordValid) {
    return jsonError("Contraseña actual incorrecta", 401);
  }

  if (parsed.data.type === "email") {
    const { newEmail } = parsed.data;
    const normalized = newEmail.trim().toLowerCase();

    if (normalized === admin.email) {
      return jsonError("El nuevo email es igual al actual", 400);
    }

    const existing = await prisma.adminUser.findUnique({ where: { email: normalized } });
    if (existing) {
      return jsonError("Ese email ya está en uso", 409);
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { email: normalized }
    });

    const newToken = await signAdminSession({ id: admin.id, email: normalized, role: admin.role });
    setAdminSessionCookie(newToken);

    return NextResponse.json({ ok: true });
  }

  if (parsed.data.type === "password") {
    const { newPassword } = parsed.data;
    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: hashed }
    });

    return NextResponse.json({ ok: true });
  }
}
