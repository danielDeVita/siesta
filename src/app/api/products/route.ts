import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toProductDTO } from "@/lib/mappers";
import { backfillLegacyMeasurements } from "@/lib/legacy-measurements-backfill";

export async function GET() {
  await backfillLegacyMeasurements(prisma);

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: {
      images: true,
      category: {
        include: {
          fieldDefinitions: {
            orderBy: { sortOrder: "asc" }
          }
        }
      },
      collection: true,
      fieldValues: true
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    products: products.map(toProductDTO)
  });
}
