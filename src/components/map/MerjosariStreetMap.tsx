"use client";

import React, { useEffect, useRef, useState } from "react";
import type LType from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAngkut } from "@/context/AngkutContext";
import { cn } from "@/lib/utils";

interface MerjosariStreetMapProps {
  heightClass?: string;
  interactiveSelect?: boolean;
  focusSelectedBin?: boolean;
  focusCart?: boolean;
  onBinClick?: (binId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

export function MerjosariStreetMap({
  heightClass = "h-72",
  interactiveSelect = true,
  focusSelectedBin = false,
  focusCart = false,
  onBinClick,
  onMapClick,
}: MerjosariStreetMapProps) {
  const {
    bins,
    selectedBinId,
    selectBin,
    cart,
    tpsCoords,
    routeWaypoints,
    cartWaypointIndex,
    isTpsCongested,
  } = useAngkut();

  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const staticLayerRef = useRef<LType.LayerGroup | null>(null);
  const routeLayerRef = useRef<LType.LayerGroup | null>(null);
  const cartMarkerRef = useRef<LType.Marker | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  // Initialize Leaflet map once
  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: [-7.94715, 112.60435],
        zoom: 17,
        zoomControl: true,
        attributionControl: true,
      });

      // OpenStreetMap standard tiles (100% free, zero API key, no watermark)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      routeLayerRef.current = L.layerGroup().addTo(map);
      staticLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      map.on("click", (e: LType.LeafletMouseEvent) => {
        if (onMapClickRef.current) {
          onMapClickRef.current(e.latlng.lat, e.latlng.lng);
        }
      });

      setMapReady(true);

      // Trigger size recalibration after mount
      setTimeout(() => map.invalidateSize(), 120);
    }

    initMap();

    return () => {
      cancelled = true;
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        staticLayerRef.current = null;
        routeLayerRef.current = null;
        cartMarkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update street-contour route lines & live Web Mock IoT cart marker
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const routeGroup = routeLayerRef.current;
    if (!mapReady || !L || !map || !routeGroup) return;

    routeGroup.clearLayers();

    if (!cart.coordinates) {
      if (routeWaypoints.length >= 2) {
        L.polyline(routeWaypoints, {
          color: "#52525b",
          weight: 3.5,
          opacity: 0.55,
          dashArray: "6 7",
          lineJoin: "round",
        }).addTo(routeGroup);
      }
      if (cartMarkerRef.current) {
        map.removeLayer(cartMarkerRef.current);
        cartMarkerRef.current = null;
      }
      return;
    }

    const traveledPoints = routeWaypoints.slice(0, cartWaypointIndex + 1);
    const remainingPoints = routeWaypoints.slice(cartWaypointIndex);

    if (traveledPoints.length >= 2) {
      L.polyline(traveledPoints, {
        color: "#059669",
        weight: 5,
        opacity: 0.9,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(routeGroup);
    }

    if (remainingPoints.length >= 2) {
      L.polyline(remainingPoints, {
        color: "#52525b",
        weight: 3.5,
        opacity: 0.65,
        dashArray: "6 7",
        lineJoin: "round",
      }).addTo(routeGroup);
    }

    const dotColor = isTpsCongested ? "#e11d48" : "#10b981";
    const icon = L.divIcon({
      className: "angkut-cart-icon",
      iconSize: [110, 32],
      iconAnchor: [55, 16],
      html: `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:9999px;background:#09090b;color:#fff;font-size:11px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.32);border:2px solid ${dotColor};white-space:nowrap;">
        <span style="width:7px;height:7px;border-radius:9999px;background:${dotColor};display:inline-block;"></span>
        <span>${cart.cartCode}</span>
      </div>`,
    });

    if (!cartMarkerRef.current) {
      cartMarkerRef.current = L.marker(
        [cart.coordinates.lat, cart.coordinates.lng],
        {
          icon,
          zIndexOffset: 600,
        }
      ).addTo(map);
    } else {
      cartMarkerRef.current.setLatLng([
        cart.coordinates.lat,
        cart.coordinates.lng,
      ]);
      cartMarkerRef.current.setIcon(icon);
    }

    cartMarkerRef.current.bindPopup(
      `<div style="font-family:sans-serif;font-size:12px;">
        <strong>${cart.cartCode}</strong><br/>
        Posisi: ${cart.currentLocationLabel}<br/>
        Sinkronisasi: ${cart.lastSyncAt}
      </div>`
    );

    if (focusCart) {
      map.panTo([cart.coordinates.lat, cart.coordinates.lng], {
        animate: true,
      });
    }
  }, [
    cart.cartCode,
    cart.coordinates,
    cart.currentLocationLabel,
    cart.lastSyncAt,
    cartWaypointIndex,
    focusCart,
    isTpsCongested,
    mapReady,
    routeWaypoints,
  ]);

  // Update GeoQR bin markers & TPS node
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const group = staticLayerRef.current;
    if (!mapReady || !L || !map || !group) return;

    group.clearLayers();

    const tpsColor = isTpsCongested ? "#e11d48" : "#18181b";
    L.circle([tpsCoords.lat, tpsCoords.lng], {
      radius: 20,
      color: tpsColor,
      fillColor: tpsColor,
      fillOpacity: 0.14,
      weight: 1.5,
    }).addTo(group);

    L.marker([tpsCoords.lat, tpsCoords.lng], {
      icon: L.divIcon({
        className: "",
        iconSize: [106, 30],
        iconAnchor: [53, 15],
        html: `<div style="display:inline-flex;align-items:center;justify-content:center;padding:3px 9px;border-radius:9999px;background:${tpsColor};color:#fff;font-size:10.5px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.22);border:2px solid #fff;white-space:nowrap;">
          TPS Merjosari
        </div>`,
      }),
    })
      .bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;">
          <strong>TPS Merjosari</strong><br/>
          Status: ${isTpsCongested ? "Antrean Bongkar Muat" : "Normal"}<br/>
          Durasi tunggu: ${cart.tpsWaitDurationMinutes} menit
        </div>`
      )
      .addTo(group);

    bins.forEach((bin) => {
      const isOverdue = bin.hoursSinceLastPassed >= 24;
      const isSelected = bin.id === selectedBinId;

      const accentColor = isOverdue ? "#e11d48" : "#059669";
      const borderColor = isSelected ? "#10b981" : accentColor;
      const bgColor = isSelected ? "#09090b" : "#ffffff";
      const textColor = isSelected ? "#ffffff" : "#09090b";
      const iconBg = isSelected ? "#10b981" : accentColor;

      L.circle([bin.coordinates.lat, bin.coordinates.lng], {
        radius: 14,
        color: accentColor,
        fillColor: accentColor,
        fillOpacity: isSelected ? 0.28 : 0.14,
        weight: isSelected ? 2 : 1.25,
      }).addTo(group);

      const marker = L.marker([bin.coordinates.lat, bin.coordinates.lng], {
        zIndexOffset: isSelected ? 450 : isOverdue ? 300 : 250,
        icon: L.divIcon({
          className: "",
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          html: `<div style="transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:5px;padding:3px 8px 3px 4px;border-radius:9999px;background:${bgColor};color:${textColor};border:2px solid ${borderColor};box-shadow:0 3px 10px rgba(0,0,0,0.22);font-size:10px;font-weight:700;white-space:nowrap;cursor:pointer;">
            <span style="width:18px;height:18px;border-radius:9999px;background:${iconBg};color:#ffffff;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18"/>
                <path d="M8 6V4h8v2"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/>
                <path d="M14 11v6"/>
              </svg>
            </span>
            <span>${bin.shortLabel}</span>
          </div>`,
        }),
      }).addTo(group);

      marker.bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;line-height:1.45;">
          <strong>${bin.name}</strong><br/>
          <span>${bin.rt}/${bin.rw} • ${bin.lastPassedAt}</span><br/>
          <span style="color:#71717a;">Unit: ${bin.assignedCartCode}</span>
        </div>`
      );

      if (interactiveSelect || onBinClick) {
        marker.on("click", () => {
          if (interactiveSelect) selectBin(bin.id);
          if (onBinClick) onBinClick(bin.id);
        });
      }
    });

    if (focusSelectedBin) {
      const target = bins.find((b) => b.id === selectedBinId);
      if (target) {
        map.panTo([target.coordinates.lat, target.coordinates.lng], {
          animate: true,
        });
      }
    }
  }, [
    bins,
    cart.tpsWaitDurationMinutes,
    focusSelectedBin,
    interactiveSelect,
    isTpsCongested,
    mapReady,
    onBinClick,
    selectBin,
    selectedBinId,
    tpsCoords.lat,
    tpsCoords.lng,
  ]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100",
        heightClass
      )}
    >
      <div ref={containerRef} className="z-0 h-full w-full" />
    </div>
  );
}
