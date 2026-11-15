import type {
  CartTrackerState,
  GeoQrBin,
  ReportCategory,
  SmartRoutingResult,
} from "@/types/angkut";

export const GEOFENCE_RADIUS_MIN_M = 5;
export const GEOFENCE_RADIUS_MAX_M = 10;
export const GEOFENCE_MIN_DWELL_SECONDS = 30;
export const REPORTER_MAX_DISTANCE_METERS = 50;
export const TPS_CONGESTION_THRESHOLD_MINUTES = 45;

export function evaluateSmartRouting(
  bin: GeoQrBin,
  category: ReportCategory,
  cart: CartTrackerState
): SmartRoutingResult {
  const isTpsOverloaded =
    cart.status === "TERTAHAN_DI_TPS" &&
    cart.tpsWaitDurationMinutes > TPS_CONGESTION_THRESHOLD_MINUTES;

  if (
    category === "OVERLOAD_TPS" ||
    (isTpsOverloaded && category === "BELUM_DIANGKUT")
  ) {
    return {
      escalationTarget: "DLH_ARMADA_TPS",
      escalationLabel: "Dinas Lingkungan Hidup (DLH) Kota Malang",
      channel: "DASHBOARD_DLH",
      reportStatus: "DITERUSKAN_KE_DLH",
      badgeTone: "rose",
      routingReason: isTpsOverloaded
        ? `Sensor ${cart.cartCode} mendeteksi gerobak tertahan ${cart.tpsWaitDurationMinutes} menit di area TPS Merjosari.`
        : "Penumpukan skala komunal di titik TPS diteruskan ke DLH Kota Malang untuk penanganan prioritas.",
    };
  }

  if (category === "KERUSAKAN_SARANA") {
    return {
      escalationTarget: "DLH_ASET_SARANA",
      escalationLabel: "Bidang Sarpras DLH Kota Malang",
      channel: "DASHBOARD_DLH",
      reportStatus: "DITERUSKAN_KE_DLH",
      badgeTone: "neutral",
      routingReason:
        "Laporan kerusakan bak komunal atau unit tong kuning TPS diteruskan ke DLH untuk inspeksi dan peremajaan alat.",
    };
  }

  if (bin.hoursSinceLastPassed >= 24) {
    return {
      escalationTarget: "RT_RW_OPERASIONAL",
      escalationLabel: `Pengurus ${bin.rt}/${bin.rw} & Koordinator Rute`,
      channel: "WHATSAPP_RTRW",
      reportStatus: "DITERUSKAN_KE_RTRW",
      badgeTone: "rose",
      routingReason: `Log sensor ${bin.assignedCartCode} belum mencatat kunjungan di titik ${bin.id} selama ${bin.hoursSinceLastPassed} jam (>24 jam).`,
    };
  }

  return {
    escalationTarget: "RT_RW_TEGURAN_HUNIAN",
    escalationLabel: `Pengurus ${bin.rt}/${bin.rw} (Penertiban Tong Hunian)`,
    channel: "WHATSAPP_RTRW",
    reportStatus: "DITERUSKAN_KE_RTRW",
    badgeTone: "emerald",
    routingReason: `Sensor ${bin.assignedCartCode} mencatat pengangkutan sudah berjalan (${bin.lastPassedAt}, berhenti ${bin.lastDwellSeconds} detik). Keluhan diteruskan ke RT/RW untuk evaluasi kapasitas tong hunian.`,
  };
}

export function isReporterWithinGpsRadius(distanceMeters: number): boolean {
  return distanceMeters >= 0 && distanceMeters <= REPORTER_MAX_DISTANCE_METERS;
}

export function isGeofenceCheckInValid(
  distanceMeters: number,
  dwellSeconds: number
): boolean {
  return (
    distanceMeters <= GEOFENCE_RADIUS_MAX_M &&
    dwellSeconds >= GEOFENCE_MIN_DWELL_SECONDS
  );
}

/** Haversine distance in meters between two [lat, lng] coordinates */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng *
      sinLng;
  return Math.round(2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}
