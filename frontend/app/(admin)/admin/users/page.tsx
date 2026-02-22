'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, UserPlus, Trash2, Shield, ShieldOff, X, CheckCircle, XCircle } from 'lucide-react';

interface UserData {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_staff: boolean;
    is_active: boolean;
    date_joined: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'staff' | 'regular'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', email: '', first_name: '', last_name: '', password: '', is_staff: false });
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState<number | null>(null);

    const token = () => localStorage.getItem('access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/users/`, { headers: { 'Authorization': `Bearer ${token()}` } });
            if (res.ok) {
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : data.results || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus user ini? Tindakan tidak bisa dibatalkan.')) return;
        try {
            const res = await fetch(`${apiUrl}/api/users/${id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token()}` } });
            if (res.ok) fetchUsers();
            else alert('Gagal menghapus user.');
        } catch (e) { console.error(e); }
    };

    const toggleStaff = async (user: UserData) => {
        setToggling(user.id);
        try {
            const res = await fetch(`${apiUrl}/api/users/${user.id}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_staff: !user.is_staff }),
            });
            if (res.ok) fetchUsers();
            else alert('Gagal mengubah role user.');
        } catch (e) { console.error(e); }
        finally { setToggling(null); }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${apiUrl}/api/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
                body: JSON.stringify({ ...newUser, password_confirm: newUser.password }),
            });
            if (res.ok) {
                setShowAddModal(false);
                setNewUser({ username: '', email: '', first_name: '', last_name: '', password: '', is_staff: false });
                fetchUsers();
            } else {
                const err = await res.json();
                alert(JSON.stringify(err));
            }
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const filtered = users.filter(u => {
        const matchSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'all' ||
            (roleFilter === 'staff' && u.is_staff) ||
            (roleFilter === 'regular' && !u.is_staff);
        return matchSearch && matchRole;
    });

    const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{users.length} pengguna terdaftar.</p>
                </div>
                <button onClick={() => setShowAddModal(true)}
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
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)}
                        className="border-none outline-none bg-transparent font-medium text-gray-700 cursor-pointer">
                        <option value="all">Semua Role</option>
                        <option value="staff">Staff/Admin</option>
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
                                <th className="px-5 py-3 text-center">Toggle Staff</th>
                                <th className="px-5 py-3 text-center">Bergabung</th>
                                <th className="px-5 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={7} className="py-10 text-center text-gray-400">Memuat...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="py-10 text-center text-gray-400">Tidak ada user yang cocok.</td></tr>
                            ) : filtered.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                                {u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{u.username}</p>
                                                <p className="text-xs text-gray-500">{u.first_name} {u.last_name}</p>
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
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${u.is_staff ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            {u.is_staff ? 'Staff' : 'Regular'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <button
                                            onClick={() => toggleStaff(u)}
                                            disabled={toggling === u.id}
                                            title={u.is_staff ? 'Revoke Staff' : 'Jadikan Staff'}
                                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${u.is_staff ? 'text-purple-600 hover:bg-purple-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                        >
                                            {u.is_staff ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3 text-center text-xs text-gray-400">
                                        {new Date(u.date_joined).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button onClick={() => handleDelete(u.id)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-lg text-gray-900">Tambah User Baru</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Depan</label>
                                    <input required className={inputCls} value={newUser.first_name} onChange={e => setNewUser(u => ({ ...u, first_name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Belakang</label>
                                    <input required className={inputCls} value={newUser.last_name} onChange={e => setNewUser(u => ({ ...u, last_name: e.target.value }))} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                                <input required className={inputCls} value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                                <input required type="email" className={inputCls} value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
                                <input required type="password" className={inputCls} value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                                <input type="checkbox" checked={newUser.is_staff} onChange={e => setNewUser(u => ({ ...u, is_staff: e.target.checked }))} className="rounded" />
                                Jadikan Staff/Admin
                            </label>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                                    Batal
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
