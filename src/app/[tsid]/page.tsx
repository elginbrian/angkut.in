"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ToastBanner } from "@/components/common/ToastBanner";
import { CitizenBinReportView } from "@/components/warga/CitizenBinReportView";

export default function TsidBinReportPage() {
  const params = useParams<{ tsid: string }>();
  const tsid = typeof params?.tsid === "string" ? params.tsid : "";

  return (
    <>
      <ToastBanner />
      <CitizenBinReportView tsid={tsid} />
    </>
  );
}

