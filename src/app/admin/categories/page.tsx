import { CategoriesManager } from "@/components/admin/categories-manager";
import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminPageSession();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <CategoriesManager
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug
      }))}
    />
  );
}
