import { AdminProductsManager } from "@/components/admin/products-manager";
import { requireAdminPageSession } from "@/lib/auth";
import { serializeAdminProduct } from "@/lib/admin-products";
import { backfillLegacyMeasurements } from "@/lib/legacy-measurements-backfill";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireAdminPageSession();
  await backfillLegacyMeasurements(prisma);

  const [products, categories, collections] = await Promise.all([
    prisma.product.findMany({
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
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        fieldDefinitions: {
          orderBy: { sortOrder: "asc" }
        }
      }
    }),
    prisma.collection.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <AdminProductsManager
      initialProducts={products.map(serializeAdminProduct)}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        fieldDefinitions: category.fieldDefinitions.map((definition) => ({
          id: definition.id,
          key: definition.key,
          label: definition.label,
          type: definition.type,
          required: definition.required,
          unit: definition.unit,
          options: Array.isArray(definition.optionsJson) ? definition.optionsJson.filter((option): option is string => typeof option === "string") : [],
          showInCatalog: definition.showInCatalog,
          showInDetail: definition.showInDetail,
          sortOrder: definition.sortOrder,
          isActive: definition.isActive
        }))
      }))}
      collections={collections.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
