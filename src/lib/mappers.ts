import type { Product, ProductImage, Category, Collection } from "@prisma/client";
import type { ProductDTO, ProductDetailDTO } from "@/types";

type ProductWithImages = Product & {
  images: ProductImage[];
  category: Category | null;
  collection: Collection | null;
};

export function toProductDTO(product: ProductWithImages): ProductDTO {
  const coverImage = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    measurements: product.measurements,
    priceArs: product.priceArs,
    stock: product.stock,
    status: product.status,
    coverImageUrl: coverImage?.url ?? null,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    collectionId: product.collectionId,
    collectionName: product.collection?.name ?? null
  };
}

export function toProductDetailDTO(product: ProductWithImages): ProductDetailDTO {
  const base = toProductDTO(product);
  return {
    ...base,
    images: product.images
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.altText,
        sortOrder: image.sortOrder
      }))
  };
}
