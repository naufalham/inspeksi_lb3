'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Warehouse {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  geoFenceRadius: number;
  status: string;
}

function AutoFit({ warehouses }: { warehouses: Warehouse[] }) {
  const map = useMap();
  useEffect(() => {
    if (warehouses.length === 0) return;
    if (warehouses.length === 1) {
      map.setView([warehouses[0].latitude, warehouses[0].longitude], 14);
      return;
    }
    const L = require('leaflet');
    const bounds = L.latLngBounds(warehouses.map(w => [w.latitude, w.longitude]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [warehouses, map]);
  return null;
}

const statusColor = (status: string) =>
  status === 'aktif' ? '#10b981' : status === 'perbaikan' ? '#f59e0b' : '#ef4444';

export function WarehouseMapFull({ warehouses }: { warehouses: Warehouse[] }) {
  if (warehouses.length === 0) return null;
  const center: [number, number] = [warehouses[0].latitude, warehouses[0].longitude];

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: '320px', isolation: 'isolate' }}>
      <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoFit warehouses={warehouses} />
        {warehouses.map(wh => (
          <CircleMarker
            key={wh.id}
            center={[wh.latitude, wh.longitude]}
            radius={10}
            pathOptions={{
              color: statusColor(wh.status),
              fillColor: statusColor(wh.status),
              fillOpacity: 0.85,
              weight: 3,
            }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong>{wh.name}</strong><br />
                <small style={{ color: '#666' }}>{wh.address}</small><br />
                <small>Radius geo-fence: {wh.geoFenceRadius}m</small>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export function WarehouseMiniMap({ warehouse }: { warehouse: Warehouse }) {
  return (
    <div style={{ height: '120px', isolation: 'isolate' }} className="rounded-t-xl overflow-hidden">
      <MapContainer
        center={[warehouse.latitude, warehouse.longitude]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <CircleMarker
          center={[warehouse.latitude, warehouse.longitude]}
          radius={7}
          pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.85, weight: 2 }}
        />
      </MapContainer>
    </div>
  );
}
