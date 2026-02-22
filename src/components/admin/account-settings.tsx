"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  currentEmail: string;
};

export function AccountSettings({ currentEmail }: Props) {
  const router = useRouter();

  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const handleEmailChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);
    setEmailLoading(true);

    try {
      const response = await fetch("/api/admin/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "email", ...emailForm })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Error al actualizar email.");
      setEmailSuccess(true);
      setEmailForm({ newEmail: "", currentPassword: "" });
      router.refresh();
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch("/api/admin/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "password",
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Error al actualizar contraseña.");
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <section className="admin-shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Mi cuenta</h1>
        <div className="row">
          <button className="button button-ghost" onClick={() => router.push("/admin/products")}>
            Ver productos
          </button>
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
          <button className="button button-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <form className="card" onSubmit={handleEmailChange}>
        <div className="card-body stack">
          <h2 style={{ margin: 0 }}>Cambiar email</h2>
          <p className="muted" style={{ margin: 0 }}>Email actual: <strong>{currentEmail}</strong></p>

          <div className="field-grid">
            <div className="field">
              <label className="label">Nuevo email</label>
              <input
                type="email"
                className="input"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm((f) => ({ ...f, newEmail: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label className="label">Contraseña actual</label>
              <input
                type="password"
                className="input"
                value={emailForm.currentPassword}
                onChange={(e) => setEmailForm((f) => ({ ...f, currentPassword: e.target.value }))}
                required
              />
            </div>
          </div>

          {emailError && <p className="feedback-error">{emailError}</p>}
          {emailSuccess && <p className="feedback-success">Email actualizado correctamente.</p>}

          <div>
            <button
              type="submit"
              className="button button-primary"
              disabled={emailLoading || !emailForm.newEmail || !emailForm.currentPassword}
            >
              {emailLoading ? "Guardando..." : "Actualizar email"}
            </button>
          </div>
        </div>
      </form>

      <form className="card" onSubmit={handlePasswordChange}>
        <div className="card-body stack">
          <h2 style={{ margin: 0 }}>Cambiar contraseña</h2>

          <div className="field-grid">
            <div className="field">
              <label className="label">Contraseña actual</label>
              <input
                type="password"
                className="input"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label className="label">Nueva contraseña</label>
              <input
                type="password"
                className="input"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                minLength={8}
                required
              />
            </div>
            <div className="field">
              <label className="label">Confirmar nueva contraseña</label>
              <input
                type="password"
                className="input"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                required
              />
            </div>
          </div>

          {passwordError && <p className="feedback-error">{passwordError}</p>}
          {passwordSuccess && <p className="feedback-success">Contraseña actualizada correctamente.</p>}

          <div>
            <button
              type="submit"
              className="button button-primary"
              disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
            >
              {passwordLoading ? "Guardando..." : "Actualizar contraseña"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
