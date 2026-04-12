import { appConfig } from "@/lib/env";

export const SITE_NAME = "Sine";
export const SITE_DESCRIPTION =
  "Objetos ilustrados, accesorios y piezas de diseño original para el uso diario.";
export const SITE_OG_IMAGE_PATH = "/logo.jpeg";
export const INSTAGRAM_URL = "https://www.instagram.com/sine.es.sine/";

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function buildAbsoluteUrl(path = "/") {
  return new URL(path, appConfig.appUrl).toString();
}

export function truncateSeoText(value: string, maxLength: number) {
  const clean = collapseWhitespace(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}

export function normalizeSeoTitle(value: string) {
  const clean = collapseWhitespace(value);
  return clean.replace(new RegExp(`\\s*\\|\\s*${SITE_NAME}\\s*$`, "i"), "");
}

export function buildBrandedTitle(value: string) {
  return `${normalizeSeoTitle(value)} | ${SITE_NAME}`;
}

export function buildCategorySeoDescription(name: string, description?: string | null) {
  if (description?.trim()) {
    return truncateSeoText(description, 180);
  }

  return truncateSeoText(
    `${name} de Sine con ilustraciones y diseño original para el uso diario.`,
    180
  );
}

export function buildProductSeoDescription(input: {
  title: string;
  description?: string | null;
  categoryName?: string | null;
}) {
  if (input.description?.trim()) {
    return truncateSeoText(input.description, 180);
  }

  const categoryFragment = input.categoryName ? ` de ${input.categoryName}` : "";
  return truncateSeoText(
    `${input.title}${categoryFragment} de Sine con diseño original, ilustraciones propias y retiro coordinado.`,
    180
  );
}

export function buildOrganizationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: appConfig.appUrl,
    logo: buildAbsoluteUrl(SITE_OG_IMAGE_PATH),
    sameAs: [INSTAGRAM_URL]
  };
}

export function buildWebsiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: appConfig.appUrl
  };
}

export function buildProductStructuredData(input: {
  title: string;
  description: string;
  image: string;
  urlPath: string;
  categoryName?: string | null;
  priceArs: number;
  stock: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    description: input.description,
    image: [input.image],
    category: input.categoryName ?? undefined,
    offers: {
      "@type": "Offer",
      url: buildAbsoluteUrl(input.urlPath),
      priceCurrency: "ARS",
      price: (input.priceArs / 100).toFixed(2),
      availability:
        input.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock"
    }
  };
}
