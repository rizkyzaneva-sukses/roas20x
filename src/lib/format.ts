export function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

export function tanggal(value: Date | string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
}

export function statusClass(status?: string) {
  if (status === "BAHAYA") return "badge-danger";
  if (status === "CUKUP") return "badge-warning";
  if (status === "PROPORSIONAL") return "badge-success";
  return "badge-muted";
}
