"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Camera, QrCode } from "lucide-react";
import { useAngkut } from "@/context/AngkutContext";
import { cn } from "@/lib/utils";

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
}

export function CitizenScanApp() {
  const router = useRouter();
  const { bins, selectBin } = useAngkut();

  const [scanningBinId, setScanningBinId] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleScanBin = React.useCallback(
    (binId: string) => {
      setScanningBinId(binId);
      setTimeout(() => {
        selectBin(binId);
        setScanningBinId(null);
        stopCamera();
        router.push(`/${encodeURIComponent(binId)}`);
      }, 350);
    },
    [router, selectBin]
  );

  // Real browser BarcodeDetector scanning when camera is enabled
  useEffect(() => {
    if (!cameraActive || scanningBinId) return;
    const win = window as unknown as {
      BarcodeDetector?: new (opts: {
        formats: string[];
      }) => BarcodeDetectorInstance;
    };
    if (!win.BarcodeDetector) return;

    const detector = new win.BarcodeDetector({ formats: ["qr_code"] });
    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const codes = await detector.detect(videoRef.current);
        const raw = codes[0]?.rawValue?.trim();
        if (!raw) return;
        const match = raw.match(/(tsid-[a-z]{8})/i);
        if (match?.[1]) {
          handleScanBin(match[1].toLowerCase());
        }
      } catch {
        // ignore transient detection frame errors
      }
    }, 500);

    return () => clearInterval(interval);
  }, [cameraActive, handleScanBin, scanningBinId]);

  const handleEnableCamera = async () => {
    setCameraError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError("Kamera browser tidak tersedia pada perangkat ini.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      setCameraError(
        "Izin kamera ditolak. Pilih stiker QR di bawah untuk memindai."
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 sm:flex sm:items-center sm:justify-center sm:bg-zinc-900 sm:p-4">
      <div className="relative flex min-h-screen w-full max-w-[430px] flex-col justify-between overflow-hidden bg-zinc-950 text-white sm:min-h-[780px] sm:rounded-[32px] sm:border sm:border-zinc-800 sm:shadow-2xl">
        {/* Top Brand Bar */}
        <header className="relative z-20 flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white">
                Angkut<span className="text-emerald-400">.in</span>
              </span>
              <p className="text-[10px] text-zinc-400">Kel. Merjosari</p>
            </div>
          </div>

          <button
            type="button"
            onClick={cameraActive ? stopCamera : handleEnableCamera}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-800"
          >
            <Camera className="h-3.5 w-3.5 text-emerald-400" />
            <span>{cameraActive ? "Matikan Kamera" : "Aktifkan Kamera"}</span>
          </button>
        </header>

        {/* Center Camera Viewfinder */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-6">
          <div className="relative flex h-64 w-64 items-center justify-center overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60">
            {cameraActive && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}

            {!cameraActive && (
              <div className="flex flex-col items-center gap-2 px-6 text-center">
                <QrCode className="h-12 w-12 text-zinc-600" />
                <p className="text-xs font-medium text-zinc-400">
                  Arahkan kamera ke stiker GeoQR tong sampah
                </p>
              </div>
            )}

            {/* Corner Finder Brackets */}
            <div className="pointer-events-none absolute inset-4">
              <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-xl border-l-4 border-t-4 border-emerald-400" />
              <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-xl border-r-4 border-t-4 border-emerald-400" />
              <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-xl border-b-4 border-l-4 border-emerald-400" />
              <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-xl border-b-4 border-r-4 border-emerald-400" />
            </div>

            {/* Scanning Laser */}
            <div
              className={cn(
                "pointer-events-none absolute inset-x-5 top-1/2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399]",
                !scanningBinId && "animate-pulse"
              )}
            />
          </div>

          <p className="mt-5 text-center text-xs text-zinc-400">
            {scanningBinId
              ? "Memindai GeoQR & membuka pelacakan tong..."
              : cameraError ?? "Pindai QR tong untuk buka pelacak & form laporan"}
          </p>
        </div>

        {/* Bottom Sheet: Select QR Sticker to Scan (No tsid link shown) */}
        <div className="relative z-20 rounded-t-3xl border-t border-zinc-800 bg-zinc-900/95 p-5">
          <p className="text-xs font-semibold text-zinc-300">
            Pilih Stiker GeoQR Tong Sampah
          </p>

          <div className="mt-3 space-y-2">
            {bins.map((bin) => {
              const isScanningThis = scanningBinId === bin.id;
              const overdue = bin.hoursSinceLastPassed >= 24;
              return (
                <button
                  key={bin.id}
                  type="button"
                  onClick={() => handleScanBin(bin.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99]",
                    isScanningThis
                      ? "border-emerald-400 bg-emerald-500/20"
                      : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">
                        {bin.name}
                      </p>
                      <p className="truncate text-[10px] text-zinc-400">
                        {bin.rt} • {bin.address}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      overdue
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    )}
                  >
                    <span>{isScanningThis ? "Membuka..." : "Buka QR"}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
