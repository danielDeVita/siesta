import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { adminCategorySchema } from "@/lib/validators";
import { jsonError } from "@/lib/api";

async function buildUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name) || "categoria";
  let slugCandidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.category.findUnique({
      where: { slug: slugCandidate },
      select: { id: true }
    });

    if (!existing) {
      return slugCandidate;
    }

    slugCandidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminOrResponse();
  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = adminCategorySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const name = parsed.data.name.trim();
  const slug = await buildUniqueSlug(name);

  try {
    const category = await prisma.category.create({
      data: { name, slug }
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo crear la categoría.", 409);
  }
}
