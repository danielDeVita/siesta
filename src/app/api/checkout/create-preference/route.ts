import { NextRequest, NextResponse } from "next/server";
import { createMercadoPagoPreference } from "@/lib/mercadopago";
import { generatePublicOrderCode } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { createPreferenceSchema } from "@/lib/validators";
import { jsonError } from "@/lib/api";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createPreferenceSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request body", 400);
  }

  const input = parsed.data;
  const quantityByProduct = input.items.reduce<Map<string, number>>((accumulator, item) => {
    accumulator.set(item.productId, (accumulator.get(item.productId) ?? 0) + item.quantity);
    return accumulator;
  }, new Map());
  const uniqueProductIds = [...quantityByProduct.keys()];

  const products = await prisma.product.findMany({
    where: {
      id: { in: uniqueProductIds },
      status: "ACTIVE"
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1
      }
    }
  });

  if (products.length !== uniqueProductIds.length) {
    return jsonError("Some products are no longer available.", 400);
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  let subtotalAmount = 0;

  for (const [productId, quantity] of quantityByProduct.entries()) {
    const product = productById.get(productId);
    if (!product) {
      return jsonError("Invalid product in cart.", 400);
    }
    if (quantity > product.stock) {
      return jsonError(`Stock insuficiente para ${product.title}.`, 409);
    }
    subtotalAmount += product.priceArs * quantity;
  }

  const totalAmount = subtotalAmount;
  const publicCode = generatePublicOrderCode();

  const order = await prisma.order.create({
    data: {
      publicCode,
      status: "PENDING_PAYMENT",
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerWhatsapp: input.customerWhatsapp,
      pickupNotes: input.pickupNotes,
      currency: "ARS",
      subtotalAmount,
      totalAmount,
      items: {
        create: [...quantityByProduct.entries()].map(([productId, quantity]) => {
          const product = productById.get(productId)!;
          return {
            productId: product.id,
            productNameSnapshot: product.title,
            unitPriceSnapshot: product.priceArs,
            quantity,
            lineTotal: product.priceArs * quantity
          };
        })
      }
    },
    include: {
      items: true
    }
  });

  try {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const preference = await createMercadoPagoPreference({
      externalReference: order.publicCode,
      items: order.items.map((item) => ({
        title: item.productNameSnapshot,
        quantity: item.quantity,
        unit_price: item.unitPriceSnapshot / 100,
        currency_id: "ARS"
      })),
      payer: {
        name: input.customerName,
        email: input.customerEmail
      },
      backUrls: {
        success: `${appUrl}/checkout/success?order=${order.publicCode}`,
        failure: `${appUrl}/checkout/failure?order=${order.publicCode}`,
        pending: `${appUrl}/checkout/success?order=${order.publicCode}`
      },
      // This can coexist with a webhook configured in Mercado Pago panel.
      // Duplicate notifications are safely deduplicated by payment_events.external_event_id.
      notificationUrl: `${appUrl}/api/webhooks/mercadopago`,
      metadata: {
        orderId: order.id,
        orderPublicCode: order.publicCode
      }
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { mpPreferenceId: preference.id }
    });

    return NextResponse.json({
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point ?? null,
      orderPublicCode: order.publicCode
    });
  } catch (error) {
    await prisma.order.delete({
      where: { id: order.id }
    });

    console.error(error);
    return jsonError("No se pudo iniciar el pago con Mercado Pago.", 502);
  }
}
