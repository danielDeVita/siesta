import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogGrid } from "@/components/catalog-grid";
import { toProductDTO } from "@/lib/mappers";
import { backfillLegacyMeasurements } from "@/lib/legacy-measurements-backfill";
import { prisma } from "@/lib/prisma";
import {
  buildCategorySeoDescription,
  buildBrandedTitle,
  SITE_OG_IMAGE_PATH
} from "@/lib/seo";

type Params = {
  params: {
    slug: string;
  };
};

export const dynamic = "force-dynamic";

async function getCategoryLandingBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: {
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
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const category = await getCategoryLandingBySlug(params.slug);

  if (!category) {
    return {
      title: "Categoría no encontrada",
      robots: {
        index: false,
        follow: false
      }
    };
  }

  const description = buildCategorySeoDescription(category.name, category.description);
  const image = category.products[0]?.images[0]?.url ?? SITE_OG_IMAGE_PATH;
  const canonical = `/categorias/${category.slug}`;
  const pageTitle = category.name;

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical
    },
    openGraph: {
      title: buildBrandedTitle(pageTitle),
      description,
      url: canonical,
      images: [{ url: image }],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: buildBrandedTitle(pageTitle),
      description,
      images: [image]
    }
  };
}

export default async function CategoryLandingPage({ params }: Params) {
  await backfillLegacyMeasurements(prisma);

  const category = await getCategoryLandingBySlug(params.slug);

  if (!category) {
    notFound();
  }

  const products = category.products.map(toProductDTO);

  return (
    <section className="stack home-stack">
      <header className="stack" style={{ gap: "0.45rem" }}>
        <Link href="/" className="muted">
          ← Volver al catálogo
        </Link>
        <div className="home-section-head">
          <h1 style={{ margin: 0 }}>{category.name}</h1>
        </div>
        {category.description.trim() ? (
          <p className="home-manifesto" style={{ justifySelf: "start", textAlign: "left", maxWidth: "72ch" }}>
            {category.description}
          </p>
        ) : null}
      </header>

      <CatalogGrid products={products} />
    </section>
  );
}
