"use client";

import React from "react";
import { Printer, X } from "lucide-react";
import type { GeoQrBin } from "@/types/angkut";

interface QrStickerModalProps {
  bin: GeoQrBin;
  open: boolean;
  onClose: () => void;
}

/**
 * Deterministic visual QR matrix derived from the bin's GeoQR ID string.
 */
function buildQrGrid(seed: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = isBorder || isCenter;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      grid[r][c] = (Math.abs(hash) % 10) < 5;
    }
  }

  return grid;
}

export function QrStickerModal({ bin, open, onClose }: QrStickerModalProps) {
  if (!open) return null;

  const matrix = buildQrGrid(bin.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Stiker GeoQR Tong Sampah"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
          <h3 className="text-sm font-bold text-zinc-900">
            Stiker GeoQR Tong Sampah
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-xl border-2 border-zinc-900 bg-white p-4 text-center">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2 text-left">
              <span className="text-xs font-extrabold tracking-tight text-zinc-900">
                ANGKUT<span className="text-emerald-600">.IN</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {bin.rt} / {bin.rw} Merjosari
              </span>
            </div>

            <div className="my-4 flex justify-center">
              <svg
                viewBox="0 0 21 21"
                className="h-40 w-40 rounded-lg border border-zinc-200 bg-white p-2"
                shapeRendering="crispEdges"
              >
                {matrix.map((row, r) =>
                  row.map((filled, c) =>
                    filled ? (
                      <rect
                        key={`${r}-${c}`}
                        x={c}
                        y={r}
                        width={1}
                        height={1}
                        fill="#09090b"
                      />
                    ) : null
                  )
                )}
              </svg>
            </div>

            <p className="font-mono text-[11px] font-bold text-zinc-900">
              {bin.id}
            </p>
            <p className="mt-0.5 font-mono text-[10px] font-semibold text-emerald-700">
              /{bin.id}
            </p>
            <p className="mt-1 text-xs font-medium text-zinc-600">{bin.name}</p>
            <p className="mt-2 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[10px] font-medium text-zinc-600">
              Scan kamera HP untuk cek jam angkut &amp; lapor kondisi tong
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Stiker Vinyl (Simulasi Print)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

