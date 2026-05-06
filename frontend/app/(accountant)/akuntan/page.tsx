'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, ReceiptText, WalletCards, XCircle } from 'lucide-react';
import { formatRupiah } from '@/types/currency';
import { InstructorWithdrawalRequest } from '@/types';

interface AccountantStats {
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    cancelled_orders: number;
    revenue: number;
    platform_revenue?: number;
    platform_net_revenue?: number;
    instructor_payout?: number;
    affiliate_commission_total?: number;
    affiliate_summary?: {
        pending_applications: number;
        approved_affiliates: number;
    };
    withdrawal_summary?: {
        pending_count: number;
        approved_count: number;
        paid_count: number;
        pending_amount: number;
        approved_amount: number;
        paid_amount: number;
    };
    recent_orders: {
        id: number;
        user: string;
        course: string;
        amount: string;
        original_amount?: string;
        referral_discount_amount?: string;
        referral_code_snapshot?: string;
        affiliate_user?: string;
        platform_fee_amount?: string;
        platform_net_amount?: string;
        instructor_earning_amount?: string;
        affiliate_commission_amount?: string;
        status: string;
        created_at: string;
    }[];
    recent_withdrawals?: InstructorWithdrawalRequest[];
}

const STATUS_MAP: Record<string, string> = {
    Completed: 'bg-emerald-100 text-emerald-700',
    Pending: 'bg-amber-100 text-amber-700',
    Cancelled: 'bg-rose-100 text-rose-700',
    Failed: 'bg-slate-200 text-slate-700',
};

export default function AccountantDashboard() {
    const [stats, setStats] = useState<AccountantStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/accountant/stats/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    setStats(await res.json());
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statCards = stats ? [
        { label: 'Total Transaksi', value: stats.total_orders.toLocaleString('id-ID'), icon: ReceiptText, color: 'bg-emerald-100 text-emerald-700' },
        { label: 'Tertunda', value: stats.pending_orders.toLocaleString('id-ID'), icon: Clock3, color: 'bg-amber-100 text-amber-700' },
        { label: 'Selesai', value: stats.completed_orders.toLocaleString('id-ID'), icon: CheckCircle2, color: 'bg-blue-100 text-blue-700' },
        { label: 'Net Platform', value: `Rp ${((stats.platform_net_revenue ?? stats.platform_revenue ?? stats.revenue * 0.1) / 1_000_000).toFixed(1)} Jt`, icon: WalletCards, color: 'bg-slate-100 text-slate-700' },
    ] : [];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Dashboard Akuntan</h1>
                    <p className="text-emerald-50 max-w-2xl">
                        Seluruh pengelolaan transaksi Akademiso kini terpusat di role akuntan, termasuk pemantauan order, status pembayaran, dan ringkasan pendapatan.
                    </p>
                    <div className="flex gap-3 mt-5 flex-wrap">
                        <Link href="/akuntan/transaksi" className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-emerald-50">
                            Buka Transaksi <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link href="/akuntan/pencairan" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">
                            Review Pencairan <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
                <div className="absolute right-0 top-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {loading
                    ? [1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
                    ))
                    : statCards.map((card) => (
                        <div key={card.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${card.color}`}>
                                <card.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                                <h3 className="text-2xl font-extrabold text-slate-900">{card.value}</h3>
                            </div>
                        </div>
                    ))}
            </div>

            <div className="grid md:grid-cols-3 gap-5">
                {stats && [
                    { label: 'Transaksi Dibatalkan', value: stats.cancelled_orders, icon: XCircle, color: 'text-rose-600 bg-rose-50' },
                    { label: 'Pencairan Pending', value: stats.withdrawal_summary?.pending_count ?? 0, icon: Clock3, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Affiliate Pending', value: stats.affiliate_summary?.pending_applications ?? 0, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                ].map((item) => (
                    <div key={item.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium mb-0.5">{item.label}</p>
                            <p className="text-2xl font-extrabold text-slate-900">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900">Pencairan Terbaru</h2>
                        <p className="text-sm text-slate-500">Pengajuan fee trainer yang baru masuk ke akunting.</p>
                    </div>
                    <Link href="/akuntan/pencairan" className="text-sm font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1">
                        Buka Halaman Pencairan <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="px-6 py-8 text-center text-slate-400">Memuat...</div>
                    ) : stats?.recent_withdrawals?.length ? (
                        stats.recent_withdrawals.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-4 px-6 py-4">
                                <div>
                                    <p className="font-semibold text-slate-900">{item.instructor_name}</p>
                                    <p className="text-sm text-slate-500">{item.requested_by_name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-900">{formatRupiah(item.amount)}</p>
                                    <p className="text-xs text-slate-400">{item.status_label || item.status}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-8 text-center text-slate-400">Belum ada pengajuan pencairan.</div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900">Transaksi Terbaru</h2>
                        <p className="text-sm text-slate-500">Ringkasan transaksi yang paling baru masuk ke sistem.</p>
                    </div>
                    <Link href="/akuntan/transaksi" className="text-sm font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1">
                        Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 text-left">ID</th>
                                <th className="px-6 py-3 text-left">Pengguna</th>
                                <th className="px-6 py-3 text-left">Kursus</th>
                                <th className="px-6 py-3 text-right">Jumlah</th>
                                <th className="px-6 py-3 text-right">Komisi</th>
                                <th className="px-6 py-3 text-right">Komisi Affiliate</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Memuat...</td></tr>
                            ) : stats?.recent_orders?.length ? (
                                stats.recent_orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-3 text-xs text-slate-500 font-mono">#{order.id}</td>
                                        <td className="px-6 py-3 text-sm font-semibold text-slate-800">{order.user}</td>
                                        <td className="px-6 py-3 text-sm text-slate-600 max-w-[240px] truncate">{order.course}</td>
                                        <td className="px-6 py-3 text-sm font-bold text-slate-900 text-right">{formatRupiah(order.amount)}</td>
                                        <td className="px-6 py-3 text-sm font-bold text-teal-700 text-right">
                                            {formatRupiah(order.platform_net_amount ?? order.platform_fee_amount ?? Math.round(Number(order.amount) * 0.1))}
                                        </td>
                                        <td className="px-6 py-3 text-sm font-bold text-amber-700 text-right">{formatRupiah(order.affiliate_commission_amount ?? 0)}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_MAP[order.status] || 'bg-slate-100 text-slate-700'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-400 text-right">{order.created_at}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Belum ada transaksi.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
