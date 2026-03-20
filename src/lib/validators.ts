import { CategoryFieldType, OrderStatus } from "@prisma/client";
import { z } from "zod";

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive()
});

export const createPreferenceSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerEmail: z.string().email(),
  customerWhatsapp: z.string().regex(/^\+?[0-9]{6,32}$/, "Solo números y el signo + al inicio"),
  pickupNotes: z.string().max(400).optional(),
  items: z.array(cartItemSchema).min(1)
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128)
});

export const adminProductImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1).optional().nullable(),
  altText: z.string().max(160).optional(),
  sortOrder: z.number().int().nonnegative().optional()
});

export const productStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);

export const categoryFieldTypeSchema = z.nativeEnum(CategoryFieldType);

export const adminProductAttributeSchema = z.object({
  fieldDefinitionId: z.string().cuid(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()])
});

export const adminProductUpsertSchema = z.object({
  title: z.string().min(2).max(140),
  description: z.string().max(2500).optional(),
  priceArs: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  status: productStatusSchema,
  images: z.array(adminProductImageSchema).min(1),
  categoryId: z.string().cuid().optional().nullable(),
  collectionId: z.string().cuid().optional().nullable(),
  attributes: z.array(adminProductAttributeSchema).default([])
});

export const adminCategoryFieldDefinitionSchema = z.object({
  id: z.string().cuid().optional(),
  label: z.string().min(1).max(80),
  type: categoryFieldTypeSchema,
  required: z.boolean().optional(),
  unit: z.string().max(20).optional(),
  options: z.array(z.string().min(1).max(80)).optional(),
  showInCatalog: z.boolean().optional(),
  showInDetail: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional()
});

export const adminCategorySchema = z.object({
  name: z.string().min(2).max(80),
  fieldDefinitions: z.array(adminCategoryFieldDefinitionSchema).default([])
});

export const adminCollectionSchema = z.object({
  name: z.string().min(2).max(80)
});

export const adminOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus)
});
