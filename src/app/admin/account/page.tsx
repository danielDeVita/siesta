import { requireAdminPageSession } from "@/lib/auth";
import { AccountSettings } from "@/components/admin/account-settings";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  const session = await requireAdminPageSession();

  return <AccountSettings currentEmail={session.email} />;
}
