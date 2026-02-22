const ARS_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function formatArs(cents: number): string {
  return ARS_FORMATTER.format(cents / 100);
}
