"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import type { OrderDTO } from "@/types";
import { ORDER_STATUS_LABELS } from "@/lib/order";

export function CheckoutSuccessView() {
  const searchParams = useSearchParams();
  const code = searchParams.get("order");
  const { clearCart } = useCart();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    if (!code) return;

    const run = async () => {
      try {
        const response = await fetch(`/api/orders/${code}`);
        const data = (await response.json()) as { order?: OrderDTO; error?: string };
        if (!response.ok || !data.order) {
          throw new Error(data.error ?? "No se pudo cargar el pedido.");
        }
        setOrder(data.order);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      }
    };

    void run();
  }, [code]);

  return (
    <section className="stack">
      <div className="card">
        <div className="card-body stack">
          <h1 style={{ margin: 0 }}>Pago recibido</h1>
          <p className="muted">
            Gracias por comprar en Siesta. Te vamos a escribir por WhatsApp para coordinar el retiro.
          </p>
          {order && (
            <>
              <p style={{ margin: 0 }}>
                Código de pedido: <strong>{order.publicCode}</strong>
              </p>
              <p style={{ margin: 0 }}>
                Estado actual: <strong>{ORDER_STATUS_LABELS[order.status]}</strong>
              </p>
            </>
          )}
          {error && <p className="feedback-error">{error}</p>}
          <Link href="/" className="button button-primary">
            Volver al catálogo
          </Link>
        </div>
      </div>
    </section>
  );
}
