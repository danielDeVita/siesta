import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { definitionToDTO, validateAndNormalizeProductAttributes } from "@/lib/category-fields";
import { buildProductAttributes, summarizeAttributes } from "@/lib/product-attributes";
import { resolveCloudinaryPublicId } from "@/lib/cloudinary";
import type {
  AdminProductAttributeInput,
  CategoryFieldDefinitionDTO,
  ProductAttributeDTO
} from "@/types";

export async function getCategoryDefinitions(categoryId: string | null): Promise<CategoryFieldDefinitionDTO[]> {
  if (!categoryId) {
    return [];
  }

  const definitions = await prisma.categoryFieldDefinition.findMany({
    where: {
      categoryId
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });

  return definitions.map(definitionToDTO);
}

export async function getCategoryDefinitionsForValidation(categoryId: string | null) {
  if (!categoryId) {
    return [];
  }

  return prisma.categoryFieldDefinition.findMany({
    where: { categoryId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
}

export async function prepareNormalizedProductAttributes(
  categoryId: string | null,
  inputAttributes: AdminProductAttributeInput[]
) {
  if (!categoryId) {
    if (inputAttributes.length > 0) {
      throw new Error("No podés enviar atributos sin categoría.");
    }

    return [];
  }

  const definitions = await getCategoryDefinitionsForValidation(categoryId);
  return validateAndNormalizeProductAttributes(definitions, inputAttributes);
}

export async function syncProductFieldValues(
  tx: Prisma.TransactionClient,
  params: {
    productId: string;
    previousCategoryId: string | null;
    nextCategoryId: string | null;
    normalizedAttributes: Array<{ fieldDefinitionId: string; value: string | number | boolean | null }>;
  }
) {
  const { productId, previousCategoryId, nextCategoryId, normalizedAttributes } = params;
  const categoryChanged = previousCategoryId !== nextCategoryId;

  if (!nextCategoryId) {
    await tx.productFieldValue.deleteMany({
      where: { productId }
    });
    return;
  }

  if (categoryChanged) {
    await tx.productFieldValue.deleteMany({
      where: { productId }
    });
  }

  for (const attribute of normalizedAttributes) {
    const isEmpty = attribute.value === null || (typeof attribute.value === "string" && attribute.value.trim().length === 0);
    if (isEmpty) {
      await tx.productFieldValue.deleteMany({
        where: {
          productId,
          categoryFieldDefinitionId: attribute.fieldDefinitionId
        }
      });
      continue;
    }

    await tx.productFieldValue.upsert({
      where: {
        productId_categoryFieldDefinitionId: {
          productId,
          categoryFieldDefinitionId: attribute.fieldDefinitionId
        }
      },
      update: {
        valueJson: attribute.value as Prisma.InputJsonValue
      },
      create: {
        productId,
        categoryFieldDefinitionId: attribute.fieldDefinitionId,
        valueJson: attribute.value as Prisma.InputJsonValue
      }
    });
  }
}

export type SerializableAdminProduct = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  measurements: string | null;
  priceArs: number;
  stock: number;
  status: "ACTIVE" | "ARCHIVED";
  categoryId: string | null;
  collectionId: string | null;
  images: Array<{
    id: string;
    url: string;
    publicId: string | null;
    altText: string | null;
    sortOrder: number;
  }>;
  attributes: ProductAttributeDTO[];
  catalogAttributesSummary: string;
};

type ProductForSerialization = Prisma.ProductGetPayload<{
  include: {
    images: true;
    collection: true;
    category: {
      include: {
        fieldDefinitions: true;
      };
    };
    fieldValues: true;
  };
}>;

export function serializeAdminProduct(product: ProductForSerialization): SerializableAdminProduct {
  const attributes = buildProductAttributes(product.category?.fieldDefinitions ?? [], product.fieldValues, product.measurements);
  const catalogAttributes = attributes.filter((attribute) => attribute.showInCatalog);

  return {
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
      publicId: resolveCloudinaryPublicId({ publicId: image.publicId, url: image.url }),
      altText: image.altText,
      sortOrder: image.sortOrder
    })),
    attributes,
    catalogAttributesSummary: summarizeAttributes(catalogAttributes)
  };
}
