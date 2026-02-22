import { NextResponse } from "next/server";
import { requireAdminSessionApi } from "@/lib/auth";

export async function requireAdminOrResponse() {
  const session = await requireAdminSessionApi();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }
  return { session, response: null };
}
