import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { adminProductUpsertSchema } from "@/lib/validators";
import { jsonError } from "@/lib/api";
import { prepareNormalizedProductAttributes, serializeAdminProduct, syncProductFieldValues } from "@/lib/admin-products";
import { deleteImageFromCloudinary, resolveCloudinaryPublicId } from "@/lib/cloudinary";

type Params = {
  params: {
    id: string;
  };
};

async function buildUniqueSlugFromTitle(title: string, productId: string): Promise<string> {
  const baseSlug = slugify(title) || "producto";
  let slugCandidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.product.findFirst({
      where: {
        slug: slugCandidate,
        id: {
          not: productId
        }
      },
      select: { id: true }
    });

    if (!existing) {
      return slugCandidate;
    }

    slugCandidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function buildImageIdentity(image: { url: string; publicId?: string | null }) {
  return resolveCloudinaryPublicId({
    publicId: image.publicId,
    url: image.url
  }) ?? image.url;
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

async function deleteCloudinaryImages(images: Array<{ url: string; publicId?: string | null }>) {
  const publicIds = Array.from(
    new Set(
      images
        .map((image) =>
          resolveCloudinaryPublicId({
            publicId: image.publicId,
            url: image.url
          })
        )
        .filter((value): value is string => Boolean(value))
    )
  );

  for (const publicId of publicIds) {
    await deleteImageFromCloudinary(publicId);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireAdminOrResponse();
  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = adminProductUpsertSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const input = parsed.data;
  const title = input.title.trim();
  const slug = await buildUniqueSlugFromTitle(title, params.id);
  const existingProduct = await prisma.product.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      categoryId: true,
      images: {
        select: {
          url: true,
          publicId: true
        }
      }
    }
  });

  if (!existingProduct) {
    return jsonError("Producto no encontrado.", 404);
  }

  const nextImageIdentities = new Set(input.images.map((image) => buildImageIdentity(image)));
  const removedImages = existingProduct.images.filter((image) => !nextImageIdentities.has(buildImageIdentity(image)));

  let normalizedAttributes;

  try {
    normalizedAttributes = await prepareNormalizedProductAttributes(input.categoryId ?? null, input.attributes);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No se pudieron validar los atributos.", 400);
  }

  let product;

  try {
    product = await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({
        where: { productId: params.id }
      });

      const updatedProduct = await tx.product.update({
        where: { id: params.id },
        data: {
          title,
          slug,
          description: input.description?.trim() || null,
          priceArs: input.priceArs,
          stock: input.stock,
          status: input.status,
          categoryId: input.categoryId ?? null,
          collectionId: input.collectionId ?? null,
          images: {
            createMany: {
              data: buildProductImageCreateData(input.images)
            }
          }
        },
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

      await syncProductFieldValues(tx, {
        productId: updatedProduct.id,
        previousCategoryId: existingProduct.categoryId,
        nextCategoryId: input.categoryId ?? null,
        normalizedAttributes
      });

      return tx.product.findUniqueOrThrow({
        where: { id: updatedProduct.id },
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

  } catch (error) {
    console.error(error);
    return jsonError("No se pudo actualizar el producto.", 409);
  }

  try {
    await deleteCloudinaryImages(removedImages);
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      product: serializeAdminProduct(product),
      warning: "El producto se actualizó, pero no se pudieron borrar todas las imágenes remotas."
    });
  }

  return NextResponse.json({ product: serializeAdminProduct(product) });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { response } = await requireAdminOrResponse();
  if (response) {
    return response;
  }

  let existingProduct;

  try {
    existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        images: {
          select: {
            url: true,
            publicId: true
          }
        }
      }
    });

    if (!existingProduct) {
      return jsonError("Producto no encontrado.", 404);
    }

    await prisma.product.delete({
      where: { id: params.id }
    });

  } catch (error) {
    console.error(error);
    return jsonError("No se pudo eliminar el producto.", 400);
  }

  try {
    await deleteCloudinaryImages(existingProduct.images);
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      ok: true,
      warning: "El producto se eliminó, pero quedaron imágenes remotas sin borrar."
    });
  }

  return NextResponse.json({ ok: true });
}
