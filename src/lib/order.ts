import { OrderStatus } from "@prisma/client";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePublicOrderCode(): string {
  let code = "SIESTA-";
  for (let index = 0; index < 8; index += 1) {
    const randomIndex = Math.floor(Math.random() * ALPHABET.length);
    code += ALPHABET[randomIndex];
  }
  return code;
}

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  PAYMENT_FAILED: ["CANCELLED"]
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pago pendiente",
  PAID: "Pagado",
  READY_FOR_PICKUP: "Listo para retirar",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  PAYMENT_FAILED: "Pago fallido"
};

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) {
    return true;
  }

  return transitions[current].includes(next);
}
