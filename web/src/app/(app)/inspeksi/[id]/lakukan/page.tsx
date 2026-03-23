'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

const InspectionMap = dynamic(() => import('@/components/InspectionMap'), { ssr: false });

type Step = 1 | 2 | 3 | 4 | 5;

interface AnswerOption { label: string; score: number; }

interface ChecklistItem {
  templateId: string;
  category: string;
  description: string;
  answerOptions: AnswerOption[];
  requiresPhoto: boolean;
  photoLabel: string;
  status: string;
  comment: string;
}

interface Finding {
  severity: string;
  description: string;
  recommendation: string;
}

interface NamedPhoto {
  label: string;
  file: File | null;
  preview: string;
}

interface InspectionData {
  id: string;
  type: string;
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

// Named photo slots per inspection type
const NAMED_PHOTOS: Record<string, string[]> = {
  p3k: [
    'Foto tampak depan kotak P3K',
    'Foto seluruh isi kotak',
    'Foto item yang mendekati kadaluarsa',
    'Foto penempatan di lokasi kerja',
  ],
  apar: [
    'Tampak Depan APAR',
    'Pressure gauge',
    'Label kadaluarsa',
    'Area Pemasangan',
  ],
};

// Overall status options per type
const OVERALL_STATUS_OPTIONS: Record<string, string[]> = {
  p3k: ['Lengkap & Layak', 'Kurang (Perlu Penambahan)', 'Tidak Layak (Perlu Penggantian)'],
  apar: ['Layak Pakai', 'Perlu Perbaikan', 'Perlu Penggantian'],
};

// Coming soon types
const COMING_SOON_TYPES = ['apd', 'fire_alarm', 'hydrant'];

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
  const [namedPhotos, setNamedPhotos] = useState<NamedPhoto[]>([]);
  const [extraPhotos, setExtraPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [overallStatus, setOverallStatus] = useState('');
  const [catatan, setCatatan] = useState('');
  const [gpsStatus, setGpsStatus] = useState<'checking' | 'ok' | 'warning' | 'error'>('checking');
  const [gpsInfo, setGpsInfo] = useState<{
    lat: number; lng: number; distance: number; withinFence: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const namedFileRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    api.get(`/inspections/${id}`).then(inspRes => {
      const inspData = inspRes.data.data;
      setInsp(inspData);
      const isInProgress = inspData.status === 'berlangsung';
      if (isInProgress) setStep(2);

      // Init named photos for this type
      const slots = NAMED_PHOTOS[inspData.type] || [];
      setNamedPhotos(slots.map(label => ({ label, file: null, preview: '' })));

      // Init overall status
      const statusOpts = OVERALL_STATUS_OPTIONS[inspData.type];
      if (statusOpts?.length) setOverallStatus(statusOpts[0]);

      return api.get(`/checklist-templates?type=${inspData.type || 'tps_lb3'}`);
    }).then(tmplRes => {
      const tmpls: {
        id: string; category: string; description: string;
        answerOptions: string; requiresPhoto: boolean; photoLabel: string;
      }[] = tmplRes.data.data.templates;
      setChecklist(
        tmpls.map(t => ({
          templateId: t.id,
          category: t.category,
          description: t.description,
          answerOptions: JSON.parse(t.answerOptions || '[]'),
          requiresPhoto: t.requiresPhoto || false,
          photoLabel: t.photoLabel || '',
          status: '',
          comment: '',
        }))
      );
    });
  }, [id]);

  useEffect(() => {
    if (step === 1 && insp && gpsStatus === 'checking') checkGPS();
  }, [step, insp]);

  function checkGPS() {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
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
    if (gpsInfo) { body.gpsLat = gpsInfo.lat; body.gpsLng = gpsInfo.lng; body.gpsAccuracy = 10; }
    await api.post(`/inspections/${id}/start`, body);
    setStep(2);
  }

  function handleNamedPhoto(idx: number, file: File) {
    const preview = URL.createObjectURL(file);
    setNamedPhotos(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      if (p.preview) URL.revokeObjectURL(p.preview);
      return { ...p, file, preview };
    }));
  }

  function handleExtraPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setExtraPhotos(prev => [...prev, { file, preview }]);
    e.target.value = '';
  }

  async function submitInspection() {
    setSubmitting(true);
    setSubmitError('');
    try {
      await api.put(`/inspections/${id}/checklist`, {
        results: checklist.map(c => ({
          templateId: c.templateId,
          status: c.status || (c.answerOptions[c.answerOptions.length - 1]?.label ?? 'na'),
          comment: c.comment,
        })),
      });

      for (const f of findings) {
        if (f.description.trim()) await api.post(`/inspections/${id}/findings`, f);
      }

      // Upload named photos with labels
      for (const p of namedPhotos) {
        if (p.file) {
          const fd = new FormData();
          fd.append('photo', p.file);
          fd.append('label', p.label);
          await api.post(`/inspections/${id}/photos`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }

      // Upload extra/unlabeled photos
      for (const p of extraPhotos) {
        const fd = new FormData();
        fd.append('photo', p.file);
        await api.post(`/inspections/${id}/photos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await api.post(`/inspections/${id}/complete`, {
        notes: catatan || undefined,
        overallStatus: overallStatus || undefined,
      });
      router.push(`/inspeksi/${id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setSubmitError(axiosErr.response?.data?.message || 'Terjadi kesalahan saat menyimpan');
    }
    setSubmitting(false);
  }

  if (!insp)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );

  // Score calculation using answerOptions weights
  const totalMaxScore = checklist.reduce((sum, c) => {
    if (!c.answerOptions.length) return sum;
    return sum + Math.max(...c.answerOptions.map(o => o.score));
  }, 0);
  const totalScore = checklist.reduce((sum, c) => {
    const sel = c.answerOptions.find(o => o.label === c.status);
    return sum + (sel?.score ?? 0);
  }, 0);
  const score = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
  const filled = checklist.filter(c => c.status !== '').length;
  const categories = Array.from(new Set(checklist.map(c => c.category)));
  const circumference = 2 * Math.PI * 45;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  const steps = ['GPS', 'Checklist', 'Foto', 'Temuan', 'Submit'];
  const isComingSoon = COMING_SOON_TYPES.includes(insp.type);
  const hasOverallStatus = !!OVERALL_STATUS_OPTIONS[insp.type];
  const hasNamedPhotos = (NAMED_PHOTOS[insp.type] || []).length > 0;

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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  state === 'done' ? 'bg-emerald-600 border-emerald-600 text-white'
                  : state === 'active' ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-slate-600 text-slate-500'}`}>
                  {state === 'done' ? '✓' : num}
                </div>
                <span className={`text-xs mt-1 ${state === 'active' ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 transition-colors ${num < step ? 'bg-emerald-600' : 'bg-slate-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="card p-6">
        {/* Step 1: GPS */}
        {step === 1 && (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-white">Verifikasi Lokasi GPS</h3>
            <p className="text-slate-400 text-sm">Sistem akan memeriksa apakah Anda berada di dalam radius gudang.</p>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl border-4 transition-all ${
              gpsStatus === 'checking' ? 'border-slate-600 animate-pulse'
              : gpsStatus === 'ok' ? 'border-emerald-500 bg-emerald-500/10'
              : gpsStatus === 'warning' ? 'border-amber-500 bg-amber-500/10'
              : 'border-red-500 bg-red-500/10'}`}>
              {gpsStatus === 'checking' ? '📡' : gpsStatus === 'ok' ? '✅' : gpsStatus === 'warning' ? '⚠️' : '❌'}
            </div>
            <div className="space-y-1">
              {gpsStatus === 'checking' && <p className="text-slate-400">Mengecek lokasi GPS...</p>}
              {gpsInfo && (
                <>
                  <p className={`font-semibold text-lg ${gpsInfo.withinFence ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Jarak: {gpsInfo.distance}m dari gudang
                  </p>
                  <p className="text-slate-400 text-sm">
                    {gpsInfo.withinFence
                      ? `Dalam radius ${insp.warehouse.geoFenceRadius}m — Lokasi Valid`
                      : `Di luar radius ${insp.warehouse.geoFenceRadius}m — Anda mungkin tidak di lokasi`}
                  </p>
                </>
              )}
              {gpsStatus === 'error' && <p className="text-red-400">GPS tidak tersedia. Melanjutkan tanpa verifikasi GPS.</p>}
            </div>
            {gpsInfo && insp && (
              <InspectionMap
                userLat={gpsInfo.lat} userLng={gpsInfo.lng}
                warehouseLat={insp.warehouse.latitude} warehouseLng={insp.warehouse.longitude}
                radius={insp.warehouse.geoFenceRadius} withinFence={gpsInfo.withinFence}
              />
            )}
            {gpsStatus !== 'checking' && (
              <button onClick={() => { setGpsStatus('checking'); setGpsInfo(null); setTimeout(checkGPS, 100); }} className="btn-secondary text-sm">
                Refresh GPS
              </button>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={startInspection} disabled={gpsStatus === 'checking'} className="btn-primary disabled:opacity-50">
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
              <span className="text-slate-400 text-sm">{filled}/{checklist.length} terisi</span>
            </div>

            {/* Coming Soon */}
            {isComingSoon ? (
              <div className="text-center py-16 space-y-3">
                <div className="text-6xl">🚧</div>
                <h4 className="text-xl font-bold text-white">Segera Hadir</h4>
                <p className="text-slate-400">Form inspeksi untuk tipe ini sedang dalam pengembangan.</p>
              </div>
            ) : (
              <>
                <div className="w-full bg-slate-700 rounded-full h-1.5 mb-6">
                  <div className="bg-indigo-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${checklist.length > 0 ? (filled / checklist.length) * 100 : 0}%` }} />
                </div>

                <div className="space-y-6">
                  {categories.map(cat => (
                    <div key={cat}>
                      <h4 className="font-medium text-slate-300 mb-3 text-sm uppercase tracking-wide border-b border-slate-700 pb-1">
                        {cat}
                      </h4>
                      {checklist.filter(c => c.category === cat).map(item => {
                        const idx = checklist.indexOf(item);
                        const isAnswered = item.status !== '';
                        return (
                          <div key={item.templateId}
                            className={`mb-3 rounded-lg p-3 border transition-colors ${
                              isAnswered ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-900 border-slate-700'}`}>
                            <p className="text-slate-300 text-sm mb-2">{item.description}</p>
                            <div className="flex gap-2 flex-wrap mb-2">
                              {item.answerOptions.map(opt => (
                                <button key={opt.label} type="button"
                                  onClick={() => setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, status: opt.label } : c))}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                    item.status === opt.label
                                      ? opt.score > 0
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-red-600 text-white'
                                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                  }`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            <input type="text" placeholder="Catatan (opsional)"
                              value={item.comment}
                              onChange={e => setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, comment: e.target.value } : c))}
                              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-between pt-6 border-t border-slate-700 mt-4">
              <button onClick={() => setStep(1)} className="btn-secondary">← Kembali</button>
              <button onClick={() => setStep(3)} className="btn-primary">Lanjut ke Foto →</button>
            </div>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Dokumentasi Foto</h3>
            <p className="text-slate-400 text-sm mb-5">Ambil foto sebagai bukti visual inspeksi.</p>

            {/* Named photo slots */}
            {hasNamedPhotos && (
              <div className="space-y-3 mb-6">
                <p className="text-slate-300 text-sm font-medium">Foto Wajib:</p>
                {namedPhotos.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-lg p-3">
                    {p.preview ? (
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <img src={p.preview} alt={p.label} className="w-full h-full object-cover rounded-lg" />
                        <button onClick={() => setNamedPhotos(prev => prev.map((x, j) => {
                          if (j !== i) return x;
                          if (x.preview) URL.revokeObjectURL(x.preview);
                          return { ...x, file: null, preview: '' };
                        }))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center">✕</button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 flex-shrink-0 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-500 text-xl">📷</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-sm font-medium">{p.label}</p>
                      {!p.preview && <p className="text-slate-500 text-xs">Belum diambil</p>}
                    </div>
                    <input
                      ref={el => { namedFileRefs.current[i] = el; }}
                      type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleNamedPhoto(i, f); e.target.value = ''; }}
                    />
                    <button onClick={() => namedFileRefs.current[i]?.click()}
                      className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">
                      {p.preview ? 'Ganti' : 'Ambil'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Overall status */}
            {hasOverallStatus && (
              <div className="mb-6">
                <label className="block text-slate-300 text-sm font-medium mb-2">Status Keseluruhan</label>
                <div className="flex flex-wrap gap-2">
                  {OVERALL_STATUS_OPTIONS[insp.type].map(opt => (
                    <button key={opt} onClick={() => setOverallStatus(opt)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        overallStatus === opt ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Catatan */}
            <div className="mb-5">
              <label className="block text-slate-300 text-sm font-medium mb-2">Catatan</label>
              <textarea value={catatan} onChange={e => setCatatan(e.target.value)}
                placeholder="Catatan tambahan (opsional)..."
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none h-20 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Extra photos */}
            <div>
              <p className="text-slate-300 text-sm font-medium mb-2">Foto Tambahan:</p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {extraPhotos.map((p, i) => (
                  <div key={i} className="relative aspect-square group">
                    <img src={p.preview} alt={`foto ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button onClick={() => setExtraPhotos(prev => {
                      const next = [...prev];
                      URL.revokeObjectURL(next[i].preview);
                      next.splice(i, 1);
                      return next;
                    })} className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center gap-1 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-colors">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                  <span className="text-xs">Tambah</span>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleExtraPhoto} capture="environment" />
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-700 mt-4">
              <button onClick={() => setStep(2)} className="btn-secondary">← Kembali</button>
              <button onClick={() => setStep(4)} className="btn-primary">Lanjut ke Temuan →</button>
            </div>
          </div>
        )}

        {/* Step 4: Findings */}
        {step === 4 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Temuan & Rekomendasi</h3>
            <p className="text-slate-400 text-sm mb-4">Catat temuan ketidaksesuaian yang ditemukan selama inspeksi.</p>
            <div className="space-y-3 mb-3">
              {findings.map((f, i) => (
                <div key={i} className={`rounded-lg p-3 border space-y-2 ${
                  f.severity === 'kritis' ? 'bg-red-500/5 border-red-500/30'
                  : f.severity === 'sedang' ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-blue-500/5 border-blue-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <select value={f.severity}
                      onChange={e => setFindings(prev => prev.map((f2, j) => j === i ? { ...f2, severity: e.target.value } : f2))}
                      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                      <option value="ringan">Ringan</option>
                      <option value="sedang">Sedang</option>
                      <option value="kritis">Kritis</option>
                    </select>
                    <button onClick={() => setFindings(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-sm">Hapus</button>
                  </div>
                  <textarea placeholder="Deskripsi temuan..." value={f.description}
                    onChange={e => setFindings(prev => prev.map((f2, j) => j === i ? { ...f2, description: e.target.value } : f2))}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-600 resize-none h-16 focus:outline-none focus:border-indigo-500" />
                  <textarea placeholder="Rekomendasi perbaikan..." value={f.recommendation}
                    onChange={e => setFindings(prev => prev.map((f2, j) => j === i ? { ...f2, recommendation: e.target.value } : f2))}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-600 resize-none h-16 focus:outline-none focus:border-indigo-500" />
                </div>
              ))}
            </div>
            <button onClick={() => setFindings(prev => [...prev, { severity: 'ringan', description: '', recommendation: '' }])}
              className="btn-secondary w-full flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Temuan
            </button>
            {findings.length === 0 && <p className="text-slate-500 text-sm text-center mt-3">Tidak ada temuan? Anda dapat melanjutkan tanpa temuan.</p>}
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(3)} className="btn-secondary">← Kembali</button>
              <button onClick={() => setStep(5)} className="btn-primary">Review →</button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Review & Submit Laporan</h3>

            {!isComingSoon && (
              <div className="flex items-center justify-center mb-6">
                <div className="text-center">
                  <svg width="120" height="120" viewBox="0 0 100 100" className="mx-auto">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8"/>
                    <circle cx="50" cy="50" r="45" fill="none" stroke={scoreColor} strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (score / 100) * circumference}
                      strokeLinecap="round" transform="rotate(-90 50 50)" />
                    <text x="50" y="50" textAnchor="middle" dy="0.35em" fill={scoreColor} fontSize="20" fontWeight="800">{score}%</text>
                  </svg>
                  <p className="text-slate-400 text-sm mt-1">Estimasi Skor Kepatuhan</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-slate-500 text-xs mb-1">Checklist Terisi</p>
                <p className="text-white font-semibold">{filled}/{checklist.length} item</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-slate-500 text-xs mb-1">Temuan</p>
                <p className="text-amber-400 font-semibold">{findings.filter(f => f.description.trim()).length} temuan</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-slate-500 text-xs mb-1">Foto Wajib</p>
                <p className="text-indigo-400 font-semibold">{namedPhotos.filter(p => p.file).length}/{namedPhotos.length}</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-slate-500 text-xs mb-1">Foto Tambahan</p>
                <p className="text-indigo-400 font-semibold">{extraPhotos.length} foto</p>
              </div>
              {overallStatus && (
                <div className="col-span-2 bg-slate-900 rounded-lg p-3 border border-slate-700">
                  <p className="text-slate-500 text-xs mb-1">Status Keseluruhan</p>
                  <p className="text-white font-semibold">{overallStatus}</p>
                </div>
              )}
            </div>

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">{submitError}</div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(4)} className="btn-secondary">← Kembali</button>
              <button onClick={submitInspection} disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                {submitting ? (
                  <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Menyimpan...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Submit Laporan</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
