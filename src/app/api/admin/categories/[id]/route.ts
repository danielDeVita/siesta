import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { adminCategorySchema } from "@/lib/validators";
import { slugify } from "@/lib/slug";
import {
  normalizeCategoryFieldDefinitions,
  serializeAdminCategory,
  validateCategoryFieldDefinitions
} from "@/lib/category-fields";

type Params = {
  params: {
    id: string;
  };
};

async function buildUniqueSlug(name: string, categoryId: string): Promise<string> {
  const baseSlug = slugify(name) || "categoria";
  let slugCandidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.category.findFirst({
      where: {
        slug: slugCandidate,
        id: {
          not: categoryId
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

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireAdminOrResponse();
  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = adminCategorySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const existingCategory = await prisma.category.findUnique({
    where: { id: params.id },
    include: {
      fieldDefinitions: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!existingCategory) {
    return jsonError("Categoría no encontrada.", 404);
  }

  const input = parsed.data;
  const name = input.name.trim();
  const slug = await buildUniqueSlug(name, params.id);
  let normalizedDefinitions;

  try {
    validateCategoryFieldDefinitions(input.fieldDefinitions);
    normalizedDefinitions = normalizeCategoryFieldDefinitions(input.fieldDefinitions, existingCategory.fieldDefinitions);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No se pudieron validar los campos de la categoría.", 400);
  }

  try {
    const category = await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id: params.id },
        data: { name, slug }
      });

      const incomingIds = new Set(normalizedDefinitions.map((definition) => definition.id).filter(Boolean));
      const existingIds = existingCategory.fieldDefinitions.map((definition) => definition.id);

      for (const definition of normalizedDefinitions) {
        if (definition.id) {
          await tx.categoryFieldDefinition.update({
            where: { id: definition.id },
            data: {
              label: definition.label,
              type: definition.type,
              required: definition.required,
              unit: definition.unit,
              optionsJson: definition.optionsJson,
              showInCatalog: definition.showInCatalog,
              showInDetail: definition.showInDetail,
              sortOrder: definition.sortOrder,
              isActive: definition.isActive
            }
          });
        } else {
          await tx.categoryFieldDefinition.create({
            data: {
              categoryId: params.id,
              key: definition.key,
              label: definition.label,
              type: definition.type,
              required: definition.required,
              unit: definition.unit,
              optionsJson: definition.optionsJson,
              showInCatalog: definition.showInCatalog,
              showInDetail: definition.showInDetail,
              sortOrder: definition.sortOrder,
              isActive: definition.isActive
            }
          });
        }
      }

      const omittedDefinitionIds = existingIds.filter((definitionId) => !incomingIds.has(definitionId));
      if (omittedDefinitionIds.length > 0) {
        await tx.categoryFieldDefinition.updateMany({
          where: {
            id: { in: omittedDefinitionIds }
          },
          data: {
            isActive: false
          }
        });
      }

      return tx.category.findUniqueOrThrow({
        where: { id: params.id },
        include: {
          fieldDefinitions: {
            orderBy: { sortOrder: "asc" }
          },
          _count: {
            select: {
              products: true
            }
          }
        }
      });
    });

    return NextResponse.json({ category: serializeAdminCategory(category) });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo actualizar la categoría.", 409);
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { response } = await requireAdminOrResponse();
  if (response) {
    return response;
  }

  const productsUsingCategory = await prisma.product.count({
    where: { categoryId: params.id }
  });

  if (productsUsingCategory > 0) {
    return jsonError("No se puede eliminar una categoría que todavía tiene productos.", 409);
  }

  try {
    await prisma.category.delete({
      where: { id: params.id }
    });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo eliminar la categoría.", 400);
  }

  return NextResponse.json({ ok: true });
}
