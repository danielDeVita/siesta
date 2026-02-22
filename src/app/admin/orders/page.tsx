import { AdminOrdersManager } from "@/components/admin/orders-manager";
import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requireAdminPageSession();

  const orders = await prisma.order.findMany({
    include: {
      items: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <AdminOrdersManager
      initialOrders={orders.map((order) => ({
        id: order.id,
        publicCode: order.publicCode,
        status: order.status,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerWhatsapp: order.customerWhatsapp,
        pickupNotes: order.pickupNotes,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          productNameSnapshot: item.productNameSnapshot,
          quantity: item.quantity
        }))
      }))}
    />
  );
}
