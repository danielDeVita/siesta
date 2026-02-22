import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/login-form";
import { getAdminSessionFromCookies } from "@/lib/auth";

export default async function AdminLoginPage() {
  const session = await getAdminSessionFromCookies();
  if (session) {
    redirect("/admin/reports");
  }

  return <AdminLoginForm />;
}
