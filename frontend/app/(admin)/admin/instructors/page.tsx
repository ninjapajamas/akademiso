'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit3, Trash2, KeyRound, LogIn, X, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';

interface InstructorData {
    id: number;
    user: number | null;
    name: string;
    title: string;
    bio: string;
    photo: string | null;
}

type Modal =
    | null
    | { type: 'add' }
    | { type: 'edit'; instructor: InstructorData }
    | { type: 'reset-pw'; instructor: InstructorData }
    | { type: 'hijack'; instructor: InstructorData };

export default function InstructorsPage() {
    const router = useRouter();
    const [instructors, setInstructors] = useState<InstructorData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState<Modal>(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Form states
    const [formData, setFormData] = useState({ name: '', title: '', bio: '' });
    const [newPassword, setNewPassword] = useState('');
    const [showPw, setShowPw] = useState(false);

    const token = () => localStorage.getItem('access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchInstructors = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/instructors/`, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInstructors(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Hapus instruktur "${name}"? Tindakan tidak bisa dibatalkan.`)) return;

        try {
            const res = await fetch(`${apiUrl}/api/instructors/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token()}` }
            });

            if (res.ok) {
                showToast(`Instruktur ${name} dihapus.`);
                fetchInstructors();
            } else {
                showToast('Gagal menghapus instruktur.', 'error');
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modal) return;
        setSaving(true);

        try {
            let res;
            if (modal.type === 'add') {
                res = await fetch(`${apiUrl}/api/instructors/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
                    body: JSON.stringify(formData),
                });
            } else if (modal.type === 'edit') {
                res = await fetch(`${apiUrl}/api/instructors/${modal.instructor.id}/`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
                    body: JSON.stringify(formData),
                });
            } else if (modal.type === 'reset-pw') {
                if (!modal.instructor.user) throw new Error('Instruktur tidak memiliki user terkait.');
                res = await fetch(`${apiUrl}/api/users/${modal.instructor.user}/reset-password/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
                    body: JSON.stringify({ new_password: newPassword }),
                });
            }

            if (res?.ok) {
                showToast('Berhasil disimpan.');
                setModal(null);
                fetchInstructors();
            } else {
                const err = await res?.json();
                showToast(JSON.stringify(err) || 'Terjadi kesalahan.', 'error');
            }
        } catch (err: any) {
            showToast(err.message || 'Terjadi kesalahan.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleHijack = async () => {
        if (modal?.type !== 'hijack') return;
        if (!modal.instructor.user) {
            showToast('Instruktur tidak memiliki user terkait.', 'error');
            return;
        }
        setSaving(true);
        const res = await fetch(`${apiUrl}/api/users/${modal.instructor.user}/impersonate/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
        });
        setSaving(false);
        if (res.ok) {
            const data = await res.json();
            const originalAccess = localStorage.getItem('access_token');
            const originalRefresh = localStorage.getItem('refresh_token');
            if (originalAccess) localStorage.setItem('admin_original_access', originalAccess);
            if (originalRefresh) localStorage.setItem('admin_original_refresh', originalRefresh);
            localStorage.setItem('admin_hijack_user', data.username);
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            setModal(null);
            showToast(`🔑 Login sebagai ${data.username}. Mengalihkan...`);
            setTimeout(() => router.push('/dashboard'), 1500);
        } else {
            const err = await res.json();
            showToast(err.error || 'Gagal melakukan impersonasi.', 'error');
        }
    };

    useEffect(() => { fetchInstructors(); }, []);

    const filtered = instructors.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.title.toLowerCase().includes(search.toLowerCase())
    );

    const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none';

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Instruktur</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{instructors.length} instruktur terdaftar.</p>
                </div>
                <button onClick={() => { setFormData({ name: '', title: '', bio: '' }); setModal({ type: 'add' }); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                    <Plus className="w-4 h-4" /> Tambah Instruktur
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cari nama atau gelar..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">
                        <tr>
                            <th className="px-5 py-3">Instruktur</th>
                            <th className="px-5 py-3">Gelar</th>
                            <th className="px-5 py-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-black">
                        {loading ? (
                            <tr><td colSpan={3} className="py-10 text-center text-gray-400">Memuat...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={3} className="py-10 text-center text-gray-400">Tidak ada instruktur ditemukan.</td></tr>
                        ) : filtered.map(i => (
                            <tr key={i.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {i.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">{i.name}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-600">{i.title}</td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => { setFormData({ name: i.name, title: i.title, bio: i.bio }); setModal({ type: 'edit', instructor: i }); }}
                                            title="Edit Data" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { setNewPassword(''); setModal({ type: 'reset-pw', instructor: i }); }}
                                            title="Reset Password" className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg">
                                            <KeyRound className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setModal({ type: 'hijack', instructor: i })}
                                            title="Login Sebagai" className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg">
                                            <LogIn className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(i.id, i.name)}
                                            title="Hapus" className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        {modal.type === 'add' || modal.type === 'edit' ? (
                            <form onSubmit={handleAction} className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-lg text-gray-900">{modal.type === 'add' ? 'Tambah Instruktur' : 'Edit Instruktur'}</h2>
                                    <button type="button" onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                                    <input required className={inputCls} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Gelar / Jabatan</label>
                                    <input required className={inputCls} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Bio</label>
                                    <textarea required className={inputCls + ' h-24'} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} /></div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">Batal</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                                </div>
                            </form>
                        ) : modal.type === 'reset-pw' ? (
                            <form onSubmit={handleAction} className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-lg text-gray-900">Reset Password</h2>
                                    <button type="button" onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700 flex gap-2">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    Password user terkait akan langsung diubah.
                                </div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Password Baru</label>
                                    <div className="relative">
                                        <input type={showPw ? 'text' : 'password'} required minLength={6} className={inputCls} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2 text-xs text-gray-400">{showPw ? 'Hide' : 'Show'}</button>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">Batal</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-bold">Reset Password</button>
                                </div>
                            </form>
                        ) : modal.type === 'hijack' && (
                            <div className="p-6 space-y-4 text-center">
                                <h2 className="font-bold text-lg text-gray-900">Login Sebagai Instruktur</h2>
                                <p className="text-sm text-gray-500 italic">"Anda akan masuk sebagai {modal.instructor.name}"</p>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">Batal</button>
                                    <button onClick={handleHijack} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold">{saving ? 'Redirecting...' : 'Confirm Login'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
