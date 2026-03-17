'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: string;
  isActive: boolean;
}

export default function PenggunaPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'inspektur',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    api
      .get('/users')
      .then(r => setUsers(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await api.post('/users', form);
      setShowForm(false);
      setForm({ username: '', password: '', name: '', email: '', role: 'inspektur' });
      fetchUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setFormError(axiosErr.response?.data?.message || 'Terjadi kesalahan');
    }
    setFormLoading(false);
  }

  const fields: { key: keyof typeof form; label: string; required?: boolean }[] = [
    { key: 'name', label: 'Nama Lengkap', required: true },
    { key: 'username', label: 'Username', required: true },
    { key: 'password', label: 'Password', required: true },
    { key: 'email', label: 'Email (opsional)' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Manajemen Pengguna</h2>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} pengguna terdaftar</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
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
          Tambah Pengguna
        </button>
      </div>

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
                  <th className="px-4 py-3 text-left text-slate-400 font-medium">Nama</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium">Username</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium">Role</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {u.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-white font-medium">{u.name}</p>
                          {u.email && <p className="text-slate-500 text-xs">{u.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{u.username}</td>
                    <td className="px-4 py-3">
                      <span
                        className={u.role === 'admin' ? 'badge-warning' : 'badge-info'}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.isActive ? 'badge-success' : 'badge-neutral'}>
                        {u.isActive ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-20 text-center text-slate-500">
                      Belum ada pengguna terdaftar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Tambah Pengguna</h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormError('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="block text-sm text-slate-300 mb-1">{f.label}</label>
                  <input
                    type={f.key === 'password' ? 'password' : f.key === 'email' ? 'email' : 'text'}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="input-field"
                    required={f.required}
                    autoComplete={f.key === 'password' ? 'new-password' : undefined}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="input-field"
                >
                  <option value="inspektur">Inspektur</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button type="submit" disabled={formLoading} className="btn-primary flex-1">
                  {formLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
