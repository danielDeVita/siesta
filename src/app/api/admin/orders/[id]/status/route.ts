import { NextRequest, NextResponse } from "next/server";
import { canTransitionOrderStatus } from "@/lib/order";
import { adminOrderStatusSchema } from "@/lib/validators";
import { requireAdminOrResponse } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response, session } = await requireAdminOrResponse();
  if (response || !session) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = adminOrderStatusSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const nextStatus = parsed.data.status;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          inventoryMovements: true
        }
      }
    }
  });

  if (!order) {
    return jsonError("Order not found", 404);
  }

  if (!canTransitionOrderStatus(order.status, nextStatus)) {
    return jsonError(`No se puede pasar de ${order.status} a ${nextStatus}.`, 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const hadDiscountedStock = ["PAID", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status);

    if (nextStatus === "CANCELLED" && order.status !== "CANCELLED" && hadDiscountedStock) {
      for (const item of order.items) {
        if (!item.productId) {
          continue;
        }

        const alreadyRestored = item.inventoryMovements.some(
          (movement) => movement.type === "ORDER_CANCEL_RESTORE"
        );

        if (!alreadyRestored) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity }
            }
          });

          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              orderItemId: item.id,
              type: "ORDER_CANCEL_RESTORE",
              delta: item.quantity,
              reason: "Cancelación manual del pedido por admin",
              createdByAdminId: session.id
            }
          });
        }
      }
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus
      },
      include: {
        items: true
      }
    });
  });

  return NextResponse.json({ order: updated });
}
