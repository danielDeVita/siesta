import type {
  Product,
  ProductImage,
  Category,
  Collection,
  CategoryFieldDefinition,
  ProductFieldValue
} from "@prisma/client";
import type { ProductDTO, ProductDetailDTO } from "@/types";
import { buildProductAttributes } from "@/lib/product-attributes";
import { resolveCloudinaryPublicId } from "@/lib/cloudinary";

type ProductWithImages = Product & {
  images: ProductImage[];
  category: (Category & { fieldDefinitions: CategoryFieldDefinition[] }) | null;
  collection: Collection | null;
  fieldValues: ProductFieldValue[];
};

export function toProductDTO(product: ProductWithImages): ProductDTO {
  const coverImage = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const attributes = buildProductAttributes(product.category?.fieldDefinitions ?? [], product.fieldValues, product.measurements);

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    priceArs: product.priceArs,
    stock: product.stock,
    status: product.status,
    coverImageUrl: coverImage?.url ?? null,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    collectionId: product.collectionId,
    collectionName: product.collection?.name ?? null,
    attributes
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
        publicId: resolveCloudinaryPublicId({ publicId: image.publicId, url: image.url }),
        altText: image.altText,
        sortOrder: image.sortOrder
      }))
  };
}
