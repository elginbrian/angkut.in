"use client";

import React from "react";
import { ToastBanner } from "@/components/common/ToastBanner";
import { RtRwPortalApp } from "@/components/rtrw/RtRwPortalApp";

export default function RtRwPage() {
  return (
    <>
      <ToastBanner />
      <RtRwPortalApp />
    </>
  );
}

