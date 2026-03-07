import { Prisma, PrismaClient } from "@prisma/client";
import { parseLegacyMeasurements } from "@/lib/product-attributes";

type PrismaLike = PrismaClient | Prisma.TransactionClient;
type CategoryFieldDefinitionDelegate = Pick<
  PrismaClient["categoryFieldDefinition"],
  "findMany" | "upsert"
>;
type ProductFieldValueDelegate = Pick<PrismaClient["productFieldValue"], "upsert">;

const LEGACY_DIMENSION_DEFINITIONS = [
  {
    key: "largo",
    label: "Largo",
    sortOrder: 0
  },
  {
    key: "alto",
    label: "Alto",
    sortOrder: 1
  }
] as const;

function getAttributeDelegates(prismaClient: PrismaLike) {
  const client = prismaClient as PrismaLike & {
    categoryFieldDefinition?: CategoryFieldDefinitionDelegate;
    productFieldValue?: ProductFieldValueDelegate;
  };

  if (!client.categoryFieldDefinition || !client.productFieldValue) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "Skipping legacy measurements backfill because Prisma client is missing category field delegates. Run `npm run prisma:generate` and restart `npm run dev`."
      );
    }

    return null;
  }

  return {
    categoryFieldDefinition: client.categoryFieldDefinition,
    productFieldValue: client.productFieldValue
  };
}

export async function backfillLegacyMeasurements(prismaClient: PrismaLike) {
  const delegates = getAttributeDelegates(prismaClient);

  if (!delegates) {
    return;
  }

  const products = await prismaClient.product.findMany({
    where: {
      categoryId: { not: null },
      measurements: { not: null }
    },
    select: {
      id: true,
      categoryId: true,
      measurements: true
    }
  });

  if (products.length === 0) {
    return;
  }

  const categoryIds = [...new Set(products.map((product) => product.categoryId).filter(Boolean) as string[])];
  const existingDefinitions = await delegates.categoryFieldDefinition.findMany({
    where: {
      categoryId: { in: categoryIds },
      key: { in: LEGACY_DIMENSION_DEFINITIONS.map((definition) => definition.key) }
    }
  });

  const definitionsByCategory = new Map<string, Map<string, typeof existingDefinitions[number]>>();
  for (const definition of existingDefinitions) {
    const current = definitionsByCategory.get(definition.categoryId) ?? new Map<string, typeof definition>();
    current.set(definition.key, definition);
    definitionsByCategory.set(definition.categoryId, current);
  }

  for (const categoryId of categoryIds) {
    const categoryDefinitions = definitionsByCategory.get(categoryId) ?? new Map<string, typeof existingDefinitions[number]>();

    for (const legacyDefinition of LEGACY_DIMENSION_DEFINITIONS) {
      const existing = categoryDefinitions.get(legacyDefinition.key);
      if (existing) {
        continue;
      }

      const created = await delegates.categoryFieldDefinition.upsert({
        where: {
          categoryId_key: {
            categoryId,
            key: legacyDefinition.key
          }
        },
        update: {
          unit: "cm",
          showInCatalog: true,
          showInDetail: true,
          isActive: true
        },
        create: {
          categoryId,
          key: legacyDefinition.key,
          label: legacyDefinition.label,
          type: "NUMBER",
          required: false,
          unit: "cm",
          showInCatalog: true,
          showInDetail: true,
          sortOrder: legacyDefinition.sortOrder,
          isActive: true
        }
      });

      categoryDefinitions.set(created.key, created);
    }

    definitionsByCategory.set(categoryId, categoryDefinitions);
  }

  for (const product of products) {
    if (!product.categoryId) {
      continue;
    }

    const parsed = parseLegacyMeasurements(product.measurements);
    if (!parsed) {
      continue;
    }

    const categoryDefinitions = definitionsByCategory.get(product.categoryId);
    const largoDefinition = categoryDefinitions?.get("largo");
    const altoDefinition = categoryDefinitions?.get("alto");

    if (!largoDefinition || !altoDefinition) {
      continue;
    }

    await delegates.productFieldValue.upsert({
      where: {
        productId_categoryFieldDefinitionId: {
          productId: product.id,
          categoryFieldDefinitionId: largoDefinition.id
        }
      },
      update: {
        valueJson: parsed.largo as Prisma.InputJsonValue
      },
      create: {
        productId: product.id,
        categoryFieldDefinitionId: largoDefinition.id,
        valueJson: parsed.largo as Prisma.InputJsonValue
      }
    });

    await delegates.productFieldValue.upsert({
      where: {
        productId_categoryFieldDefinitionId: {
          productId: product.id,
          categoryFieldDefinitionId: altoDefinition.id
        }
      },
      update: {
        valueJson: parsed.alto as Prisma.InputJsonValue
      },
      create: {
        productId: product.id,
        categoryFieldDefinitionId: altoDefinition.id,
        valueJson: parsed.alto as Prisma.InputJsonValue
      }
    });
  }
}
