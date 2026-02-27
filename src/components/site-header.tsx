"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import chartImg from "@/assets/chart.png";
import menuImg from "@/assets/menu.png";
import adminImg from "@/assets/admin.png";

type NavItem = { id: string; name: string };

type SiteHeaderProps = {
  categories: NavItem[];
  collections: NavItem[];
};


export function SiteHeader({ categories, collections }: SiteHeaderProps) {
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
        <Link href="/" className="brand" aria-label="Sine inicio">
          <span className="brand-copy">
            <span className="brand-title">Sine</span>
            <span className="brand-subtitle">bolsas estampadas</span>
          </span>
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
                className="nav-catalog-btn"
                onClick={() => setCatalogOpen((v) => !v)}
                aria-expanded={catalogOpen}
                aria-haspopup="true"
                aria-label="Menú"
              >
                <Image src={menuImg} alt="" className="nav-menu-img" width={52} height={52} />
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
            <Link href="/" onClick={closeAll} aria-label="Menú">
              <Image src={menuImg} alt="" className="nav-menu-img" width={52} height={52} />
            </Link>
          )}

          <Link href="/cart" onClick={closeAll} className="nav-cart-img-link">
            <Image src={chartImg} alt="Carrito" className="nav-cart-img" width={52} height={52} />
            {totalItems > 0 && <span className="nav-cart-badge">{totalItems}</span>}
          </Link>

          <Link href="/admin/login" onClick={closeAll} aria-label="Admin" className="nav-icon-link">
            <Image src={adminImg} alt="" className="nav-menu-img" width={52} height={52} />
          </Link>

          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
