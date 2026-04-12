import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { toProductDTO } from "@/lib/mappers";
import { CatalogGrid } from "@/components/catalog-grid";
import { backfillLegacyMeasurements } from "@/lib/legacy-measurements-backfill";
import sineWordmarkImg from "@/assets/Sine.png";
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE_PATH
} from "@/lib/seo";
export const dynamic = "force-dynamic";

type SearchParams = { cat?: string; col?: string };

type HomeMetadataProps = {
  searchParams: SearchParams;
};

export async function generateMetadata({ searchParams }: HomeMetadataProps): Promise<Metadata> {
  const hasFilters = Boolean(searchParams.cat || searchParams.col);

  return {
    title: "Objetos ilustrados y diseño original",
    description: SITE_DESCRIPTION,
    alternates: {
      canonical: "/"
    },
    openGraph: {
      title: `${SITE_NAME} | Objetos ilustrados y diseño original`,
      description: SITE_DESCRIPTION,
      images: [{ url: SITE_OG_IMAGE_PATH }],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} | Objetos ilustrados y diseño original`,
      description: SITE_DESCRIPTION,
      images: [SITE_OG_IMAGE_PATH]
    },
    robots: hasFilters
      ? {
          index: false,
          follow: true
        }
      : undefined
  };
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
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

  const data = products.map(toProductDTO);
  const initialCategoryId = searchParams.cat ?? null;
  const initialCollectionId = searchParams.col ?? null;
  const structuredData = [buildOrganizationStructuredData(), buildWebsiteStructuredData()];

  return (
    <section className="stack home-stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <header className="hero">
        <h1 className="home-logo">
          <span className="sr-only">Sine</span>
          <img
            src={sineWordmarkImg.src}
            width={sineWordmarkImg.width}
            height={sineWordmarkImg.height}
            alt=""
            aria-hidden="true"
            className="home-logo-image"
          />
        </h1>
        <p className="home-manifesto">Salón del imaginario nostálgico y estético</p>
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
