"use client";

import React from "react";
import { ToastBanner } from "@/components/common/ToastBanner";
import { DlhPortalApp } from "@/components/dlh/DlhPortalApp";

export default function DlhPage() {
  return (
    <>
      <ToastBanner />
      <DlhPortalApp />
    </>
  );
}

