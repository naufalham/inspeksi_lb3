'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function FitBounds({ userLat, userLng, warehouseLat, warehouseLng }: {
  userLat: number; userLng: number; warehouseLat: number; warehouseLng: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [[userLat, userLng], [warehouseLat, warehouseLng]],
      { padding: [40, 40] }
    );
  }, [userLat, userLng, warehouseLat, warehouseLng, map]);
  return null;
}

interface Props {
  userLat: number;
  userLng: number;
  warehouseLat: number;
  warehouseLng: number;
  radius: number;
  withinFence: boolean;
}

export default function InspectionMap({ userLat, userLng, warehouseLat, warehouseLng, radius, withinFence }: Props) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: '220px' }}>
      <MapContainer
        center={[warehouseLat, warehouseLng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds userLat={userLat} userLng={userLng} warehouseLat={warehouseLat} warehouseLng={warehouseLng} />

        {/* Geofence circle — dashed */}
        <Circle
          center={[warehouseLat, warehouseLng]}
          radius={radius}
          pathOptions={{
            color: '#6366f1',
            fillColor: '#6366f1',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '5,5',
          }}
        />

        {/* Warehouse marker — indigo */}
        <CircleMarker
          center={[warehouseLat, warehouseLng]}
          radius={9}
          pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.85, weight: 3 }}
        >
          <Popup>Gudang</Popup>
        </CircleMarker>

        {/* User marker — green */}
        <CircleMarker
          center={[userLat, userLng]}
          radius={9}
          pathOptions={{
            color: withinFence ? '#10b981' : '#f59e0b',
            fillColor: withinFence ? '#10b981' : '#f59e0b',
            fillOpacity: 0.85,
            weight: 3,
          }}
        >
          <Popup>Lokasi Anda</Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
