import { CollectionsManager } from "@/components/admin/collections-manager";
import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  await requireAdminPageSession();

  const collections = await prisma.collection.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <CollectionsManager
      collections={collections.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug
      }))}
    />
  );
}
