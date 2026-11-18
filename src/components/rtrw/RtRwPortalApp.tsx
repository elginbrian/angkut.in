"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Crosshair,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Radio,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { BinCoordinatePickerMap } from "@/components/map/BinCoordinatePickerMap";
import { MerjosariStreetMap } from "@/components/map/MerjosariStreetMap";
import { QrStickerModal } from "@/components/warga/QrStickerModal";
import {
  useAngkut,
  type BinManagementPayload,
} from "@/context/AngkutContext";
import { resolveMediaUrl } from "@/lib/api";
import { cn, formatRupiah } from "@/lib/utils";
import type { BinCondition, GeoQrBin } from "@/types/angkut";

type RtRwTab = "monitoring" | "bins_management";
type RtFilter = "ALL" | "RT 01" | "RT 02";

const DEFAULT_BIN_COORDS = {
  lat: -7.94685,
  lng: 112.60345,
};

const EMPTY_BIN_FORM: BinManagementPayload = {
  name: "",
  address: "",
  rt: "RT 01",
  ownerLabel: "",
  ownerPhone: "+62 812-",
  assignedCartCode: "GRB-MRJ-01",
  binCondition: "TERTUTUP_LAYAK",
  binTypeLabel: "Tong Tertutup 80L (1 Unit)",
  monthlyFeeBase: 30000,
  lat: DEFAULT_BIN_COORDS.lat,
  lng: DEFAULT_BIN_COORDS.lng,
};

export function RtRwPortalApp() {
  const {
    bins,
    cart,
    reports,
    whatsAppLogs,
    counts,
    isTpsCongested,
    iotLive,
    sendManualRtRwWarning,
    resolveReportManually,
    updateHouseholdBinCompliance,
    addGeoQrBin,
    updateGeoQrBin,
    deleteGeoQrBin,
  } = useAngkut();

  const [activeTab, setActiveTab] = useState<RtRwTab>("monitoring");
  const [drawerReportId, setDrawerReportId] = useState<string | null>(null);

  // Bin Management & Print QR State
  const [rtFilter, setRtFilter] = useState<RtFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [qrModalBin, setQrModalBin] = useState<GeoQrBin | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<GeoQrBin | null>(null);
  const [binForm, setBinForm] = useState<BinManagementPayload>(EMPTY_BIN_FORM);
  const [latInput, setLatInput] = useState<string>(
    String(DEFAULT_BIN_COORDS.lat)
  );
  const [lngInput, setLngInput] = useState<string>(
    String(DEFAULT_BIN_COORDS.lng)
  );
  const [coordError, setCoordError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const rtRwReports = reports.filter(
    (r) =>
      r.escalationTarget === "RT_RW_OPERASIONAL" ||
      r.escalationTarget === "RT_RW_TEGURAN_HUNIAN"
  );

  const drawerReport =
    rtRwReports.find((r) => r.id === drawerReportId) ?? null;

  const relatedWaMessages = drawerReport
    ? whatsAppLogs.filter(
        (w) =>
          w.relatedReportId === drawerReport.id ||
          w.relatedBinId === drawerReport.binId
      )
    : [];

  const filteredBins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bins.filter((b) => {
      const matchRt = rtFilter === "ALL" || b.rt === rtFilter;
      const matchQuery =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.ownerLabel.toLowerCase().includes(q);
      return matchRt && matchQuery;
    });
  }, [bins, rtFilter, searchQuery]);

  const compliantCount = bins.filter(
    (b) => b.binCondition === "TERTUTUP_LAYAK"
  ).length;
  const issueBinCount = bins.length - compliantCount;

  const applyFormCoordinates = (nextLat: number, nextLng: number) => {
    const fixedLat = Number(nextLat.toFixed(6));
    const fixedLng = Number(nextLng.toFixed(6));
    setBinForm((f) => ({ ...f, lat: fixedLat, lng: fixedLng }));
    setLatInput(fixedLat.toFixed(6));
    setLngInput(fixedLng.toFixed(6));
    setCoordError(null);
  };

  const handleManualCoordChange = (field: "lat" | "lng", raw: string) => {
    const normalized = raw.replace(",", ".");
    if (field === "lat") {
      setLatInput(normalized);
    } else {
      setLngInput(normalized);
    }

    const trimmed = normalized.trim();
    if (!trimmed || trimmed === "-" || trimmed === "." || trimmed === "-.") {
      return;
    }
    const parsed = Number(trimmed);
    const inRange =
      field === "lat"
        ? parsed >= -90 && parsed <= 90
        : parsed >= -180 && parsed <= 180;
    if (Number.isFinite(parsed) && inRange) {
      setBinForm((f) => ({ ...f, [field]: parsed }));
      setCoordError(null);
    }
  };

  const handleUseDeviceGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCoordError("Perangkat/browser ini tidak mendukung GPS.");
      return;
    }
    setGpsLoading(true);
    setCoordError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        applyFormCoordinates(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setGpsLoading(false);
        setCoordError(
          "Gagal mengambil lokasi GPS. Pastikan izin lokasi diaktifkan atau pilih titik di peta."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCenterDefaultArea = () => {
    const anchor = bins[0]?.coordinates ?? DEFAULT_BIN_COORDS;
    applyFormCoordinates(anchor.lat, anchor.lng);
  };

  const openCreateModal = () => {
    const anchor = bins[0]?.coordinates ?? DEFAULT_BIN_COORDS;
    const initialLat = Number(anchor.lat.toFixed(6));
    const initialLng = Number(anchor.lng.toFixed(6));
    setEditingBin(null);
    setBinForm({
      ...EMPTY_BIN_FORM,
      lat: initialLat,
      lng: initialLng,
    });
    setLatInput(initialLat.toFixed(6));
    setLngInput(initialLng.toFixed(6));
    setCoordError(null);
    setGpsLoading(false);
    setFormOpen(true);
  };

  const openEditModal = (bin: GeoQrBin) => {
    const initialLat = Number(bin.coordinates.lat.toFixed(6));
    const initialLng = Number(bin.coordinates.lng.toFixed(6));
    setEditingBin(bin);
    setBinForm({
      name: bin.name,
      address: bin.address,
      rt: bin.rt,
      ownerLabel: bin.ownerLabel,
      ownerPhone: bin.ownerPhone,
      assignedCartCode: bin.assignedCartCode,
      binCondition: bin.binCondition,
      binTypeLabel: bin.binTypeLabel,
      monthlyFeeBase: bin.monthlyFeeBase,
      lat: initialLat,
      lng: initialLng,
    });
    setLatInput(initialLat.toFixed(6));
    setLngInput(initialLng.toFixed(6));
    setCoordError(null);
    setGpsLoading(false);
    setFormOpen(true);
  };

  const handleSaveBinForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!binForm.name.trim() || !binForm.address.trim()) return;

    const parsedLat = Number(latInput.trim().replace(",", "."));
    const parsedLng = Number(lngInput.trim().replace(",", "."));
    if (
      !latInput.trim() ||
      !lngInput.trim() ||
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      setCoordError(
        "Koordinat tidak valid. Latitude harus -90 s/d 90 dan Longitude -180 s/d 180."
      );
      return;
    }

    const payload: BinManagementPayload = {
      ...binForm,
      lat: Number(parsedLat.toFixed(6)),
      lng: Number(parsedLng.toFixed(6)),
    };

    if (editingBin) {
      updateGeoQrBin(editingBin.id, payload);
    } else {
      addGeoQrBin(payload);
    }
    setFormOpen(false);
    setEditingBin(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      {/* Top Portal Bar */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-xs font-bold text-white">
              RW12
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-900 sm:text-base">
                Portal Pengurus RW 12 Joyosuko
              </h1>
              <p className="text-[11px] text-zinc-500">
                Kelurahan Merjosari, Kec. Lowokwaru, Kota Malang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("bins_management");
                if (bins[0]) setQrModalBin(bins[0]);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/50"
            >
              <Printer className="h-3.5 w-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Print Stiker QR</span>
              <span className="sm:hidden">Print QR</span>
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs md:flex">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isTpsCongested ? "bg-rose-500" : "bg-emerald-500"
                )}
              />
              <span className="font-mono font-semibold text-zinc-800">
                {cart.cartCode}
              </span>
              <span className="text-zinc-500">
                • {cart.currentLocationLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Tab Strip */}
        <div className="flex gap-1 border-t border-zinc-100 px-4 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("monitoring")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
              activeTab === "monitoring"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Rute &amp; Laporan ({counts.openRtRw})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bins_management")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
              activeTab === "bins_management"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Manajemen Tong ({bins.length})</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-12">
        {/* Clean 2-Item Sidebar */}
        <aside className="hidden lg:col-span-3 lg:block">
          <nav className="sticky top-20 space-y-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("monitoring")}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition",
                activeTab === "monitoring"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <span className="flex items-center gap-2.5">
                <ClipboardList className="h-4 w-4" />
                <span>Pantauan Rute &amp; Laporan</span>
              </span>
              {counts.openRtRw > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    activeTab === "monitoring"
                      ? "bg-emerald-400 text-zinc-950"
                      : "bg-rose-100 text-rose-700"
                  )}
                >
                  {counts.openRtRw}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("bins_management")}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition",
                activeTab === "bins_management"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <span className="flex items-center gap-2.5">
                <QrCode className="h-4 w-4" />
                <span>Manajemen Tong &amp; QR</span>
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  activeTab === "bins_management"
                    ? "bg-emerald-400 text-zinc-950"
                    : "bg-zinc-100 text-zinc-700"
                )}
              >
                {bins.length}
              </span>
            </button>
          </nav>
        </aside>

        {/* Main Workspace */}
        <main className="lg:col-span-9">
          {activeTab === "monitoring" && (
            <div className="space-y-6">
              {/* Live Route Map */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-bold text-zinc-900">
                      Peta Pergerakan Gerobak RW 12 → TPS Merjosari
                    </h2>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold text-zinc-700">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        cart.coordinates
                          ? iotLive
                            ? "animate-pulse bg-emerald-500"
                            : "bg-emerald-500"
                          : "bg-zinc-400"
                      )}
                    />
                    <span>
                      {cart.coordinates
                        ? "Terhubung ke Sinyal Mock IoT"
                        : "Menunggu Sinyal Web Mock IoT"}
                    </span>
                  </span>
                </div>

                <MerjosariStreetMap heightClass="h-72" />
              </div>

              {/* Clean Single-Source Reports Table */}
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 px-5 py-3.5">
                  <h2 className="text-sm font-bold text-zinc-900">
                    Laporan Warga Masuk ({rtRwReports.length})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Klik baris laporan untuk melihat bukti foto, log sensor, dan
                    kirim tindak lanjut WhatsApp
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-100 bg-zinc-50 text-[11px] uppercase text-zinc-500">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-3">Tiket</th>
                        <th className="whitespace-nowrap px-4 py-3">
                          Lokasi Titik
                        </th>
                        <th className="whitespace-nowrap px-4 py-3">
                          Kategori
                        </th>
                        <th className="whitespace-nowrap px-4 py-3">Status</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right">
                          Detail
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {rtRwReports.map((rep) => {
                        const resolved = rep.workflowStage === "SELESAI";
                        const isOperasional =
                          rep.escalationTarget === "RT_RW_OPERASIONAL";

                        return (
                          <tr
                            key={rep.id}
                            onClick={() => setDrawerReportId(rep.id)}
                            className="cursor-pointer transition hover:bg-zinc-50"
                          >
                            <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-zinc-900">
                              {rep.ticketCode}
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="max-w-[220px] truncate font-semibold text-zinc-900">
                                {rep.binName}
                              </p>
                              <p className="max-w-[220px] truncate text-[11px] text-zinc-500">
                                {rep.rtRwLabel} • {rep.createdAt}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold",
                                  isOperasional
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-zinc-100 text-zinc-800"
                                )}
                              >
                                {isOperasional
                                  ? "Rute Terlewat >24j"
                                  : "Teguran Hunian"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                                  resolved
                                    ? "bg-emerald-100 text-emerald-800"
                                    : rep.workflowStage === "DITINDAKLANJUTI"
                                      ? "bg-zinc-900 text-white"
                                      : "bg-zinc-100 text-zinc-700"
                                )}
                              >
                                {resolved
                                  ? "Selesai"
                                  : rep.workflowStage === "DITINDAKLANJUTI"
                                    ? "Ditindaklanjuti"
                                    : "Baru"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-emerald-700">
                              Buka →
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "bins_management" && (
            <div className="space-y-5">
              {/* Summary Strip */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-zinc-500">
                    Total Titik GeoQR Terdaftar
                  </p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900">
                    {bins.length} Titik
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-zinc-500">
                    Tong Tertutup Layak
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {compliantCount} Titik
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-zinc-500">
                    Perlu Penertiban / Perbaikan
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-bold",
                      issueBinCount > 0 ? "text-rose-600" : "text-zinc-900"
                    )}
                  >
                    {issueBinCount} Titik
                  </p>
                </div>
              </div>

              {/* Bin Management Table Card */}
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900">
                      Manajemen Tong Sampah &amp; Stiker GeoQR RW 12
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Kelola data titik tempat sampah, verifikasi kelayakan
                      iuran 15%, serta cetak stiker QR masing-masing lokasi
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Tong Sampah</span>
                  </button>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {(["ALL", "RT 01", "RT 02"] as const).map((rt) => (
                      <button
                        key={rt}
                        type="button"
                        onClick={() => setRtFilter(rt)}
                        className={cn(
                          "rounded-lg border px-3 py-1 text-xs font-semibold transition",
                          rtFilter === rt
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                        )}
                      >
                        {rt === "ALL" ? "Semua RT" : rt}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama, alamat, atau tsid..."
                      className="w-full rounded-xl border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-100 bg-zinc-50 text-[11px] uppercase text-zinc-500">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-3">
                          Titik Lokasi
                        </th>
                        <th className="whitespace-nowrap px-4 py-3">
                          Wilayah
                        </th>
                        <th className="whitespace-nowrap px-4 py-3">
                          Status Tong
                        </th>
                        <th className="whitespace-nowrap px-4 py-3">
                          Iuran / Bln
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-right">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredBins.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-xs text-zinc-400"
                          >
                            Tidak ada titik tempat sampah yang cocok dengan
                            pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredBins.map((bin) => {
                          const isCompliant =
                            bin.binCondition === "TERTUTUP_LAYAK";
                          const isBroken =
                            bin.binCondition === "KOMUNAL_RUSAK";
                          const statusShortLabel = isCompliant
                            ? "Tertutup Layak"
                            : isBroken
                              ? "Komunal Rusak"
                              : "Kurang Layak";
                          const finalFee = bin.incentiveEligible
                            ? bin.monthlyFeeBase *
                              (1 - bin.discountPercent / 100)
                            : bin.monthlyFeeBase;

                          return (
                            <tr key={bin.id} className="hover:bg-zinc-50/70">
                              <td className="px-4 py-3.5">
                                <p className="max-w-[200px] truncate font-semibold text-zinc-900">
                                  {bin.name}
                                </p>
                                <p className="font-mono text-[11px] text-zinc-400">
                                  {bin.id} •{" "}
                                  {bin.coordinates.lat.toFixed(5)},{" "}
                                  {bin.coordinates.lng.toFixed(5)}
                                </p>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5">
                                <p className="font-semibold text-zinc-800">
                                  {bin.rt} / {bin.rw}
                                </p>
                                <p className="font-mono text-[11px] text-zinc-500">
                                  {bin.assignedCartCode}
                                </p>
                              </td>
                              <td className="px-4 py-3.5">
                                <span
                                  className={cn(
                                    "inline-flex whitespace-nowrap items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold",
                                    isCompliant
                                      ? "bg-emerald-100 text-emerald-800"
                                      : isBroken
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-zinc-100 text-zinc-800"
                                  )}
                                >
                                  {isCompliant ? (
                                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  ) : (
                                    <ShieldAlert className="h-3 w-3 shrink-0" />
                                  )}
                                  <span>{statusShortLabel}</span>
                                </span>
                                <p className="mt-1 max-w-[165px] truncate text-[11px] text-zinc-500">
                                  {bin.binTypeLabel}
                                </p>
                                {bin.monthlyFeeBase > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateHouseholdBinCompliance(
                                        bin.id,
                                        !isCompliant
                                      )
                                    }
                                    className="mt-0.5 whitespace-nowrap text-[10.5px] font-semibold text-emerald-700 hover:underline"
                                  >
                                    {isCompliant
                                      ? "Tandai Kurang Layak"
                                      : "Verifikasi Layak"}
                                  </button>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5">
                                {bin.monthlyFeeBase === 0 ? (
                                  <span className="inline-block whitespace-nowrap rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                                    Komunal
                                  </span>
                                ) : (
                                  <div>
                                    <p className="font-mono font-bold text-zinc-900">
                                      {formatRupiah(finalFee)}
                                    </p>
                                    {bin.incentiveEligible && (
                                      <span className="text-[10px] font-semibold text-emerald-700">
                                        Diskon {bin.discountPercent}%
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setQrModalBin(bin)}
                                    className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-zinc-800"
                                  >
                                    <Printer className="h-3 w-3 shrink-0 text-emerald-400" />
                                    <span>Cetak QR</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(bin)}
                                    title="Edit data tong"
                                    aria-label={`Edit ${bin.name}`}
                                    className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteGeoQrBin(bin.id)}
                                    title="Hapus titik tong"
                                    aria-label={`Hapus ${bin.name}`}
                                    className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit GeoQR Bin Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={editingBin ? "Edit Titik Tong Sampah" : "Tambah Tong Sampah"}
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  {editingBin
                    ? "Kelola Data Tong Sampah"
                    : "Tambah Titik Tong Sampah Baru"}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  {editingBin
                    ? `Kode stiker: ${editingBin.id}`
                    : "Kode stiker tsid-xxxxxxxx dibuat otomatis setelah disimpan"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Tutup form"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBinForm} className="space-y-4 p-5 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block font-semibold text-zinc-800">
                    Nama Lokasi / Hunian
                  </label>
                  <input
                    type="text"
                    required
                    value={binForm.name}
                    onChange={(e) =>
                      setBinForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Contoh: Kos Melati Joyosuko No. 19"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block font-semibold text-zinc-800">
                    Alamat Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={binForm.address}
                    onChange={(e) =>
                      setBinForm((f) => ({ ...f, address: e.target.value }))
                    }
                    placeholder="Contoh: Jl. Joyosuko Gg. II No. 19, Kel. Merjosari"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-zinc-800">
                    Wilayah RT
                  </label>
                  <select
                    value={binForm.rt}
                    onChange={(e) =>
                      setBinForm((f) => ({ ...f, rt: e.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
                  >
                    <option value="RT 01">RT 01</option>
                    <option value="RT 02">RT 02</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-zinc-800">
                    Unit Gerobak Bertugas
                  </label>
                  <select
                    value={binForm.assignedCartCode}
                    onChange={(e) =>
                      setBinForm((f) => ({
                        ...f,
                        assignedCartCode: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-zinc-900 outline-none focus:border-zinc-900"
                  >
                    <option value="GRB-MRJ-01">GRB-MRJ-01</option>
                    <option value="GRB-MRJ-02">GRB-MRJ-02</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-zinc-800">
                    Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    value={binForm.ownerLabel}
                    onChange={(e) =>
                      setBinForm((f) => ({ ...f, ownerLabel: e.target.value }))
                    }
                    placeholder="Pengelola Kos / Pemilik"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-zinc-800">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    value={binForm.ownerPhone}
                    onChange={(e) =>
                      setBinForm((f) => ({ ...f, ownerPhone: e.target.value }))
                    }
                    placeholder="+62 812-xxxx-xxxx"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-zinc-800">
                    Status Kelayakan Tong
                  </label>
                  <select
                    value={binForm.binCondition}
                    onChange={(e) =>
                      setBinForm((f) => ({
                        ...f,
                        binCondition: e.target.value as BinCondition,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
                  >
                    <option value="TERTUTUP_LAYAK">Tong Tertutup Layak</option>
                    <option value="TERBUKA_KURANG_KAPASITAS">
                      Terbuka / Kurang Kapasitas
                    </option>
                    <option value="KOMUNAL_RUSAK">Bak Komunal Rusak</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-zinc-800">
                    Iuran Bulanan Dasar (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={binForm.monthlyFeeBase}
                    onChange={(e) =>
                      setBinForm((f) => ({
                        ...f,
                        monthlyFeeBase: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block font-semibold text-zinc-800">
                    Keterangan Jenis &amp; Ukuran Tong
                  </label>
                  <input
                    type="text"
                    required
                    value={binForm.binTypeLabel}
                    onChange={(e) =>
                      setBinForm((f) => ({
                        ...f,
                        binTypeLabel: e.target.value,
                      }))
                    }
                    placeholder="Contoh: Tong Tertutup 80L (2 Unit)"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Coordinate Picker Map & Manual Lat/Lng */}
                <div className="space-y-2.5 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3.5 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                      <span className="font-semibold text-zinc-900">
                        Titik Koordinat Lokasi (Pilih di Peta atau Input Manual)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleUseDeviceGps}
                        disabled={gpsLoading}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 transition hover:border-emerald-500 hover:bg-emerald-50/60 disabled:opacity-60"
                      >
                        <Crosshair className="h-3 w-3 text-emerald-700" />
                        <span>
                          {gpsLoading ? "Mengambil GPS..." : "Gunakan GPS Saya"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCenterDefaultArea}
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        Pusatkan RW 12
                      </button>
                    </div>
                  </div>

                  <BinCoordinatePickerMap
                    lat={binForm.lat ?? DEFAULT_BIN_COORDS.lat}
                    lng={binForm.lng ?? DEFAULT_BIN_COORDS.lng}
                    editingBinId={editingBin?.id ?? null}
                    onChange={applyFormCoordinates}
                    heightClass="h-48"
                  />

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-zinc-700">
                        Latitude (Garis Lintang)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={latInput}
                        onChange={(e) =>
                          handleManualCoordChange("lat", e.target.value)
                        }
                        placeholder="-7.946850"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-900 outline-none focus:border-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-zinc-700">
                        Longitude (Garis Bujur)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={lngInput}
                        onChange={(e) =>
                          handleManualCoordChange("lng", e.target.value)
                        }
                        placeholder="112.603450"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-900 outline-none focus:border-zinc-900"
                      />
                    </div>
                  </div>

                  {coordError && (
                    <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700">
                      {coordError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
                >
                  {editingBin ? "Simpan Perubahan" : "Simpan Titik Tong"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print QR Sticker Modal from RT/RW */}
      {qrModalBin && (
        <QrStickerModal
          bin={qrModalBin}
          open={Boolean(qrModalBin)}
          onClose={() => setQrModalBin(null)}
        />
      )}

      {/* Slide-Over Detail Drawer */}
      {drawerReport && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-zinc-950/50 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Detail Laporan RT/RW"
        >
          <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-5 py-4">
              <div>
                <span className="font-mono text-xs font-bold text-zinc-500">
                  {drawerReport.ticketCode}
                </span>
                <h3 className="text-sm font-bold text-zinc-900">
                  {drawerReport.binName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerReportId(null)}
                aria-label="Tutup panel"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 p-5">
              {/* Evidence Photo */}
              <div className="overflow-hidden rounded-2xl border border-zinc-200">
                {/* eslint-disable-next-line @next/next/img-element */}
                <img
                  src={resolveMediaUrl(drawerReport.photoUrl)}
                  alt={drawerReport.photoLabel}
                  className="h-44 w-full object-cover"
                />
                <div className="flex items-center justify-between bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Radius pelapor: {drawerReport.reporterDistanceMeters}m
                  </span>
                  <span>{drawerReport.createdAt}</span>
                </div>
              </div>

              {/* Description & IoT Verification */}
              <div className="space-y-2.5 text-xs">
                <p className="leading-relaxed text-zinc-700">
                  {drawerReport.description}
                </p>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-600">
                  <strong className="text-zinc-900">Log Pelacak Gerobak:</strong>{" "}
                  {drawerReport.routingReason}
                </div>
              </div>

              {/* WhatsApp Outbox for this Ticket */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  <span>Log Pesan WhatsApp Tiket Ini</span>
                </div>

                <div className="space-y-2 rounded-2xl bg-zinc-100 p-3">
                  {relatedWaMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-zinc-800 shadow-sm"
                    >
                      <p className="mb-1 font-semibold text-emerald-950">
                        Kepada: {msg.recipientRole}
                      </p>
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                        {msg.content}
                      </pre>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-zinc-500">
                        <span>{msg.timestamp}</span>
                        <CheckCheck className="h-3 w-3 text-emerald-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {drawerReport.workflowStage !== "SELESAI" && (
              <div className="sticky bottom-0 flex flex-col gap-2 border-t border-zinc-100 bg-white p-4">
                <button
                  type="button"
                  onClick={() => sendManualRtRwWarning(drawerReport.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {drawerReport.escalationTarget === "RT_RW_OPERASIONAL"
                      ? "Kirim WA Koordinasi Rute"
                      : "Kirim WA Teguran Pemilik Hunian"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => resolveReportManually(drawerReport.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Tandai Selesai</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
