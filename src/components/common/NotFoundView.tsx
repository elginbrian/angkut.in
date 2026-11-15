"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface NotFoundViewProps {
  invalidCode?: string;
}

export function NotFoundView({ invalidCode }: NotFoundViewProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12 text-center">
      {/* Ilustrasi SVG Sederhana Tong GeoQR 404 */}
      <div className="mb-6 w-full max-w-[200px]">
        <svg
          viewBox="0 0 220 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-auto w-full"
          aria-hidden="true"
        >
          <rect
            x="24"
            y="148"
            width="172"
            height="10"
            rx="5"
            fill="#e4e4e7"
          />
          <path
            d="M66 58H154L144 148H76L66 58Z"
            fill="#fafafa"
            stroke="#18181b"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <rect
            x="58"
            y="44"
            width="104"
            height="14"
            rx="6"
            fill="#18181b"
          />
          <rect
            x="92"
            y="34"
            width="36"
            height="10"
            rx="4"
            fill="#10b981"
          />
          <rect
            x="88"
            y="78"
            width="44"
            height="44"
            rx="8"
            fill="#ffffff"
            stroke="#71717a"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />
          <text
            x="110"
            y="105"
            textAnchor="middle"
            fill="#18181b"
            fontFamily="monospace"
            fontSize="15"
            fontWeight="700"
          >
            404
          </text>
          <circle cx="164" cy="40" r="14" fill="#10b981" />
          <path
            d="M164 33V41M164 46H164.01"
            stroke="#ffffff"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h1 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
        Halaman Tidak Ditemukan
      </h1>
      <p className="mt-2 max-w-xs text-xs leading-relaxed text-zinc-500">
        {invalidCode
          ? `Kode "${invalidCode}" atau halaman yang Anda cari tidak tersedia.`
          : "Halaman atau kode tempat sampah yang Anda cari tidak tersedia."}
      </p>

      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800"
      >
        <ArrowLeft className="h-3.5 w-3.5 text-emerald-400" />
        <span>Kembali</span>
      </Link>
    </div>
  );
}
