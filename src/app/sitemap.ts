import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { buildAbsoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "ACTIVE"
      },
      select: {
        slug: true,
        updatedAt: true
      }
    }),
    prisma.category.findMany({
      where: {
        products: {
          some: {
            status: "ACTIVE"
          }
        }
      },
      select: {
        slug: true,
        updatedAt: true
      }
    })
  ]);

  return [
    {
      url: buildAbsoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1
    },
    ...categories.map((category) => ({
      url: buildAbsoluteUrl(`/categorias/${category.slug}`),
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8
    })),
    ...products.map((product) => ({
      url: buildAbsoluteUrl(`/products/${product.slug}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7
    }))
  ];
}
