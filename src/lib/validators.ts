import { OrderStatus } from "@prisma/client";
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
  altText: z.string().max(160).optional(),
  sortOrder: z.number().int().nonnegative().optional()
});

export const productStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);

export const adminProductUpsertSchema = z.object({
  title: z.string().min(2).max(140),
  description: z.string().max(2500).optional(),
  measurements: z.string().max(80).optional(),
  priceArs: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  status: productStatusSchema,
  images: z.array(adminProductImageSchema).min(1),
  categoryId: z.string().cuid().optional().nullable(),
  collectionId: z.string().cuid().optional().nullable()
});

export const adminCategorySchema = z.object({
  name: z.string().min(2).max(80)
});

export const adminCollectionSchema = z.object({
  name: z.string().min(2).max(80)
});

export const adminOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus)
});
