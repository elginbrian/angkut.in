"use client";

import React from "react";
import { ToastBanner } from "@/components/common/ToastBanner";
import { IotTransmitterApp } from "@/components/iot/IotTransmitterApp";

export default function IotPage() {
  return (
    <>
      <ToastBanner />
      <IotTransmitterApp />
    </>
  );
}
