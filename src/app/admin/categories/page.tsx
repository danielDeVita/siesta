import { CategoriesManager } from "@/components/admin/categories-manager";
import { requireAdminPageSession } from "@/lib/auth";
import { definitionToDTO } from "@/lib/category-fields";
import { backfillLegacyMeasurements } from "@/lib/legacy-measurements-backfill";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminPageSession();
  await backfillLegacyMeasurements(prisma);

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
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

  return (
    <CategoriesManager
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        productCount: category._count.products,
        fieldDefinitions: category.fieldDefinitions.map(definitionToDTO)
      }))}
    />
  );
}
