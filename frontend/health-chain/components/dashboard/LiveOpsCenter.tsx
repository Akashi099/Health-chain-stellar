"use client";
import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface RiderMarker {
  riderId: string;
  lat: number;
  lng: number;
  status: string;
  orderId?: string;
}

interface Incident {
  orderId: string;
  status: string;
  urgency: "critical" | "high" | "medium" | "low";
  bloodType: string;
  region: string;
}

const URGENCY_COLOR: Record<string, string> = {
  critical: "#E22A2A",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

export default function LiveOpsCenter() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const riderLayerRef = useRef<Record<string, any>>({});
  const incidentLayerRef = useRef<Record<string, any>>({});
  const socketRef = useRef<Socket | null>(null);

  const [filter, setFilter] = useState<{ urgency: string; region: string }>({ urgency: "all", region: "all" });
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let L: any;

    const initMap = async () => {
      L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!mapRef.current || mapInstance.current) return;

      mapInstance.current = L.map(mapRef.current, { zoomControl: true }).setView([6.5244, 3.3792], 12);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "©OpenStreetMap",
      }).addTo(mapInstance.current);
    };

    initMap().then(() => {
      const socket: Socket = io(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/ops`,
        { transports: ["websocket"] }
      );
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("ops.subscribe", { region: filter.region !== "all" ? filter.region : undefined });
      });
      socket.on("disconnect", () => setConnected(false));

      socket.on("ops.rider.moved", (payload: RiderMarker) => {
        if (!L || !mapInstance.current) return;
        const existing = riderLayerRef.current[payload.riderId];
        if (existing) {
          existing.setLatLng([payload.lat, payload.lng]);
        } else {
          const icon = L.divIcon({
            className: "",
            html: `<div class="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow"></div>`,
            iconSize: [12, 12],
          });
          riderLayerRef.current[payload.riderId] = L.marker([payload.lat, payload.lng], { icon })
            .addTo(mapInstance.current)
            .bindPopup(`Rider: ${payload.riderId}<br/>Status: ${payload.status}`);
        }
      });

      socket.on("ops.incident.updated", (incident: Incident) => {
        if (!L || !mapInstance.current) return;
        // Remove old marker if exists
        if (incidentLayerRef.current[incident.orderId]) {
          incidentLayerRef.current[incident.orderId].remove();
        }
        if (filter.urgency !== "all" && incident.urgency !== filter.urgency) return;

        const color = URGENCY_COLOR[incident.urgency] ?? "#888";
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${color}" class="w-4 h-4 rounded-full border-2 border-white shadow animate-pulse"></div>`,
          iconSize: [16, 16],
        });
        // Place near Lagos center with slight random offset for demo
        const lat = 6.5244 + (Math.random() - 0.5) * 0.1;
        const lng = 3.3792 + (Math.random() - 0.5) * 0.1;
        incidentLayerRef.current[incident.orderId] = L.marker([lat, lng], { icon })
          .addTo(mapInstance.current)
          .bindPopup(`Order: ${incident.orderId}<br/>Blood: ${incident.bloodType}<br/>Status: ${incident.status}`)
          .on("click", () => setSelectedIncident(incident));
      });
    });

    return () => {
      socketRef.current?.disconnect();
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full gap-4 font-poppins">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${connected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {connected ? "● Live" : "○ Disconnected"}
        </span>
        <select
          className="text-sm border rounded-lg px-3 py-1.5"
          value={filter.urgency}
          onChange={(e) => setFilter((f) => ({ ...f, urgency: e.target.value }))}
        >
          <option value="all">All urgencies</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          className="text-sm border rounded-lg px-3 py-1.5"
          value={filter.region}
          onChange={(e) => setFilter((f) => ({ ...f, region: e.target.value }))}
        >
          <option value="all">All regions</option>
          <option value="lagos">Lagos</option>
          <option value="abuja">Abuja</option>
        </select>
      </div>

      {/* Map */}
      <div className="relative flex-1 rounded-2xl overflow-hidden shadow-sm min-h-[420px]">
        <div ref={mapRef} className="w-full h-full z-0" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow p-3 text-xs space-y-1 z-10">
          {Object.entries(URGENCY_COLOR).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: v }} />
              <span className="capitalize">{k}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-1">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Rider</span>
          </div>
        </div>
      </div>

      {/* Selected incident detail */}
      {selectedIncident && (
        <div className="bg-white rounded-2xl shadow-sm p-4 text-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">Order {selectedIncident.orderId}</p>
              <p className="text-gray-500">Blood type: {selectedIncident.bloodType} · Region: {selectedIncident.region}</p>
              <p className="text-gray-500">Status: {selectedIncident.status}</p>
            </div>
            <span
              className="text-xs font-medium px-2 py-1 rounded-full capitalize"
              style={{ background: URGENCY_COLOR[selectedIncident.urgency] + "22", color: URGENCY_COLOR[selectedIncident.urgency] }}
            >
              {selectedIncident.urgency}
            </span>
          </div>
          <button className="mt-2 text-xs text-gray-400 hover:text-gray-600" onClick={() => setSelectedIncident(null)}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
