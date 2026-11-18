"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BatteryCharging,
  LocateFixed,
  Navigation,
  Power,
  Radio,
  RotateCcw,
  Square,
} from "lucide-react";
import { MerjosariStreetMap } from "@/components/map/MerjosariStreetMap";
import { useAngkut } from "@/context/AngkutContext";
import { haversineMeters } from "@/lib/smart-routing";
import { cn } from "@/lib/utils";
import type { TelemetryResponseMeta } from "@/types/angkut";

type IotMode = "gps" | "map" | "route";

export function IotTransmitterApp() {
  const {
    bins,
    cart,
    routeWaypoints,
    backendConnected,
    dwellInfo,
    sendIotTelemetry,
    stopIotSession,
    relocateBinsToCoords,
    resetBinCoords,
  } = useAngkut();

  const [selectedCartCode, setSelectedCartCode] = useState("GRB-MRJ-01");
  const [mode, setMode] = useState<IotMode>("map");
  const [isStreaming, setIsStreaming] = useState(false);
  const [batteryPercent, setBatteryPercent] = useState(86);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [deviceGps, setDeviceGps] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastMeta, setLastMeta] = useState<TelemetryResponseMeta | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const routeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeIdxRef = useRef<number>(0);
  const lastPingRef = useRef<number>(0);

  const appendLog = (text: string) => {
    const t = new Date().toTimeString().slice(0, 8);
    setLogs((prev) => [`[${t}] ${text}`, ...prev.slice(0, 14)]);
  };

  useEffect(() => {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number;
        addEventListener: (ev: string, fn: () => void) => void;
      }>;
    };
    if (!nav.getBattery) return;
    nav
      .getBattery()
      .then((bat) => {
        const update = () => setBatteryPercent(Math.round(bat.level * 100));
        update();
        bat.addEventListener("levelchange", update);
      })
      .catch(() => {});
  }, []);

  const stopStreams = () => {
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (routeTimerRef.current) {
      clearInterval(routeTimerRef.current);
      routeTimerRef.current = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    return () => stopStreams();
  }, []);

  const transmit = async (
    lat: number,
    lng: number,
    label?: string,
    forceBinId?: string
  ) => {
    const meta = await sendIotTelemetry({
      cartCode: selectedCartCode,
      lat,
      lng,
      batteryPercent,
      gsmSignal: mode === "gps" ? "Web IoT GPS Live" : "Web IoT Simulasi",
      locationLabel: label,
      forceCheckInBinId: forceBinId,
    });
    if (meta) {
      setLastMeta(meta);
      if (meta.autoCheckInTriggered) {
        appendLog(
          `AUTO-CHECK-IN di ${meta.nearestBinName} (${meta.autoResolvedCount} tiket selesai)`
        );
      } else {
        appendLog(
          `Kirim (${lat.toFixed(5)}, ${lng.toFixed(5)}) -> ${meta.distanceToNearestBinMeters ?? "-"}m dari ${meta.nearestBinName ?? "-"}`
        );
      }
    }
  };

  const handleStartLiveGps = () => {
    stopStreams();
    setMode("gps");
    setGpsError(null);

    if (!("geolocation" in navigator)) {
      setGpsError("Browser ini tidak mendukung Geolocation API.");
      return;
    }

    setIsStreaming(true);
    appendLog("Memulai share lokasi GPS real-time...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setDeviceGps({ lat: latitude, lng: longitude });
        setAccuracyMeters(Math.round(accuracy));
        const now = Date.now();
        if (now - lastPingRef.current >= 1800) {
          lastPingRef.current = now;
          void transmit(latitude, longitude, "Live GPS Perangkat");
        }
      },
      (err) => {
        setGpsError(`Izin GPS gagal: ${err.message}`);
        stopStreams();
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  };

  const handleStartRouteStream = () => {
    stopStreams();
    setMode("route");
    setIsStreaming(true);
    appendLog("Memulai pengiriman telemetri rute jalan Merjosari...");

    routeTimerRef.current = setInterval(() => {
      if (routeWaypoints.length === 0) return;
      const [lat, lng] = routeWaypoints[routeIdxRef.current];
      routeIdxRef.current = (routeIdxRef.current + 1) % routeWaypoints.length;
      void transmit(lat, lng, "Simulasi Jalan Rute Merjosari");
    }, 2200);
  };

  const handleRelocateHere = () => {
    if (deviceGps) {
      void relocateBinsToCoords(deviceGps.lat, deviceGps.lng);
      appendLog(`Memindahkan ${bins.length} titik tong ke sekitar GPS Anda.`);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDeviceGps(gps);
        void relocateBinsToCoords(gps.lat, gps.lng);
        appendLog(`Memindahkan ${bins.length} titik tong ke sekitar GPS Anda.`);
      },
      (err) => setGpsError(`Gagal ambil lokasi GPS: ${err.message}`),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  const cartCoords = cart.coordinates;
  const nearestDist =
    lastMeta?.distanceToNearestBinMeters ??
    (cartCoords
      ? Math.min(...bins.map((b) => haversineMeters(cartCoords, b.coordinates)))
      : null);
  const nearestBin =
    bins.find((b) => b.id === lastMeta?.nearestBinId) ?? bins[0];
  const dwellSeconds = lastMeta?.dwellSeconds ?? dwellInfo.seconds;
  const dwellTarget = lastMeta?.dwellTargetSeconds ?? dwellInfo.targetSeconds;

  return (
    <div className="min-h-screen bg-zinc-950 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="flex min-h-screen w-full max-w-[440px] flex-col bg-zinc-50 sm:min-h-[820px] sm:overflow-hidden sm:rounded-[32px] sm:border sm:border-zinc-800 sm:shadow-2xl">
        <header className="border-b border-zinc-200 bg-white px-4 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    backendConnected
                      ? cartCoords
                        ? "animate-pulse bg-emerald-500"
                        : "bg-emerald-500"
                      : "bg-rose-500"
                  )}
                />
                <h1 className="text-sm font-bold text-zinc-900">
                  IoT GPS Transmitter
                </h1>
              </div>
              <p className="text-[11px] text-zinc-500">
                {backendConnected
                  ? cartCoords
                    ? "Mengirim koordinat real-time ke server"
                    : "Terhubung — belum mengirim lokasi gerobak"
                  : "Backend tidak terjangkau"}
              </p>
            </div>

            <select
              value={selectedCartCode}
              onChange={(e) => setSelectedCartCode(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
            >
              <option value="GRB-MRJ-01">GRB-MRJ-01</option>
              <option value="GRB-MRJ-02">GRB-MRJ-02</option>
            </select>
          </div>
        </header>

        <div className="relative h-64 w-full shrink-0 border-b border-zinc-200">
          <MerjosariStreetMap
            heightClass="h-full rounded-none border-0"
            interactiveSelect={false}
            focusCart
            onMapClick={(lat, lng) => {
              stopStreams();
              setMode("map");
              void transmit(lat, lng, "Ketuk Peta Web IoT");
            }}
          />
          <div className="pointer-events-none absolute inset-x-3 bottom-2 z-20 flex justify-center">
            <span className="rounded-full bg-zinc-950/85 px-3 py-1 text-[10px] font-semibold text-white">
              Ketuk titik di peta untuk kirim lokasi gerobak
            </span>
          </div>
        </div>

        <main className="flex-1 space-y-3.5 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            {mode === "gps" && isStreaming ? (
              <button
                type="button"
                onClick={stopStreams}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Hentikan Live GPS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartLiveGps}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <LocateFixed className="h-3.5 w-3.5" />
                <span>Share Live GPS HP</span>
              </button>
            )}

            {mode === "route" && isStreaming ? (
              <button
                type="button"
                onClick={stopStreams}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-white"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Hentikan Simulasi</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRouteStream}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100"
              >
                <Navigation className="h-3.5 w-3.5 text-emerald-700" />
                <span>Jalan di Rute Peta</span>
              </button>
            )}
          </div>

          {gpsError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
              {gpsError}
            </div>
          )}

          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-600">Koordinat Aktif</span>
              <span className="font-mono text-[11px] font-bold text-zinc-900">
                {cartCoords
                  ? `${cartCoords.lat.toFixed(6)}, ${cartCoords.lng.toFixed(6)}`
                  : "Belum ada sinyal"}
              </span>
            </div>

            <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-2.5 text-center">
              <div>
                <p className="text-[10px] text-zinc-400">Tong Terdekat</p>
                <p className="font-mono text-xs font-bold text-zinc-900">
                  {nearestDist !== null ? `${nearestDist} m` : "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400">Baterai</p>
                <p className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-700">
                  <BatteryCharging className="h-3.5 w-3.5" />
                  {batteryPercent}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400">Akurasi GPS</p>
                <p className="font-mono text-xs font-bold text-zinc-900">
                  {accuracyMeters !== null ? `±${accuracyMeters}m` : "-"}
                </p>
              </div>
            </div>

            <div className="mt-3 border-t border-zinc-100 pt-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="truncate font-semibold text-zinc-700">
                  Geofence {nearestBin.name}
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  {dwellSeconds}/{dwellTarget} dtk
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (dwellSeconds / dwellTarget) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleRelocateHere}
              className="rounded-xl border border-emerald-600 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              Pindahkan Tong ke Lokasi Saya
            </button>
            <button
              type="button"
              onClick={() => {
                stopStreams();
                void resetBinCoords();
                appendLog("Koordinat dikembalikan ke Merjosari.");
              }}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Merjosari</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!cartCoords}
              onClick={() => {
                if (!cartCoords) return;
                void transmit(
                  cartCoords.lat,
                  cartCoords.lng,
                  "Check-In Langsung Web IoT",
                  nearestBin.id
                );
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              <span>Check-In Tong</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopStreams();
                void stopIotSession();
                appendLog("Sesi gerobak Web IoT dimatikan.");
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <Power className="h-3.5 w-3.5" />
              <span>Matikan Sesi IoT</span>
            </button>
          </div>

          {logs.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-3">
              <p className="text-[11px] font-bold text-zinc-800">
                Log Transmisi
              </p>
              <div className="mt-1.5 max-h-24 space-y-1 overflow-y-auto font-mono text-[10px] text-zinc-600">
                {logs.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
