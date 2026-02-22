"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/confirm-modal";

type Collection = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  collections: Collection[];
};

export function CollectionsManager({ collections: initialCollections }: Props) {
  const [collections, setCollections] = useState(initialCollections);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const addCollection = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = (await response.json()) as { error?: string; collection?: Collection };
      if (!response.ok || !data.collection) {
        throw new Error(data.error ?? "No se pudo crear la colección.");
      }
      setCollections((current) => [...current, data.collection!].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const deleteCollection = async (id: string) => {
    const response = await fetch(`/api/admin/collections/${id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "No se pudo eliminar.");
      return;
    }
    setCollections((current) => current.filter((c) => c.id !== id));
  };

  const confirmDeleteCollection = (collection: { id: string; name: string }) => {
    setPending({
      title: "Eliminar colección",
      description: `¿Eliminar "${collection.name}"? Los productos que la tenían quedarán sin colección. Esta acción no se puede deshacer.`,
      onConfirm: () => { deleteCollection(collection.id); setPending(null); },
    });
  };

  return (
    <section className="admin-shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Colecciones</h1>
        <div className="row">
          <button className="button button-ghost" onClick={() => router.push("/admin/products")}>
            Productos
          </button>
          <button className="button button-ghost" onClick={() => router.push("/admin/categories")}>
            Categorías
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

      <form className="card" onSubmit={addCollection}>
        <div className="card-body stack">
          <h2 style={{ margin: 0 }}>Nueva colección</h2>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Nombre</label>
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: Barbie"
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
              {collections.map((collection) => (
                <tr key={collection.id}>
                  <td>{collection.name}</td>
                  <td className="muted">{collection.slug}</td>
                  <td>
                    <button className="button button-ghost" onClick={() => confirmDeleteCollection(collection)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {collections.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    No hay colecciones.
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
