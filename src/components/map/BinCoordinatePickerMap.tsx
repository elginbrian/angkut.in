"use client";

import React, { useEffect, useRef, useState } from "react";
import type LType from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAngkut } from "@/context/AngkutContext";

interface BinCoordinatePickerMapProps {
  lat: number;
  lng: number;
  editingBinId?: string | null;
  onChange: (lat: number, lng: number) => void;
  heightClass?: string;
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Peta interaktif di form RT/RW untuk memilih koordinat titik tong sampah
 * melalui klik peta atau geser pin marker secara langsung.
 */
export function BinCoordinatePickerMap({
  lat,
  lng,
  editingBinId = null,
  onChange,
  heightClass = "h-48",
}: BinCoordinatePickerMapProps) {
  const { bins, routeWaypoints } = useAngkut();
  const [mapReady, setMapReady] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);
  const refLayerRef = useRef<LType.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<LType.Marker | null>(null);
  const pickerCircleRef = useRef<LType.Circle | null>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const initialCoordRef = useRef({
    lat: isValidCoord(lat, lng) ? lat : -7.94685,
    lng: isValidCoord(lat, lng) ? lng : 112.60345,
  });

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      leafletRef.current = L;
      const start = initialCoordRef.current;

      const map = L.map(containerRef.current, {
        center: [start.lat, start.lng],
        zoom: 17,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      refLayerRef.current = L.layerGroup().addTo(map);

      const circle = L.circle([start.lat, start.lng], {
        radius: 14,
        color: "#059669",
        fillColor: "#10b981",
        fillOpacity: 0.22,
        weight: 2,
      }).addTo(map);

      const marker = L.marker([start.lat, start.lng], {
        draggable: true,
        zIndexOffset: 600,
        icon: L.divIcon({
          className: "",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          html: `<div style="width:34px;height:34px;border-radius:9999px;background:#09090b;color:#ffffff;border:2.5px solid #10b981;box-shadow:0 4px 12px rgba(0,0,0,0.34);display:flex;align-items:center;justify-content:center;cursor:grab;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18"/>
              <path d="M8 6V4h8v2"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
            </svg>
          </div>`,
        }),
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChangeRef.current(
          Number(pos.lat.toFixed(6)),
          Number(pos.lng.toFixed(6))
        );
      });

      map.on("click", (e: LType.LeafletMouseEvent) => {
        onChangeRef.current(
          Number(e.latlng.lat.toFixed(6)),
          Number(e.latlng.lng.toFixed(6))
        );
      });

      pickerCircleRef.current = circle;
      pickerMarkerRef.current = marker;
      mapRef.current = map;
      setMapReady(true);

      setTimeout(() => map.invalidateSize(), 120);
      setTimeout(() => map.invalidateSize(), 350);
    }

    initMap();

    return () => {
      cancelled = true;
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        refLayerRef.current = null;
        pickerMarkerRef.current = null;
        pickerCircleRef.current = null;
      }
    };
  }, []);

  // Render subtle reference route & existing bins on the picker map
  useEffect(() => {
    const L = leafletRef.current;
    const refGroup = refLayerRef.current;
    if (!mapReady || !L || !refGroup) return;

    refGroup.clearLayers();

    if (routeWaypoints.length >= 2) {
      L.polyline(routeWaypoints, {
        color: "#059669",
        weight: 3,
        opacity: 0.45,
        dashArray: "5 6",
      }).addTo(refGroup);
    }

    bins.forEach((b) => {
      if (editingBinId && b.id === editingBinId) return;
      L.circleMarker([b.coordinates.lat, b.coordinates.lng], {
        radius: 5,
        color: "#ffffff",
        weight: 1.5,
        fillColor: "#52525b",
        fillOpacity: 0.85,
      })
        .bindTooltip(b.name, { direction: "top" })
        .addTo(refGroup);
    });
  }, [mapReady, bins, editingBinId, routeWaypoints]);

  // Keep marker & circle synced when lat/lng updates from manual inputs or GPS button
  useEffect(() => {
    const map = mapRef.current;
    const marker = pickerMarkerRef.current;
    const circle = pickerCircleRef.current;
    if (!mapReady || !map || !marker || !circle) return;
    if (!isValidCoord(lat, lng)) return;

    const current = marker.getLatLng();
    const changed =
      Math.abs(current.lat - lat) > 1e-6 ||
      Math.abs(current.lng - lng) > 1e-6;

    marker.setLatLng([lat, lng]);
    circle.setLatLng([lat, lng]);
    if (changed) {
      map.panTo([lat, lng], { animate: true });
    }
  }, [mapReady, lat, lng]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
      <div
        ref={containerRef}
        className={`w-full cursor-crosshair ${heightClass}`}
      />
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-lg border border-zinc-200/90 bg-white/95 px-2.5 py-1 text-[10px] font-medium text-zinc-700 shadow-sm">
        Klik peta atau seret pin untuk atur titik lokasi tong
      </div>
    </div>
  );
}
