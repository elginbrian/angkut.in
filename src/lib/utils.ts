import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ReportCategory } from "@/types/angkut";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatWibTime(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}.${minutes} WIB`;
}

export const REPORT_CATEGORY_OPTIONS: Array<{
  value: ReportCategory;
  label: string;
  shortDesc: string;
}> = [
  {
    value: "BELUM_DIANGKUT",
    label: "Tong Penuh / Belum Diangkut",
    shortDesc: "Sampah menumpuk dan gerobak belum melintas.",
  },
  {
    value: "MELUBER_BAU",
    label: "Sampah Meluber / Bau Menyengat",
    shortDesc: "Volume tong kurang memadai atau kondisi tong terbuka.",
  },
  {
    value: "OVERLOAD_TPS",
    label: "Penumpukan Masif / Antrean TPS",
    shortDesc: "Banyak titik tertahan akibat armada truk terlambat.",
  },
  {
    value: "KERUSAKAN_SARANA",
    label: "Kerusakan Sarana / Tong Kuning TPS",
    shortDesc: "Bak komunal atau tong kuning bantuan rusak/pecah.",
  },
];

export function getCategoryLabel(category: ReportCategory): string {
  const found = REPORT_CATEGORY_OPTIONS.find((item) => item.value === category);
  return found ? found.label : category;
}
