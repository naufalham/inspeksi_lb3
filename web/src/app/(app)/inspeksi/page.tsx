'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface Inspection {
  id: string;
  type: string;
  scheduledDate: string;
  status: string;
  complianceScore?: number;
  warehouse: { id: string; name: string; address: string };
  inspector: { id: string; name: string } | null;
  _count?: { findings: number; photos: number };
}

const INSPECTION_TYPES = [
  { value: 'tps_lb3',    label: 'TPS LB3',    color: 'bg-indigo-500/15 text-indigo-400' },
  { value: 'apd',        label: 'APD',         color: 'bg-orange-500/15 text-orange-400' },
  { value: 'p3k',        label: 'P3K',         color: 'bg-red-500/15 text-red-400' },
  { value: 'apar',       label: 'APAR',        color: 'bg-rose-500/15 text-rose-400' },
  { value: 'fire_alarm', label: 'Fire Alarm',  color: 'bg-amber-500/15 text-amber-400' },
  { value: 'hydrant',    label: 'Hydrant',     color: 'bg-blue-500/15 text-blue-400' },
];

const typeLabel = (t: string) => INSPECTION_TYPES.find(x => x.value === t)?.label ?? t;
const typeColor = (t: string) => INSPECTION_TYPES.find(x => x.value === t)?.color ?? 'bg-slate-700 text-slate-400';

const statusBadgeMap: Record<string, string> = {
  dijadwalkan: 'badge-info',
  berlangsung: 'badge-warning',
  selesai: 'badge-success',
  dibatalkan: 'badge-neutral',
};
const statusLabelMap: Record<string, string> = {
  dijadwalkan: 'Terjadwal',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const statusBadge = (s: string) => statusBadgeMap[s] || 'badge-neutral';
const statusLabel = (s: string) => statusLabelMap[s] || s;

const scoreColor = (score?: number) => {
  if (!score && score !== 0) return '';
  return score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
};

export default function InspeksiPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const { user } = useAuthStore();

  const fetchInspections = useCallback(() => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : '';
    api
      .get(`/inspections${q}`)
      .then(r => setInspections(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {['', 'dijadwalkan', 'berlangsung', 'selesai'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s === '' ? 'Semua' : statusLabel(s)}
            </button>
          ))}
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => setShowSchedule(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Jadwalkan
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {inspections.map(insp => (
            <div key={insp.id} className="card p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white">{insp.warehouse.name}</h3>
                    <span className={statusBadge(insp.status)}>{statusLabel(insp.status)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColor(insp.type)}`}>{typeLabel(insp.type)}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-0.5">{insp.warehouse.address}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                    <span>
                      {new Date(insp.scheduledDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {insp.inspector
                      ? <span>{insp.inspector.name}</span>
                      : <span className="italic text-slate-600">Belum ditugaskan</span>
                    }
                    {insp._count && (
                      <>
                        <span>{insp._count.findings} temuan</span>
                        <span>{insp._count.photos} foto</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {insp.complianceScore !== null && insp.complianceScore !== undefined && (
                    <div className={`text-xl font-bold ${scoreColor(insp.complianceScore)}`}>
                      {insp.complianceScore}%
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    {insp.status === 'dijadwalkan' && !insp.inspector && (
                      <Link href={`/inspeksi/${insp.id}/lakukan`} className="btn-primary text-xs py-1 px-3">
                        Ambil & Mulai
                      </Link>
                    )}
                    {insp.status === 'dijadwalkan' && insp.inspector?.id === user?.id && (
                      <Link href={`/inspeksi/${insp.id}/lakukan`} className="btn-primary text-xs py-1 px-3">
                        Mulai
                      </Link>
                    )}
                    {insp.status === 'berlangsung' && insp.inspector?.id === user?.id && (
                      <Link href={`/inspeksi/${insp.id}/lakukan`} className="btn-warning text-xs py-1 px-3">
                        Lanjutkan
                      </Link>
                    )}
                    {insp.status === 'berlangsung' && insp.inspector && insp.inspector.id !== user?.id && (
                      <span className="text-xs text-amber-400 py-1">
                        Dikerjakan: {insp.inspector.name}
                      </span>
                    )}
                    <Link href={`/inspeksi/${insp.id}`} className="btn-secondary text-xs py-1 px-3">
                      Detail
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {inspections.length === 0 && (
            <div className="text-center py-20 text-slate-500">Tidak ada inspeksi ditemukan</div>
          )}
        </div>
      )}

      {showSchedule && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          onSave={() => {
            setShowSchedule(false);
            fetchInspections();
          }}
        />
      )}
    </div>
  );
}

function ScheduleModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ warehouseId: '', scheduledDate: '', type: 'tps_lb3' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/warehouses?limit=100').then(r => setWarehouses(r.data.data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/inspections', form);
      onSave();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Terjadi kesalahan');
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Jadwalkan Inspeksi</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Jenis Inspeksi</label>
            <select
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="input-field"
              required
            >
              {INSPECTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Gudang</label>
            <select
              value={form.warehouseId}
              onChange={e => setForm(p => ({ ...p, warehouseId: e.target.value }))}
              className="input-field"
              required
            >
              <option value="">Pilih gudang...</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Tanggal Inspeksi</label>
            <input
              type="date"
              value={form.scheduledDate}
              onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Batal
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Menyimpan...' : 'Jadwalkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
