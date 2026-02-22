"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function CheckoutFailureView() {
  const searchParams = useSearchParams();
  const code = searchParams.get("order");

  return (
    <section className="stack">
      <div className="card">
        <div className="card-body stack">
          <h1 style={{ margin: 0 }}>No se pudo completar el pago</h1>
          <p className="muted">
            Podés intentar nuevamente desde el carrito. Si el problema continúa, escribinos por WhatsApp.
          </p>
          {code && (
            <p style={{ margin: 0 }}>
              Código de referencia: <strong>{code}</strong>
            </p>
          )}
          <div className="row">
            <Link href="/cart" className="button button-primary">
              Volver al carrito
            </Link>
            <Link href="/" className="button button-ghost">
              Ir al catálogo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
