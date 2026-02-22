"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { ProductDTO } from "@/types";

type Filter = "ALL" | "AVAILABLE" | "SOLD_OUT";

type CatalogGridProps = {
  products: ProductDTO[];
  initialCategoryId?: string | null;
  initialCollectionId?: string | null;
};

export function CatalogGrid({ products, initialCategoryId = null, initialCollectionId = null }: CatalogGridProps) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(initialCategoryId);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(initialCollectionId);

  const uniqueCategories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of products) {
      if (p.categoryId && p.categoryName) seen.set(p.categoryId, p.categoryName);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [products]);

  const uniqueCollections = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of products) {
      if (p.collectionId && p.collectionName) seen.set(p.collectionId, p.collectionName);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [products]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = products;

    if (query) {
      result = result.filter(
        (product) =>
          product.title.toLowerCase().includes(query) ||
          (product.description ?? "").toLowerCase().includes(query)
      );
    }

    if (categoryFilter) result = result.filter((p) => p.categoryId === categoryFilter);
    if (collectionFilter) result = result.filter((p) => p.collectionId === collectionFilter);

    if (filter === "AVAILABLE") {
      return result.filter((product) => product.stock > 0);
    }
    if (filter === "SOLD_OUT") {
      return result.filter((product) => product.stock === 0);
    }
    return result;
  }, [filter, products, searchQuery, categoryFilter, collectionFilter]);

  return (
    <section className="stack">
      <div className="section-block">
        <div className="catalog-toolbar">
          <input
            className="input"
            type="search"
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <div className="row">
            <button
              className={`button ${filter === "ALL" ? "button-primary" : "button-ghost"}`}
              onClick={() => setFilter("ALL")}
            >
              Todos
            </button>
            <button
              className={`button ${filter === "AVAILABLE" ? "button-primary" : "button-ghost"}`}
              onClick={() => setFilter("AVAILABLE")}
            >
              Con stock
            </button>
            <button
              className={`button ${filter === "SOLD_OUT" ? "button-primary" : "button-ghost"}`}
              onClick={() => setFilter("SOLD_OUT")}
            >
              Agotados
            </button>
          </div>
          <strong>{filtered.length} productos</strong>
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="card">
          <div className="card-body">
            <p className="muted">No hay productos para este filtro.</p>
          </div>
        </section>
      ) : (
        <div className="product-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
