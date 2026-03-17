'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

type Step = 1 | 2 | 3 | 4 | 5;

interface ChecklistItem {
  templateId: string;
  category: string;
  description: string;
  status: string;
  comment: string;
}

interface Finding {
  severity: string;
  description: string;
  recommendation: string;
}

interface Photo {
  file: File;
  preview: string;
}

interface InspectionData {
  id: string;
  status: string;
  warehouse: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    geoFenceRadius: number;
  };
  inspector: { id: string; name: string };
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LakukanInspeksiPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [insp, setInsp] = useState<InspectionData | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [gpsStatus, setGpsStatus] = useState<'checking' | 'ok' | 'warning' | 'error'>('checking');
  const [gpsInfo, setGpsInfo] = useState<{
    lat: number;
    lng: number;
    distance: number;
    withinFence: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/inspections/${id}`),
      api.get('/checklist-templates'),
    ]).then(([inspRes, tmplRes]) => {
      setInsp(inspRes.data.data);
      const tmpls: { id: string; category: string; description: string }[] =
        tmplRes.data.data.templates;
      setChecklist(
        tmpls.map(t => ({
          templateId: t.id,
          category: t.category,
          description: t.description,
          status: '',
          comment: '',
        }))
      );
    });
  }, [id]);

  useEffect(() => {
    if (step === 1 && insp && gpsStatus === 'checking') {
      checkGPS();
    }
  }, [step, insp]);

  function checkGPS() {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        if (!insp) return;
        const distance = Math.round(
          calcDistance(latitude, longitude, insp.warehouse.latitude, insp.warehouse.longitude)
        );
        const withinFence = distance <= insp.warehouse.geoFenceRadius;
        setGpsInfo({ lat: latitude, lng: longitude, distance, withinFence });
        setGpsStatus(withinFence ? 'ok' : 'warning');
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function startInspection() {
    const body: Record<string, number> = {};
    if (gpsInfo) {
      body.gpsLat = gpsInfo.lat;
      body.gpsLng = gpsInfo.lng;
      body.gpsAccuracy = 10;
    }
    await api.post(`/inspections/${id}/start`, body);
    setStep(2);
  }

  async function submitInspection() {
    setSubmitting(true);
    setSubmitError('');
    try {
      // Save checklist
      await api.put(`/inspections/${id}/checklist`, {
        results: checklist.map(c => ({
          templateId: c.templateId,
          status: c.status || 'na',
          comment: c.comment,
        })),
      });

      // Save findings
      for (const f of findings) {
        if (f.description.trim()) {
          await api.post(`/inspections/${id}/findings`, f);
        }
      }

      // Upload photos
      for (const p of photos) {
        const fd = new FormData();
        fd.append('photo', p.file);
        await api.post(`/inspections/${id}/photos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Complete inspection
      await api.post(`/inspections/${id}/complete`, {});
      router.push(`/inspeksi/${id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setSubmitError(axiosErr.response?.data?.message || 'Terjadi kesalahan saat menyimpan');
    }
    setSubmitting(false);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPhotos(prev => [...prev, { file, preview }]);
    e.target.value = '';
  }

  function removePhoto(idx: number) {
    setPhotos(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  }

  if (!insp)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );

  const sesuai = checklist.filter(c => c.status === 'sesuai').length;
  const naCount = checklist.filter(c => c.status === 'na').length;
  const filled = checklist.filter(c => c.status !== '').length;
  const applicable = filled - naCount;
  const score = applicable > 0 ? Math.round((sesuai / applicable) * 100) : 0;
  const categories = [...new Set(checklist.map(c => c.category))];
  const circumference = 2 * Math.PI * 45;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  const steps = ['GPS', 'Checklist', 'Foto', 'Temuan', 'Submit'];

  const catIcons: Record<string, string> = {
    'Bangunan Gudang': '🏗️',
    'Labeling & Simbol': '🏷️',
    MSDS: '📄',
    'Kemasan & Kontainer': '🛢️',
    'Drainase & Penampungan': '🚰',
    'APD Petugas': '🦺',
    'Peralatan Darurat': '🧯',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Warehouse info */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-white">{insp.warehouse.name}</h2>
          <p className="text-slate-400 text-sm">{insp.warehouse.address}</p>
        </div>
        <span className="badge-warning">Berlangsung</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center">
        {steps.map((label, i) => {
          const num = i + 1;
          const state = num < step ? 'done' : num === step ? 'active' : 'pending';
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    state === 'done'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : state === 'active'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-600 text-slate-500'
                  }`}
                >
                  {state === 'done' ? '✓' : num}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    state === 'active' ? 'text-indigo-400' : 'text-slate-500'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 mb-4 transition-colors ${
                    num < step ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="card p-6">
        {/* Step 1: GPS Verification */}
        {step === 1 && (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-white">Verifikasi Lokasi GPS</h3>
            <p className="text-slate-400 text-sm">
              Sistem akan memeriksa apakah Anda berada di dalam radius gudang.
            </p>

            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl border-4 transition-all ${
                gpsStatus === 'checking'
                  ? 'border-slate-600 animate-pulse'
                  : gpsStatus === 'ok'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : gpsStatus === 'warning'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-red-500 bg-red-500/10'
              }`}
            >
              {gpsStatus === 'checking'
                ? '📡'
                : gpsStatus === 'ok'
                ? '✅'
                : gpsStatus === 'warning'
                ? '⚠️'
                : '❌'}
            </div>

            <div className="space-y-1">
              {gpsStatus === 'checking' && (
                <p className="text-slate-400">Mengecek lokasi GPS...</p>
              )}
              {gpsInfo && (
                <>
                  <p
                    className={`font-semibold text-lg ${
                      gpsInfo.withinFence ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    Jarak: {gpsInfo.distance}m dari gudang
                  </p>
                  <p className="text-slate-400 text-sm">
                    {gpsInfo.withinFence
                      ? `Dalam radius ${insp.warehouse.geoFenceRadius}m — Lokasi Valid`
                      : `Di luar radius ${insp.warehouse.geoFenceRadius}m — Anda mungkin tidak di lokasi`}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {gpsInfo.lat.toFixed(6)}, {gpsInfo.lng.toFixed(6)}
                  </p>
                </>
              )}
              {gpsStatus === 'error' && (
                <p className="text-red-400">
                  GPS tidak tersedia di perangkat ini. Melanjutkan tanpa verifikasi GPS.
                </p>
              )}
            </div>

            {gpsStatus === 'warning' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 text-sm text-left">
                Anda berada di luar radius geofence gudang. Inspeksi tetap dapat dilanjutkan,
                namun akan dicatat dalam sistem.
              </div>
            )}

            {gpsStatus !== 'checking' && (
              <button
                onClick={() => {
                  setGpsStatus('checking');
                  setGpsInfo(null);
                  setTimeout(checkGPS, 100);
                }}
                className="btn-secondary text-sm"
              >
                Refresh GPS
              </button>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={startInspection}
                disabled={gpsStatus === 'checking'}
                className="btn-primary disabled:opacity-50"
              >
                Mulai Inspeksi →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Checklist */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Checklist Inspeksi</h3>
              <span className="text-slate-400 text-sm">
                {filled}/{checklist.length} terisi
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-6">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                style={{ width: `${checklist.length > 0 ? (filled / checklist.length) * 100 : 0}%` }}
              />
            </div>

            <div className="space-y-6">
              {categories.map(cat => (
                <div key={cat}>
                  <h4 className="font-medium text-slate-300 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <span>{catIcons[cat] || '📋'}</span> {cat}
                  </h4>
                  {checklist
                    .filter(c => c.category === cat)
                    .map(item => {
                      const idx = checklist.indexOf(item);
                      return (
                        <div
                          key={item.templateId}
                          className={`mb-3 rounded-lg p-3 border transition-colors ${
                            item.status === 'sesuai'
                              ? 'bg-emerald-500/5 border-emerald-500/30'
                              : item.status === 'tidak_sesuai'
                              ? 'bg-red-500/5 border-red-500/30'
                              : item.status === 'na'
                              ? 'bg-slate-700/30 border-slate-600'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          <p className="text-slate-300 text-sm mb-2">{item.description}</p>
                          <div className="flex gap-2 mb-2">
                            {(
                              [
                                ['sesuai', 'Sesuai', 'bg-emerald-600 text-white'],
                                ['tidak_sesuai', 'Tidak Sesuai', 'bg-red-600 text-white'],
                                ['na', 'N/A', 'bg-slate-600 text-white'],
                              ] as [string, string, string][]
                            ).map(([val, label, activeCls]) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() =>
                                  setChecklist(prev =>
                                    prev.map((c, i) =>
                                      i === idx ? { ...c, status: val } : c
                                    )
                                  )
                                }
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                  item.status === val
                                    ? activeCls
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Catatan / komentar (opsional)"
                            value={item.comment}
                            onChange={e =>
                              setChecklist(prev =>
                                prev.map((c, i) =>
                                  i === idx ? { ...c, comment: e.target.value } : c
                                )
                              )
                            }
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-700 mt-4">
              <button onClick={() => setStep(1)} className="btn-secondary">
                ← Kembali
              </button>
              <button onClick={() => setStep(3)} className="btn-primary">
                Lanjut ke Foto →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Dokumentasi Foto</h3>
            <p className="text-slate-400 text-sm mb-4">
              Ambil foto kondisi gudang sebagai bukti visual inspeksi.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square group">
                  <img
                    src={p.preview}
                    alt={`foto ${i + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-0.5 text-center rounded-b-lg">
                    {(p.file.size / 1024).toFixed(0)} KB
                  </div>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                  />
                </svg>
                <span className="text-xs font-medium">Ambil Foto</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
              capture="environment"
            />

            <p className="text-slate-500 text-xs mb-4">
              {photos.length} foto ditambahkan. Anda dapat melanjutkan tanpa foto.
            </p>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)} className="btn-secondary">
                ← Kembali
              </button>
              <button onClick={() => setStep(4)} className="btn-primary">
                Lanjut ke Temuan →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Findings */}
        {step === 4 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Temuan & Rekomendasi</h3>
            <p className="text-slate-400 text-sm mb-4">
              Catat temuan ketidaksesuaian yang ditemukan selama inspeksi.
            </p>

            <div className="space-y-3 mb-3">
              {findings.map((f, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 border space-y-2 ${
                    f.severity === 'kritis'
                      ? 'bg-red-500/5 border-red-500/30'
                      : f.severity === 'sedang'
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-blue-500/5 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <select
                      value={f.severity}
                      onChange={e =>
                        setFindings(prev =>
                          prev.map((f2, j) =>
                            j === i ? { ...f2, severity: e.target.value } : f2
                          )
                        )
                      }
                      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ringan">Ringan</option>
                      <option value="sedang">Sedang</option>
                      <option value="kritis">Kritis</option>
                    </select>
                    <button
                      onClick={() => setFindings(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Hapus
                    </button>
                  </div>
                  <textarea
                    placeholder="Deskripsi temuan yang ditemukan..."
                    value={f.description}
                    onChange={e =>
                      setFindings(prev =>
                        prev.map((f2, j) =>
                          j === i ? { ...f2, description: e.target.value } : f2
                        )
                      )
                    }
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-600 resize-none h-16 focus:outline-none focus:border-indigo-500"
                  />
                  <textarea
                    placeholder="Rekomendasi tindakan perbaikan..."
                    value={f.recommendation}
                    onChange={e =>
                      setFindings(prev =>
                        prev.map((f2, j) =>
                          j === i ? { ...f2, recommendation: e.target.value } : f2
                        )
                      )
                    }
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-600 resize-none h-16 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                setFindings(prev => [
                  ...prev,
                  { severity: 'ringan', description: '', recommendation: '' },
                ])
              }
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Temuan
            </button>

            {findings.length === 0 && (
              <p className="text-slate-500 text-sm text-center mt-3">
                Tidak ada temuan? Anda dapat melanjutkan tanpa temuan.
              </p>
            )}

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(3)} className="btn-secondary">
                ← Kembali
              </button>
              <button onClick={() => setStep(5)} className="btn-primary">
                Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Review & Submit Laporan</h3>

            {/* Score preview */}
            <div className="flex items-center justify-center mb-6">
              <div className="text-center">
                <svg width="120" height="120" viewBox="0 0 100 100" className="mx-auto">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8"/>
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={
                      circumference - (score / 100) * circumference
                    }
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  <text
                    x="50"
                    y="50"
                    textAnchor="middle"
                    dy="0.35em"
                    fill={scoreColor}
                    fontSize="20"
                    fontWeight="800"
                  >
                    {score}%
                  </text>
                </svg>
                <p className="text-slate-400 text-sm mt-1">Estimasi Skor Kepatuhan</p>
              </div>
            </div>

            {/* Summary grid */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-slate-500 text-xs mb-1">Checklist Terisi</p>
                <p className="text-white font-semibold">
                  {filled}/{checklist.length} item
                </p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-slate-500 text-xs mb-1">Item Sesuai</p>
                <p className="text-emerald-400 font-semibold">{sesuai} item</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-slate-500 text-xs mb-1">Temuan</p>
                <p className="text-amber-400 font-semibold">{findings.filter(f => f.description.trim()).length} temuan</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-slate-500 text-xs mb-1">Foto</p>
                <p className="text-indigo-400 font-semibold">{photos.length} foto</p>
              </div>
            </div>

            {/* Findings severity breakdown */}
            {findings.filter(f => f.description.trim()).length > 0 && (
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 mb-4">
                <p className="text-slate-400 text-xs mb-2">Detail Temuan:</p>
                <div className="flex gap-4 text-xs">
                  <span>
                    <span className="text-blue-400 font-medium">
                      {findings.filter(f => f.severity === 'ringan' && f.description.trim()).length}
                    </span>{' '}
                    ringan
                  </span>
                  <span>
                    <span className="text-amber-400 font-medium">
                      {findings.filter(f => f.severity === 'sedang' && f.description.trim()).length}
                    </span>{' '}
                    sedang
                  </span>
                  <span>
                    <span className="text-red-400 font-medium">
                      {findings.filter(f => f.severity === 'kritis' && f.description.trim()).length}
                    </span>{' '}
                    kritis
                  </span>
                </div>
              </div>
            )}

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
                {submitError}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(4)} className="btn-secondary">
                ← Kembali
              </button>
              <button
                onClick={submitInspection}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Submit Laporan
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
