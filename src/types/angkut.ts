export type CartOperationalStatus =
  | "BERKELILING_RUTE"
  | "TERTAHAN_DI_TPS"
  | "SELESAI_BEROPERASI";

export type ReportCategory =
  | "BELUM_DIANGKUT"
  | "MELUBER_BAU"
  | "OVERLOAD_TPS"
  | "KERUSAKAN_SARANA";

export type EscalationTarget =
  | "RT_RW_OPERASIONAL"
  | "RT_RW_TEGURAN_HUNIAN"
  | "DLH_ARMADA_TPS"
  | "DLH_ASET_SARANA";

export type ReportStatus =
  | "MENUNGGU_TINDAK_LANJUT"
  | "DITERUSKAN_KE_RTRW"
  | "DITERUSKAN_KE_DLH"
  | "SELESAI_AUTO_RESOLVE";

export type WorkflowStage = "BARU" | "DITINDAKLANJUTI" | "SELESAI";

export type BinCondition =
  | "TERTUTUP_LAYAK"
  | "TERBUKA_KURANG_KAPASITAS"
  | "KOMUNAL_RUSAK";

export interface PickupLogEntry {
  id: string;
  timestamp: string;
  dateLabel: string;
  dwellSeconds: number;
  distanceMeters: number;
  cartCode: string;
}

export interface GeoQrBin {
  id: string;
  name: string;
  shortLabel: string;
  address: string;
  rt: string;
  rw: string;
  kaplingName: string;
  ownerLabel: string;
  ownerPhone: string;
  assignedCartCode: string;
  waypointIndex: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  lastPassedAt: string;
  hoursSinceLastPassed: number;
  lastDwellSeconds: number;
  lastDistanceMeters: number;
  binCondition: BinCondition;
  binTypeLabel: string;
  incentiveEligible: boolean;
  discountPercent: number;
  monthlyFeeBase: number;
  pickupHistory: PickupLogEntry[];
}

export interface CartTrackerState {
  cartCode: string;
  kapling: string;
  status: CartOperationalStatus;
  currentBinId: string;
  currentLocationLabel: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  tpsWaitDurationMinutes: number;
  ritaseToday: number;
  batteryPercent: number;
  gsmSignal: string;
  lastSyncAt: string;
}

export interface CartDeviceUnit {
  id: string;
  cartCode: string;
  kapling: string;
  hardwareSpec: string;
  gpsStatus: "AKTIF" | "LEMAH" | "OFFLINE";
  batteryPercent: number;
  gsmSignal: string;
  lastSyncAt: string;
  geofenceTriggerCountToday: number;
}

export interface SmartReport {
  id: string;
  ticketCode: string;
  binId: string;
  binName: string;
  rtRwLabel: string;
  category: ReportCategory;
  categoryLabel: string;
  description: string;
  photoLabel: string;
  photoUrl: string;
  reporterDistanceMeters: number;
  gpsValid: boolean;
  createdAt: string;
  status: ReportStatus;
  workflowStage: WorkflowStage;
  escalationTarget: EscalationTarget;
  escalationLabel: string;
  routingReason: string;
  adminActionNote?: string;
  resolvedAt?: string;
}

export interface WhatsAppNotification {
  id: string;
  recipientRole: string;
  recipientPhone: string;
  timestamp: string;
  messageType: "OPERASIONAL_RUTE" | "TEGURAN_HUNIAN" | "AUTO_RESOLVE";
  content: string;
  relatedBinId: string;
  relatedReportId?: string;
}

export type TongKuningCondition = "LAYAK" | "RUSAK_RINGAN" | "RUSAK_BERAT";
export type TongKuningSpkStatus =
  | "TIDAK_ADA"
  | "DIAJUKAN_SPK"
  | "SUDAH_DIGANTI";

export interface TongKuningUnit {
  id: string;
  code: string;
  zone: string;
  condition: TongKuningCondition;
  defectNote: string;
  lastInspected: string;
  spkStatus: TongKuningSpkStatus;
}

export interface SmartRoutingResult {
  escalationTarget: EscalationTarget;
  escalationLabel: string;
  channel: "WHATSAPP_RTRW" | "DASHBOARD_DLH";
  reportStatus: ReportStatus;
  routingReason: string;
  badgeTone: "emerald" | "rose" | "neutral";
}

export interface SubmitReportPayload {
  binId: string;
  category: ReportCategory;
  description: string;
  photoLabel: string;
  photoUrl: string;
  reporterDistanceMeters: number;
}
