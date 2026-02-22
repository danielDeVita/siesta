"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { formatArs } from "@/lib/money";

type CheckoutResponse = {
  initPoint: string;
  orderPublicCode: string;
  sandboxInitPoint?: string | null;
};

export function CheckoutForm() {
  const { items, subtotal } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const canSubmit = useMemo(
    () =>
      items.length > 0 &&
      customerName.trim().length > 1 &&
      customerEmail.trim().length > 3 &&
      customerWhatsapp.trim().length > 5,
    [customerEmail, customerName, customerWhatsapp, items.length]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/checkout/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerWhatsapp,
          pickupNotes,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        })
      });

      const data = (await response.json()) as CheckoutResponse | { error: string };

      if (!response.ok || !("initPoint" in data)) {
        throw new Error("error" in data ? data.error : "No se pudo iniciar checkout.");
      }

      window.location.href = data.initPoint;
    } catch (submissionError) {
      setLoading(false);
      setError(submissionError instanceof Error ? submissionError.message : "Error inesperado.");
    }
  };

  if (items.length === 0) {
    return (
      <section className="card">
        <div className="card-body stack">
          <h1>Checkout</h1>
          <p className="muted">Tu carrito está vacío.</p>
          <button className="button button-primary" onClick={() => router.push("/cart")}>
            Ir al carrito
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <h1>Checkout</h1>

      <section className="card">
        <div className="card-body field-grid">
          <div className="field">
            <label htmlFor="customerName" className="label">
              Nombre y apellido
            </label>
            <input
              id="customerName"
              className="input"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="customerEmail" className="label">
              Email
            </label>
            <input
              id="customerEmail"
              type="email"
              className="input"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="customerWhatsapp" className="label">
              WhatsApp
            </label>
            <input
              id="customerWhatsapp"
              className="input"
              inputMode="tel"
              value={customerWhatsapp}
              onChange={(event) => setCustomerWhatsapp(event.target.value.replace(/[^0-9+]/g, ""))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pickupNotes" className="label">
              Nota de retiro (opcional)
            </label>
            <textarea
              id="pickupNotes"
              className="input textarea"
              value={pickupNotes}
              onChange={(event) => setPickupNotes(event.target.value)}
              placeholder="Ej: prefiero retirar por la tarde."
            />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body stack">
          {items.map((item) => (
            <div key={item.productId} className="row" style={{ justifyContent: "space-between" }}>
              <span>
                {item.title} x {item.quantity}
              </span>
              <strong>{formatArs(item.priceArs * item.quantity)}</strong>
            </div>
          ))}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>Total</span>
            <strong>{formatArs(subtotal)}</strong>
          </div>
          {error && <p className="feedback-error">{error}</p>}
          <button className="button button-primary" type="submit" disabled={!canSubmit || loading}>
            {loading ? "Redirigiendo a Mercado Pago..." : "Pagar con Mercado Pago"}
          </button>
        </div>
      </section>
    </form>
  );
}
