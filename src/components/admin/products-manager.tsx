"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { formatArs } from "@/lib/money";

type ProductStatus = "ACTIVE" | "ARCHIVED";

type AdminProduct = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  measurements: string | null;
  priceArs: number;
  stock: number;
  status: ProductStatus;
  categoryId: string | null;
  collectionId: string | null;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    sortOrder: number;
  }>;
};

type CategoryOption = { id: string; name: string };
type CollectionOption = { id: string; name: string };

type Props = {
  initialProducts: AdminProduct[];
  categories: CategoryOption[];
  collections: CollectionOption[];
};

type UploadResponse = {
  image?: {
    url: string;
    publicId: string;
    width: number | null;
    height: number | null;
  };
  error?: string;
};

type FormImage = {
  url: string;
  altText: string;
};

type FormState = {
  id?: string;
  title: string;
  description: string;
  measurementsLargo: string;
  measurementsAlto: string;
  priceArs: string;
  stock: string;
  status: ProductStatus;
  categoryId: string;
  collectionId: string;
  images: FormImage[];
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  measurementsLargo: "",
  measurementsAlto: "",
  priceArs: "",
  stock: "",
  status: "ACTIVE",
  categoryId: "",
  collectionId: "",
  images: []
};

function filenameToAltText(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

export function AdminProductsManager({ initialProducts, categories, collections }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const router = useRouter();

  const formRef = useRef<HTMLFormElement>(null);
  const editing = useMemo(() => Boolean(form.id), [form.id]);
  const canSubmit = useMemo(
    () =>
      !loading &&
      !uploadingImages &&
      form.title.trim().length > 1 &&
      form.images.length > 0 &&
      Number(form.priceArs) > 0 &&
      Number(form.stock) >= 0,
    [form.images.length, form.priceArs, form.stock, form.title, loading, uploadingImages]
  );

  const resetForm = () => {
    setError(null);
    setForm(EMPTY_FORM);
  };

  const onSelectFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setUploadingImages(true);
    setError(null);

    try {
      const uploaded: FormImage[] = [];

      for (const file of files) {
        const body = new FormData();
        body.append("file", file);

        const response = await fetch("/api/admin/uploads", {
          method: "POST",
          body
        });

        const data = (await response.json()) as UploadResponse;

        if (!response.ok || !data.image) {
          throw new Error(data.error ?? `No se pudo subir ${file.name}`);
        }

        uploaded.push({
          url: data.image.url,
          altText: filenameToAltText(file.name)
        });
      }

      setForm((current) => ({
        ...current,
        images: [...current.images, ...uploaded]
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Error al subir imágenes.");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index)
    }));
  };

  const updateImageAltText = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) =>
        imageIndex === index ? { ...image, altText: value } : image
      )
    }));
  };

  const upsertProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const largo = form.measurementsLargo.trim();
    const alto = form.measurementsAlto.trim();
    const measurements = largo && alto ? `${largo} x ${alto} cm` : undefined;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      measurements,
      priceArs: Math.round(Number(form.priceArs) * 100),
      stock: Number(form.stock),
      status: form.status,
      categoryId: form.categoryId || null,
      collectionId: form.collectionId || null,
      images: form.images.map((image, index) => ({
        url: image.url,
        altText: image.altText.trim() || undefined,
        sortOrder: index
      }))
    };

    try {
      const response = await fetch(form.id ? `/api/admin/products/${form.id}` : "/api/admin/products", {
        method: form.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as { error?: string; product?: AdminProduct };
      if (!response.ok || !data.product) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }

      if (form.id) {
        setProducts((current) => current.map((product) => (product.id === data.product!.id ? data.product! : product)));
      } else {
        setProducts((current) => [data.product!, ...current]);
      }

      resetForm();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const editProduct = (product: AdminProduct) => {
    setError(null);
    const measurementsParts = product.measurements?.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
    setForm({
      id: product.id,
      title: product.title,
      description: product.description ?? "",
      measurementsLargo: measurementsParts?.[1] ?? "",
      measurementsAlto: measurementsParts?.[2] ?? "",
      priceArs: String(product.priceArs / 100),
      stock: String(product.stock),
      status: product.status,
      categoryId: product.categoryId ?? "",
      collectionId: product.collectionId ?? "",
      images: product.images
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((image) => ({
          url: image.url,
          altText: image.altText ?? ""
        }))
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deleteProduct = async (id: string) => {
    const confirmed = window.confirm("¿Eliminar producto?");
    if (!confirmed) return;

    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "No se pudo eliminar.");
      return;
    }
    setProducts((current) => current.filter((product) => product.id !== id));
  };

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <section className="admin-shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Admin Productos</h1>
        <div className="row">
          <button className="button button-ghost" onClick={() => router.push("/admin/categories")}>
            Categorías
          </button>
          <button className="button button-ghost" onClick={() => router.push("/admin/collections")}>
            Colecciones
          </button>
          <button className="button button-ghost" onClick={() => router.push("/admin/orders")}>
            Ver pedidos
          </button>
          <button className="button button-ghost" onClick={() => router.push("/admin/reports")}>
            Reportes
          </button>
          <button className="button button-ghost" onClick={() => router.push("/admin/account")}>
            Mi cuenta
          </button>
          <button className="button button-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <form ref={formRef} className="card" onSubmit={upsertProduct}>
        <div className="card-body stack">
          <h2 style={{ margin: 0 }}>{editing ? "Editar producto" : "Nuevo producto"}</h2>
          <p className="muted" style={{ margin: 0 }}>
            El enlace del producto se genera automáticamente desde el título.
          </p>

          <div className="field-grid">
            <div className="field">
              <label className="label">Título</label>
              <input
                className="input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label className="label">Descripción</label>
              <textarea
                className="input textarea"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="field">
              <label className="label">Medidas</label>
              <div className="row" style={{ alignItems: "center", gap: 8 }}>
                <input
                  type="number"
                  min={1}
                  className="input"
                  style={{ width: 80 }}
                  value={form.measurementsLargo}
                  onChange={(event) => setForm((current) => ({ ...current, measurementsLargo: event.target.value }))}
                  placeholder="Largo"
                />
                <span className="muted">x</span>
                <input
                  type="number"
                  min={1}
                  className="input"
                  style={{ width: 80 }}
                  value={form.measurementsAlto}
                  onChange={(event) => setForm((current) => ({ ...current, measurementsAlto: event.target.value }))}
                  placeholder="Alto"
                />
                <span className="muted">cm</span>
              </div>
            </div>

            <div className="row">
              <div className="field" style={{ flex: 1 }}>
                <label className="label">Precio (ARS)</label>
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  className="input"
                  value={form.priceArs}
                  onChange={(event) => setForm((current) => ({ ...current, priceArs: event.target.value }))}
                  placeholder="Ej: 12500"
                  required
                />
              </div>

              <div className="field" style={{ width: 120 }}>
                <label className="label">Stock</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.stock}
                  onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                  required
                />
              </div>

              <div className="field" style={{ width: 180 }}>
                <label className="label">Estado</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, status: event.target.value as ProductStatus }))
                  }
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="ARCHIVED">Archivado</option>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="field" style={{ flex: 1 }}>
                <label className="label">Categoría</label>
                <select
                  className="input"
                  value={form.categoryId}
                  onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ flex: 1 }}>
                <label className="label">Colección</label>
                <select
                  className="input"
                  value={form.collectionId}
                  onChange={(event) => setForm((current) => ({ ...current, collectionId: event.target.value }))}
                >
                  <option value="">Sin colección</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="label">Imágenes</label>
              <div className="row">
                <label className="button button-ghost" style={{ cursor: uploadingImages ? "wait" : "pointer" }}>
                  {uploadingImages ? "Subiendo..." : "Subir imágenes"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    onChange={onSelectFiles}
                    disabled={uploadingImages}
                    style={{ display: "none" }}
                  />
                </label>
                <span className="muted">Podés seleccionar varias imágenes.</span>
              </div>

              {form.images.length === 0 && (
                <p className="muted" style={{ margin: 0 }}>
                  Todavía no cargaste imágenes.
                </p>
              )}

              {form.images.length > 0 && (
                <div className="image-upload-grid">
                  {form.images.map((image, index) => (
                    <article key={`${image.url}-${index}`} className="image-upload-item">
                      <Image
                        src={image.url}
                        alt={image.altText || `Imagen ${index + 1}`}
                        width={240}
                        height={240}
                        className="image-upload-preview"
                      />
                      <input
                        className="input"
                        value={image.altText}
                        onChange={(event) => updateImageAltText(index, event.target.value)}
                        placeholder={`Texto alternativo ${index + 1}`}
                      />
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => removeImage(index)}
                      >
                        Quitar imagen
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="feedback-error">{error}</p>}

          <div className="row">
            <button className="button button-primary" type="submit" disabled={!canSubmit}>
              {loading ? "Guardando..." : editing ? "Actualizar" : "Crear producto"}
            </button>
            {editing && (
              <button className="button button-ghost" type="button" onClick={resetForm} disabled={loading}>
                Cancelar edición
              </button>
            )}
          </div>
        </div>
      </form>

      <section className="card">
        <div className="card-body">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 196 }}></th>
                <th>Título</th>
                <th>Categoría</th>
                <th>Colección</th>
                <th>Medidas</th>
                <th>Estado</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const thumb = product.images.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0];
                const categoryName = categories.find((c) => c.id === product.categoryId)?.name ?? "-";
                const collectionName = collections.find((c) => c.id === product.collectionId)?.name ?? "-";
                return (
                <tr key={product.id}>
                  <td>
                    {thumb ? (
                      <Image
                        src={thumb.url}
                        alt={thumb.altText || product.title}
                        width={180}
                        height={180}
                        style={{ objectFit: "cover", borderRadius: 6, display: "block" }}
                      />
                    ) : (
                      <div style={{ width: 180, height: 180, background: "var(--color-border)", borderRadius: 6 }} />
                    )}
                  </td>
                  <td style={{ verticalAlign: "middle" }}>{product.title}</td>
                  <td style={{ verticalAlign: "middle" }}>{categoryName}</td>
                  <td style={{ verticalAlign: "middle" }}>{collectionName}</td>
                  <td style={{ verticalAlign: "middle" }}>{product.measurements || "-"}</td>
                  <td style={{ verticalAlign: "middle" }}>{{ ACTIVE: "Activo", ARCHIVED: "Archivado" }[product.status]}</td>
                  <td style={{ verticalAlign: "middle" }}>{product.stock}</td>
                  <td style={{ verticalAlign: "middle" }}>{formatArs(product.priceArs)}</td>
                  <td style={{ verticalAlign: "middle" }}>
                    <div className="row">
                      <button className="button button-ghost" onClick={() => editProduct(product)}>
                        Editar
                      </button>
                      <button className="button button-ghost" onClick={() => deleteProduct(product.id)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted">
                    No hay productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
