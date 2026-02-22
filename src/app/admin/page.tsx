import { redirect } from "next/navigation";
import { getAdminSessionFromCookies } from "@/lib/auth";

export default async function AdminRootPage() {
  const session = await getAdminSessionFromCookies();
  if (session) {
    redirect("/admin/products");
  }
  redirect("/admin/login");
}
