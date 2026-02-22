'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, BookOpen, GraduationCap, DollarSign, TrendingUp, ShoppingBag, Clock, CheckCircle, ArrowRight } from 'lucide-react';

interface Stats {
    total_users: number;
    total_courses: number;
    total_instructors: number;
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    revenue: number;
    recent_orders: { id: number; user: string; course: string; amount: string; status: string; created_at: string }[];
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    Completed: { label: 'Selesai', cls: 'bg-green-100 text-green-700' },
    Pending: { label: 'Tertunda', cls: 'bg-yellow-100 text-yellow-700' },
    Cancelled: { label: 'Dibatalkan', cls: 'bg-red-100 text-red-700' },
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/stats/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setStats(await res.json());
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchStats();
    }, []);

    const fmt = (n: number) => n.toLocaleString('id-ID');
    const fmtRp = (n: number) => `Rp ${(n / 1_000_000).toFixed(1)} Jt`;

    const statCards = stats ? [
        { label: 'Total Pengguna', value: fmt(stats.total_users), icon: Users, color: 'bg-blue-100 text-blue-600', href: '/admin/users' },
        { label: 'Total Kursus', value: fmt(stats.total_courses), icon: BookOpen, color: 'bg-purple-100 text-purple-600', href: '/admin/courses' },
        { label: 'Total Instruktur', value: fmt(stats.total_instructors), icon: GraduationCap, color: 'bg-indigo-100 text-indigo-600', href: '/admin/instructors' },
        { label: 'Total Pendapatan', value: fmtRp(stats.revenue), icon: DollarSign, color: 'bg-green-100 text-green-600', href: '/admin/orders' },
    ] : [];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Dashboard Admin</h1>
                    <p className="text-blue-100 text-base leading-relaxed max-w-lg">
                        Selamat datang di panel administrasi Akademiso. Kelola kursus, instruktur, dan peserta dari sini.
                    </p>
                    <div className="flex gap-3 mt-5 flex-wrap">
                        <Link href="/admin/courses/new" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-blue-50">
                            + Tambah Kursus
                        </Link>
                        <Link href="/admin/orders" className="inline-flex items-center gap-2 bg-white/20 text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/30 border border-white/30">
                            Kelola Orders <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
                <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {loading ? (
                    [1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)
                ) : statCards.map((s, i) => (
                    <Link key={i} href={s.href} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 hover:shadow-md hover:border-blue-200 transition-all group">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${s.color}`}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                            <h3 className="text-2xl font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors">{s.value}</h3>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Orders stats + recent orders */}
            <div className="grid md:grid-cols-3 gap-5">
                {/* Orders mini-stats */}
                {stats && [
                    { label: 'Total Orders', value: stats.total_orders, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Selesai', value: stats.completed_orders, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
                    { label: 'Tertunda', value: stats.pending_orders, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium mb-0.5">{s.label}</p>
                            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Orders table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900">Order Terbaru</h2>
                    <Link href="/admin/orders" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 text-left">ID</th>
                                <th className="px-6 py-3 text-left">Pengguna</th>
                                <th className="px-6 py-3 text-left">Kursus</th>
                                <th className="px-6 py-3 text-right">Jumlah</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Memuat...</td></tr>
                            ) : stats?.recent_orders?.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Belum ada orders.</td></tr>
                            ) : stats?.recent_orders?.map(o => {
                                const s = STATUS_MAP[o.status] || { label: o.status, cls: 'bg-gray-100 text-gray-600' };
                                return (
                                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-3 text-xs text-gray-500 font-mono">#{o.id}</td>
                                        <td className="px-6 py-3 text-sm font-semibold text-gray-800">{o.user}</td>
                                        <td className="px-6 py-3 text-sm text-gray-600 max-w-[200px] truncate">{o.course}</td>
                                        <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">Rp {Number(o.amount).toLocaleString('id-ID')}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                                        </td>
                                        <td className="px-6 py-3 text-xs text-gray-400 text-right">{o.created_at}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { href: '/admin/courses', emoji: '📚', label: 'Kursus', desc: 'Kelola program' },
                    { href: '/admin/instructors', emoji: '👨‍🏫', label: 'Instruktur', desc: 'Kelola pengajar' },
                    { href: '/admin/users', emoji: '👥', label: 'Pengguna', desc: 'Kelola akun' },
                    { href: '/admin/orders', emoji: '🧾', label: 'Orders', desc: 'Kelola transaksi' },
                ].map(item => (
                    <Link key={item.href} href={item.href}
                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                        <div className="text-2xl mb-2">{item.emoji}</div>
                        <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
