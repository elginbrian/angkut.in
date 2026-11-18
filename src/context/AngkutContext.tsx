"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  INITIAL_CART_DEVICES,
  INITIAL_CART_STATE,
  INITIAL_GEOQR_BINS,
  INITIAL_REPORTS,
  INITIAL_TONG_KUNING_UNITS,
  INITIAL_WHATSAPP_LOGS,
  MERJOSARI_STREET_PATH,
  TPS_MERJOSARI_COORDS,
} from "@/data/mock-merjosari";
import { apiRequest, getWsUrl } from "@/lib/api";
import {
  evaluateSmartRouting,
  haversineMeters,
  isReporterWithinGpsRadius,
  TPS_CONGESTION_THRESHOLD_MINUTES,
} from "@/lib/smart-routing";
import { formatWibTime, getCategoryLabel } from "@/lib/utils";
import type {
  BinCondition,
  CartDeviceUnit,
  CartTrackerState,
  GeoQrBin,
  SmartReport,
  SubmitReportPayload,
  TelemetryResponseMeta,
  TongKuningUnit,
  WhatsAppNotification,
  WorkflowStage,
} from "@/types/angkut";

export interface BinManagementPayload {
  name: string;
  address: string;
  rt: string;
  ownerLabel: string;
  ownerPhone: string;
  assignedCartCode: string;
  binCondition: BinCondition;
  binTypeLabel: string;
  monthlyFeeBase: number;
}

export interface DwellInfo {
  binId: string | null;
  seconds: number;
  targetSeconds: number;
  checkedIn: boolean;
}

export interface BackendStatePayload {
  bins: GeoQrBin[];
  cart: CartTrackerState;
  cartDevices: CartDeviceUnit[];
  reports: SmartReport[];
  whatsAppLogs: WhatsAppNotification[];
  tongKuningUnits: TongKuningUnit[];
  routeWaypoints: Array<[number, number]>;
  tpsCoords: { lat: number; lng: number };
  iotLive: boolean;
  dwellInfo?: DwellInfo;
}

function generateTsidCode(existingIds: string[]): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let candidate = "";
  do {
    let suffix = "";
    for (let i = 0; i < 8; i++) {
      suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    candidate = `tsid-${suffix}`;
  } while (existingIds.includes(candidate));
  return candidate;
}

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  tone: "emerald" | "rose" | "neutral";
}

interface AngkutContextValue {
  bins: GeoQrBin[];
  selectedBinId: string;
  selectedBin: GeoQrBin;
  selectBin: (binId: string) => void;
  routeWaypoints: Array<[number, number]>;
  tpsCoords: { lat: number; lng: number };
  cartWaypointIndex: number;
  distanceToSelectedBinMeters: number | null;
  etaMinutes: number | null;
  cart: CartTrackerState;
  cartDevices: CartDeviceUnit[];
  reports: SmartReport[];
  whatsAppLogs: WhatsAppNotification[];
  tongKuningUnits: TongKuningUnit[];
  isTpsCongested: boolean;
  backendConnected: boolean;
  iotLive: boolean;
  dwellInfo: DwellInfo;
  toast: ToastMessage | null;
  dismissToast: () => void;
  // Citizen actions
  submitCitizenReport: (payload: SubmitReportPayload) => Promise<SmartReport | null>;
  // RT/RW operational & bin management actions
  sendManualRtRwWarning: (reportId: string, customNote?: string) => Promise<void>;
  resolveReportManually: (reportId: string, note?: string) => Promise<void>;
  updateHouseholdBinCompliance: (binId: string, compliant: boolean) => Promise<void>;
  addGeoQrBin: (payload: BinManagementPayload) => Promise<GeoQrBin | null>;
  updateGeoQrBin: (binId: string, payload: Partial<BinManagementPayload>) => Promise<void>;
  deleteGeoQrBin: (binId: string) => Promise<void>;
  // DLH equipment & ticket actions
  requestTongKuningSpk: (unitIds: string[]) => Promise<void>;
  replaceTongKuningUnit: (unitId: string) => Promise<void>;
  updateDlhTicketStage: (
    reportId: string,
    stage: WorkflowStage,
    note?: string
  ) => Promise<void>;
  // IoT Web Mock telemetry actions
  sendIotTelemetry: (payload: {
    cartCode?: string;
    lat: number;
    lng: number;
    batteryPercent?: number;
    gsmSignal?: string;
    locationLabel?: string;
    forceCheckInBinId?: string;
  }) => Promise<TelemetryResponseMeta | null>;
  stopIotSession: () => Promise<void>;
  relocateBinsToCoords: (lat: number, lng: number) => Promise<void>;
  resetBinCoords: () => Promise<void>;
  counts: {
    openRtRw: number;
    openDlh: number;
    autoResolved: number;
    healthyTongKuning: number;
  };
}

const AngkutContext = createContext<AngkutContextValue | undefined>(undefined);

export function AngkutProvider({ children }: { children: React.ReactNode }) {
  const [bins, setBins] = useState<GeoQrBin[]>(INITIAL_GEOQR_BINS);
  const [selectedBinId, setSelectedBinId] = useState<string>(
    INITIAL_GEOQR_BINS[0].id
  );
  const [routeWaypoints, setRouteWaypoints] =
    useState<Array<[number, number]>>(MERJOSARI_STREET_PATH);
  const [tpsCoords, setTpsCoords] = useState<{ lat: number; lng: number }>(
    TPS_MERJOSARI_COORDS
  );
  const [cart, setCart] = useState<CartTrackerState>(INITIAL_CART_STATE);
  const [cartDevices, setCartDevices] =
    useState<CartDeviceUnit[]>(INITIAL_CART_DEVICES);
  const [reports, setReports] = useState<SmartReport[]>(INITIAL_REPORTS);
  const [whatsAppLogs, setWhatsAppLogs] = useState<WhatsAppNotification[]>(
    INITIAL_WHATSAPP_LOGS
  );
  const [tongKuningUnits, setTongKuningUnits] = useState<TongKuningUnit[]>(
    INITIAL_TONG_KUNING_UNITS
  );
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [iotLive, setIotLive] = useState<boolean>(false);
  const [dwellInfo, setDwellInfo] = useState<DwellInfo>({
    binId: null,
    seconds: 0,
    targetSeconds: 15,
    checkedIn: false,
  });
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const lastIotAlertBinRef = useRef<string | null>(null);

  const showToast = useCallback((msg: Omit<ToastMessage, "id">) => {
    setToast({ ...msg, id: `TST-${Date.now()}` });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const applyBackendState = useCallback((data: BackendStatePayload) => {
    if (Array.isArray(data.bins) && data.bins.length > 0) {
      setBins(data.bins);
    }
    if (data.cart) setCart(data.cart);
    if (Array.isArray(data.cartDevices)) setCartDevices(data.cartDevices);
    if (Array.isArray(data.reports)) setReports(data.reports);
    if (Array.isArray(data.whatsAppLogs)) setWhatsAppLogs(data.whatsAppLogs);
    if (Array.isArray(data.tongKuningUnits)) setTongKuningUnits(data.tongKuningUnits);
    if (Array.isArray(data.routeWaypoints) && data.routeWaypoints.length > 0) {
      setRouteWaypoints(data.routeWaypoints);
    }
    if (data.tpsCoords) setTpsCoords(data.tpsCoords);
    setIotLive(Boolean(data.iotLive));
    if (data.dwellInfo) {
      setDwellInfo(data.dwellInfo);
      if (
        data.dwellInfo.checkedIn &&
        data.dwellInfo.binId &&
        lastIotAlertBinRef.current !== data.dwellInfo.binId
      ) {
        lastIotAlertBinRef.current = data.dwellInfo.binId;
        setToast({
          id: `TST-${Date.now()}`,
          tone: "emerald",
          title: "Auto-Check-In IoT Tercatat",
          description: `Gerobak berhenti di radius tong selama ${data.dwellInfo.seconds} detik.`,
        });
      } else if (!data.dwellInfo.checkedIn) {
        lastIotAlertBinRef.current = null;
      }
    }
    setBackendConnected(true);
  }, []);

  // Load state from angkutin-be + maintain real-time WebSocket updates
  useEffect(() => {
    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function hydrate() {
      try {
        const state = await apiRequest<BackendStatePayload>("/state");
        if (active) applyBackendState(state);
      } catch {
        if (active) setBackendConnected(false);
      }
    }

    function connectWs() {
      if (!active || typeof window === "undefined") return;
      try {
        ws = new WebSocket(getWsUrl());
        ws.onopen = () => {
          if (active) setBackendConnected(true);
        };
        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed?.type === "state_update" && parsed.data && active) {
              applyBackendState(parsed.data);
            }
          } catch {
            // ignore malformed message
          }
        };
        ws.onclose = () => {
          if (active) {
            reconnectTimer = setTimeout(connectWs, 3000);
          }
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (active) reconnectTimer = setTimeout(connectWs, 4000);
      }
    }

    hydrate();
    connectWs();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [applyBackendState]);

  const cartWaypointIndex = useMemo(() => {
    if (!cart.coordinates) return 0;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < routeWaypoints.length; i++) {
      const [wLat, wLng] = routeWaypoints[i];
      const d = haversineMeters(cart.coordinates, { lat: wLat, lng: wLng });
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [routeWaypoints, cart.coordinates]);

  const selectedBin = useMemo(
    () => bins.find((b) => b.id === selectedBinId) ?? bins[0],
    [bins, selectedBinId]
  );

  const distanceToSelectedBinMeters = useMemo(() => {
    if (!cart.coordinates) return null;
    return haversineMeters(cart.coordinates, selectedBin.coordinates);
  }, [cart.coordinates, selectedBin.coordinates]);

  const etaMinutes = useMemo(() => {
    if (distanceToSelectedBinMeters === null) return null;
    return Math.max(1, Math.round(distanceToSelectedBinMeters / 65));
  }, [distanceToSelectedBinMeters]);

  const isTpsCongested = useMemo(
    () =>
      cart.status === "TERTAHAN_DI_TPS" &&
      cart.tpsWaitDurationMinutes > TPS_CONGESTION_THRESHOLD_MINUTES,
    [cart.status, cart.tpsWaitDurationMinutes]
  );

  const selectBin = useCallback((binId: string) => {
    setSelectedBinId(binId);
  }, []);

  // --- CITIZEN ACTIONS ---
  const submitCitizenReport = useCallback(
    async (payload: SubmitReportPayload): Promise<SmartReport | null> => {
      if (backendConnected) {
        try {
          const res = await apiRequest<{
            ok: boolean;
            report: SmartReport | null;
            badgeTone: "emerald" | "rose" | "neutral";
            state: BackendStatePayload;
          }>("/reports", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          applyBackendState(res.state);
          if (res.report) {
            showToast({
              tone: res.badgeTone || "emerald",
              title: `Tiket ${res.report.ticketCode} Terkirim`,
              description: `Laporan diteruskan ke ${res.report.escalationLabel}.`,
            });
          }
          return res.report;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Gagal mengirim laporan.";
          showToast({
            tone: "rose",
            title: "Laporan Ditolak",
            description: msg,
          });
          return null;
        }
      }

      const targetBin = bins.find((b) => b.id === payload.binId);
      if (!targetBin) return null;

      if (!isReporterWithinGpsRadius(payload.reporterDistanceMeters)) {
        showToast({
          tone: "rose",
          title: "Lokasi GPS Di Luar Radius",
          description: `Posisi perangkat (${payload.reporterDistanceMeters}m) melebihi batas jarak 50m dari titik GeoQR.`,
        });
        return null;
      }

      const routing = evaluateSmartRouting(targetBin, payload.category, cart);
      const timeNow = formatWibTime();
      const shortTime = timeNow.replace(" WIB", "");
      const reportId = `REP-${Date.now().toString().slice(-4)}`;
      const ticketPrefix =
        routing.channel === "DASHBOARD_DLH" ? "DLH-MRJ" : "ANG-RTRW";
      const ticketCode = `${ticketPrefix}-${Math.floor(100 + Math.random() * 899)}`;

      const newReport: SmartReport = {
        id: reportId,
        ticketCode,
        binId: targetBin.id,
        binName: targetBin.name,
        rtRwLabel: `${targetBin.rt} / ${targetBin.rw}`,
        category: payload.category,
        categoryLabel: getCategoryLabel(payload.category),
        description: payload.description,
        photoLabel: payload.photoLabel,
        photoUrl: payload.photoUrl,
        reporterDistanceMeters: payload.reporterDistanceMeters,
        gpsValid: true,
        createdAt: `Hari ini, ${timeNow}`,
        status: routing.reportStatus,
        workflowStage: "BARU",
        escalationTarget: routing.escalationTarget,
        escalationLabel: routing.escalationLabel,
        routingReason: routing.routingReason,
      };

      setReports((prev) => [newReport, ...prev]);

      if (routing.channel === "WHATSAPP_RTRW") {
        const isOperational = routing.escalationTarget === "RT_RW_OPERASIONAL";
        const newWa: WhatsAppNotification = {
          id: `WA-${Date.now()}`,
          recipientRole: isOperational
            ? `Ketua ${targetBin.rt} & Koordinator Rute`
            : `Ketua ${targetBin.rt} / ${targetBin.rw}`,
          recipientPhone: "+62 812-3340-8812",
          timestamp: shortTime,
          messageType: isOperational ? "OPERASIONAL_RUTE" : "TEGURAN_HUNIAN",
          relatedBinId: targetBin.id,
          relatedReportId: reportId,
          content: isOperational
            ? `*[ANGKUT.IN • EVALUASI RUTE GEROBAK]*\nTiket: ${ticketCode}\nLokasi: ${targetBin.name}\n\n🚨 Sensor *${targetBin.assignedCartCode}* belum memasuki radius 10m titik ini selama *${targetBin.hoursSinceLastPassed} jam*. Mohon koordinasikan pengambilan.`
            : `*[ANGKUT.IN • PENERTIBAN TONG HUNIAN]*\nTiket: ${ticketCode}\nLokasi: ${targetBin.name}\n\n✅ Log *${targetBin.assignedCartCode}* mencatat pengangkutan SUDAH dilakukan (${targetBin.lastPassedAt}).\n\n⚠️ Warga melaporkan sampah meluber/bau. Mohon imbau pemilik hunian menyediakan tong tertutup yang memadai.`,
        };
        setWhatsAppLogs((prev) => [newWa, ...prev]);
      }

      showToast({
        tone: routing.badgeTone,
        title: `Tiket ${ticketCode} Terkirim`,
        description: `Laporan diteruskan ke ${routing.escalationLabel}.`,
      });

      return newReport;
    },
    [applyBackendState, backendConnected, bins, cart, showToast]
  );

  // --- RT/RW OPERATIONAL ACTIONS ---
  const sendManualRtRwWarning = useCallback(
    async (reportId: string, customNote?: string) => {
      if (backendConnected) {
        try {
          const res = await apiRequest<{
            ok: boolean;
            recipientRole: string;
            state: BackendStatePayload;
          }>(`/reports/${encodeURIComponent(reportId)}/warn`, {
            method: "POST",
            body: JSON.stringify({ customNote }),
          });
          applyBackendState(res.state);
          showToast({
            tone: "emerald",
            title: "Pesan WhatsApp Terkirim",
            description: `Notifikasi tindak lanjut dikirim ke ${res.recipientRole}.`,
          });
          return;
        } catch {
          // fallback
        }
      }

      const target = reports.find((r) => r.id === reportId);
      if (!target) return;

      const targetBin = bins.find((b) => b.id === target.binId);
      const timeNow = formatWibTime();
      const shortTime = timeNow.replace(" WIB", "");
      const isOperasional = target.escalationTarget === "RT_RW_OPERASIONAL";

      const recipientRole = isOperasional
        ? `Koordinator Rute ${targetBin?.assignedCartCode ?? "GRB-MRJ-01"}`
        : targetBin?.ownerLabel ?? "Pemilik Hunian";

      const content =
        customNote?.trim() ||
        (isOperasional
          ? `*[TINDAK LANJUT RT/RW]*\nTiket ${target.ticketCode} (${target.binName}): Mohon prioritaskan pengambilan titik ini oleh unit ${targetBin?.assignedCartCode ?? "GRB-MRJ-01"} pada ritase hari ini.`
          : `*[TEGURAN PENGURUS RW 12]*\nKepada ${recipientRole} (${target.binName}).\nBerdasarkan bukti foto & log pengangkutan ${targetBin?.assignedCartCode ?? "GRB-MRJ-01"}, kapasitas tong saat ini kurang/terbuka. Mohon lengkapi tong tertutup dalam 3x24 jam.`);

      const newWa: WhatsAppNotification = {
        id: `WA-ADM-${Date.now()}`,
        recipientRole,
        recipientPhone: targetBin?.ownerPhone ?? "+62 813-5910-4402",
        timestamp: shortTime,
        messageType: isOperasional ? "OPERASIONAL_RUTE" : "TEGURAN_HUNIAN",
        relatedBinId: target.binId,
        relatedReportId: target.id,
        content,
      };

      setWhatsAppLogs((prev) => [newWa, ...prev]);
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                workflowStage: "DITINDAKLANJUTI",
                adminActionNote: `Pesan WhatsApp dikirim ke ${recipientRole} pukul ${timeNow}.`,
              }
            : r
        )
      );

      showToast({
        tone: "emerald",
        title: "Pesan WhatsApp Terkirim",
        description: `Notifikasi tindak lanjut dikirim ke ${recipientRole}.`,
      });
    },
    [applyBackendState, backendConnected, bins, reports, showToast]
  );

  const resolveReportManually = useCallback(
    async (reportId: string, note?: string) => {
      if (backendConnected) {
        try {
          const res = await apiRequest<{ ok: boolean; state: BackendStatePayload }>(
            `/reports/${encodeURIComponent(reportId)}/resolve`,
            {
              method: "POST",
              body: JSON.stringify({ note }),
            }
          );
          applyBackendState(res.state);
          showToast({
            tone: "emerald",
            title: "Tiket Diselesaikan",
            description: "Status laporan diperbarui menjadi Selesai.",
          });
          return;
        } catch {
          // fallback
        }
      }

      const timeNow = formatWibTime();
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status: "SELESAI_AUTO_RESOLVE",
                workflowStage: "SELESAI",
                resolvedAt: `Hari ini, ${timeNow}`,
                adminActionNote:
                  note || `Diselesaikan oleh pengurus pada ${timeNow}.`,
              }
            : r
        )
      );
      showToast({
        tone: "emerald",
        title: "Tiket Diselesaikan",
        description: "Status laporan diperbarui menjadi Selesai.",
      });
    },
    [applyBackendState, backendConnected, showToast]
  );

  const updateHouseholdBinCompliance = useCallback(
    async (binId: string, compliant: boolean) => {
      if (backendConnected) {
        try {
          const res = await apiRequest<{ ok: boolean; state: BackendStatePayload }>(
            `/bins/${encodeURIComponent(binId)}/compliance`,
            {
              method: "POST",
              body: JSON.stringify({ compliant }),
            }
          );
          applyBackendState(res.state);
          showToast({
            tone: compliant ? "emerald" : "neutral",
            title: compliant
              ? "Tong Hunian Diverifikasi Layak"
              : "Status Tong Diubah Perlu Perbaikan",
            description: compliant
              ? "Potongan iuran bulanan 15% otomatis diaktifkan."
              : "Potongan iuran dinonaktifkan hingga tong tertutup tersedia.",
          });
          return;
        } catch {
          // fallback
        }
      }

      setBins((prev) =>
        prev.map((b) => {
          if (b.id !== binId) return b;
          return {
            ...b,
            binCondition: compliant
              ? "TERTUTUP_LAYAK"
              : "TERBUKA_KURANG_KAPASITAS",
            binTypeLabel: compliant
              ? "Tong Tertutup 80L (Terverifikasi RW)"
              : "Ember Terbuka 25L (Kapasitas Kurang)",
            incentiveEligible: compliant && b.monthlyFeeBase > 0,
            discountPercent: compliant && b.monthlyFeeBase > 0 ? 15 : 0,
          };
        })
      );

      showToast({
        tone: compliant ? "emerald" : "neutral",
        title: compliant
          ? "Tong Hunian Diverifikasi Layak"
          : "Status Tong Diubah Perlu Perbaikan",
        description: compliant
          ? "Potongan iuran bulanan 15% otomatis diaktifkan."
          : "Potongan iuran dinonaktifkan hingga tong tertutup tersedia.",
      });
    },
    [applyBackendState, backendConnected, showToast]
  );

  const addGeoQrBin = useCallback(
    async (payload: BinManagementPayload): Promise<GeoQrBin | null> => {
      if (backendConnected) {
        try {
          const res = await apiRequest<{
            ok: boolean;
            bin: GeoQrBin;
            state: BackendStatePayload;
          }>("/bins", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          applyBackendState(res.state);
          showToast({
            tone: "emerald",
            title: "Titik Tong Baru Ditambahkan",
            description: `${res.bin.name} (${res.bin.id}) tersimpan di database.`,
          });
          return res.bin;
        } catch (err) {
          showToast({
            tone: "rose",
            title: "Gagal Menambah Tong",
            description: err instanceof Error ? err.message : "Error backend",
          });
          return null;
        }
      }

      const existingIds = bins.map((b) => b.id);
      const newId = generateTsidCode(existingIds);
      const waypointIdx =
        (bins.length * 7 + 4) % Math.max(1, routeWaypoints.length - 2);
      const [lat, lng] = routeWaypoints[waypointIdx] ?? routeWaypoints[0];
      const incentiveEligible =
        payload.binCondition === "TERTUTUP_LAYAK" && payload.monthlyFeeBase > 0;

      const newBin: GeoQrBin = {
        id: newId,
        name: payload.name.trim(),
        shortLabel: `Titik ${String(bins.length + 1).padStart(2, "0")} • ${payload.rt}`,
        address: payload.address.trim(),
        rt: payload.rt,
        rw: "RW 12",
        kaplingName: "Kapling RT 01 & RT 02 RW 12",
        ownerLabel: payload.ownerLabel.trim() || "Penghuni Titik Baru",
        ownerPhone: payload.ownerPhone.trim() || "+62 812-3400-0000",
        assignedCartCode: payload.assignedCartCode,
        waypointIndex: waypointIdx,
        coordinates: { lat, lng },
        lastPassedAt: `Hari ini, ${formatWibTime()}`,
        hoursSinceLastPassed: 1,
        lastDwellSeconds: 40,
        lastDistanceMeters: 3.5,
        binCondition: payload.binCondition,
        binTypeLabel: payload.binTypeLabel.trim(),
        incentiveEligible,
        discountPercent: incentiveEligible ? 15 : 0,
        monthlyFeeBase: payload.monthlyFeeBase,
        pickupHistory: [],
      };

      setBins((prev) => [newBin, ...prev]);
      showToast({
        tone: "emerald",
        title: "Titik Tong Baru Ditambahkan",
        description: `${newBin.name} (${newBin.id}) terdaftar & tampil di peta.`,
      });
      return newBin;
    },
    [applyBackendState, backendConnected, bins, routeWaypoints, showToast]
  );

  const updateGeoQrBin = useCallback(
    async (binId: string, payload: Partial<BinManagementPayload>) => {
      if (backendConnected) {
        try {
          const res = await apiRequest<{ ok: boolean; state: BackendStatePayload }>(
            `/bins/${encodeURIComponent(binId)}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            }
          );
          applyBackendState(res.state);
          showToast({
            tone: "emerald",
            title: "Data Tong Sampah Diperbarui",
            description: "Perubahan titik lokasi & stiker QR telah disimpan.",
          });
          return;
        } catch {
          // fallback
        }
      }

      setBins((prev) =>
        prev.map((b) => {
          if (b.id !== binId) return b;
          const nextCondition = payload.binCondition ?? b.binCondition;
          const nextFeeBase =
            payload.monthlyFeeBase !== undefined
              ? payload.monthlyFeeBase
              : b.monthlyFeeBase;
          const nextRt = payload.rt ?? b.rt;
          const incentiveEligible =
            nextCondition === "TERTUTUP_LAYAK" && nextFeeBase > 0;

          return {
            ...b,
            name: payload.name !== undefined ? payload.name.trim() : b.name,
            address:
              payload.address !== undefined ? payload.address.trim() : b.address,
            rt: nextRt,
            shortLabel: b.shortLabel.replace(/RT \d+/i, nextRt),
            ownerLabel:
              payload.ownerLabel !== undefined
                ? payload.ownerLabel.trim()
                : b.ownerLabel,
            ownerPhone:
              payload.ownerPhone !== undefined
                ? payload.ownerPhone.trim()
                : b.ownerPhone,
            assignedCartCode: payload.assignedCartCode ?? b.assignedCartCode,
            binCondition: nextCondition,
            binTypeLabel:
              payload.binTypeLabel !== undefined
                ? payload.binTypeLabel.trim()
                : b.binTypeLabel,
            monthlyFeeBase: nextFeeBase,
            incentiveEligible,
            discountPercent: incentiveEligible ? 15 : 0,
          };
        })
      );

      showToast({
        tone: "emerald",
        title: "Data Tong Sampah Diperbarui",
        description: "Perubahan titik lokasi & stiker QR telah disimpan.",
      });
    },
    [applyBackendState, backendConnected, showToast]
  );

  const deleteGeoQrBin = useCallback(
    async (binId: string) => {
      if (backendConnected) {
        try {
          const res = await apiRequest<{ ok: boolean; state: BackendStatePayload }>(
            `/bins/${encodeURIComponent(binId)}`,
            { method: "DELETE" }
          );
          applyBackendState(res.state);
          showToast({
            tone: "neutral",
            title: "Titik Tong Dihapus",
            description: "Titik tempat sampah telah dihapus.",
          });
          return;
        } catch (err) {
          showToast({
            tone: "rose",
            title: "Tidak Dapat Menghapus",
            description: err instanceof Error ? err.message : "Gagal menghapus",
          });
          return;
        }
      }

      if (bins.length <= 1) {
        showToast({
          tone: "rose",
          title: "Tidak Dapat Menghapus",
          description: "Minimal harus terdapat 1 titik tempat sampah aktif.",
        });
        return;
      }

      const remaining = bins.filter((b) => b.id !== binId);
      setBins(remaining);
      if (selectedBinId === binId && remaining[0]) {
        setSelectedBinId(remaining[0].id);
      }

      showToast({
        tone: "neutral",
        title: "Titik Tong Dihapus",
        description: "Titik tempat sampah telah dihapus dari daftar wilayah.",
      });
    },
    [applyBackendState, backendConnected, bins, selectedBinId, showToast]
  );

  // --- DLH EQUIPMENT & TICKET ACTIONS ---
  const requestTongKuningSpk = useCallback(
    async (unitIds: string[]) => {
      if (unitIds.length === 0) return;
      if (backendConnected) {
        try {
          const res = await apiRequest<{ ok: boolean; state: BackendStatePayload }>(
            "/tong-kuning/request-spk",
            {
              method: "POST",
              body: JSON.stringify({ unitIds }),
            }
          );
          applyBackendState(res.state);
          showToast({
            tone: "emerald",
            title: "Pengajuan Penggantian Alat Dibuat",
            description: `${unitIds.length} unit tong kuning masuk daftar pengajuan perbaikan/penggantian DLH.`,
          });
          return;
        } catch {
          // fallback
        }
      }

      setTongKuningUnits((prev) =>
        prev.map((u) =>
          unitIds.includes(u.id) ? { ...u, spkStatus: "DIAJUKAN_SPK" } : u
        )
      );
      showToast({
        tone: "emerald",
        title: "Pengajuan Penggantian Alat Dibuat",
        description: `${unitIds.length} unit tong kuning masuk daftar pengajuan perbaikan/penggantian DLH.`,
      });
    },
    [applyBackendState, backendConnected, showToast]
  );

  const replaceTongKuningUnit = useCallback(
    async (unitId: string) => {
      if (backendConnected) {
        try {
          const res = await apiRequest<{ ok: boolean; state: BackendStatePayload }>(
            `/tong-kuning/${encodeURIComponent(unitId)}/replace`,
            { method: "POST" }
          );
          applyBackendState(res.state);
          showToast({
            tone: "emerald",
            title: "Kondisi Alat Diperbarui",
            description: "Unit tong kuning berstatus Layak Pakai.",
          });
          return;
        } catch {
          // fallback
        }
      }

      setTongKuningUnits((prev) =>
        prev.map((u) =>
          u.id === unitId
            ? {
                ...u,
                condition: "LAYAK",
                defectNote: "Unit baru terpasang di TPS Merjosari",
                lastInspected: "Hari ini",
                spkStatus: "SUDAH_DIGANTI",
              }
            : u
        )
      );
      showToast({
        tone: "emerald",
        title: "Kondisi Alat Diperbarui",
        description: "Unit tong kuning berstatus Layak Pakai.",
      });
    },
    [applyBackendState, backendConnected, showToast]
  );

  const updateDlhTicketStage = useCallback(
    async (reportId: string, stage: WorkflowStage, note?: string) => {
      if (backendConnected) {
        try {
          const res = await apiRequest<{ ok: boolean; state: BackendStatePayload }>(
            `/reports/${encodeURIComponent(reportId)}/dlh-stage`,
            {
              method: "PATCH",
              body: JSON.stringify({ stage, note }),
            }
          );
          applyBackendState(res.state);
          showToast({
            tone: "emerald",
            title: "Status Tiket DLH Diperbarui",
            description: `Tahap penanganan diubah ke ${stage}.`,
          });
          return;
        } catch {
          // fallback
        }
      }

      const timeNow = formatWibTime();
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                workflowStage: stage,
                status:
                  stage === "SELESAI" ? "SELESAI_AUTO_RESOLVE" : r.status,
                resolvedAt:
                  stage === "SELESAI" ? `Hari ini, ${timeNow}` : r.resolvedAt,
                adminActionNote: note || r.adminActionNote,
              }
            : r
        )
      );
      showToast({
        tone: "emerald",
        title: "Status Tiket DLH Diperbarui",
        description: `Tahap penanganan diubah ke ${stage}.`,
      });
    },
    [applyBackendState, backendConnected, showToast]
  );

  // --- WEB MOCK IOT TELEMETRY ACTIONS ---
  const sendIotTelemetry = useCallback(
    async (payload: {
      cartCode?: string;
      lat: number;
      lng: number;
      batteryPercent?: number;
      gsmSignal?: string;
      locationLabel?: string;
      forceCheckInBinId?: string;
    }): Promise<TelemetryResponseMeta | null> => {
      try {
        const res = await apiRequest<{
          ok: boolean;
          meta: TelemetryResponseMeta;
          state: BackendStatePayload;
        }>("/iot/telemetry", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        applyBackendState(res.state);
        return res.meta;
      } catch {
        return null;
      }
    },
    [applyBackendState]
  );

  const stopIotSession = useCallback(async () => {
    try {
      const res = await apiRequest<{ ok: boolean; state: BackendStatePayload }>(
        "/iot/stop",
        { method: "POST" }
      );
      applyBackendState(res.state);
    } catch {
      // ignore if offline
    }
  }, [applyBackendState]);

  const relocateBinsToCoords = useCallback(
    async (lat: number, lng: number) => {
      const res = await apiRequest<{ ok: boolean; state: BackendStatePayload }>(
        "/iot/relocate-bins",
        {
          method: "POST",
          body: JSON.stringify({ lat, lng }),
        }
      );
      applyBackendState(res.state);
      showToast({
        tone: "emerald",
        title: "Titik Tong Dipindahkan ke Sekitar Anda",
        description: "Sekarang Anda dapat menguji geofencing & auto-check-in dari lokasi GPS Anda.",
      });
    },
    [applyBackendState, showToast]
  );

  const resetBinCoords = useCallback(async () => {
    const res = await apiRequest<{ ok: boolean; state: BackendStatePayload }>(
      "/iot/reset-coords",
      { method: "POST" }
    );
    applyBackendState(res.state);
    showToast({
      tone: "neutral",
      title: "Koordinat Direset",
      description: "Seluruh titik kembali ke peta Jl. Joyosuko Merjosari.",
    });
  }, [applyBackendState, showToast]);

  const counts = useMemo(
    () => ({
      openRtRw: reports.filter(
        (r) =>
          (r.escalationTarget === "RT_RW_OPERASIONAL" ||
            r.escalationTarget === "RT_RW_TEGURAN_HUNIAN") &&
          r.workflowStage !== "SELESAI"
      ).length,
      openDlh: reports.filter(
        (r) =>
          (r.escalationTarget === "DLH_ARMADA_TPS" ||
            r.escalationTarget === "DLH_ASET_SARANA") &&
          r.workflowStage !== "SELESAI"
      ).length,
      autoResolved: reports.filter((r) => r.workflowStage === "SELESAI").length,
      healthyTongKuning: tongKuningUnits.filter((u) => u.condition === "LAYAK")
        .length,
    }),
    [reports, tongKuningUnits]
  );

  const value: AngkutContextValue = {
    bins,
    selectedBinId,
    selectedBin,
    selectBin,
    routeWaypoints,
    tpsCoords,
    cartWaypointIndex,
    distanceToSelectedBinMeters,
    etaMinutes,
    cart,
    cartDevices,
    reports,
    whatsAppLogs,
    tongKuningUnits,
    isTpsCongested,
    backendConnected,
    iotLive,
    dwellInfo,
    toast,
    dismissToast,
    submitCitizenReport,
    sendManualRtRwWarning,
    resolveReportManually,
    updateHouseholdBinCompliance,
    addGeoQrBin,
    updateGeoQrBin,
    deleteGeoQrBin,
    requestTongKuningSpk,
    replaceTongKuningUnit,
    updateDlhTicketStage,
    sendIotTelemetry,
    stopIotSession,
    relocateBinsToCoords,
    resetBinCoords,
    counts,
  };

  return (
    <AngkutContext.Provider value={value}>{children}</AngkutContext.Provider>
  );
}

export function useAngkut(): AngkutContextValue {
  const ctx = useContext(AngkutContext);
  if (!ctx) {
    throw new Error("useAngkut must be used inside AngkutProvider");
  }
  return ctx;
}
