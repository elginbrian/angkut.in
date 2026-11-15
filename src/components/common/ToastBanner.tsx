"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useAngkut } from "@/context/AngkutContext";
import { cn } from "@/lib/utils";

export function ToastBanner() {
  const { toast, dismissToast } = useAngkut();

  if (!toast) return null;

  const Icon =
    toast.tone === "emerald"
      ? CheckCircle2
      : toast.tone === "rose"
        ? AlertCircle
        : Info;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4 sm:justify-end sm:px-6">
      <div
        role="status"
        className={cn(
          "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-3.5 shadow-lg transition-all",
          toast.tone === "emerald" && "border-emerald-200",
          toast.tone === "rose" && "border-rose-200",
          toast.tone === "neutral" && "border-zinc-200"
        )}
      >
        <Icon
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            toast.tone === "emerald" && "text-emerald-600",
            toast.tone === "rose" && "text-rose-600",
            toast.tone === "neutral" && "text-zinc-900"
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-900">{toast.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">
            {toast.description}
          </p>
        </div>
        <button
          type="button"
          onClick={dismissToast}
          aria-label="Tutup notifikasi"
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

