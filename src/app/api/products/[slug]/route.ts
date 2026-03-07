import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toProductDetailDTO } from "@/lib/mappers";
import { jsonError } from "@/lib/api";
import { backfillLegacyMeasurements } from "@/lib/legacy-measurements-backfill";

type Params = {
  params: { slug: string };
};

export async function GET(_: NextRequest, { params }: Params) {
  await backfillLegacyMeasurements(prisma);

  const product = await prisma.product.findFirst({
    where: {
      slug: params.slug,
      status: "ACTIVE"
    },
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
    }
  });

  if (!product) {
    return jsonError("Product not found", 404);
  }

  return NextResponse.json({
    product: toProductDetailDTO(product)
  });
}
