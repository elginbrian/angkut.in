"use client";

import React, { useState } from "react";
import {
  BatteryCharging,
  Building2,
  CheckCircle2,
  Cpu,
  FileCheck2,
  MapPin,
  Radio,
  Signal,
  Wrench,
  X,
} from "lucide-react";
import { MerjosariStreetMap } from "@/components/map/MerjosariStreetMap";
import { useAngkut } from "@/context/AngkutContext";
import { resolveMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TongKuningCondition } from "@/types/angkut";

type DlhTab = "tickets" | "equipment";
type AssetFilter = "ALL" | TongKuningCondition;

export function DlhPortalApp() {
  const {
    cart,
    isTpsCongested,
    iotLive,
    reports,
    cartDevices,
    tongKuningUnits,
    counts,
    requestTongKuningSpk,
    replaceTongKuningUnit,
    updateDlhTicketStage,
  } = useAngkut();

  const [activeTab, setActiveTab] = useState<DlhTab>("tickets");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("ALL");
  const [drawerReportId, setDrawerReportId] = useState<string | null>(null);

  const dlhReports = reports.filter(
    (r) =>
      r.escalationTarget === "DLH_ARMADA_TPS" ||
      r.escalationTarget === "DLH_ASET_SARANA"
  );

  const drawerReport =
    dlhReports.find((r) => r.id === drawerReportId) ?? null;

  const layakCount = tongKuningUnits.filter((u) => u.condition === "LAYAK").length;
  const ringanCount = tongKuningUnits.filter(
    (u) => u.condition === "RUSAK_RINGAN"
  ).length;
  const beratCount = tongKuningUnits.filter(
    (u) => u.condition === "RUSAK_BERAT"
  ).length;

  const filteredUnits =
    assetFilter === "ALL"
      ? tongKuningUnits
      : tongKuningUnits.filter((u) => u.condition === assetFilter);

  const unrequestedHeavyIds = tongKuningUnits
    .filter((u) => u.condition === "RUSAK_BERAT" && u.spkStatus === "TIDAK_ADA")
    .map((u) => u.id);

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-xs font-bold text-white">
              DLH
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-900 sm:text-base">
                Portal DLH Kota Malang
              </h1>
              <p className="text-[11px] text-zinc-500">
                Penerimaan Laporan &amp; Pemantauan Kondisi Alat TPS Merjosari
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs sm:flex">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isTpsCongested ? "bg-rose-500" : "bg-emerald-500"
              )}
            />
            <span className="font-mono font-semibold text-zinc-800">
              {cart.cartCode}
            </span>
            <span className="text-zinc-500">• {cart.currentLocationLabel}</span>
          </div>
        </div>

        {/* Mobile Tab Strip */}
        <div className="flex gap-1 border-t border-zinc-100 px-4 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
              activeTab === "tickets"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Laporan Masuk ({counts.openDlh})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("equipment")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
              activeTab === "equipment"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Kondisi Alat ({ringanCount + beratCount} Rusak)</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-12">
        {/* Clean 2-Item Sidebar */}
        <aside className="hidden lg:col-span-3 lg:block">
          <nav className="sticky top-20 space-y-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("tickets")}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition",
                activeTab === "tickets"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <span className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4" />
                <span>Laporan Masuk DLH</span>
              </span>
              {counts.openDlh > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    activeTab === "tickets"
                      ? "bg-emerald-400 text-zinc-950"
                      : "bg-emerald-100 text-emerald-800"
                  )}
                >
                  {counts.openDlh}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("equipment")}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition",
                activeTab === "equipment"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <span className="flex items-center gap-2.5">
                <Wrench className="h-4 w-4" />
                <span>Kondisi Alat &amp; Sarana</span>
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  activeTab === "equipment"
                    ? "bg-rose-500 text-white"
                    : "bg-rose-100 text-rose-800"
                )}
              >
                {ringanCount + beratCount}
              </span>
            </button>
          </nav>
        </aside>

        {/* Main Workspace */}
        <main className="lg:col-span-9">
          {activeTab === "tickets" && (
            <div className="space-y-6">
              {/* Live Route & Asset Distribution Map */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-bold text-zinc-900">
                      Peta Sebaran Titik Tong, Rute Gerobak &amp; TPS Merjosari
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

              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 px-5 py-4">
                  <h2 className="text-sm font-bold text-zinc-900">
                    Laporan Masuk DLH Kota Malang ({dlhReports.length})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Klik baris laporan untuk meninjau bukti foto, validasi lokasi,
                    dan memperbarui status penanganan
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-100 bg-zinc-50 text-[11px] uppercase text-zinc-500">
                      <tr>
                        <th className="px-4 py-3">Tiket</th>
                        <th className="px-4 py-3">Lokasi &amp; Wilayah</th>
                        <th className="px-4 py-3">Kategori Masalah</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {dlhReports.map((rep) => {
                        const resolved = rep.workflowStage === "SELESAI";
                        return (
                          <tr
                            key={rep.id}
                            onClick={() => setDrawerReportId(rep.id)}
                            className="cursor-pointer transition hover:bg-zinc-50"
                          >
                            <td className="px-4 py-3.5 font-mono font-bold text-zinc-900">
                              {rep.ticketCode}
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-semibold text-zinc-900">
                                {rep.binName}
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                {rep.rtRwLabel} • {rep.createdAt}
                              </p>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-800">
                                {rep.categoryLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
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
                                    ? "Dalam Penanganan"
                                    : "Baru"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
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

          {activeTab === "equipment" && (
            <div className="space-y-6">
              {/* Section A: Passive IoT Cart Tracker Hardware Health */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3.5">
                  <Cpu className="h-4 w-4 text-emerald-700" />
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900">
                      Kondisi Perangkat Pelacak Gerobak (IoT Tracker)
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Status baterai, sinyal GSM, dan aktivitas geofencing unit
                      gerobak
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {cartDevices.map((dev) => (
                    <div
                      key={dev.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-zinc-900">
                          {dev.cartCode}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                            dev.gpsStatus === "AKTIF"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          )}
                        >
                          {dev.gpsStatus === "AKTIF"
                            ? "Sensor Aktif"
                            : "Baterai Rendah"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-zinc-600">
                        {dev.kapling}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                        {dev.hardwareSpec}
                      </p>

                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-200/70 pt-3 text-[11px]">
                        <div className="flex items-center gap-1 text-zinc-700">
                          <BatteryCharging className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="font-mono font-semibold">
                            {dev.batteryPercent}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-700">
                          <Signal className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="truncate">
                            {dev.gsmSignal.split(" ")[0]}
                          </span>
                        </div>
                        <div className="text-right font-mono text-zinc-500">
                          {dev.geofenceTriggerCountToday} log
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section B: 18 Tong Kuning TPS Merjosari Inventory */}
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900">
                      Kondisi 18 Unit Tong Kuning TPS Merjosari
                    </h2>
                    <p className="text-xs text-zinc-500">
                      {layakCount} Layak • {ringanCount} Rusak Ringan •{" "}
                      {beratCount} Rusak Berat
                    </p>
                  </div>

                  {unrequestedHeavyIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => requestTongKuningSpk(unrequestedHeavyIds)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <FileCheck2 className="h-3.5 w-3.5" />
                      <span>
                        Ajukan Penggantian ({unrequestedHeavyIds.length} Rusak
                        Berat)
                      </span>
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-2 border-b border-zinc-100 bg-zinc-50/60 px-5 py-3">
                  {(
                    [
                      { id: "ALL", label: `Semua (${tongKuningUnits.length})` },
                      { id: "LAYAK", label: `Layak (${layakCount})` },
                      {
                        id: "RUSAK_RINGAN",
                        label: `Rusak Ringan (${ringanCount})`,
                      },
                      {
                        id: "RUSAK_BERAT",
                        label: `Rusak Berat (${beratCount})`,
                      },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setAssetFilter(f.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1 text-xs font-semibold transition",
                        assetFilter === f.id
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-100 bg-zinc-50 text-[11px] uppercase text-zinc-500">
                      <tr>
                        <th className="px-4 py-3">Kode Unit</th>
                        <th className="px-4 py-3">Zona TPS</th>
                        <th className="px-4 py-3">Kondisi</th>
                        <th className="px-4 py-3">Keterangan Inspeksi</th>
                        <th className="px-4 py-3 text-right">Status SPK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredUnits.map((unit) => (
                        <tr key={unit.id} className="hover:bg-zinc-50/60">
                          <td className="px-4 py-3 font-mono font-bold text-zinc-900">
                            {unit.code}
                          </td>
                          <td className="px-4 py-3 text-zinc-600">
                            {unit.zone}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                unit.condition === "LAYAK"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : unit.condition === "RUSAK_RINGAN"
                                    ? "bg-zinc-200 text-zinc-800"
                                    : "bg-rose-100 text-rose-800"
                              )}
                            >
                              {unit.condition === "LAYAK"
                                ? "Layak Pakai"
                                : unit.condition === "RUSAK_RINGAN"
                                  ? "Rusak Ringan"
                                  : "Rusak Berat"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-600">
                            {unit.defectNote}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {unit.condition === "LAYAK" ? (
                              <span className="text-[11px] text-zinc-400">
                                {unit.spkStatus === "SUDAH_DIGANTI"
                                  ? "Unit Baru Terpasang"
                                  : "Baik"}
                              </span>
                            ) : unit.spkStatus === "DIAJUKAN_SPK" ? (
                              <button
                                type="button"
                                onClick={() => replaceTongKuningUnit(unit.id)}
                                className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800"
                              >
                                Konfirmasi Unit Baru
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => requestTongKuningSpk([unit.id])}
                                className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-50"
                              >
                                Ajukan Penggantian
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Slide-Over Detail Drawer for DLH Ticket */}
      {drawerReport && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-zinc-950/50 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Detail Tiket DLH"
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

            <div className="flex-1 space-y-4 p-5 text-xs">
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

              <div className="space-y-2">
                <span className="inline-flex rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-800">
                  {drawerReport.categoryLabel}
                </span>
                <p className="leading-relaxed text-zinc-700">
                  {drawerReport.description}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-600">
                <strong className="text-zinc-900">Validasi Sistem:</strong>{" "}
                {drawerReport.routingReason}
              </div>

              {drawerReport.adminActionNote && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                  <strong>Catatan Penanganan:</strong>{" "}
                  {drawerReport.adminActionNote}
                </div>
              )}
            </div>

            {drawerReport.workflowStage !== "SELESAI" && (
              <div className="sticky bottom-0 flex flex-col gap-2 border-t border-zinc-100 bg-white p-4">
                {drawerReport.workflowStage === "BARU" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateDlhTicketStage(
                        drawerReport.id,
                        "DITINDAKLANJUTI",
                        "Tim sarpras DLH dijadwalkan melakukan pemeriksaan di TPS Merjosari."
                      )
                    }
                    className="w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Proses Tindak Lanjut Lapangan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    updateDlhTicketStage(
                      drawerReport.id,
                      "SELESAI",
                      "Laporan sarana & kondisi TPS telah ditangani DLH."
                    )
                  }
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
