"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  cartWaypointIndex: number;
  isCartMoving: boolean;
  toggleCartMoving: () => void;
  distanceToSelectedBinMeters: number;
  etaMinutes: number;
  cart: CartTrackerState;
  cartDevices: CartDeviceUnit[];
  reports: SmartReport[];
  whatsAppLogs: WhatsAppNotification[];
  tongKuningUnits: TongKuningUnit[];
  isTpsCongested: boolean;
  toast: ToastMessage | null;
  dismissToast: () => void;
  // Citizen actions
  submitCitizenReport: (payload: SubmitReportPayload) => SmartReport | null;
  // RT/RW operational & bin management actions
  sendManualRtRwWarning: (reportId: string, customNote?: string) => void;
  resolveReportManually: (reportId: string, note?: string) => void;
  updateHouseholdBinCompliance: (binId: string, compliant: boolean) => void;
  addGeoQrBin: (payload: BinManagementPayload) => GeoQrBin;
  updateGeoQrBin: (binId: string, payload: Partial<BinManagementPayload>) => void;
  deleteGeoQrBin: (binId: string) => void;
  // DLH equipment & ticket actions
  requestTongKuningSpk: (unitIds: string[]) => void;
  replaceTongKuningUnit: (unitId: string) => void;
  updateDlhTicketStage: (
    reportId: string,
    stage: WorkflowStage,
    note?: string
  ) => void;
  // IoT & Geofence event triggers
  simulateCartPassBin: (binId: string) => void;
  toggleTpsCongestion: (congested: boolean) => void;
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
  const [cartWaypointIndex, setCartWaypointIndex] = useState<number>(6);
  const [isCartMoving, setIsCartMoving] = useState<boolean>(true);
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
  const [toast, setToast] = useState<ToastMessage | null>(null);

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

  // Smooth Gojek-style movement of GRB-MRJ-01 along real road waypoints
  useEffect(() => {
    if (!isCartMoving || cart.status === "TERTAHAN_DI_TPS") return;

    const interval = setInterval(() => {
      setCartWaypointIndex((prev) => {
        const next = prev >= MERJOSARI_STREET_PATH.length - 1 ? 0 : prev + 1;
        const [lat, lng] = MERJOSARI_STREET_PATH[next];

        const areaLabel =
          next < 4
            ? "Jl. Joyosuko Gg. IV (RT 01)"
            : next < 18
              ? "Jl. Joyosuko (Rute RT 01)"
              : next < 30
                ? "Jl. Joyosuko Timur (Rute RT 02)"
                : next < 33
                  ? "Simpang Joyosuko – Akses TPS"
                  : "TPS Merjosari";

        setCart((c) => ({
          ...c,
          coordinates: { lat, lng },
          currentLocationLabel: areaLabel,
          lastSyncAt: formatWibTime(),
        }));

        return next;
      });
    }, 2200);

    return () => clearInterval(interval);
  }, [isCartMoving, cart.status]);

  const toggleCartMoving = useCallback(() => {
    setIsCartMoving((v) => !v);
  }, []);

  const selectedBin = useMemo(
    () => bins.find((b) => b.id === selectedBinId) ?? bins[0],
    [bins, selectedBinId]
  );

  const distanceToSelectedBinMeters = useMemo(
    () => haversineMeters(cart.coordinates, selectedBin.coordinates),
    [cart.coordinates, selectedBin.coordinates]
  );

  const etaMinutes = useMemo(
    () => Math.max(1, Math.round(distanceToSelectedBinMeters / 65)),
    [distanceToSelectedBinMeters]
  );

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
    (payload: SubmitReportPayload): SmartReport | null => {
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
    [bins, cart, showToast]
  );

  // --- RT/RW OPERATIONAL ACTIONS ---
  const sendManualRtRwWarning = useCallback(
    (reportId: string, customNote?: string) => {
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
    [bins, reports, showToast]
  );

  const resolveReportManually = useCallback(
    (reportId: string, note?: string) => {
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
    [showToast]
  );

  const updateHouseholdBinCompliance = useCallback(
    (binId: string, compliant: boolean) => {
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
    [showToast]
  );

  const addGeoQrBin = useCallback(
    (payload: BinManagementPayload): GeoQrBin => {
      const existingIds = bins.map((b) => b.id);
      const newId = generateTsidCode(existingIds);
      const waypointIdx =
        (bins.length * 7 + 4) % (MERJOSARI_STREET_PATH.length - 2);
      const [lat, lng] = MERJOSARI_STREET_PATH[waypointIdx];
      const incentiveEligible =
        payload.binCondition === "TERTUTUP_LAYAK" && payload.monthlyFeeBase > 0;
      const discountPercent = incentiveEligible ? 15 : 0;

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
        discountPercent,
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
    [bins, showToast]
  );

  const updateGeoQrBin = useCallback(
    (binId: string, payload: Partial<BinManagementPayload>) => {
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
    [showToast]
  );

  const deleteGeoQrBin = useCallback(
    (binId: string) => {
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
    [bins, selectedBinId, showToast]
  );

  // --- DLH EQUIPMENT & TICKET ACTIONS ---
  const requestTongKuningSpk = useCallback(
    (unitIds: string[]) => {
      if (unitIds.length === 0) return;
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
    [showToast]
  );

  const replaceTongKuningUnit = useCallback(
    (unitId: string) => {
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
    [showToast]
  );

  const updateDlhTicketStage = useCallback(
    (reportId: string, stage: WorkflowStage, note?: string) => {
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
    [showToast]
  );

  // --- IOT GEOFENCE CHECK-IN & AUTO-RESOLVE ---
  const simulateCartPassBin = useCallback(
    (binId: string) => {
      const targetBin = bins.find((b) => b.id === binId);
      if (!targetBin) return;

      const timeNow = formatWibTime();
      const shortTime = timeNow.replace(" WIB", "");
      const simulatedDwell = 36 + Math.floor(Math.random() * 14);
      const simulatedDist = Number((2.8 + Math.random() * 3.4).toFixed(1));

      setCartWaypointIndex(targetBin.waypointIndex);

      setBins((prev) =>
        prev.map((bin) => {
          if (bin.id !== binId) return bin;
          const previousTodayEntry =
            bin.hoursSinceLastPassed < 24
              ? [
                  {
                    id: `LOG-${Date.now()}`,
                    timestamp: bin.lastPassedAt.replace("Hari ini, ", ""),
                    dateLabel: "Sebelumnya",
                    dwellSeconds: bin.lastDwellSeconds,
                    distanceMeters: bin.lastDistanceMeters,
                    cartCode: bin.assignedCartCode,
                  },
                ]
              : [];

          return {
            ...bin,
            lastPassedAt: `Hari ini, ${timeNow}`,
            hoursSinceLastPassed: 0,
            lastDwellSeconds: simulatedDwell,
            lastDistanceMeters: simulatedDist,
            pickupHistory: [...previousTodayEntry, ...bin.pickupHistory],
          };
        })
      );

      setCart((prev) => ({
        ...prev,
        status: "BERKELILING_RUTE",
        currentBinId: binId,
        currentLocationLabel: `${targetBin.name} (${targetBin.rt})`,
        coordinates: targetBin.coordinates,
        tpsWaitDurationMinutes: 12,
        lastSyncAt: timeNow,
      }));

      setCartDevices((prev) =>
        prev.map((d) =>
          d.cartCode === cart.cartCode
            ? {
                ...d,
                lastSyncAt: "Baru saja",
                geofenceTriggerCountToday: d.geofenceTriggerCountToday + 1,
              }
            : d
        )
      );

      const activeReportsOnBin = reports.filter(
        (r) => r.binId === binId && r.workflowStage !== "SELESAI"
      );

      if (activeReportsOnBin.length > 0) {
        setReports((prev) =>
          prev.map((r) =>
            r.binId === binId && r.workflowStage !== "SELESAI"
              ? {
                  ...r,
                  status: "SELESAI_AUTO_RESOLVE",
                  workflowStage: "SELESAI",
                  resolvedAt: `Hari ini, ${timeNow}`,
                  adminActionNote: `Auto-Resolve: Sensor ${cart.cartCode} berhenti ${simulatedDwell} detik (${simulatedDist}m).`,
                }
              : r
          )
        );

        const autoResolveNotifs: WhatsAppNotification[] =
          activeReportsOnBin.map((rep, idx) => ({
            id: `WA-RES-${Date.now()}-${idx}`,
            recipientRole: `Warga & Pengurus ${targetBin.rt}`,
            recipientPhone: "+62 856-4800-1190",
            timestamp: shortTime,
            messageType: "AUTO_RESOLVE",
            relatedBinId: binId,
            relatedReportId: rep.id,
            content: `*[ANGKUT.IN • AUTO-RESOLVE]*\nTiket ${rep.ticketCode} pada ${targetBin.name} otomatis ditutup.\n\n✅ Sensor *${cart.cartCode}* terdeteksi berhenti ${simulatedDwell} detik (jarak ${simulatedDist}m) pukul ${timeNow}.`,
          }));

        setWhatsAppLogs((prev) => [...autoResolveNotifs, ...prev]);

        showToast({
          tone: "emerald",
          title: `Auto-Check-In & Auto-Resolve`,
          description: `${cart.cartCode} tiba di ${targetBin.shortLabel} (${simulatedDwell} dtk). ${activeReportsOnBin.length} tiket otomatis selesai.`,
        });
      } else {
        showToast({
          tone: "emerald",
          title: `${cart.cartCode} Tiba di ${targetBin.shortLabel}`,
          description: `Check-in geofence pasif tercatat (${simulatedDwell} detik, jarak ${simulatedDist}m).`,
        });
      }
    },
    [bins, cart.cartCode, reports, showToast]
  );

  const toggleTpsCongestion = useCallback(
    (congested: boolean) => {
      const timeNow = formatWibTime();

      if (congested) {
        setCartWaypointIndex(MERJOSARI_STREET_PATH.length - 1);
        setCart((prev) => ({
          ...prev,
          status: "TERTAHAN_DI_TPS",
          currentBinId: "TPS-MERJOSARI",
          currentLocationLabel: "Antre Bongkar Muat di TPS Merjosari",
          coordinates: TPS_MERJOSARI_COORDS,
          tpsWaitDurationMinutes: 95,
          lastSyncAt: timeNow,
        }));
        showToast({
          tone: "rose",
          title: "Antrean TPS Merjosari Terdeteksi",
          description: `${cart.cartCode} tertahan 95 menit di area TPS Merjosari.`,
        });
      } else {
        setCartWaypointIndex(6);
        setCart((prev) => ({
          ...prev,
          status: "BERKELILING_RUTE",
          currentBinId: INITIAL_CART_STATE.currentBinId,
          currentLocationLabel: INITIAL_CART_STATE.currentLocationLabel,
          coordinates: INITIAL_CART_STATE.coordinates,
          tpsWaitDurationMinutes: 12,
          lastSyncAt: timeNow,
        }));
        showToast({
          tone: "emerald",
          title: "Gerobak Kembali ke Rute",
          description: `${cart.cartCode} kembali berkeliling rute RW 12.`,
        });
      }
    },
    [cart.cartCode, showToast]
  );

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
    routeWaypoints: MERJOSARI_STREET_PATH,
    cartWaypointIndex,
    isCartMoving,
    toggleCartMoving,
    distanceToSelectedBinMeters,
    etaMinutes,
    cart,
    cartDevices,
    reports,
    whatsAppLogs,
    tongKuningUnits,
    isTpsCongested,
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
    simulateCartPassBin,
    toggleTpsCongestion,
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
