import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin-api";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE_MB = 8;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(request: NextRequest) {
  const { response } = await requireAdminOrResponse();
  if (response) {
    return response;
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const categoryIdValue = formData?.get("categoryId");
  const productTitleValue = formData?.get("productTitle");

  if (!(file instanceof File)) {
    return jsonError("No se recibió imagen.", 400);
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return jsonError("Formato no soportado. Usá JPG, PNG, WEBP o AVIF.", 415);
  }

  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return jsonError(`La imagen supera ${MAX_IMAGE_SIZE_MB}MB.`, 413);
  }

  try {
    const categoryId = typeof categoryIdValue === "string" ? categoryIdValue.trim() : "";
    const productTitle = typeof productTitleValue === "string" ? productTitleValue.trim() : "";

    const category = categoryId
      ? await prisma.category.findUnique({
          where: { id: categoryId },
          select: { slug: true }
        })
      : null;

    const uploaded = await uploadImageToCloudinary(file, {
      categorySlug: category?.slug ?? null,
      productTitle
    });

    return NextResponse.json({ image: uploaded }, { status: 201 });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo subir la imagen.", 502);
  }
}
