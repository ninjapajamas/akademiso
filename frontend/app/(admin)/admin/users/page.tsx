'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getProfileDisplayName, splitFullName } from '@/utils/profile';
import {
    Search, Filter, UserPlus, Trash2,
    X, CheckCircle, XCircle, KeyRound, Edit3, LogIn, AlertTriangle
} from 'lucide-react';

type StaffRole = 'admin' | 'akuntan' | 'regular';

interface UserData {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_staff: boolean;
    is_active: boolean;
    date_joined: string;
    role: 'admin' | 'akuntan' | 'instructor' | 'student';
    staff_role?: 'admin' | 'akuntan' | null;
    is_instructor?: boolean;
}

type Modal =
    | null
    | { type: 'add' }
    | { type: 'edit'; user: UserData }
    | { type: 'reset-pw'; user: UserData }
    | { type: 'hijack'; user: UserData };

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | StaffRole>('all');
    const [modal, setModal] = useState<Modal>(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Form states
    const [newUser, setNewUser] = useState({ username: '', email: '', full_name: '', password: '', role: 'regular' as StaffRole });
    const [editForm, setEditForm] = useState({ full_name: '', email: '', role: 'regular' as StaffRole, is_active: true });
    const [newPassword, setNewPassword] = useState('');
    const [showPw, setShowPw] = useState(false);

    const token = () => localStorage.getItem('access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/users/`, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : data.results || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [apiUrl]);

    const handleDelete = async (u: UserData) => {
        if (!confirm(`Hapus user "${u.username}"? Tindakan tidak bisa dibatalkan.`)) return;
        const res = await fetch(`${apiUrl}/api/users/${u.id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        if (res.ok) { showToast(`User ${u.username} dihapus.`); fetchUsers(); }
        else showToast('Gagal menghapus user.', 'error');
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { firstName, lastName } = splitFullName(newUser.full_name);
        const res = await fetch(`${apiUrl}/api/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
            body: JSON.stringify({
                username: newUser.username,
                email: newUser.email,
                first_name: firstName,
                last_name: lastName,
                password: newUser.password,
                password_confirm: newUser.password,
                is_staff: newUser.role !== 'regular',
                staff_role: newUser.role === 'regular' ? null : newUser.role,
            }),
        });
        setSaving(false);
        if (res.ok) {
            setModal(null);
            setNewUser({ username: '', email: '', full_name: '', password: '', role: 'regular' });
            showToast(`User ${newUser.username} berhasil dibuat.`);
            fetchUsers();
        } else {
            const err = await res.json();
            showToast(JSON.stringify(err), 'error');
        }
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (modal?.type !== 'edit') return;
        setSaving(true);
        const { firstName, lastName } = splitFullName(editForm.full_name);
        const res = await fetch(`${apiUrl}/api/users/${modal.user.id}/edit/`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: editForm.email,
                is_staff: editForm.role !== 'regular',
                staff_role: editForm.role === 'regular' ? null : editForm.role,
                is_active: editForm.is_active,
            }),
        });
        setSaving(false);
        if (res.ok) {
            setModal(null);
            showToast(`Data ${modal.user.username} berhasil diperbarui.`);
            fetchUsers();
        } else {
            const err = await res.json();
            showToast(err.error || 'Gagal mengubah data user.', 'error');
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (modal?.type !== 'reset-pw') return;
        if (newPassword.length < 6) { showToast('Password minimal 6 karakter.', 'error'); return; }
        setSaving(true);
        const res = await fetch(`${apiUrl}/api/users/${modal.user.id}/reset-password/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_password: newPassword }),
        });
        setSaving(false);
        if (res.ok) {
            setModal(null);
            setNewPassword('');
            showToast(`Password ${modal.user.username} berhasil direset.`);
        } else {
            const err = await res.json();
            showToast(err.error || 'Gagal mereset password.', 'error');
        }
    };

    const handleHijack = async () => {
        if (modal?.type !== 'hijack') return;
        setSaving(true);
        const res = await fetch(`${apiUrl}/api/users/${modal.user.id}/impersonate/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
        });
        setSaving(false);
        if (res.ok) {
            const data = await res.json();
            // Save the original admin token to restore later
            const originalAccess = localStorage.getItem('access_token');
            const originalRefresh = localStorage.getItem('refresh_token');
            if (originalAccess) localStorage.setItem('admin_original_access', originalAccess);
            if (originalRefresh) localStorage.setItem('admin_original_refresh', originalRefresh);
            localStorage.setItem('admin_hijack_user', modal.user.username);
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

    const openEdit = (u: UserData) => {
        const role: StaffRole = u.role === 'admin' || u.role === 'akuntan' ? u.role : 'regular';
        setEditForm({ full_name: getProfileDisplayName(u), email: u.email, role, is_active: u.is_active });
        setModal({ type: 'edit', user: u });
    };

    useEffect(() => { void fetchUsers(); }, [fetchUsers]);

    const filtered = users.filter(u => {
        const matchSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            getProfileDisplayName(u).toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'all' || u.role === roleFilter || (roleFilter === 'regular' && !u.is_staff);
        return matchSearch && matchRole;
    });

    const getRoleLabel = (user: UserData) => {
        if (user.role === 'admin') return { label: 'Admin', cls: 'bg-violet-100 text-violet-700 border-violet-200' };
        if (user.role === 'akuntan') return { label: 'Akuntan', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        if (user.role === 'instructor') return { label: 'Instruktur', cls: 'bg-sky-100 text-sky-700 border-sky-200' };
        return { label: 'Regular', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
    };

    const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none';

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{users.length} pengguna terdaftar.</p>
                </div>
                <button onClick={() => setModal({ type: 'add' })}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                    <UserPlus className="w-4 h-4" /> Tambah User
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Cari username, email, atau nama..."
                        className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as 'all' | StaffRole)}
                        className="border-none outline-none bg-transparent font-medium text-gray-900 cursor-pointer">
                        <option value="all">Semua Role</option>
                        <option value="admin">Admin</option>
                        <option value="akuntan">Akuntan</option>
                        <option value="regular">Regular</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3 text-left">Pengguna</th>
                                <th className="px-5 py-3 text-left">Email</th>
                                <th className="px-5 py-3 text-center">Status</th>
                                <th className="px-5 py-3 text-center">Role</th>
                                <th className="px-5 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="py-10 text-center text-gray-400">Memuat...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="py-10 text-center text-gray-400">Tidak ada user yang cocok.</td></tr>
                            ) : filtered.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                                {u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{u.username}</p>
                                                <p className="text-xs text-gray-500">{getProfileDisplayName(u) || '-'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                                    <td className="px-5 py-3 text-center">
                                        {u.is_active
                                            ? <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Aktif</span>
                                            : <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Non-aktif</span>
                                        }
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleLabel(u).cls}`}>
                                            {getRoleLabel(u).label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-center gap-1">
                                            {/* Edit */}
                                            <button onClick={() => openEdit(u)} title="Edit Data"
                                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            {/* Reset Password */}
                                            <button onClick={() => { setNewPassword(''); setModal({ type: 'reset-pw', user: u }); }} title="Reset Password"
                                                className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors">
                                                <KeyRound className="w-4 h-4" />
                                            </button>
                                            {/* Hijack */}
                                            <button onClick={() => setModal({ type: 'hijack', user: u })} title="Login Sebagai User Ini"
                                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <LogIn className="w-4 h-4" />
                                            </button>
                                            {/* Delete */}
                                            <button onClick={() => handleDelete(u)} title="Hapus User"
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Modals ─────────────────────────────────────────────── */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

                        {/* ADD USER */}
                        {modal.type === 'add' && (
                            <form onSubmit={handleAddUser} className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-lg text-gray-900">Tambah User Baru</h2>
                                    <button type="button" onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                                    <input required className={inputCls} value={newUser.full_name} onChange={e => setNewUser(u => ({ ...u, full_name: e.target.value }))} placeholder="Nama lengkap" /></div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                                    <input required className={inputCls} value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} /></div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                                    <input required type="email" className={inputCls} value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} /></div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
                                    <input required type="password" className={inputCls} value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} /></div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                                    <select className={inputCls} value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value as StaffRole }))}>
                                        <option value="regular">Regular</option>
                                        <option value="admin">Admin</option>
                                        <option value="akuntan">Akuntan</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Batal</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                                </div>
                            </form>
                        )}

                        {/* EDIT USER */}
                        {modal.type === 'edit' && (
                            <form onSubmit={handleEditUser} className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="font-bold text-lg text-gray-900">Edit User</h2>
                                        <p className="text-xs text-gray-500">@{modal.user.username}</p>
                                    </div>
                                    <button type="button" onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                                    <input className={inputCls} value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nama lengkap" /></div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                                    <input type="email" className={inputCls} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                                        <select className={inputCls} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as StaffRole }))}>
                                            <option value="regular">Regular</option>
                                            <option value="admin">Admin</option>
                                            <option value="akuntan">Akuntan</option>
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                                        <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                                        Aktif
                                    </label>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Batal</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                                </div>
                            </form>
                        )}

                        {/* RESET PASSWORD */}
                        {modal.type === 'reset-pw' && (
                            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="font-bold text-lg text-gray-900">Reset Password</h2>
                                        <p className="text-xs text-gray-500">@{modal.user.username}</p>
                                    </div>
                                    <button type="button" onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex gap-2 text-xs text-yellow-700">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    Password lama akan langsung diganti. User perlu login ulang.
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Password Baru</label>
                                    <div className="relative">
                                        <input type={showPw ? 'text' : 'password'} required minLength={6}
                                            className={inputCls + ' pr-20'} value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="Minimal 6 karakter" />
                                        <button type="button" onClick={() => setShowPw(v => !v)}
                                            className="absolute right-3 top-2 text-xs text-gray-400 hover:text-gray-700">
                                            {showPw ? 'Sembunyikan' : 'Tampilkan'}
                                        </button>
                                    </div>
                                    {/* Strength bar */}
                                    {newPassword && (
                                        <div className="flex gap-1 mt-2">
                                            {[6, 8, 12].map((min, i) => (
                                                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${newPassword.length >= min ? ['bg-red-400', 'bg-yellow-400', 'bg-green-500'][i] : 'bg-gray-200'}`} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Batal</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 disabled:opacity-50">{saving ? 'Menyimpan...' : '🔑 Reset Password'}</button>
                                </div>
                            </form>
                        )}

                        {/* HIJACK / IMPERSONATE */}
                        {modal.type === 'hijack' && (
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-lg text-gray-900">Login Sebagai User</h2>
                                    <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
                                        {modal.user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <p className="font-bold text-gray-900">@{modal.user.username}</p>
                                    <p className="text-xs text-gray-500">{modal.user.email}</p>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex gap-2 text-xs text-orange-700">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>Anda akan login sebagai user ini. Session admin Anda disimpan dan bisa dipulihkan dari dashboard.</span>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Batal</button>
                                    <button onClick={handleHijack} disabled={saving}
                                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? 'Mengalihkan...' : <><LogIn className="w-4 h-4" /> Login Sebagai @{modal.user.username}</>}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}
