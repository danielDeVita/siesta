import { AdminProductsManager } from "@/components/admin/products-manager";
import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireAdminPageSession();

  const [products, categories, collections] = await Promise.all([
    prisma.product.findMany({
      include: { images: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.collection.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <AdminProductsManager
      initialProducts={products.map((product) => ({
        id: product.id,
        title: product.title,
        slug: product.slug,
        description: product.description,
        measurements: product.measurements,
        priceArs: product.priceArs,
        stock: product.stock,
        status: product.status === "ACTIVE" ? "ACTIVE" : "ARCHIVED",
        categoryId: product.categoryId,
        collectionId: product.collectionId,
        images: product.images.map((image) => ({
          id: image.id,
          url: image.url,
          altText: image.altText,
          sortOrder: image.sortOrder
        }))
      }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      collections={collections.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
