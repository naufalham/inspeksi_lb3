'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface DashboardData {
  totalInspections: number;
  selesai: number;
  berlangsung: number;
  dijadwalkan: number;
  averageComplianceScore: number;
  criticalFindings: number;
  pendingFindings: number;
  totalWarehouses: number;
  inspectionsByMonth: { month: string; count: number; avgScore: number }[];
  complianceByWarehouse: { name: string; avgScore: number; count: number }[];
  findingsBySeverity: { ringan: number; sedang: number; kritis: number };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/reports/dashboard')
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );

  if (!data) return <div className="text-slate-400">Gagal memuat data</div>;

  const stats = [
    {
      label: 'Total Inspeksi',
      value: data.totalInspections,
      color: 'from-indigo-600 to-indigo-700',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
        </svg>
      ),
    },
    {
      label: 'Selesai',
      value: data.selesai,
      color: 'from-emerald-600 to-emerald-700',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
    },
    {
      label: 'Rata-rata Kepatuhan',
      value: `${data.averageComplianceScore}%`,
      color: 'from-violet-600 to-violet-700',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      ),
    },
    {
      label: 'Temuan Kritis',
      value: data.criticalFindings,
      color: 'from-red-600 to-red-700',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      ),
    },
  ];

  const customTooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f5f9',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="card p-5">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}
            >
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-slate-400 text-sm mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-500 rounded-full" />
          <div>
            <div className="text-lg font-bold text-white">{data.dijadwalkan}</div>
            <div className="text-xs text-slate-400">Terjadwal</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-2 h-8 bg-amber-500 rounded-full" />
          <div>
            <div className="text-lg font-bold text-white">{data.berlangsung}</div>
            <div className="text-xs text-slate-400">Berlangsung</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-2 h-8 bg-emerald-500 rounded-full" />
          <div>
            <div className="text-lg font-bold text-white">{data.selesai}</div>
            <div className="text-xs text-slate-400">Selesai</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-2 h-8 bg-orange-500 rounded-full" />
          <div>
            <div className="text-lg font-bold text-white">{data.pendingFindings}</div>
            <div className="text-xs text-slate-400">Temuan Pending</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">Tren Inspeksi (6 Bulan)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.inspectionsByMonth}>
              <XAxis dataKey="month" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">Kepatuhan per Gudang</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.complianceByWarehouse}>
              <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={customTooltipStyle}
                formatter={(v: number) => [`${v}%`, 'Avg Score']}
              />
              <Bar dataKey="avgScore" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Findings by severity */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-4">Distribusi Temuan</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {data.findingsBySeverity.ringan}
            </div>
            <div className="text-xs text-slate-400 mt-1">Ringan</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {data.findingsBySeverity.sedang}
            </div>
            <div className="text-xs text-slate-400 mt-1">Sedang</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {data.findingsBySeverity.kritis}
            </div>
            <div className="text-xs text-slate-400 mt-1">Kritis</div>
          </div>
        </div>
      </div>

      {/* Gudang & Warehouse summary */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-2">Ringkasan Gudang</h3>
        <p className="text-slate-400 text-sm">
          Total <span className="text-white font-semibold">{data.totalWarehouses}</span> gudang terdaftar dalam sistem.
        </p>
      </div>
    </div>
  );
}
