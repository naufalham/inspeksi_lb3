'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function GudangDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [wh, setWh] = useState<{
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    geoFenceRadius: number;
    capacity?: number;
    capacityUnit?: string;
    status: string;
    pic?: string;
    picPhone?: string;
    wasteTypes?: string[];
    inspections?: {
      id: string;
      scheduledDate: string;
      complianceScore?: number;
      inspector?: { name: string };
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api
      .get(`/warehouses/${id}`)
      .then(r => setWh(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );

  if (!wh) return <div className="text-slate-400">Gudang tidak ditemukan</div>;

  const statusLabel: Record<string, string> = {
    aktif: 'Aktif',
    tidak_aktif: 'Non-Aktif',
    perbaikan: 'Perbaikan',
  };
  const statusBadge: Record<string, string> = {
    aktif: 'badge-success',
    tidak_aktif: 'badge-neutral',
    perbaikan: 'badge-warning',
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-secondary p-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white flex-1 truncate">{wh.name}</h1>
        <span className={statusBadge[wh.status]}>{statusLabel[wh.status]}</span>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs mb-0.5">Alamat</p>
            <p className="text-white">{wh.address}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-0.5">PIC</p>
            <p className="text-white">{wh.pic || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-0.5">Telepon PIC</p>
            <p className="text-white">{wh.picPhone || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-0.5">Kapasitas</p>
            <p className="text-white">
              {wh.capacity ? `${wh.capacity} ${wh.capacityUnit}` : '-'}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-0.5">Koordinat GPS</p>
            <p className="text-white text-xs">
              {wh.latitude}, {wh.longitude}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-0.5">Radius Geofence</p>
            <p className="text-white">{wh.geoFenceRadius}m</p>
          </div>
        </div>

        {wh.wasteTypes && wh.wasteTypes.length > 0 && (
          <div>
            <p className="text-slate-500 text-xs mb-2">Jenis Limbah B3</p>
            <div className="flex flex-wrap gap-1">
              {wh.wasteTypes.map((wt: string) => (
                <span key={wt} className="bg-indigo-500/10 text-indigo-400 text-xs px-2 py-1 rounded">
                  {wt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent inspections */}
      {wh.inspections && wh.inspections.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-3">Riwayat Inspeksi</h3>
          <div className="space-y-2">
            {wh.inspections.map(insp => (
              <Link
                key={insp.id}
                href={`/inspeksi/${insp.id}`}
                className="flex items-center justify-between py-2.5 border-b border-slate-700 last:border-0 hover:text-indigo-400 transition-colors group"
              >
                <div>
                  <p className="text-slate-300 text-sm group-hover:text-indigo-400">
                    {new Date(insp.scheduledDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-slate-500 text-xs">{insp.inspector?.name}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  {insp.complianceScore != null && (
                    <span
                      className={`font-bold text-sm ${
                        insp.complianceScore >= 80
                          ? 'text-emerald-400'
                          : insp.complianceScore >= 60
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {insp.complianceScore}%
                    </span>
                  )}
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
