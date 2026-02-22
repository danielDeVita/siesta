import Image from "next/image";
import Link from "next/link";
import { formatArs } from "@/lib/money";
import type { ProductDTO } from "@/types";
import { OrnateFrameImage } from "./ornate-frame-image";

export function ProductCard({ product }: { product: ProductDTO }) {
  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-card-media-wrap">
        <OrnateFrameImage>
          <Image
            src={product.coverImageUrl || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab"}
            alt={product.title}
            fill
            sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw"
            className="product-card-media"
          />
        </OrnateFrameImage>
      </Link>
      <div className="product-card-body">
        <h3 className="product-title">
          <Link href={`/products/${product.slug}`}>{product.title}</Link>
        </h3>
        {product.measurements && <span className="muted">Medidas: {product.measurements}</span>}
        <span className="price">{formatArs(product.priceArs)}</span>
        <div className="product-card-foot">
          <span className={`pill ${product.stock > 0 ? "pill-ok" : "pill-warn"}`}>
            {product.stock > 0 ? `${product.stock} en stock` : "Agotado"}
          </span>
          <Link href={`/products/${product.slug}`} className="product-card-link">
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  );
}
