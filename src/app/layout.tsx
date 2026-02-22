import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "@/app/globals.css";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";

const bodyFont = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"]
});

const displayFont = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"]
});

export const metadata: Metadata = {
  title: "Siesta | Bolsas estampadas",
  description: "E-commerce de bolsos estampados con diseño original."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [categories, collections] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.collection.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);

  return (
    <html lang="es">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <CartProvider>
          <div className="main-layout">
            <SiteHeader categories={categories} collections={collections} />
            <main>
              <div className="container">{children}</div>
            </main>
            <SiteFooter />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
