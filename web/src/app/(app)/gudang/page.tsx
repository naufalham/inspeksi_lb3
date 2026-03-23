'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const WarehouseMapFull = dynamic(
  () => import('@/components/WarehouseMap').then(m => m.WarehouseMapFull),
  { ssr: false }
);
const WarehouseMiniMap = dynamic(
  () => import('@/components/WarehouseMap').then(m => m.WarehouseMiniMap),
  { ssr: false }
);

interface Warehouse {
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
  wasteTypes: string[];
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    aktif: 'badge-success',
    tidak_aktif: 'badge-neutral',
    perbaikan: 'badge-warning',
  };
  return map[status] || 'badge-neutral';
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    aktif: 'Aktif',
    tidak_aktif: 'Non-Aktif',
    perbaikan: 'Perbaikan',
  };
  return map[status] || status;
};

export default function GudangPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Warehouse | null>(null);
  const { user } = useAuthStore();

  const fetchWarehouses = () => {
    setLoading(true);
    api
      .get(`/warehouses?search=${search}`)
      .then(r => setWarehouses(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWarehouses();
  }, [search]);

  async function handleDelete(id: string) {
    if (!confirm('Hapus gudang ini?')) return;
    await api.delete(`/warehouses/${id}`);
    fetchWarehouses();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Cari gudang..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 w-64"
          />
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => {
              setEditItem(null);
              setShowForm(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Gudang
          </button>
        )}
      </div>

      {/* Peta semua gudang */}
      {!loading && warehouses.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              Peta Lokasi Gudang
            </h3>
          </div>
          <WarehouseMapFull warehouses={warehouses} />
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {warehouses.map(wh => (
            <div key={wh.id} className="card overflow-hidden hover:border-slate-600 transition-colors">
              {/* Mini map */}
              <WarehouseMiniMap warehouse={wh} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{wh.name}</h3>
                  <p className="text-slate-400 text-sm mt-0.5 truncate">{wh.address}</p>
                </div>
                <span className={`ml-2 flex-shrink-0 ${statusBadge(wh.status)}`}>
                  {statusLabel(wh.status)}
                </span>
              </div>

              {wh.wasteTypes?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {wh.wasteTypes.map(wt => (
                    <span key={wt} className="bg-indigo-500/10 text-indigo-400 text-xs px-2 py-0.5 rounded">
                      {wt}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-4">
                {wh.capacity && (
                  <div>
                    <span className="text-slate-500">Kapasitas:</span> {wh.capacity} {wh.capacityUnit}
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Geofence:</span> {wh.geoFenceRadius}m
                </div>
                {wh.pic && (
                  <div className="col-span-2">
                    <span className="text-slate-500">PIC:</span> {wh.pic}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
                <Link
                  href={`/gudang/${wh.id}`}
                  className="flex-1 text-center py-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Detail
                </Link>
                {user?.role === 'admin' && (
                  <>
                    <button
                      onClick={() => {
                        setEditItem(wh);
                        setShowForm(true);
                      }}
                      className="flex-1 text-center py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(wh.id)}
                      className="flex-1 text-center py-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      Hapus
                    </button>
                  </>
                )}
              </div>
              </div>{/* end p-5 */}
            </div>
          ))}

          {warehouses.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-500">
              Tidak ada gudang ditemukan
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <WarehouseModal
          item={editItem}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            fetchWarehouses();
          }}
        />
      )}
    </div>
  );
}

function WarehouseModal({
  item,
  onClose,
  onSave,
}: {
  item: Warehouse | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name || '',
    address: item?.address || '',
    latitude: item?.latitude?.toString() || '',
    longitude: item?.longitude?.toString() || '',
    geoFenceRadius: item?.geoFenceRadius?.toString() || '100',
    capacity: item?.capacity?.toString() || '',
    capacityUnit: item?.capacityUnit || 'ton',
    status: item?.status || 'aktif',
    pic: item?.pic || '',
    picPhone: item?.picPhone || '',
    wasteTypes: item?.wasteTypes?.join(', ') || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        geoFenceRadius: parseFloat(form.geoFenceRadius),
        capacity: form.capacity ? parseFloat(form.capacity) : null,
        wasteTypes: form.wasteTypes
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      };
      if (item) {
        await api.put(`/warehouses/${item.id}`, payload);
      } else {
        await api.post('/warehouses', payload);
      }
      onSave();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Terjadi kesalahan');
    }
    setLoading(false);
  }

  const fields = [
    { key: 'name', label: 'Nama Gudang', required: true },
    { key: 'address', label: 'Alamat', required: true },
    { key: 'latitude', label: 'Latitude', type: 'number', required: true },
    { key: 'longitude', label: 'Longitude', type: 'number', required: true },
    { key: 'geoFenceRadius', label: 'Radius Geofence (m)', type: 'number' },
    { key: 'capacity', label: 'Kapasitas' },
    { key: 'capacityUnit', label: 'Satuan Kapasitas' },
    { key: 'pic', label: 'PIC' },
    { key: 'picPhone', label: 'Telepon PIC' },
    { key: 'wasteTypes', label: 'Jenis Limbah (pisahkan koma)' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">{item ? 'Edit' : 'Tambah'} Gudang</h3>
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

        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm text-slate-300 mb-1">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={(form as Record<string, string>)[f.key]}
                onChange={e =>
                  setForm(prev => ({ ...prev, [f.key]: e.target.value }))
                }
                className="input-field"
                required={f.required}
                step={f.type === 'number' ? 'any' : undefined}
              />
            </div>
          ))}
          <div>
            <label className="block text-sm text-slate-300 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
              className="input-field"
            >
              <option value="aktif">Aktif</option>
              <option value="tidak_aktif">Non-Aktif</option>
              <option value="perbaikan">Perbaikan</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Batal
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
