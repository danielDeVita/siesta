import { PaymentProcessStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoPayment, verifyMercadoPagoWebhookSignature } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

type WebhookPolicy = "compat" | "strict" | "skip_signature";
type EventStatus = "PROCESSED" | "IGNORED" | "ERROR";
type DuplicateMeta = {
  duplicate: boolean;
  reprocessed: boolean;
};

async function markEvent(
  eventId: string,
  status: EventStatus,
  orderId?: string
) {
  await prisma.paymentEvent.update({
    where: { externalEventId: eventId },
    data: {
      processStatus: status,
      processedAt: new Date(),
      ...(orderId ? { orderId } : {})
    }
  });
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getWebhookPolicy(): WebhookPolicy {
  const val = process.env.MP_WEBHOOK_POLICY?.toLowerCase();
  if (val === "strict") return "strict";
  if (val === "skip_signature") return "skip_signature";
  return "compat";
}

function buildWebhookResponse(meta: DuplicateMeta, payload: Record<string, unknown> = {}) {
  return NextResponse.json({
    ok: true,
    duplicate: meta.duplicate,
    reprocessed: meta.reprocessed,
    ...payload
  });
}

function logWebhook(params: {
  externalEventId: string;
  paymentId: string;
  eventType: string;
  processStatusFinal: EventStatus;
  reason: string;
  duplicate: boolean;
  reprocessed: boolean;
}) {
  console.info("[mercadopago-webhook]", JSON.stringify(params));
}

async function updateEventAndReply(params: {
  externalEventId: string;
  paymentId: string;
  eventType: string;
  status: EventStatus;
  reason: string;
  duplicateMeta: DuplicateMeta;
  orderId?: string;
  responsePayload?: Record<string, unknown>;
}) {
  const { externalEventId, paymentId, eventType, status, reason, duplicateMeta, orderId, responsePayload } =
    params;

  await markEvent(externalEventId, status, orderId);
  logWebhook({
    externalEventId,
    paymentId,
    eventType,
    processStatusFinal: status,
    reason,
    duplicate: duplicateMeta.duplicate,
    reprocessed: duplicateMeta.reprocessed
  });

  return buildWebhookResponse(duplicateMeta, responsePayload ?? {});
}

async function registerEvent(params: {
  externalEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<{
  duplicateMeta: DuplicateMeta;
  existingStatus?: PaymentProcessStatus;
}> {
  const { externalEventId, eventType, payload } = params;

  try {
    await prisma.paymentEvent.create({
      data: {
        provider: "MERCADO_PAGO",
        externalEventId,
        eventType,
        payloadJson: payload as Prisma.InputJsonValue
      }
    });

    return {
      duplicateMeta: { duplicate: false, reprocessed: false }
    };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }

    const existing = await prisma.paymentEvent.findUnique({
      where: { externalEventId },
      select: { processStatus: true }
    });

    if (!existing) {
      throw error;
    }

    if (existing.processStatus === "PROCESSED") {
      return {
        duplicateMeta: { duplicate: true, reprocessed: false },
        existingStatus: existing.processStatus
      };
    }

    await prisma.paymentEvent.update({
      where: { externalEventId },
      data: {
        eventType,
        payloadJson: payload as Prisma.InputJsonValue,
        processStatus: "RECEIVED",
        processedAt: null
      }
    });

    return {
      duplicateMeta: { duplicate: true, reprocessed: true },
      existingStatus: existing.processStatus
    };
  }
}

function getWebhookCore(request: NextRequest, payload: Record<string, unknown>) {
  const searchParams = request.nextUrl.searchParams;
  const typeFromQuery = searchParams.get("type") ?? searchParams.get("topic");
  const typeFromBody = toStringValue(payload.type);
  const eventType = (typeFromQuery ?? typeFromBody ?? "unknown").toLowerCase();

  const paymentIdFromQueryData = searchParams.get("data.id");
  const paymentIdFromQueryLegacy = searchParams.get("id");
  const paymentIdFromBodyData =
    payload.data && typeof payload.data === "object" && "id" in payload.data
      ? toStringValue((payload.data as { id?: unknown }).id)
      : null;
  const paymentIdFromBody = toStringValue(payload.id);

  const paymentId =
    paymentIdFromQueryData ??
    paymentIdFromQueryLegacy ??
    paymentIdFromBodyData ??
    paymentIdFromBody ??
    "";
  const isLegacyFormat = searchParams.has("topic") && searchParams.has("id");
  const isPaymentEvent = eventType === "payment" || eventType === "topic_payment";
  const rawEventId =
    toStringValue(payload.id) ?? paymentIdFromQueryLegacy ?? paymentIdFromQueryData ?? "unknown";
  const externalEventId = isPaymentEvent && paymentId ? `payment:${paymentId}` : `${eventType}:${rawEventId}`;

  return { eventType, paymentId, externalEventId, isLegacyFormat, isPaymentEvent };
}

async function processPaymentNotification(params: {
  paymentId: string;
  eventType: string;
  externalEventId: string;
  duplicateMeta: DuplicateMeta;
}) {
  const { paymentId, eventType, externalEventId, duplicateMeta } = params;

  try {
    const payment = await getMercadoPagoPayment(paymentId);
    const paymentMetadata =
      payment.metadata && typeof payment.metadata === "object"
        ? (payment.metadata as Record<string, unknown>)
        : null;
    const publicCode =
      toStringValue(payment.external_reference) ??
      toStringValue(paymentMetadata?.orderPublicCode) ??
      toStringValue(paymentMetadata?.order_public_code);

    if (!publicCode) {
      return updateEventAndReply({
        externalEventId,
        paymentId,
        eventType,
        status: "ERROR",
        reason: "missing_public_code",
        duplicateMeta
      });
    }

    const order = await prisma.order.findUnique({
      where: { publicCode },
      include: {
        items: true
      }
    });

    if (!order) {
      return updateEventAndReply({
        externalEventId,
        paymentId,
        eventType,
        status: "ERROR",
        reason: "order_not_found",
        duplicateMeta
      });
    }

    if (payment.status === "approved") {
      let alreadyFinalized = false;

      try {
        await prisma.$transaction(async (tx) => {
          const current = await tx.order.findUnique({
            where: { id: order.id },
            include: { items: true }
          });

          if (!current) {
            throw new Error("Order not found during transaction.");
          }

          if (["PAID", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"].includes(current.status)) {
            alreadyFinalized = true;
            await tx.order.update({
              where: { id: current.id },
              data: {
                mpPaymentId: String(payment.id)
              }
            });
            return;
          }

          for (const item of current.items) {
            if (!item.productId) {
              continue;
            }

            const updated = await tx.product.updateMany({
              where: {
                id: item.productId,
                stock: { gte: item.quantity }
              },
              data: {
                stock: { decrement: item.quantity }
              }
            });

            if (updated.count !== 1) {
              throw new Error(`Stock inconsistente para item ${item.id}.`);
            }

            await tx.inventoryMovement.create({
              data: {
                productId: item.productId,
                orderItemId: item.id,
                type: "ORDER_CONFIRM",
                delta: -item.quantity,
                reason: `Pago aprobado MP #${payment.id}`
              }
            });
          }

          await tx.order.update({
            where: { id: current.id },
            data: {
              status: "PAID",
              paidAt: new Date(),
              mpPaymentId: String(payment.id)
            }
          });
        });

        return updateEventAndReply({
          externalEventId,
          paymentId,
          eventType,
          status: "PROCESSED",
          reason: alreadyFinalized ? "approved_order_already_finalized" : "approved_order_marked_paid",
          duplicateMeta,
          orderId: order.id
        });
      } catch (transactionError) {
        if (
          transactionError instanceof Error &&
          transactionError.message.toLowerCase().includes("stock inconsistente")
        ) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
              mpPaymentId: String(payment.id)
            }
          });

          return updateEventAndReply({
            externalEventId,
            paymentId,
            eventType,
            status: "ERROR",
            reason: "stock_conflict_cancelled",
            duplicateMeta,
            orderId: order.id,
            responsePayload: { stockConflict: true }
          });
        }

        throw transactionError;
      }
    }

    if (["rejected", "cancelled", "refunded", "charged_back"].includes(payment.status)) {
      const freshOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true }
      });

      if (!freshOrder) {
        return updateEventAndReply({
          externalEventId,
          paymentId,
          eventType,
          status: "ERROR",
          reason: "order_not_found_on_cancel",
          duplicateMeta,
          orderId: order.id
        });
      }

      if (["CANCELLED", "COMPLETED"].includes(freshOrder.status)) {
        await prisma.order.update({
          where: { id: order.id },
          data: { mpPaymentId: String(payment.id) }
        });
      } else if (["PAID", "READY_FOR_PICKUP"].includes(freshOrder.status)) {
        await prisma.$transaction(async (tx) => {
          for (const item of freshOrder.items) {
            if (!item.productId) continue;

            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            });

            await tx.inventoryMovement.create({
              data: {
                productId: item.productId,
                orderItemId: item.id,
                type: "ORDER_CANCEL_RESTORE",
                delta: item.quantity,
                reason: `Pago revertido MP #${payment.id} (${payment.status})`
              }
            });
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
              mpPaymentId: String(payment.id)
            }
          });
        });
      } else {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "PAYMENT_FAILED",
            mpPaymentId: String(payment.id)
          }
        });
      }

      return updateEventAndReply({
        externalEventId,
        paymentId,
        eventType,
        status: "PROCESSED",
        reason: `payment_status_${payment.status}`,
        duplicateMeta,
        orderId: order.id
      });
    }

    return updateEventAndReply({
      externalEventId,
      paymentId,
      eventType,
      status: "IGNORED",
      reason: `payment_status_${payment.status}_ignored`,
      duplicateMeta,
      orderId: order.id
    });
  } catch (error) {
    console.error(error);
    return updateEventAndReply({
      externalEventId,
      paymentId,
      eventType,
      status: "ERROR",
      reason: "exception_processing_payment",
      duplicateMeta
    });
  }
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { eventType, paymentId, externalEventId, isLegacyFormat, isPaymentEvent } = getWebhookCore(
    request,
    payload
  );
  const webhookPolicy = getWebhookPolicy();
  const webhookSecret = process.env.MP_WEBHOOK_SECRET ?? null;

  const signatureCheck = verifyMercadoPagoWebhookSignature({
    rawSignatureHeader: request.headers.get("x-signature"),
    requestIdHeader: request.headers.get("x-request-id"),
    dataId: paymentId || null,
    secret: webhookSecret
  });

  const { duplicateMeta, existingStatus } = await registerEvent({
    externalEventId,
    eventType,
    payload
  });

  if (duplicateMeta.duplicate && !duplicateMeta.reprocessed && existingStatus === "PROCESSED") {
    logWebhook({
      externalEventId,
      paymentId,
      eventType,
      processStatusFinal: "PROCESSED",
      reason: "duplicate_already_processed",
      duplicate: true,
      reprocessed: false
    });
    return buildWebhookResponse(duplicateMeta, {
      reason: "duplicate_already_processed"
    });
  }

  if (signatureCheck.isSigned && !signatureCheck.isValid && webhookPolicy !== "skip_signature") {
    return updateEventAndReply({
      externalEventId,
      paymentId,
      eventType,
      status: "ERROR",
      reason: `invalid_signature:${signatureCheck.reason}`,
      duplicateMeta,
      responsePayload: {
        ignored: true,
        reason: `invalid_signature:${signatureCheck.reason}`
      }
    });
  }

  if (!signatureCheck.isSigned && webhookPolicy === "strict") {
    return updateEventAndReply({
      externalEventId,
      paymentId,
      eventType,
      status: "ERROR",
      reason: "unsigned_request_strict_policy",
      duplicateMeta,
      responsePayload: {
        ignored: true,
        reason: "unsigned_request_strict_policy"
      }
    });
  }

  if (!signatureCheck.isSigned && webhookPolicy === "compat" && !isLegacyFormat) {
    if (signatureCheck.reason !== "missing_secret") {
      return updateEventAndReply({
        externalEventId,
        paymentId,
        eventType,
        status: "IGNORED",
        reason: "unsigned_request_non_legacy",
        duplicateMeta,
        responsePayload: {
          ignored: true,
          reason: "unsigned_request_non_legacy"
        }
      });
    }
  }

  if (!isPaymentEvent || !paymentId) {
    return updateEventAndReply({
      externalEventId,
      paymentId,
      eventType,
      status: "IGNORED",
      reason: !paymentId ? "missing_payment_id" : `ignored_event_type:${eventType}`,
      duplicateMeta,
      responsePayload: {
        ignored: true,
        reason: !paymentId ? "missing_payment_id" : `ignored_event_type:${eventType}`
      }
    });
  }

  return processPaymentNotification({
    paymentId,
    eventType,
    externalEventId,
    duplicateMeta
  });
}
