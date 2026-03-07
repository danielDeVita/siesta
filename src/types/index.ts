import type { CategoryFieldType, OrderStatus, ProductStatus } from "@prisma/client";

export type CategoryFieldDefinitionDTO = {
  id: string;
  key: string;
  label: string;
  type: CategoryFieldType;
  required: boolean;
  unit: string | null;
  options: string[];
  showInCatalog: boolean;
  showInDetail: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type ProductAttributeDTO = {
  fieldDefinitionId: string;
  key: string;
  label: string;
  type: CategoryFieldType;
  unit: string | null;
  rawValue: string | number | boolean | null;
  displayValue: string;
  showInCatalog: boolean;
  showInDetail: boolean;
  sortOrder: number;
};

export type ProductDTO = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  priceArs: number;
  stock: number;
  status: ProductStatus;
  coverImageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  collectionId: string | null;
  collectionName: string | null;
  attributes: ProductAttributeDTO[];
};

export type ProductImageDTO = {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
};

export type ProductDetailDTO = ProductDTO & {
  images: ProductImageDTO[];
};

export type CartItemInput = {
  productId: string;
  quantity: number;
};

export type CreatePreferenceRequest = {
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  pickupNotes?: string;
  items: CartItemInput[];
};

export type CreatePreferenceResponse = {
  initPoint: string;
  sandboxInitPoint?: string | null;
  orderPublicCode: string;
};

export type OrderDTO = {
  id: string;
  publicCode: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  pickupNotes: string | null;
  subtotalAmount: number;
  totalAmount: number;
  currency: "ARS";
  createdAt: string;
  items: Array<{
    id: string;
    productNameSnapshot: string;
    unitPriceSnapshot: number;
    quantity: number;
    lineTotal: number;
  }>;
};

export type AdminProductImageInput = {
  url: string;
  altText?: string;
  sortOrder?: number;
};

export type AdminProductAttributeInput = {
  fieldDefinitionId: string;
  value: string | number | boolean | null;
};

export type AdminProductUpsertInput = {
  title: string;
  description?: string;
  priceArs: number;
  stock: number;
  status: ProductStatus;
  images: AdminProductImageInput[];
  categoryId?: string | null;
  collectionId?: string | null;
  attributes: AdminProductAttributeInput[];
};

export type AdminCategoryFieldDefinitionInput = {
  id?: string;
  label: string;
  type: CategoryFieldType;
  required?: boolean;
  unit?: string;
  options?: string[];
  showInCatalog?: boolean;
  showInDetail?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

export type AdminCategoryUpsertInput = {
  name: string;
  fieldDefinitions: AdminCategoryFieldDefinitionInput[];
};
