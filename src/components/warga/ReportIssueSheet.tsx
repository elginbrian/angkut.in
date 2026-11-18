"use client";

import React, { useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  LocateFixed,
  Send,
  Upload,
  X,
} from "lucide-react";
import { useAngkut } from "@/context/AngkutContext";
import { PHOTO_EVIDENCE_PRESETS } from "@/data/mock-merjosari";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import { haversineMeters } from "@/lib/smart-routing";
import { cn, REPORT_CATEGORY_OPTIONS } from "@/lib/utils";
import type { GeoQrBin, ReportCategory, SmartReport } from "@/types/angkut";

interface ReportIssueSheetProps {
  open: boolean;
  onClose: () => void;
  bin?: GeoQrBin;
}

export function ReportIssueSheet({ open, onClose, bin }: ReportIssueSheetProps) {
  const { selectedBin, submitCitizenReport, backendConnected } = useAngkut();
  const targetBin = bin ?? selectedBin;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultCategory: ReportCategory =
    targetBin.hoursSinceLastPassed >= 24
      ? "BELUM_DIANGKUT"
      : targetBin.binCondition === "KOMUNAL_RUSAK"
        ? "KERUSAKAN_SARANA"
        : targetBin.binCondition === "TERBUKA_KURANG_KAPASITAS"
          ? "MELUBER_BAU"
          : "BELUM_DIANGKUT";

  const [category, setCategory] = useState<ReportCategory>(defaultCategory);
  const [description, setDescription] = useState<string>("");
  const [photoLabel, setPhotoLabel] = useState<string>(
    PHOTO_EVIDENCE_PRESETS[0].fileName
  );
  const [photoUrl, setPhotoUrl] = useState<string>(
    PHOTO_EVIDENCE_PRESETS[0].url
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [gpsMode, setGpsMode] = useState<"simulated" | "device">("simulated");
  const [deviceCoords, setDeviceCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [deviceDistMeters, setDeviceDistMeters] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsNote, setGpsNote] = useState<string | null>(null);

  const [submittedReport, setSubmittedReport] = useState<SmartReport | null>(
    null
  );

  if (!open) return null;

  const verifiedDistanceMeters =
    gpsMode === "device" && deviceDistMeters !== null ? deviceDistMeters : 8;

  const handleUseDeviceGps = () => {
    setGpsNote(null);
    if (!("geolocation" in navigator)) {
      setGpsNote("Perangkat tidak mendukung GPS browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const d = haversineMeters(coords, targetBin.coordinates);
        setDeviceCoords(coords);
        setDeviceDistMeters(d);
        setGpsMode("device");
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsNote(`Izin GPS gagal: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPhotoLabel(file.name);
    setPhotoUrl(previewUrl);

    if (backendConnected) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await apiRequest<{ url: string; fileName: string }>(
          "/uploads",
          {
            method: "POST",
            body: formData,
          }
        );
        setPhotoUrl(res.url);
        setPhotoLabel(res.fileName);
      } catch {
        // Keep local object URL preview if upload fails
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await submitCitizenReport({
        binId: targetBin.id,
        category,
        description:
          description.trim() ||
          `Laporan kondisi ${targetBin.name} melalui pemindaian GeoQR.`,
        photoLabel,
        photoUrl,
        reporterDistanceMeters: verifiedDistanceMeters,
        reporterLat: gpsMode === "device" ? deviceCoords?.lat : undefined,
        reporterLng: gpsMode === "device" ? deviceCoords?.lng : undefined,
      });
      if (res) {
        setSubmittedReport(res);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmittedReport(null);
    setDescription("");
    onClose();
  };

  const outOfRadius = gpsMode === "device" && verifiedDistanceMeters > 50;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Form Laporan Warga"
    >
      <div className="max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              {submittedReport ? "Laporan Diterima" : "Buat Laporan Masalah"}
            </h3>
            <p className="text-[11px] text-zinc-500">{targetBin.name}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup form"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submittedReport ? (
          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
              <p className="mt-2 font-mono text-sm font-bold text-emerald-950">
                {submittedReport.ticketCode}
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                Diteruskan ke <strong>{submittedReport.escalationLabel}</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs leading-relaxed text-zinc-600">
              {submittedReport.routingReason}
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl bg-zinc-900 py-3 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Kembali ke Pelacak
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div
              className={cn(
                "rounded-xl border px-3.5 py-2.5 text-xs",
                outOfRadius
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : "border-emerald-200 bg-emerald-50/70 text-emerald-900"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <LocateFixed
                    className={cn(
                      "h-4 w-4 shrink-0",
                      outOfRadius ? "text-rose-600" : "text-emerald-600"
                    )}
                  />
                  <span>
                    {gpsLoading
                      ? "Mengambil GPS..."
                      : outOfRadius
                        ? `Di luar radius (${verifiedDistanceMeters}m > 50m)`
                        : `Lokasi terverifikasi (${verifiedDistanceMeters}m dari tong)`}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() =>
                    gpsMode === "device"
                      ? setGpsMode("simulated")
                      : handleUseDeviceGps()
                  }
                  className="shrink-0 font-semibold underline"
                >
                  {gpsMode === "device" ? "Pakai Scan QR (8m)" : "Uji GPS HP"}
                </button>
              </div>
              {gpsNote && (
                <p className="mt-1 text-[10.5px] text-rose-700">{gpsNote}</p>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-800">
                Pilih Masalah
              </span>
              <div className="space-y-2">
                {REPORT_CATEGORY_OPTIONS.map((opt) => {
                  const active = category === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCategory(opt.value)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition",
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                      )}
                    >
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p
                        className={cn(
                          "mt-0.5 text-[11px]",
                          active ? "text-zinc-300" : "text-zinc-500"
                        )}
                      >
                        {opt.shortDesc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800">
                  Foto Bukti Lapangan
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                >
                  <Upload className="h-3 w-3" />
                  <span>
                    {isUploading ? "Mengunggah..." : "Ambil / Pilih Foto"}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                {/* eslint-disable-next-line @next/next/img-element */}
                <img
                  src={resolveMediaUrl(photoUrl)}
                  alt={photoLabel}
                  className="h-32 w-full object-cover"
                />
                <div className="flex items-center gap-1.5 border-t border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-zinc-600">
                  <Camera className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <span className="truncate">{photoLabel}</span>
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {PHOTO_EVIDENCE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setPhotoLabel(preset.fileName);
                      setPhotoUrl(preset.url);
                    }}
                    className={cn(
                      "shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-medium transition",
                      photoUrl === preset.url
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="citizen-note"
                className="text-xs font-semibold text-zinc-800"
              >
                Keterangan Singkat
              </label>
              <textarea
                id="citizen-note"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Misal: Sampah meluber ke jalan sejak pagi..."
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Mengirim..." : "Kirim Laporan"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
