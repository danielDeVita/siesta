import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { adminProductUpsertSchema } from "@/lib/validators";
import { jsonError } from "@/lib/api";
import { prepareNormalizedProductAttributes, serializeAdminProduct } from "@/lib/admin-products";
import { backfillLegacyMeasurements } from "@/lib/legacy-measurements-backfill";
import { resolveCloudinaryPublicId } from "@/lib/cloudinary";

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

function buildProductImageCreateData(
  images: Array<{ url: string; publicId?: string | null; altText?: string; sortOrder?: number }>
) {
  return images.map((image, index) => ({
    url: image.url,
    publicId: resolveCloudinaryPublicId({
      publicId: image.publicId,
      url: image.url
    }),
    altText: image.altText || null,
    sortOrder: image.sortOrder ?? index
  }));
}

export async function GET() {
  const { response } = await requireAdminOrResponse();
  if (response) {
    return response;
  }

  await backfillLegacyMeasurements(prisma);

  const products = await prisma.product.findMany({
    include: {
      images: true,
      collection: true,
      category: {
        include: {
          fieldDefinitions: {
            orderBy: { sortOrder: "asc" }
          }
        }
      },
      fieldValues: true
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    products: products.map(serializeAdminProduct)
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
  let normalizedAttributes;

  try {
    normalizedAttributes = await prepareNormalizedProductAttributes(input.categoryId ?? null, input.attributes);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No se pudieron validar los atributos.", 400);
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          title,
          slug,
          description: input.description?.trim() || null,
          priceArs: input.priceArs,
          stock: input.stock,
          status: input.status,
          categoryId: input.categoryId ?? null,
          collectionId: input.collectionId ?? null,
          createdByAdminId: session.id,
          images: {
            createMany: {
              data: buildProductImageCreateData(input.images)
            }
          }
        }
      });

      for (const attribute of normalizedAttributes) {
        if (attribute.value === null || (typeof attribute.value === "string" && attribute.value.trim().length === 0)) {
          continue;
        }

        await tx.productFieldValue.create({
          data: {
            productId: created.id,
            categoryFieldDefinitionId: attribute.fieldDefinitionId,
            valueJson: attribute.value
          }
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          images: true,
          collection: true,
          category: {
            include: {
              fieldDefinitions: {
                orderBy: { sortOrder: "asc" }
              }
            }
          },
          fieldValues: true
        }
      });
    });

    return NextResponse.json({ product: serializeAdminProduct(product) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo crear el producto.", 409);
  }
}
