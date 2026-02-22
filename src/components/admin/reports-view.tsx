"use client";

import { useRouter } from "next/navigation";
import { formatArs } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/order";

type Period = "7d" | "30d" | "90d" | "all";

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED"
  | "PAYMENT_FAILED";

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
  all: "Todo"
};

type Props = {
  period: Period;
  kpis: {
    totalRevenue: number;
    orderCount: number;
    avgTicket: number;
    cancellations: number;
    uniqueCustomers: number;
    returningCustomers: number;
    unitsSold: number;
    cancellationRate: number;
  };
  byStatus: Array<{ status: OrderStatus; count: number }>;
  topProducts: Array<{ name: string; units: number; revenue: number }>;
  topCustomers: Array<{ name: string; email: string; whatsapp: string; orderCount: number; totalSpent: number }>;
  inventory: {
    value: number;
    outOfStock: Array<{ title: string; priceArs: number }>;
  };
};

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ flex: "1 1 180px" }}>
      <div className="card-body stack">
        <p className="muted" style={{ margin: 0 }}>
          {label}
        </p>
        <strong style={{ fontSize: "1.5rem" }}>{value}</strong>
      </div>
    </div>
  );
}

export function ReportsView({ period, kpis, byStatus, topProducts, topCustomers, inventory }: Props) {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <section className="admin-shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Reportes</h1>
        <div className="row">
          <button className="button button-ghost" onClick={() => router.push("/admin/products")}>
            Ver productos
          </button>
          <button className="button button-ghost" onClick={() => router.push("/admin/categories")}>
            Categorías
          </button>
          <button className="button button-ghost" onClick={() => router.push("/admin/collections")}>
            Colecciones
          </button>
          <button className="button button-ghost" onClick={() => router.push("/admin/orders")}>
            Ver pedidos
          </button>
          <button className="button button-ghost" onClick={() => router.push("/admin/account")}>
            Mi cuenta
          </button>
          <button className="button button-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="row">
        {(["7d", "30d", "90d", "all"] as Period[]).map((p) => (
          <button
            key={p}
            className={`button ${p === period ? "button-primary" : "button-ghost"}`}
            onClick={() => router.push(`/admin/reports?period=${p}`)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
        <KpiCard label="Ingresos" value={formatArs(kpis.totalRevenue)} />
        <KpiCard label="Pedidos pagados" value={String(kpis.orderCount)} />
        <KpiCard
          label="Ticket promedio"
          value={kpis.orderCount > 0 ? formatArs(kpis.avgTicket) : formatArs(0)}
        />
        <KpiCard label="Cancelaciones" value={String(kpis.cancellations)} />
        <KpiCard label="Clientes únicos" value={String(kpis.uniqueCustomers)} />
        <KpiCard label="Clientes recurrentes" value={String(kpis.returningCustomers)} />
        <KpiCard label="Unidades vendidas" value={String(kpis.unitsSold)} />
        <KpiCard label="Tasa de cancelación" value={`${kpis.cancellationRate}%`} />
      </div>

      <section className="card">
        <div className="card-body stack">
          <h2 style={{ margin: 0 }}>Clientes del período</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>WhatsApp</th>
                <th>Pedidos</th>
                <th>Total gastado</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c) => (
                <tr key={c.email}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.whatsapp}</td>
                  <td>{c.orderCount}{c.orderCount > 1 ? " ✦" : ""}</td>
                  <td>{formatArs(c.totalSpent)}</td>
                </tr>
              ))}
              {topCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Sin clientes en el período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {kpis.uniqueCustomers > 10 && (
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              Mostrando top 10 de {kpis.uniqueCustomers} clientes, ordenados por pedidos.
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-body stack">
          <h2 style={{ margin: 0 }}>Estado actual de pedidos</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {byStatus.map((row) => (
                <tr key={row.status}>
                  <td>{ORDER_STATUS_LABELS[row.status]}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
              {byStatus.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">
                    Sin pedidos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-body stack">
          <h2 style={{ margin: 0 }}>Productos más vendidos</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidades</th>
                <th>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product) => (
                <tr key={product.name}>
                  <td>{product.name}</td>
                  <td>{product.units}</td>
                  <td>{formatArs(product.revenue)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    Sin ventas en el período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-body stack">
          <h2 style={{ margin: 0 }}>Estado del inventario</h2>
          <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
            <KpiCard label="Valor total del inventario" value={formatArs(inventory.value)} />
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto sin stock</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              {inventory.outOfStock.map((product) => (
                <tr key={product.title}>
                  <td>{product.title}</td>
                  <td>{formatArs(product.priceArs)}</td>
                </tr>
              ))}
              {inventory.outOfStock.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">
                    Todos los productos tienen stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
