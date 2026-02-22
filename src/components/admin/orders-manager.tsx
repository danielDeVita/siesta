"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatArs } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/order";

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED"
  | "PAYMENT_FAILED";

type AdminOrder = {
  id: string;
  publicCode: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  pickupNotes: string | null;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    id: string;
    productNameSnapshot: string;
    quantity: number;
  }>;
};

const NEXT_OPTIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAYMENT_FAILED: ["CANCELLED"],
  PAID: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

export function AdminOrdersManager({ initialOrders }: { initialOrders: AdminOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const grouped = useMemo(() => {
    return orders.reduce<Record<OrderStatus, AdminOrder[]>>(
      (accumulator, order) => {
        accumulator[order.status].push(order);
        return accumulator;
      },
      {
        PENDING_PAYMENT: [],
        PAID: [],
        READY_FOR_PICKUP: [],
        COMPLETED: [],
        CANCELLED: [],
        PAYMENT_FAILED: []
      }
    );
  }, [orders]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setError(null);
    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });
    const data = (await response.json()) as { error?: string; order?: AdminOrder };
    if (!response.ok || !data.order) {
      setError(data.error ?? "No se pudo actualizar el estado.");
      return;
    }
    setOrders((current) => current.map((order) => (order.id === orderId ? data.order! : order)));
  };

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <section className="admin-shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Admin Pedidos</h1>
        <div className="row">
          <button className="button button-ghost" onClick={() => router.push("/admin/products")}>
            Ver productos
          </button>
          <button className="button button-ghost" onClick={() => router.push("/admin/reports")}>
            Reportes
          </button>
          <button className="button button-ghost" onClick={() => router.push("/admin/account")}>
            Mi cuenta
          </button>
          <button className="button button-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>
      {error && <p className="feedback-error">{error}</p>}

      {(Object.keys(grouped) as OrderStatus[]).map((status) => (
        <section className="card" key={status}>
          <div className="card-body stack">
            <h2 style={{ margin: 0 }}>
              {ORDER_STATUS_LABELS[status]} ({grouped[status].length})
            </h2>
            {grouped[status].length === 0 && <p className="muted">Sin pedidos en este estado.</p>}
            {grouped[status].map((order) => (
              <article key={order.id} className="card">
                <div className="card-body stack">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>{order.publicCode}</strong>
                    <span className="muted">{new Date(order.createdAt).toLocaleString("es-AR")}</span>
                  </div>
                  <div>
                    <div>{order.customerName}</div>
                    <div className="muted">{order.customerEmail}</div>
                    <div className="muted">{order.customerWhatsapp}</div>
                    {order.pickupNotes && <div className="muted">Nota: {order.pickupNotes}</div>}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.productNameSnapshot} x {item.quantity}
                      </li>
                    ))}
                  </ul>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>Total: {formatArs(order.totalAmount)}</strong>
                    <div className="row">
                      {NEXT_OPTIONS[order.status].map((next) => (
                        <button
                          key={next}
                          className="button button-ghost"
                          onClick={() => updateStatus(order.id, next)}
                        >
                          Pasar a {ORDER_STATUS_LABELS[next]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
