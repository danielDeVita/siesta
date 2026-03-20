"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { formatArs } from "@/lib/money";
import { ConfirmModal } from "@/components/confirm-modal";
import type { ProductAttributeDTO, CategoryFieldDefinitionDTO } from "@/types";

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
    publicId: string | null;
    altText: string | null;
    sortOrder: number;
  }>;
  attributes: ProductAttributeDTO[];
  catalogAttributesSummary: string;
};

type CategoryOption = {
  id: string;
  name: string;
  fieldDefinitions: CategoryFieldDefinitionDTO[];
};

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
  publicId: string | null;
  altText: string;
};

type AttributeInputState = {
  fieldDefinitionId: string;
  key: string;
  label: string;
  type: CategoryFieldDefinitionDTO["type"];
  required: boolean;
  unit: string | null;
  options: string[];
  value: string | boolean | null;
  showInCatalog: boolean;
  showInDetail: boolean;
};

type FormState = {
  id?: string;
  title: string;
  description: string;
  priceArs: string;
  stock: string;
  status: ProductStatus;
  categoryId: string;
  collectionId: string;
  images: FormImage[];
  attributes: AttributeInputState[];
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  priceArs: "",
  stock: "",
  status: "ACTIVE",
  categoryId: "",
  collectionId: "",
  images: [],
  attributes: []
};

function filenameToAltText(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function getActiveDefinitions(category: CategoryOption | undefined) {
  return (category?.fieldDefinitions ?? []).filter((definition) => definition.isActive);
}

function buildAttributeState(
  definitions: CategoryFieldDefinitionDTO[],
  currentAttributes: ProductAttributeDTO[] = []
): AttributeInputState[] {
  const currentByKey = new Map(currentAttributes.map((attribute) => [attribute.key, attribute]));

  return definitions.map((definition) => {
    const current = currentByKey.get(definition.key);

    return {
      fieldDefinitionId: definition.id,
      key: definition.key,
      label: definition.label,
      type: definition.type,
      required: definition.required,
      unit: definition.unit,
      options: definition.options,
      value:
        current?.rawValue === null || current?.rawValue === undefined
          ? definition.type === "BOOLEAN"
            ? null
            : ""
          : typeof current.rawValue === "boolean"
            ? current.rawValue
            : String(current.rawValue),
      showInCatalog: definition.showInCatalog,
      showInDetail: definition.showInDetail
    };
  });
}

function categoryProductForm(product: AdminProduct, categories: CategoryOption[]): FormState {
  const category = categories.find((item) => item.id === product.categoryId);
  return {
    id: product.id,
    title: product.title,
    description: product.description ?? "",
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
        publicId: image.publicId,
        altText: image.altText ?? ""
      })),
    attributes: buildAttributeState(getActiveDefinitions(category), product.attributes)
  };
}

function remapAttributes(
  currentAttributes: AttributeInputState[],
  previousCategory: CategoryOption | undefined,
  nextCategory: CategoryOption | undefined
) {
  const previousDefinitions = getActiveDefinitions(previousCategory);
  const currentValuesByKey = new Map(
    currentAttributes.map((attribute) => [attribute.key, attribute.value])
  );

  return getActiveDefinitions(nextCategory).map((definition) => {
    const previousDefinition = previousDefinitions.find(
      (item) => item.key === definition.key && item.type === definition.type
    );
    const preservedValue = previousDefinition ? currentValuesByKey.get(previousDefinition.key) : undefined;

    return {
      fieldDefinitionId: definition.id,
      key: definition.key,
      label: definition.label,
      type: definition.type,
      required: definition.required,
      unit: definition.unit,
      options: definition.options,
      value: preservedValue ?? (definition.type === "BOOLEAN" ? null : ""),
      showInCatalog: definition.showInCatalog,
      showInDetail: definition.showInDetail
    };
  });
}

export function AdminProductsManager({ initialProducts, categories, collections }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [pending, setPending] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const editing = useMemo(() => Boolean(form.id), [form.id]);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId),
    [categories, form.categoryId]
  );
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
        body.append("categoryId", form.categoryId);
        body.append("productTitle", form.title);

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
          publicId: data.image.publicId,
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

  const updateAttributeValue = (fieldDefinitionId: string, value: string | boolean | null) => {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute) =>
        attribute.fieldDefinitionId === fieldDefinitionId ? { ...attribute, value } : attribute
      )
    }));
  };

  const applyCategoryChange = (nextCategoryId: string) => {
    const previousCategory = categories.find((category) => category.id === form.categoryId);
    const nextCategory = categories.find((category) => category.id === nextCategoryId);

    setForm((current) => ({
      ...current,
      categoryId: nextCategoryId,
      attributes: remapAttributes(current.attributes, previousCategory, nextCategory)
    }));
  };

  const handleCategoryChange = (nextCategoryId: string) => {
    if (nextCategoryId === form.categoryId) {
      return;
    }

    const hasFilledAttributes = form.attributes.some((attribute) =>
      typeof attribute.value === "boolean" ? true : String(attribute.value ?? "").trim().length > 0
    );

    if (!hasFilledAttributes) {
      applyCategoryChange(nextCategoryId);
      return;
    }

    setPending({
      title: "Cambiar categoría",
      description:
        "Se van a recalcular los campos del producto según la nueva categoría. Se intentarán conservar solo los que sean compatibles.",
      onConfirm: () => {
        applyCategoryChange(nextCategoryId);
        setPending(null);
      }
    });
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

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priceArs: Math.round(Number(form.priceArs) * 100),
      stock: Number(form.stock),
      status: form.status,
      categoryId: form.categoryId || null,
      collectionId: form.collectionId || null,
      images: form.images.map((image, index) => ({
        url: image.url,
        publicId: image.publicId,
        altText: image.altText.trim() || undefined,
        sortOrder: index
      })),
      attributes: form.attributes.map((attribute) => ({
        fieldDefinitionId: attribute.fieldDefinitionId,
        value: attribute.value === "" ? null : attribute.value
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
    setForm(categoryProductForm(product, categories));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deleteProduct = async (id: string) => {
    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "No se pudo eliminar.");
      return;
    }
    setProducts((current) => current.filter((product) => product.id !== id));
  };

  const confirmDeleteProduct = (product: { id: string; title: string }) => {
    setPending({
      title: "Eliminar producto",
      description: `¿Eliminar "${product.title}"? Se borrarán también sus imágenes. Esta acción no se puede deshacer.`,
      onConfirm: () => {
        void deleteProduct(product.id);
        setPending(null);
      }
    });
  };

  const confirmRemoveImage = (index: number, url: string) => {
    const name = url.split("/").pop()?.split("?")[0] ?? `imagen ${index + 1}`;
    setPending({
      title: "Quitar imagen",
      description: `¿Quitar "${name}" del producto? Si guardás el formulario, la imagen se eliminará definitivamente.`,
      onConfirm: () => {
        removeImage(index);
        setPending(null);
      }
    });
  };

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <section className="admin-shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="admin-login-title">Admin Productos</h1>
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
                  onChange={(event) => handleCategoryChange(event.target.value)}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
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
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <div className="stack" style={{ gap: "0.4rem" }}>
                <label className="label">Características del producto</label>
                <p className="muted" style={{ margin: 0 }}>
                  {selectedCategory
                    ? `La categoría "${selectedCategory.name}" define estos campos.`
                    : "Seleccioná una categoría para cargar campos específicos."}
                </p>
              </div>

              {form.attributes.length === 0 ? (
                <p className="muted" style={{ marginTop: "0.6rem" }}>
                  No hay campos dinámicos para completar.
                </p>
              ) : (
                <div className="stack" style={{ marginTop: "0.75rem", gap: "0.9rem" }}>
                  {form.attributes.map((attribute) => (
                    <div key={attribute.fieldDefinitionId} className="field">
                      <label className="label">
                        {attribute.label}
                        {attribute.required ? " *" : ""}
                        {attribute.unit ? ` (${attribute.unit})` : ""}
                      </label>

                      {attribute.type === "TEXT" && (
                        <input
                          className="input"
                          value={typeof attribute.value === "string" ? attribute.value : ""}
                          onChange={(event) => updateAttributeValue(attribute.fieldDefinitionId, event.target.value)}
                        />
                      )}

                      {attribute.type === "NUMBER" && (
                        <input
                          type="number"
                          step="any"
                          className="input"
                          value={typeof attribute.value === "string" ? attribute.value : ""}
                          onChange={(event) => updateAttributeValue(attribute.fieldDefinitionId, event.target.value)}
                        />
                      )}

                      {attribute.type === "SELECT" && (
                        <select
                          className="input"
                          value={typeof attribute.value === "string" ? attribute.value : ""}
                          onChange={(event) => updateAttributeValue(attribute.fieldDefinitionId, event.target.value)}
                        >
                          <option value="">Seleccionar</option>
                          {attribute.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}

                      {attribute.type === "BOOLEAN" && (
                        <select
                          className="input"
                          value={attribute.value === null ? "" : attribute.value ? "true" : "false"}
                          onChange={(event) =>
                            updateAttributeValue(
                              attribute.fieldDefinitionId,
                              event.target.value === "" ? null : event.target.value === "true"
                            )
                          }
                        >
                          <option value="">Seleccionar</option>
                          <option value="true">Sí</option>
                          <option value="false">No</option>
                        </select>
                      )}

                      <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                        {attribute.showInCatalog ? "Visible en catálogo" : "Oculto en catálogo"} ·{" "}
                        {attribute.showInDetail ? "Visible en detalle" : "Oculto en detalle"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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
                        sizes="(max-width: 700px) 100vw, 180px"
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
                        onClick={() => confirmRemoveImage(index, form.images[index]?.url ?? "")}
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
                <th>Características</th>
                <th>Estado</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const thumb = product.images.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0];
                const categoryName = categories.find((category) => category.id === product.categoryId)?.name ?? "-";
                const collectionName = collections.find((collection) => collection.id === product.collectionId)?.name ?? "-";

                return (
                  <tr key={product.id}>
                    <td>
                      {thumb ? (
                        <Image
                          src={thumb.url}
                          alt={thumb.altText || product.title}
                          width={180}
                          height={180}
                          sizes="180px"
                          style={{ objectFit: "cover", borderRadius: 6, display: "block", width: "180px", height: "180px" }}
                        />
                      ) : (
                        <div style={{ width: 180, height: 180, background: "var(--color-border)", borderRadius: 6 }} />
                      )}
                    </td>
                    <td style={{ verticalAlign: "middle" }}>{product.title}</td>
                    <td style={{ verticalAlign: "middle" }}>{categoryName}</td>
                    <td style={{ verticalAlign: "middle" }}>{collectionName}</td>
                    <td style={{ verticalAlign: "middle", minWidth: 220 }}>
                      {product.catalogAttributesSummary || product.measurements || "-"}
                    </td>
                    <td style={{ verticalAlign: "middle" }}>
                      {{ ACTIVE: "Activo", ARCHIVED: "Archivado" }[product.status]}
                    </td>
                    <td style={{ verticalAlign: "middle" }}>{product.stock}</td>
                    <td style={{ verticalAlign: "middle" }}>{formatArs(product.priceArs)}</td>
                    <td style={{ verticalAlign: "middle" }}>
                      <div className="row">
                        <button className="button button-ghost" onClick={() => editProduct(product)}>
                          Editar
                        </button>
                        <button className="button button-ghost" onClick={() => confirmDeleteProduct(product)}>
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

      <ConfirmModal
        open={pending !== null}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        onConfirm={pending?.onConfirm ?? (() => {})}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}
