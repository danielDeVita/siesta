import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { adminCategorySchema } from "@/lib/validators";
import { jsonError } from "@/lib/api";
import {
  normalizeCategoryFieldDefinitions,
  serializeAdminCategory,
  validateCategoryFieldDefinitions
} from "@/lib/category-fields";

async function buildUniqueSlug(name: string, categoryId?: string): Promise<string> {
  const baseSlug = slugify(name) || "categoria";
  let slugCandidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.category.findFirst({
      where: {
        slug: slugCandidate,
        ...(categoryId
          ? {
              id: {
                not: categoryId
              }
            }
          : {})
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

  const input = parsed.data;
  const name = input.name.trim();
  const slug = await buildUniqueSlug(name);
  let normalizedDefinitions;

  try {
    validateCategoryFieldDefinitions(input.fieldDefinitions);
    normalizedDefinitions = normalizeCategoryFieldDefinitions(input.fieldDefinitions);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No se pudieron validar los campos de la categoría.", 400);
  }

  try {
    const category = await prisma.$transaction(async (tx) => {
      const createdCategory = await tx.category.create({
        data: { name, slug }
      });

      if (normalizedDefinitions.length > 0) {
        await tx.categoryFieldDefinition.createMany({
          data: normalizedDefinitions.map((definition) => ({
            categoryId: createdCategory.id,
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
          }))
        });
      }

      return tx.category.findUniqueOrThrow({
        where: { id: createdCategory.id },
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

    return NextResponse.json({ category: serializeAdminCategory(category) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo crear la categoría.", 409);
  }
}
