'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Report {
  id: string;
  completedAt?: string;
  complianceScore?: number;
  warehouse: { name: string; address: string };
  inspector: { name: string };
  _count?: { findings: number };
}

const scoreColor = (score?: number) => {
  if (!score && score !== 0) return 'text-slate-400';
  return score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
};

const scoreBg = (score?: number) => {
  if (!score && score !== 0) return '';
  return score >= 80
    ? 'bg-emerald-500/10'
    : score >= 60
    ? 'bg-amber-500/10'
    : 'bg-red-500/10';
};

export default function LaporanPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/reports?limit=50')
      .then(r => setReports(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const avgScore =
    reports.length > 0
      ? Math.round(
          reports
            .filter(r => r.complianceScore !== null && r.complianceScore !== undefined)
            .reduce((sum, r) => sum + (r.complianceScore || 0), 0) /
            reports.filter(r => r.complianceScore !== null && r.complianceScore !== undefined).length
        )
      : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white">Laporan Inspeksi Selesai</h2>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">{reports.length} laporan</span>
          {reports.length > 0 && (
            <span className={`text-sm font-semibold ${scoreColor(avgScore)}`}>
              Rata-rata: {avgScore}%
            </span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {reports.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {reports.filter(r => (r.complianceScore || 0) >= 80).length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Sangat Baik (≥80%)</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {
                reports.filter(
                  r => (r.complianceScore || 0) >= 60 && (r.complianceScore || 0) < 80
                ).length
              }
            </div>
            <div className="text-xs text-slate-400 mt-1">Perlu Perbaikan (60-79%)</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {reports.filter(r => (r.complianceScore || 0) < 60 && r.complianceScore !== null && r.complianceScore !== undefined).length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Tidak Memenuhi (&lt;60%)</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-slate-400 font-medium">Gudang</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium hidden md:table-cell">
                    Inspektur
                  </th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium hidden md:table-cell">
                    Tanggal Selesai
                  </th>
                  <th className="px-4 py-3 text-center text-slate-400 font-medium">Skor</th>
                  <th className="px-4 py-3 text-center text-slate-400 font-medium hidden md:table-cell">
                    Temuan
                  </th>
                  <th className="px-4 py-3 text-center text-slate-400 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{r.warehouse.name}</p>
                      <p className="text-slate-500 text-xs">{r.warehouse.address}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 hidden md:table-cell">
                      {r.inspector.name}
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                      {r.completedAt
                        ? new Date(r.completedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.complianceScore !== null && r.complianceScore !== undefined ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-sm font-bold ${scoreColor(r.complianceScore)} ${scoreBg(r.complianceScore)}`}
                        >
                          {r.complianceScore}%
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 hidden md:table-cell">
                      {r._count?.findings || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/inspeksi/${r.id}`}
                        className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                      >
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-20 text-center text-slate-500">
                      Belum ada laporan inspeksi yang selesai
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
