import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

type Params = {
  params: {
    id: string;
  };
};

export async function DELETE(_: NextRequest, { params }: Params) {
  const { response } = await requireAdminOrResponse();
  if (response) {
    return response;
  }

  try {
    await prisma.collection.delete({
      where: { id: params.id }
    });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo eliminar la colección.", 400);
  }

  return NextResponse.json({ ok: true });
}
