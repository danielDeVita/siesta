"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  categories: Category[];
};

export function CategoriesManager({ categories: initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const addCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = (await response.json()) as { error?: string; category?: Category };
      if (!response.ok || !data.category) {
        throw new Error(data.error ?? "No se pudo crear la categoría.");
      }
      setCategories((current) => [...current, data.category!].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const confirmed = window.confirm("¿Eliminar categoría? Los productos que la tenían quedarán sin categoría.");
    if (!confirmed) return;

    const response = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "No se pudo eliminar.");
      return;
    }
    setCategories((current) => current.filter((c) => c.id !== id));
  };

  return (
    <section className="admin-shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Categorías</h1>
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

      <form className="card" onSubmit={addCategory}>
        <div className="card-body stack">
          <h2 style={{ margin: 0 }}>Nueva categoría</h2>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Nombre</label>
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: Remeras"
                required
              />
            </div>
            <div style={{ alignSelf: "flex-end" }}>
              <button className="button button-primary" type="submit" disabled={loading || name.trim().length < 2}>
                {loading ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </div>
          {error && <p className="feedback-error">{error}</p>}
        </div>
      </form>

      <section className="card">
        <div className="card-body">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Slug</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td className="muted">{category.slug}</td>
                  <td>
                    <button className="button button-ghost" onClick={() => deleteCategory(category.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    No hay categorías.
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
