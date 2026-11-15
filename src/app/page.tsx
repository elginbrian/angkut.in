"use client";

import React from "react";
import { ToastBanner } from "@/components/common/ToastBanner";
import { CitizenScanApp } from "@/components/warga/CitizenScanApp";

export default function HomePage() {
  return (
    <>
      <ToastBanner />
      <CitizenScanApp />
    </>
  );
}
