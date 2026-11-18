"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  MessageSquareWarning,
  QrCode,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { NotFoundView } from "@/components/common/NotFoundView";
import { MerjosariStreetMap } from "@/components/map/MerjosariStreetMap";
import { useAngkut } from "@/context/AngkutContext";
import { haversineMeters } from "@/lib/smart-routing";
import { cn, formatRupiah } from "@/lib/utils";
import { QrStickerModal } from "./QrStickerModal";
import { ReportIssueSheet } from "./ReportIssueSheet";

type MobileSheetTab = "riwayat" | "laporan";

interface CitizenBinReportViewProps {
  tsid: string;
}

export function CitizenBinReportView({ tsid }: CitizenBinReportViewProps) {
  const router = useRouter();
  const {
    bins,
    selectedBinId,
    selectBin,
    cart,
    reports,
    isTpsCongested,
    iotLive,
  } = useAngkut();

  const [sheetTab, setSheetTab] = useState<MobileSheetTab>("riwayat");
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  const decodedTsid = useMemo(() => {
    try {
      return decodeURIComponent(tsid).trim();
    } catch {
      return tsid.trim();
    }
  }, [tsid]);

  const matchedBin = useMemo(() => {
    const query = decodedTsid.toLowerCase();
    if (!query) return undefined;
    return (
      bins.find((b) => b.id.toLowerCase() === query) ??
      bins.find((b) => b.id.toLowerCase().endsWith(query))
    );
  }, [bins, decodedTsid]);

  useEffect(() => {
    if (matchedBin && selectedBinId !== matchedBin.id) {
      selectBin(matchedBin.id);
    }
  }, [matchedBin, selectBin, selectedBinId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const deltaY = endY - touchStartYRef.current;
    touchStartYRef.current = null;

    if (deltaY > 36) {
      setIsSheetCollapsed(true);
    } else if (deltaY < -36) {
      setIsSheetCollapsed(false);
    }
  };

  if (!matchedBin) {
    return <NotFoundView invalidCode={decodedTsid} />;
  }

  const isOverdue = matchedBin.hoursSinceLastPassed >= 24;
  const binReports = reports.filter((r) => r.binId === matchedBin.id);
  const distanceToBinMeters = cart.coordinates
    ? haversineMeters(cart.coordinates, matchedBin.coordinates)
    : null;
  const etaToBinMinutes =
    distanceToBinMeters !== null
      ? Math.max(1, Math.round(distanceToBinMeters / 65))
      : null;

  return (
    <div className="min-h-screen bg-zinc-100 sm:flex sm:items-center sm:justify-center sm:py-5">
      <div className="relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-zinc-100 sm:h-[820px] sm:rounded-[32px] sm:border sm:border-zinc-200 sm:shadow-2xl">
        {/* Full-Height Interactive Road Map Behind Sheet */}
        <div className="angkut-citizen-map absolute inset-0 z-0">
          <MerjosariStreetMap
            heightClass="h-full w-full rounded-none border-0"
            interactiveSelect
            focusSelectedBin
            onBinClick={(id) => router.push(`/${encodeURIComponent(id)}`)}
          />
        </div>

        {/* Floating Back to Scanner + IoT Status & Sticker Controls */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-md backdrop-blur hover:bg-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Scan QR</span>
          </button>

          <div className="pointer-events-auto flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 shadow-md backdrop-blur">
              <Radio
                className={cn(
                  "h-3.5 w-3.5",
                  cart.coordinates ? "text-emerald-600" : "text-zinc-400"
                )}
              />
              <span>{iotLive ? "IoT Live" : cart.coordinates ? "IoT Siaga" : "IoT Offline"}</span>
            </span>

            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-md backdrop-blur hover:bg-white"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Stiker</span>
            </button>
          </div>
        </div>

        {/* Floating Live ETA Pill + Collapsible Bottom Card */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col">
          {/* Gojek-Style Live ETA Pill that moves cleanly with the card */}
          <div className="pointer-events-auto mx-auto mb-2.5 flex justify-center px-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-950/90 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isTpsCongested
                    ? "bg-rose-500"
                    : cart.coordinates
                      ? "animate-pulse bg-emerald-400"
                      : "bg-zinc-500"
                )}
              />
              <span className="font-mono">{cart.cartCode}</span>
              <span className="text-zinc-400">•</span>
              <span>
                {isTpsCongested
                  ? "Antre di TPS Merjosari"
                  : distanceToBinMeters !== null && etaToBinMinutes !== null
                    ? `${distanceToBinMeters}m dari tong (~${etaToBinMinutes} mnt)`
                    : "Menunggu sinyal Mock IoT"}
              </span>
            </div>
          </div>

          {/* Collapsible Bottom Card */}
          <div className="pointer-events-auto flex flex-col rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.14)] transition-all duration-300 ease-out">
            {/* Swipe/Click Handle Bar */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="px-4 pt-2.5 pb-2"
            >
              <button
                type="button"
                onClick={() => setIsSheetCollapsed((v) => !v)}
                aria-expanded={!isSheetCollapsed}
                aria-label={
                  isSheetCollapsed
                    ? "Naikkan kartu detail tempat sampah"
                    : "Turunkan kartu untuk melihat peta lebih leluasa"
                }
                className="flex w-full flex-col items-center gap-1.5 focus:outline-none"
              >
                <div className="h-1.5 w-11 rounded-full bg-zinc-300 transition hover:bg-zinc-400" />
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500">
                  {isSheetCollapsed ? (
                    <>
                      <ChevronUp className="h-3 w-3 text-emerald-600" />
                      <span>Naikkan Panel</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 text-zinc-500" />
                      <span>Turunkan Panel untuk Lihat Peta</span>
                    </>
                  )}
                </span>
              </button>
            </div>

            {isSheetCollapsed ? (
              /* Compact Docked Summary when collapsed */
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="flex items-center justify-between gap-2 px-4 pb-4 pt-0.5"
              >
                <div
                  onClick={() => setIsSheetCollapsed(false)}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        isOverdue ? "bg-rose-500" : "bg-emerald-500"
                      )}
                    />
                    <p className="truncate text-xs font-bold text-zinc-900">
                      {matchedBin.name}
                    </p>
                  </div>
                  <p className="truncate text-[10.5px] text-zinc-500">
                    {isOverdue
                      ? `Terlewat ${matchedBin.hoursSinceLastPassed} jam`
                      : `Sudah diangkut • ${matchedBin.lastPassedAt}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReportSheetOpen(true)}
                    className="inline-flex items-center gap-1 rounded-xl bg-zinc-900 px-3 py-2 text-[11px] font-semibold text-white hover:bg-zinc-800"
                  >
                    <MessageSquareWarning className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Lapor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSheetCollapsed(false)}
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-100"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                    <span>Detail</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Expanded Scrollable Bottom Card */
              <div className="h-[68dvh] max-h-[75dvh] overflow-y-auto px-4 pb-6 pt-1 sm:h-[560px] sm:max-h-[610px]">
                <div className="space-y-4">
                  {/* TPS Alert when congested */}
                  {isTpsCongested && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-950"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      <p className="leading-relaxed">
                        <strong>
                          TPS Merjosari Antre ({cart.tpsWaitDurationMinutes}{" "}
                          mnt):
                        </strong>{" "}
                        Mohon tahan pembuangan sampah baru sementara waktu.
                      </p>
                    </div>
                  )}

                  {/* Bin Identity & Status (No tsid link displayed) */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-zinc-500">
                        {matchedBin.assignedCartCode} • {matchedBin.rt}/
                        {matchedBin.rw}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          isOverdue
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        )}
                      >
                        {isOverdue ? (
                          <ShieldAlert className="h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {isOverdue
                          ? `Terlewat ${matchedBin.hoursSinceLastPassed} jam`
                          : "Sudah Diangkut"}
                      </span>
                    </div>

                    <h1 className="mt-1 text-lg font-bold tracking-tight text-zinc-900">
                      {matchedBin.name}
                    </h1>
                    <p className="flex items-center gap-1 text-xs text-zinc-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      <span>{matchedBin.address}</span>
                    </p>

                    <div className="mt-3 flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50 px-3.5 py-2.5 text-xs">
                      <div className="flex items-center gap-2 text-zinc-700">
                        <Clock className="h-4 w-4 text-zinc-400" />
                        <span>
                          Terakhir diangkut:{" "}
                          <strong className="text-zinc-900">
                            {matchedBin.lastPassedAt}
                          </strong>
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-500">
                        {matchedBin.lastDwellSeconds} dtk
                      </span>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <button
                    type="button"
                    onClick={() => setReportSheetOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.99]"
                  >
                    <MessageSquareWarning className="h-4 w-4 text-emerald-400" />
                    <span>Buat Laporan Masalah</span>
                  </button>

                  {/* Bottom Tabs */}
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1">
                      <button
                        type="button"
                        onClick={() => setSheetTab("riwayat")}
                        className={cn(
                          "rounded-lg py-1.5 text-xs font-semibold transition",
                          sheetTab === "riwayat"
                            ? "bg-white text-zinc-900 shadow-sm"
                            : "text-zinc-500 hover:text-zinc-800"
                        )}
                      >
                        Riwayat Sebelumnya
                      </button>
                      <button
                        type="button"
                        onClick={() => setSheetTab("laporan")}
                        className={cn(
                          "rounded-lg py-1.5 text-xs font-semibold transition",
                          sheetTab === "laporan"
                            ? "bg-white text-zinc-900 shadow-sm"
                            : "text-zinc-500 hover:text-zinc-800"
                        )}
                      >
                        Laporan &amp; Info ({binReports.length})
                      </button>
                    </div>

                    {sheetTab === "riwayat" && (
                      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200/80 bg-white">
                        {matchedBin.pickupHistory.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-zinc-900">
                                {log.dateLabel}, {log.timestamp}
                              </p>
                              <p className="font-mono text-[10px] text-zinc-500">
                                Unit {log.cartCode}
                              </p>
                            </div>
                            <span className="font-mono text-[11px] text-zinc-500">
                              {log.dwellSeconds} dtk
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {sheetTab === "laporan" && (
                      <div className="space-y-2.5">
                        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-800">
                              {matchedBin.binTypeLabel}
                            </span>
                            {matchedBin.incentiveEligible && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                <Award className="h-3 w-3" />
                                Diskon {matchedBin.discountPercent}%
                              </span>
                            )}
                          </div>
                          {matchedBin.monthlyFeeBase > 0 && (
                            <p className="mt-1 text-[11px] text-zinc-500">
                              Iuran:{" "}
                              {matchedBin.incentiveEligible
                                ? `${formatRupiah(
                                    matchedBin.monthlyFeeBase *
                                      (1 - matchedBin.discountPercent / 100)
                                  )}/bln (potongan aktif)`
                                : `${formatRupiah(
                                    matchedBin.monthlyFeeBase
                                  )}/bln — ganti ke tong tertutup untuk potongan iuran`}
                            </p>
                          )}
                        </div>

                        {binReports.length === 0 ? (
                          <p className="py-3 text-center text-xs text-zinc-400">
                            Belum ada laporan aktif pada tong ini.
                          </p>
                        ) : (
                          binReports.map((rep) => {
                            const resolved = rep.workflowStage === "SELESAI";
                            return (
                              <div
                                key={rep.id}
                                className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[11px] font-bold text-zinc-900">
                                    {rep.ticketCode}
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                      resolved
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-zinc-100 text-zinc-800"
                                    )}
                                  >
                                    {resolved ? "Selesai" : "Diproses"}
                                  </span>
                                </div>
                                <p className="mt-1 font-semibold text-zinc-900">
                                  {rep.categoryLabel}
                                </p>
                                <p className="mt-0.5 text-[11px] text-zinc-600">
                                  {rep.description}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportIssueSheet
        key={matchedBin.id}
        bin={matchedBin}
        open={reportSheetOpen}
        onClose={() => setReportSheetOpen(false)}
      />

      <QrStickerModal
        bin={matchedBin}
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
}
