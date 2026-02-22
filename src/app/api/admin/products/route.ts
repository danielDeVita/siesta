import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { adminProductUpsertSchema } from "@/lib/validators";
import { jsonError } from "@/lib/api";

async function buildUniqueSlugFromTitle(title: string): Promise<string> {
  const baseSlug = slugify(title) || "producto";
  let slugCandidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.product.findUnique({
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

export async function GET() {
  const { response } = await requireAdminOrResponse();
  if (response) {
    return response;
  }

  const products = await prisma.product.findMany({
    include: { images: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    products
  });
}

export async function POST(request: NextRequest) {
  const { response, session } = await requireAdminOrResponse();
  if (response || !session) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = adminProductUpsertSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const input = parsed.data;
  const title = input.title.trim();
  const slug = await buildUniqueSlugFromTitle(title);

  try {
    const product = await prisma.product.create({
      data: {
        title,
        slug,
        description: input.description?.trim() || null,
        measurements: input.measurements?.trim() || null,
        priceArs: input.priceArs,
        stock: input.stock,
        status: input.status,
        categoryId: input.categoryId ?? null,
        collectionId: input.collectionId ?? null,
        createdByAdminId: session.id,
        images: {
          createMany: {
            data: input.images.map((image, index) => ({
              url: image.url,
              altText: image.altText || null,
              sortOrder: image.sortOrder ?? index
            }))
          }
        }
      },
      include: {
        images: true
      }
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo crear el producto.", 409);
  }
}
