'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

type OrderStatus = 'Pending' | 'Completed' | 'Cancelled';

interface Order {
    id: number;
    user: string;
    course: string;
    total_amount: string;
    status: OrderStatus;
    created_at: string;
}

const STATUS_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Semua Status' },
    { value: 'Pending', label: 'Tertunda' },
    { value: 'Completed', label: 'Selesai' },
    { value: 'Cancelled', label: 'Dibatalkan' },
];

const STATUS_MAP: Record<string, { label: string; cls: string; icon: any }> = {
    Completed: { label: 'Selesai', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
    Pending: { label: 'Tertunda', cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
    Cancelled: { label: 'Dibatalkan', cls: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [updating, setUpdating] = useState<number | null>(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/orders/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // API returns array or paginated {results:[]}
                setOrders(Array.isArray(data) ? data : data.results || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const updateStatus = async (id: number, newStatus: OrderStatus) => {
        setUpdating(id);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/orders/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) await fetchOrders();
            else alert('Gagal mengubah status order.');
        } catch (e) { console.error(e); }
        finally { setUpdating(null); }
    };

    useEffect(() => { fetchOrders(); }, []);

    const filtered = orders.filter(o => {
        const matchSearch = o.user?.toLowerCase().includes(search.toLowerCase()) ||
            o.course?.toLowerCase().includes(search.toLowerCase()) ||
            String(o.id).includes(search);
        const matchStatus = statusFilter === 'all' || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalRevenue = orders
        .filter(o => o.status === 'Completed')
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Orders</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola semua transaksi pendaftaran kursus.</p>
                </div>
                <button onClick={fetchOrders} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Orders', value: orders.length, cls: 'text-gray-900' },
                    { label: 'Selesai', value: orders.filter(o => o.status === 'Completed').length, cls: 'text-green-600' },
                    { label: 'Tertunda', value: orders.filter(o => o.status === 'Pending').length, cls: 'text-yellow-600' },
                    { label: 'Pendapatan', value: `Rp ${(totalRevenue / 1e6).toFixed(1)}Jt`, cls: 'text-blue-600' },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                        <p className="text-xs text-gray-500 font-medium mb-1">{s.label}</p>
                        <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Cari user, kursus, atau ID order..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
                        className="border-none outline-none bg-transparent font-medium text-gray-700 cursor-pointer">
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3 text-left">ID</th>
                                <th className="px-5 py-3 text-left">Pengguna</th>
                                <th className="px-5 py-3 text-left">Kursus</th>
                                <th className="px-5 py-3 text-right">Jumlah</th>
                                <th className="px-5 py-3 text-center">Status</th>
                                <th className="px-5 py-3 text-center">Ubah Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={6} className="py-10 text-center text-gray-400">Memuat...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="py-10 text-center text-gray-400">Tidak ada order yang cocok.</td></tr>
                            ) : filtered.map(o => {
                                const s = STATUS_MAP[o.status] || { label: o.status, cls: 'bg-gray-100 text-gray-600', icon: null };
                                const Icon = s.icon;
                                return (
                                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-3 text-sm font-mono text-gray-500">#{o.id}</td>
                                        <td className="px-5 py-3 font-semibold text-gray-900 text-sm">{o.user}</td>
                                        <td className="px-5 py-3 text-sm text-gray-600 max-w-[220px] truncate">{o.course}</td>
                                        <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">
                                            Rp {Number(o.total_amount).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>
                                                {Icon && <Icon className="w-3 h-3" />} {s.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            {o.status !== 'Completed' && o.status !== 'Cancelled' ? (
                                                <div className="flex gap-1.5 justify-center">
                                                    <button
                                                        onClick={() => updateStatus(o.id, 'Completed')}
                                                        disabled={updating === o.id}
                                                        className="px-2.5 py-1 text-[10px] font-bold bg-green-100 text-green-700 hover:bg-green-200 rounded-lg disabled:opacity-50 transition-colors"
                                                    >
                                                        ✓ Selesai
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(o.id, 'Cancelled')}
                                                        disabled={updating === o.id}
                                                        className="px-2.5 py-1 text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 rounded-lg disabled:opacity-50 transition-colors"
                                                    >
                                                        ✕ Batal
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
