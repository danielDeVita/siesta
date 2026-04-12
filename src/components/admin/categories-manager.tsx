"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/confirm-modal";

type CategoryFieldType = "TEXT" | "NUMBER" | "SELECT" | "BOOLEAN";

type CategoryFieldDefinition = {
  id: string;
  key: string;
  label: string;
  type: CategoryFieldType;
  required: boolean;
  unit: string | null;
  options: string[];
  showInCatalog: boolean;
  showInDetail: boolean;
  sortOrder: number;
  isActive: boolean;
};

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  productCount: number;
  fieldDefinitions: CategoryFieldDefinition[];
};

type Props = {
  categories: CategoryRecord[];
};

type EditableField = {
  clientId: string;
  id?: string;
  key?: string;
  label: string;
  type: CategoryFieldType;
  required: boolean;
  unit: string;
  optionsText: string;
  showInCatalog: boolean;
  showInDetail: boolean;
  isActive: boolean;
};

type FormState = {
  id?: string;
  name: string;
  description: string;
  fieldDefinitions: EditableField[];
};

function emptyField(): EditableField {
  return {
    clientId: crypto.randomUUID(),
    label: "",
    type: "TEXT",
    required: false,
    unit: "",
    optionsText: "",
    showInCatalog: false,
    showInDetail: true,
    isActive: true
  };
}

function categoryToForm(category: CategoryRecord): FormState {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    fieldDefinitions: category.fieldDefinitions.map((field) => ({
      clientId: field.id,
      id: field.id,
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      unit: field.unit ?? "",
      optionsText: field.options.join("\n"),
      showInCatalog: field.showInCatalog,
      showInDetail: field.showInDetail,
      isActive: field.isActive
    }))
  };
}

function buildPayload(form: FormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    fieldDefinitions: form.fieldDefinitions
      .filter((field) => field.label.trim().length > 0)
      .map((field, index) => ({
        ...(field.id ? { id: field.id } : {}),
        label: field.label.trim(),
        type: field.type,
        required: field.required,
        unit: field.unit.trim() || undefined,
        options:
          field.type === "SELECT"
            ? field.optionsText
                .split(/\n|,/)
                .map((option) => option.trim())
                .filter(Boolean)
            : undefined,
        showInCatalog: field.showInCatalog,
        showInDetail: field.showInDetail,
        sortOrder: index,
        isActive: field.isActive
      }))
  };
}

export function CategoriesManager({ categories: initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategories[0]?.id ?? null);
  const [form, setForm] = useState<FormState>(
    initialCategories[0]
      ? categoryToForm(initialCategories[0])
      : { name: "", description: "", fieldDefinitions: [] }
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const router = useRouter();

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const startNewCategory = () => {
    setSelectedCategoryId(null);
    setError(null);
    setForm({
      name: "",
      description: "",
      fieldDefinitions: []
    });
  };

  const startEditingCategory = (category: CategoryRecord) => {
    setSelectedCategoryId(category.id);
    setError(null);
    setForm(categoryToForm(category));
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = buildPayload(form);
      const response = await fetch(form.id ? `/api/admin/categories/${form.id}` : "/api/admin/categories", {
        method: form.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { error?: string; category?: CategoryRecord };
      if (!response.ok || !data.category) {
        throw new Error(data.error ?? "No se pudo guardar la categoría.");
      }

      setCategories((current) => {
        const next = form.id
          ? current.map((category) => (category.id === data.category!.id ? data.category! : category))
          : [...current, data.category!];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedCategoryId(data.category.id);
      setForm(categoryToForm(data.category));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const response = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "No se pudo eliminar.");
      return;
    }

    setCategories((current) => current.filter((category) => category.id !== id));
    const nextSelected = categories.find((category) => category.id !== id) ?? null;
    if (!nextSelected) {
      startNewCategory();
      return;
    }

    startEditingCategory(nextSelected);
  };

  const confirmDeleteCategory = (category: CategoryRecord) => {
    setPending({
      title: "Eliminar categoría",
      description:
        category.productCount > 0
          ? `La categoría "${category.name}" tiene productos asociados. Primero mové o archivá esos productos.`
          : `¿Eliminar "${category.name}"? Esta acción no se puede deshacer.`,
      onConfirm: () => {
        if (category.productCount === 0) {
          void deleteCategory(category.id);
        }
        setPending(null);
      }
    });
  };

  const updateField = (clientId: string, patch: Partial<EditableField>) => {
    setForm((current) => ({
      ...current,
      fieldDefinitions: current.fieldDefinitions.map((field) =>
        field.clientId === clientId ? { ...field, ...patch } : field
      )
    }));
  };

  const addField = () => {
    setForm((current) => ({
      ...current,
      fieldDefinitions: [...current.fieldDefinitions, emptyField()]
    }));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const nextFields = [...current.fieldDefinitions];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= nextFields.length) {
        return current;
      }

      const [field] = nextFields.splice(index, 1);
      nextFields.splice(targetIndex, 0, field);

      return {
        ...current,
        fieldDefinitions: nextFields
      };
    });
  };

  const removeOrDeactivateField = (field: EditableField) => {
    if (field.id) {
      updateField(field.clientId, { isActive: !field.isActive });
      return;
    }

    setForm((current) => ({
      ...current,
      fieldDefinitions: current.fieldDefinitions.filter((currentField) => currentField.clientId !== field.clientId)
    }));
  };

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <section className="admin-shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="admin-login-title">Categorías</h1>
        <div className="row">
          <button className="button button-ghost" onClick={() => router.push("/admin/products")}>
            Productos
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

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)" }}>
        <section className="card">
          <div className="card-body stack">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Categorías</h2>
              <button className="button button-primary" type="button" onClick={startNewCategory}>
                Nueva categoría
              </button>
            </div>

            <div className="stack">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="card"
                  style={{
                    borderColor: selectedCategoryId === category.id ? "var(--accent)" : undefined
                  }}
                >
                  <div className="card-body stack" style={{ gap: "0.55rem" }}>
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{category.name}</strong>
                      <span className="muted">{category.productCount} productos</span>
                    </div>
                    <p className="muted" style={{ margin: 0 }}>
                      Slug: {category.slug}
                    </p>
                    <p className="muted" style={{ margin: 0 }}>
                      {category.fieldDefinitions.filter((field) => field.isActive).length} campos activos
                    </p>
                    <div className="row">
                      <button className="button button-ghost" type="button" onClick={() => startEditingCategory(category)}>
                        Editar
                      </button>
                      <button className="button button-ghost" type="button" onClick={() => confirmDeleteCategory(category)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {categories.length === 0 && <p className="muted">Todavía no hay categorías creadas.</p>}
            </div>
          </div>
        </section>

        <form className="card" onSubmit={saveCategory}>
          <div className="card-body stack">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div className="stack" style={{ gap: "0.25rem" }}>
                <h2 style={{ margin: 0 }}>{form.id ? "Editar categoría" : "Nueva categoría"}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Definí los campos que van a completar los productos de esta categoría.
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  No repitas campos base como Título, Descripción, Precio, Stock, Imágenes, Categoría o Colección.
                </p>
              </div>
              {selectedCategory && (
                <button className="button button-ghost" type="button" onClick={() => startEditingCategory(selectedCategory)}>
                  Revertir
                </button>
              )}
            </div>

            <div className="field">
              <label className="label">Nombre</label>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ej: Remeras"
                required
              />
            </div>

            <div className="field">
              <label className="label">Descripción</label>
              <textarea
                className="input textarea"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Texto breve que resume la categoría y también se usa para metadata SEO."
                required
              />
            </div>

            <div className="stack" style={{ gap: "0.75rem" }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Campos de la categoría</h3>
                <button className="button button-ghost" type="button" onClick={addField}>
                  Agregar campo
                </button>
              </div>

              {form.fieldDefinitions.length === 0 && (
                <p className="muted" style={{ margin: 0 }}>
                  Esta categoría todavía no tiene campos propios.
                </p>
              )}

              {form.fieldDefinitions.map((field, index) => (
                <article
                  key={field.clientId}
                  className="card"
                  style={{ opacity: field.isActive ? 1 : 0.68 }}
                >
                  <div className="card-body stack" style={{ gap: "0.85rem" }}>
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{field.label.trim() || `Campo ${index + 1}`}</strong>
                      <div className="row">
                        <button className="button button-ghost" type="button" onClick={() => moveField(index, -1)}>
                          ↑
                        </button>
                        <button className="button button-ghost" type="button" onClick={() => moveField(index, 1)}>
                          ↓
                        </button>
                        <button className="button button-ghost" type="button" onClick={() => removeOrDeactivateField(field)}>
                          {field.id ? (field.isActive ? "Desactivar" : "Reactivar") : "Quitar"}
                        </button>
                      </div>
                    </div>

                    {field.key && (
                      <p className="muted" style={{ margin: 0 }}>
                        Clave interna: {field.key}
                      </p>
                    )}

                    <div className="field-grid">
                      <div className="field">
                        <label className="label">Etiqueta</label>
                        <input
                          className="input"
                          value={field.label}
                          onChange={(event) => updateField(field.clientId, { label: event.target.value })}
                          placeholder="Ej: Talle"
                        />
                      </div>

                      <div className="field">
                        <label className="label">Tipo</label>
                        <select
                          className="input"
                          value={field.type}
                          onChange={(event) =>
                            updateField(field.clientId, {
                              type: event.target.value as CategoryFieldType,
                              optionsText: event.target.value === "SELECT" ? field.optionsText : ""
                            })
                          }
                        >
                          <option value="TEXT">Texto</option>
                          <option value="NUMBER">Número</option>
                          <option value="SELECT">Selección</option>
                          <option value="BOOLEAN">Sí / No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label className="label">Unidad</label>
                        <input
                          className="input"
                          value={field.unit}
                          onChange={(event) => updateField(field.clientId, { unit: event.target.value })}
                          placeholder="Ej: cm"
                        />
                      </div>
                    </div>

                    {field.type === "SELECT" && (
                      <div className="field">
                        <label className="label">Opciones</label>
                        <textarea
                          className="input textarea"
                          value={field.optionsText}
                          onChange={(event) => updateField(field.clientId, { optionsText: event.target.value })}
                          placeholder={"Una opción por línea\nS\nM\nL"}
                        />
                      </div>
                    )}

                    <div className="row" style={{ flexWrap: "wrap" }}>
                      <label className="row" style={{ gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(event) => updateField(field.clientId, { required: event.target.checked })}
                        />
                        Obligatorio
                      </label>
                      <label className="row" style={{ gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={field.showInCatalog}
                          onChange={(event) => updateField(field.clientId, { showInCatalog: event.target.checked })}
                        />
                        Mostrar en catálogo
                      </label>
                      <label className="row" style={{ gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={field.showInDetail}
                          onChange={(event) => updateField(field.clientId, { showInDetail: event.target.checked })}
                        />
                        Mostrar en detalle
                      </label>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {error && <p className="feedback-error">{error}</p>}

            <div className="row">
              <button
                className="button button-primary"
                type="submit"
                disabled={loading || form.name.trim().length < 2 || form.description.trim().length < 2}
              >
                {loading ? "Guardando..." : form.id ? "Guardar cambios" : "Crear categoría"}
              </button>
            </div>
          </div>
        </form>
      </div>

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
