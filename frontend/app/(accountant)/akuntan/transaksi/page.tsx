'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, Filter, RefreshCw, Search, XCircle, type LucideIcon } from 'lucide-react';
import { formatRupiah } from '@/types/currency';

type OrderStatus = 'Pending' | 'Completed' | 'Cancelled' | 'Failed';

interface Order {
    id: number;
    user: string;
    course: string | number;
    course_title?: string;
    total_amount: string;
    platform_fee_amount?: string;
    instructor_earning_amount?: string;
    status: OrderStatus;
    created_at: string;
}

const STATUS_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Semua Status' },
    { value: 'Pending', label: 'Tertunda' },
    { value: 'Completed', label: 'Selesai' },
    { value: 'Cancelled', label: 'Dibatalkan' },
    { value: 'Failed', label: 'Gagal' },
];

const STATUS_MAP: Record<string, { label: string; cls: string; icon: LucideIcon }> = {
    Completed: { label: 'Selesai', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    Pending: { label: 'Tertunda', cls: 'bg-amber-100 text-amber-700', icon: Clock },
    Cancelled: { label: 'Dibatalkan', cls: 'bg-rose-100 text-rose-700', icon: XCircle },
    Failed: { label: 'Gagal', cls: 'bg-slate-200 text-slate-700', icon: XCircle },
};

export default function AccountantTransactionsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [updating, setUpdating] = useState<number | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${apiUrl}/api/orders/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setOrders(Array.isArray(data) ? data : data.results || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    const updateStatus = async (id: number, newStatus: Extract<OrderStatus, 'Completed' | 'Cancelled'>) => {
        setUpdating(id);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${apiUrl}/api/orders/${id}/`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                await fetchOrders();
            } else {
                alert('Gagal mengubah status transaksi.');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setUpdating(null);
        }
    };

    useEffect(() => {
        void fetchOrders();
    }, [fetchOrders]);

    const filtered = orders.filter((order) => {
        const query = search.toLowerCase();
        const courseName = order.course_title || String(order.course);
        const matchSearch =
            order.user?.toLowerCase().includes(query) ||
            courseName.toLowerCase().includes(query) ||
            String(order.id).includes(search);
        const matchStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const completedOrders = orders.filter((order) => order.status === 'Completed');
    const totalPlatformRevenue = completedOrders
        .reduce((sum, order) => sum + Number(order.platform_fee_amount ?? Math.round(Number(order.total_amount) * 0.1)), 0);
    const totalInstructorPayout = completedOrders
        .reduce((sum, order) => sum + Number(order.instructor_earning_amount ?? Math.round(Number(order.total_amount) * 0.9)), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen Transaksi</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Seluruh transaksi pembayaran kursus dikelola khusus oleh akuntan.</p>
                </div>
                <button
                    onClick={fetchOrders}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Transaksi', value: orders.length, cls: 'text-slate-900' },
                    { label: 'Selesai', value: orders.filter((order) => order.status === 'Completed').length, cls: 'text-emerald-600' },
                    { label: 'Komisi Platform', value: `Rp ${(totalPlatformRevenue / 1e6).toFixed(1)}Jt`, cls: 'text-teal-600' },
                    { label: 'Payout Instruktur', value: `Rp ${(totalInstructorPayout / 1e6).toFixed(1)}Jt`, cls: 'text-indigo-600' },
                ].map((item) => (
                    <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-xs text-slate-500 font-medium mb-1">{item.label}</p>
                        <p className={`text-2xl font-extrabold ${item.cls}`}>{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari user, kursus, atau ID transaksi..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-100 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as OrderStatus | 'all')}
                        className="border-none outline-none bg-transparent font-medium text-slate-700 cursor-pointer"
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3 text-left">ID</th>
                                <th className="px-5 py-3 text-left">Pengguna</th>
                                <th className="px-5 py-3 text-left">Kursus</th>
                                <th className="px-5 py-3 text-right">Jumlah</th>
                                <th className="px-5 py-3 text-right">Komisi 10%</th>
                                <th className="px-5 py-3 text-right">Untuk Instruktur</th>
                                <th className="px-5 py-3 text-center">Status</th>
                                <th className="px-5 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="py-10 text-center text-slate-400">Memuat...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8} className="py-10 text-center text-slate-400">Tidak ada transaksi yang cocok.</td></tr>
                            ) : filtered.map((order) => {
                                const status = STATUS_MAP[order.status] || { label: order.status, cls: 'bg-slate-100 text-slate-600', icon: null };
                                const Icon = status.icon;
                                const courseName = order.course_title || String(order.course);
                                const platformFee = order.platform_fee_amount ?? String(Math.round(Number(order.total_amount) * 0.1));
                                const instructorPayout = order.instructor_earning_amount ?? String(Number(order.total_amount) - Number(platformFee));
                                return (
                                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-5 py-3 text-sm font-mono text-slate-500">#{order.id}</td>
                                        <td className="px-5 py-3 font-semibold text-slate-900 text-sm">{order.user}</td>
                                        <td className="px-5 py-3 text-sm text-slate-600 max-w-[220px] truncate">{courseName}</td>
                                        <td className="px-5 py-3 text-sm font-bold text-slate-900 text-right">
                                            {formatRupiah(order.total_amount)}
                                        </td>
                                        <td className="px-5 py-3 text-sm font-bold text-teal-700 text-right">
                                            {formatRupiah(platformFee)}
                                        </td>
                                        <td className="px-5 py-3 text-sm font-bold text-indigo-700 text-right">
                                            {formatRupiah(instructorPayout)}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.cls}`}>
                                                {Icon && <Icon className="w-3 h-3" />} {status.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            {order.status === 'Pending' ? (
                                                <div className="flex gap-1.5 justify-center">
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'Completed')}
                                                        disabled={updating === order.id}
                                                        className="px-2.5 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg disabled:opacity-50 transition-colors"
                                                    >
                                                        Selesaikan
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'Cancelled')}
                                                        disabled={updating === order.id}
                                                        className="px-2.5 py-1 text-[10px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg disabled:opacity-50 transition-colors"
                                                    >
                                                        Batalkan
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">Tidak ada aksi</span>
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
