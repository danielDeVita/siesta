import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportsView } from "@/components/admin/reports-view";

export const dynamic = "force-dynamic";

type Period = "7d" | "30d" | "90d" | "all";

function getStartDate(period: Period): Date | undefined {
  if (period === "all") return undefined;
  const now = new Date();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  now.setDate(now.getDate() - days);
  return now;
}

export default async function AdminReportsPage({
  searchParams
}: {
  searchParams: { period?: string };
}) {
  await requireAdminPageSession();

  const period: Period = (["7d", "30d", "90d", "all"].includes(searchParams.period ?? "")
    ? searchParams.period
    : "30d") as Period;

  const startDate = getStartDate(period);

  const [sales, cancellations, byStatus, topProducts, customerOrders, unitsSold, outOfStockProducts, activeInventory] = await Promise.all([
    prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "READY_FOR_PICKUP", "COMPLETED"] },
        ...(startDate ? { paidAt: { gte: startDate } } : {})
      },
      _sum: { totalAmount: true },
      _count: { id: true },
      _avg: { totalAmount: true }
    }),
    prisma.order.count({
      where: {
        status: "CANCELLED",
        ...(startDate ? { updatedAt: { gte: startDate } } : {})
      }
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true }
    }),
    prisma.orderItem.groupBy({
      by: ["productNameSnapshot"],
      where: {
        order: {
          status: { in: ["PAID", "READY_FOR_PICKUP", "COMPLETED"] },
          ...(startDate ? { paidAt: { gte: startDate } } : {})
        }
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["PAID", "READY_FOR_PICKUP", "COMPLETED"] },
        ...(startDate ? { paidAt: { gte: startDate } } : {})
      },
      select: {
        customerEmail: true,
        customerName: true,
        customerWhatsapp: true,
        totalAmount: true
      }
    }),
    prisma.orderItem.aggregate({
      where: {
        order: {
          status: { in: ["PAID", "READY_FOR_PICKUP", "COMPLETED"] },
          ...(startDate ? { paidAt: { gte: startDate } } : {})
        }
      },
      _sum: { quantity: true }
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", stock: 0 },
      select: { title: true, priceArs: true },
      orderBy: { title: "asc" }
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { priceArs: true, stock: true }
    })
  ]);

  const customerMap = new Map<string, { name: string; email: string; whatsapp: string; orderCount: number; totalSpent: number }>();
  for (const order of customerOrders) {
    const existing = customerMap.get(order.customerEmail);
    if (existing) {
      existing.orderCount++;
      existing.totalSpent += order.totalAmount;
    } else {
      customerMap.set(order.customerEmail, {
        name: order.customerName,
        email: order.customerEmail,
        whatsapp: order.customerWhatsapp,
        orderCount: 1,
        totalSpent: order.totalAmount
      });
    }
  }
  const allCustomers = Array.from(customerMap.values()).sort(
    (a, b) => b.orderCount - a.orderCount || b.totalSpent - a.totalSpent
  );
  const uniqueCustomers = allCustomers.length;
  const returningCustomers = allCustomers.filter((c) => c.orderCount > 1).length;
  const topCustomers = allCustomers.slice(0, 10);
  const inventoryValue = activeInventory.reduce((sum, p) => sum + p.priceArs * p.stock, 0);
  const cancellationRate = (sales._count.id + cancellations) > 0
    ? Math.round((cancellations / (sales._count.id + cancellations)) * 100)
    : 0;

  return (
    <ReportsView
      period={period}
      kpis={{
        totalRevenue: sales._sum.totalAmount ?? 0,
        orderCount: sales._count.id,
        avgTicket: Math.round(sales._avg.totalAmount ?? 0),
        cancellations,
        uniqueCustomers,
        returningCustomers,
        unitsSold: unitsSold._sum.quantity ?? 0,
        cancellationRate
      }}
      byStatus={byStatus.map((row) => ({
        status: row.status,
        count: row._count.id
      }))}
      topProducts={topProducts.map((row) => ({
        name: row.productNameSnapshot,
        units: row._sum.quantity ?? 0,
        revenue: row._sum.lineTotal ?? 0
      }))}
      topCustomers={topCustomers}
      inventory={{
        value: inventoryValue,
        outOfStock: outOfStockProducts.map((p) => ({ title: p.title, priceArs: p.priceArs }))
      }}
    />
  );
}
