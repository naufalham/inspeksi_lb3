'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface Finding {
  id: string;
  severity: string;
  description: string;
  recommendation?: string;
  followUpStatus: string;
}

interface Photo {
  id: string;
  url: string;
  caption?: string;
}

interface ChecklistResult {
  id: string;
  status: string;
  comment?: string;
  template: { description: string; category: string };
}

interface InspectionDetail {
  id: string;
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  status: string;
  complianceScore?: number;
  gpsLat?: number;
  gpsLng?: number;
  warehouse: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    geoFenceRadius: number;
  };
  inspector: { id: string; name: string };
  findings: Finding[];
  photos: Photo[];
  checklistResults: ChecklistResult[];
}

const statusLabel: Record<string, string> = {
  dijadwalkan: 'Terjadwal',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};
const statusBadge: Record<string, string> = {
  dijadwalkan: 'badge-info',
  berlangsung: 'badge-warning',
  selesai: 'badge-success',
  dibatalkan: 'badge-neutral',
};
const severityLabel: Record<string, string> = {
  ringan: 'Ringan',
  sedang: 'Sedang',
  kritis: 'Kritis',
};
const severityBadge: Record<string, string> = {
  ringan: 'badge-info',
  sedang: 'badge-warning',
  kritis: 'badge-danger',
};

export default function InspeksiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [insp, setInsp] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    api
      .get(`/inspections/${id}`)
      .then(r => setInsp(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );

  if (!insp) return <div className="text-slate-400">Inspeksi tidak ditemukan</div>;

  const circumference = 2 * Math.PI * 45;
  const score = insp.complianceScore || 0;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => router.back()} className="btn-secondary p-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white flex-1 min-w-0 truncate">{insp.warehouse.name}</h1>
        <span className={statusBadge[insp.status]}>{statusLabel[insp.status]}</span>
        {insp.status === 'dijadwalkan' && insp.inspector.id === user?.id && (
          <Link href={`/inspeksi/${insp.id}/lakukan`} className="btn-primary ml-auto">
            Mulai Inspeksi
          </Link>
        )}
      </div>

      {/* Info */}
      <div className="card p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs mb-0.5">Inspektur</p>
          <p className="text-white font-medium">{insp.inspector.name}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-0.5">Tanggal Jadwal</p>
          <p className="text-white font-medium">
            {new Date(insp.scheduledDate).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        {insp.startedAt && (
          <div>
            <p className="text-slate-500 text-xs mb-0.5">Dimulai</p>
            <p className="text-white font-medium">
              {new Date(insp.startedAt).toLocaleString('id-ID')}
            </p>
          </div>
        )}
        {insp.completedAt && (
          <div>
            <p className="text-slate-500 text-xs mb-0.5">Selesai</p>
            <p className="text-white font-medium">
              {new Date(insp.completedAt).toLocaleString('id-ID')}
            </p>
          </div>
        )}
        {insp.gpsLat && (
          <div>
            <p className="text-slate-500 text-xs mb-0.5">GPS</p>
            <p className="text-white font-medium text-xs">
              {insp.gpsLat?.toFixed(5)}, {insp.gpsLng?.toFixed(5)}
            </p>
          </div>
        )}
        <div>
          <p className="text-slate-500 text-xs mb-0.5">Gudang</p>
          <p className="text-white font-medium truncate">{insp.warehouse.address}</p>
        </div>
      </div>

      {/* Score ring */}
      {insp.complianceScore !== null && insp.complianceScore !== undefined && (
        <div className="card p-5 flex items-center gap-6">
          <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8"/>
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dy="0.35em"
              fill={scoreColor}
              fontSize="18"
              fontWeight="700"
            >
              {score}%
            </text>
          </svg>
          <div>
            <p className="text-lg font-bold text-white">Skor Kepatuhan</p>
            <p className="text-slate-400 text-sm mt-1">
              {score >= 80
                ? 'Sangat Baik — Memenuhi Standar'
                : score >= 60
                ? 'Perlu Perbaikan'
                : 'Tidak Memenuhi Standar'}
            </p>
            <div className="flex gap-3 mt-3 text-xs text-slate-400">
              <span>
                <span className="text-emerald-400 font-medium">
                  {insp.checklistResults?.filter(r => r.status === 'sesuai').length || 0}
                </span>{' '}
                sesuai
              </span>
              <span>
                <span className="text-red-400 font-medium">
                  {insp.checklistResults?.filter(r => r.status === 'tidak_sesuai').length || 0}
                </span>{' '}
                tidak sesuai
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Findings */}
      {insp.findings?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-3">
            Temuan ({insp.findings.length})
          </h3>
          <div className="space-y-3">
            {insp.findings.map(f => (
              <div
                key={f.id}
                className="bg-slate-900 rounded-lg p-3 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={severityBadge[f.severity]}>
                    {severityLabel[f.severity]}
                  </span>
                  <span
                    className={
                      f.followUpStatus === 'resolved' ? 'badge-success' : 'badge-warning'
                    }
                  >
                    {f.followUpStatus === 'resolved' ? 'Selesai' : 'Pending'}
                  </span>
                </div>
                <p className="text-slate-200 text-sm">{f.description}</p>
                {f.recommendation && (
                  <p className="text-slate-500 text-xs mt-1.5">
                    Rekomendasi: {f.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      {insp.photos?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-3">
            Foto ({insp.photos.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {insp.photos.map(p => {
              const imgUrl = p.url.startsWith('http') ? p.url : `${API_URL}${p.url}`;
              return (
                <a key={p.id} href={imgUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={imgUrl}
                    alt={p.caption || 'foto inspeksi'}
                    className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition-opacity"
                  />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Checklist Results */}
      {insp.checklistResults?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-3">
            Hasil Checklist ({insp.checklistResults.length} item)
          </h3>
          <div className="space-y-1">
            {insp.checklistResults.map(r => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-sm truncate">{r.template.description}</p>
                  {r.comment && (
                    <p className="text-slate-500 text-xs mt-0.5">{r.comment}</p>
                  )}
                </div>
                <span
                  className={
                    r.status === 'sesuai'
                      ? 'badge-success'
                      : r.status === 'tidak_sesuai'
                      ? 'badge-danger'
                      : 'badge-neutral'
                  }
                >
                  {r.status === 'sesuai'
                    ? 'Sesuai'
                    : r.status === 'tidak_sesuai'
                    ? 'Tidak Sesuai'
                    : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
