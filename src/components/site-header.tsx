"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";

type NavItem = { id: string; name: string };

type SiteHeaderProps = {
  categories: NavItem[];
  collections: NavItem[];
};

function linkClass(pathname: string, href: string) {
  return pathname === href ? "nav-link-active" : undefined;
}

export function SiteHeader({ categories, collections }: SiteHeaderProps) {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);
  const hasCatalogMenu = categories.length > 0 || collections.length > 0;

  // Tab title visibility effect
  useEffect(() => {
    const originalTitle = document.title;
    let timer: ReturnType<typeof setInterval>;

    function handleVisibilityChange() {
      if (document.hidden) {
        let show = true;
        document.title = "Cholchito";
        timer = setInterval(() => {
          document.title = show ? "Te Amo" : "Cholchito";
          show = !show;
        }, 1000);
      } else {
        clearInterval(timer);
        document.title = originalTitle;
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(timer);
      document.title = originalTitle;
    };
  }, []);

  // Close catalog dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) {
        setCatalogOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function closeAll() {
    setMenuOpen(false);
    setCatalogOpen(false);
  }

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="brand" aria-label="Siesta inicio">
          <span className="brand-title">siesta</span>
          <span className="brand-subtitle">bolsas estampadas</span>
        </Link>

        <button
          className="hamburger-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        <nav className={`nav-links${menuOpen ? " nav-open" : ""}`}>
          {hasCatalogMenu ? (
            <div
              ref={catalogRef}
              className={`nav-item${catalogOpen ? " nav-item-open" : ""}`}
            >
              <button
                className={`nav-catalog-btn${pathname === "/" ? " nav-link-active" : ""}`}
                onClick={() => setCatalogOpen((v) => !v)}
                aria-expanded={catalogOpen}
                aria-haspopup="true"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                Catálogo
                <svg className="nav-catalog-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <div className="nav-dropdown">
                {categories.length > 0 && (
                  <div className="nav-dropdown-section">
                    <div className="nav-dropdown-label">
                      Categorías
                      <svg className="nav-sub-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    <div className="nav-dropdown-items">
                      <Link href="/" onClick={closeAll}>Todas</Link>
                      {categories.map((cat) => (
                        <Link key={cat.id} href={`/?cat=${cat.id}`} onClick={closeAll}>
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {collections.length > 0 && (
                  <div className="nav-dropdown-section">
                    <div className="nav-dropdown-label">
                      Colecciones
                      <svg className="nav-sub-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    <div className="nav-dropdown-items">
                      <Link href="/" onClick={closeAll}>Todas</Link>
                      {collections.map((col) => (
                        <Link key={col.id} href={`/?col=${col.id}`} onClick={closeAll}>
                          {col.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link href="/" className={linkClass(pathname, "/")} onClick={closeAll}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              Catálogo
            </Link>
          )}

          <Link href="/cart" className={linkClass(pathname, "/cart")} onClick={closeAll}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61H19.4a2 2 0 001.98-1.71L23 6H6" />
            </svg>
            Carrito{totalItems > 0 ? ` (${totalItems})` : ""}
          </Link>

          <Link href="/admin/login" className={pathname.startsWith("/admin") ? "nav-link-active" : undefined} onClick={closeAll}>
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
