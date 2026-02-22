import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { requireAdminOrResponse } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

export async function GET(request: NextRequest) {
  const { response } = await requireAdminOrResponse();
  if (response) {
    return response;
  }

  const status = request.nextUrl.searchParams.get("status");
  if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) {
    return jsonError("Invalid status filter", 400);
  }

  const orders = await prisma.order.findMany({
    where: status ? { status: status as OrderStatus } : undefined,
    include: {
      items: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({ orders });
}
