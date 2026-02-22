import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toProductDTO } from "@/lib/mappers";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { images: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    products: products.map(toProductDTO)
  });
}
