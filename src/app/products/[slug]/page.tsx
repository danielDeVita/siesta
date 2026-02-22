import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { OrnateFrameImage } from "@/components/ornate-frame-image";
import { formatArs } from "@/lib/money";
import { prisma } from "@/lib/prisma";

type Params = {
  params: {
    slug: string;
  };
};

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: Params) {
  const product = await prisma.product.findFirst({
    where: {
      slug: params.slug,
      status: "ACTIVE"
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
      collection: true
    }
  });

  if (!product) {
    notFound();
  }

  const cover = product.images[0]?.url || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab";

  return (
    <section className="stack">
      <Link href="/" className="muted">
        ← Volver al catálogo
      </Link>
      <div className="card">
        <div className="card-body" style={{ display: "grid", gap: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem"
            }}
          >
            <div className="stack">
              <div className="product-detail-frame-wrap">
                <OrnateFrameImage>
                  <Image
                    src={cover}
                    alt={product.title}
                    fill
                    sizes="(max-width: 700px) 100vw, 50vw"
                    className="product-detail-frame-img"
                  />
                </OrnateFrameImage>
              </div>
              {product.images.length > 1 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                  {product.images.slice(1).map((image) => (
                    <Image
                      key={image.id}
                      src={image.url}
                      alt={image.altText || product.title}
                      width={1200}
                      height={1200}
                      className="product-detail-thumb-image"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="stack">
              <h1 style={{ margin: 0, fontSize: "2rem" }}>{product.title}</h1>
              {(product.category || product.collection) && (
                <div className="row" style={{ gap: "0.4rem" }}>
                  {product.category && (
                    <span className="pill pill-category">{product.category.name}</span>
                  )}
                  {product.collection && (
                    <span className="pill pill-collection">{product.collection.name}</span>
                  )}
                </div>
              )}
              {product.measurements && (
                <p className="muted" style={{ margin: 0, fontSize: "1.05rem" }}>
                  Medidas: {product.measurements}
                </p>
              )}
              <div className="price" style={{ fontSize: "1.75rem" }}>
                {formatArs(product.priceArs)}
              </div>
              <span className={`pill ${product.stock > 0 ? "pill-ok" : "pill-warn"}`} style={{ fontSize: "0.95rem", padding: "0.3rem 0.75rem" }}>
                {product.stock > 0 ? `${product.stock} disponibles` : "Sin stock"}
              </span>
              {product.description && <p className="muted" style={{ fontSize: "1.05rem" }}>{product.description}</p>}
              <AddToCartButton
                product={{
                  productId: product.id,
                  slug: product.slug,
                  title: product.title,
                  priceArs: product.priceArs,
                  imageUrl: cover,
                  stock: product.stock
                }}
              />
              <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                Podés ajustar la cantidad desde el carrito antes de pagar.
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Retiro coordinado. Te contactamos por WhatsApp luego de la compra.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
