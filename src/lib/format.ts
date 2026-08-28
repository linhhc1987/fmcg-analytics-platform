export const currency = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(v);

export const compactCurrency = (v: number) =>
  `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(v / 1_000_000_000)} tỷ`;

export const percent = (v: number | null) =>
  v === null || Number.isNaN(v) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
