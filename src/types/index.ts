import type { OrderStatus, ProductStatus } from "@prisma/client";

export type ProductDTO = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  measurements: string | null;
  priceArs: number;
  stock: number;
  status: ProductStatus;
  coverImageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  collectionId: string | null;
  collectionName: string | null;
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

export type AdminProductUpsertInput = {
  title: string;
  description?: string;
  measurements?: string;
  priceArs: number;
  stock: number;
  status: ProductStatus;
  images: AdminProductImageInput[];
};
