"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatArs } from "@/lib/money";

export function CartView() {
  const { items, removeItem, subtotal, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <section className="card">
        <div className="card-body stack">
          <h1>Tu carrito está vacío</h1>
          <p className="muted">Elegí una bolsa del catálogo para empezar tu compra.</p>
          <Link href="/" className="button button-primary">
            Ir al catálogo
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="stack">
      <h1>Carrito</h1>
      <div className="card">
        <div className="card-body stack">
          {items.map((item) => (
            <article key={item.productId} className="row" style={{ alignItems: "center" }}>
              <Image
                src={item.imageUrl || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab"}
                alt={item.title}
                width={96}
                height={96}
                className="cart-item-image"
              />
              <div style={{ flex: 1 }}>
                <Link href={`/products/${item.slug}`}>
                  <strong>{item.title}</strong>
                </Link>
                <div className="muted">{formatArs(item.priceArs)}</div>
              </div>
              <input
                className="input"
                type="number"
                min={1}
                max={item.stock}
                value={item.quantity}
                onChange={(event) => updateQuantity(item.productId, Number(event.target.value))}
                style={{ width: 80 }}
              />
              <div style={{ minWidth: 100, textAlign: "right" }} className="price">
                {formatArs(item.priceArs * item.quantity)}
              </div>
              <button className="button button-ghost" onClick={() => removeItem(item.productId)}>
                Quitar
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-body stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>Total</span>
            <strong>{formatArs(subtotal)}</strong>
          </div>
          <Link href="/checkout" className="button button-primary">
            Continuar al checkout
          </Link>
        </div>
      </div>
    </section>
  );
}
