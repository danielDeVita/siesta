import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import type { OrderDTO } from "@/types";

type Params = {
  params: {
    publicCode: string;
  };
};

export async function GET(_: NextRequest, { params }: Params) {
  const order = await prisma.order.findUnique({
    where: {
      publicCode: params.publicCode
    },
    include: {
      items: true
    }
  });

  if (!order) {
    return jsonError("Order not found", 404);
  }

  const payload: OrderDTO = {
    id: order.id,
    publicCode: order.publicCode,
    status: order.status,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerWhatsapp: order.customerWhatsapp,
    pickupNotes: order.pickupNotes,
    subtotalAmount: order.subtotalAmount,
    totalAmount: order.totalAmount,
    currency: "ARS",
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productNameSnapshot: item.productNameSnapshot,
      unitPriceSnapshot: item.unitPriceSnapshot,
      quantity: item.quantity,
      lineTotal: item.lineTotal
    }))
  };

  return NextResponse.json({ order: payload });
}
