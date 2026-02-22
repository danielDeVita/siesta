import { prisma } from "@/lib/prisma";
import { toProductDTO } from "@/lib/mappers";
import { CatalogGrid } from "@/components/catalog-grid";
export const dynamic = "force-dynamic";

type SearchParams = { cat?: string; col?: string };

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { images: true, category: true, collection: true },
    orderBy: { createdAt: "desc" }
  });

  const data = products.map(toProductDTO);
  const initialCategoryId = searchParams.cat ?? null;
  const initialCollectionId = searchParams.col ?? null;

  return (
    <section className="stack home-stack">
      <header className="hero">
        <div className="hero-kicker">Colección Siesta</div>
        <h1 className="hero-title">Bolsas estampadas hechas para usar todos los días</h1>
        <p className="hero-copy">
          Diseños únicos en series pequeñas. Elegí tu bolsa, pagá online y coordinamos el retiro por WhatsApp.
        </p>
      </header>

      {data.length === 0 ? (
        <section className="card">
          <div className="card-body">
            <p className="muted">Aún no hay productos activos.</p>
          </div>
        </section>
      ) : (
        <section id="catalogo" className="stack">
          <div className="home-section-head">
            <h2 style={{ margin: 0 }}>Productos</h2>
          </div>
          <CatalogGrid
            products={data}
            initialCategoryId={initialCategoryId}
            initialCollectionId={initialCollectionId}
          />
        </section>
      )}
    </section>
  );
}
