'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { RefreshCw, ReceiptText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type OrderRow = {
    id: number;
    status: string;
    total_amount: string;
    created_at: string;
    user?: string;
    course_title?: string;
    offer_type?: string;
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${getClientApiBaseUrl()}/api/orders/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await response.json();
            setOrders(Array.isArray(payload) ? payload : payload.results || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchOrders();
    }, [fetchOrders]);

    const money = (value: string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-gray-900">Transaksi</h1><p className="mt-1 text-sm text-gray-500">Pantau transaksi seluruh peserta dan status pembayaran.</p></div>
                <button onClick={() => void fetchOrders()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700"><RefreshCw className="h-4 w-4" />Refresh</button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                <table className="min-w-[850px] w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500"><tr><th className="p-4">ID</th><th className="p-4">Peserta</th><th className="p-4">Pelatihan</th><th className="p-4">Tipe</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4">Tanggal</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && <tr><td colSpan={7} className="p-8 text-center text-gray-500">Memuat transaksi...</td></tr>}
                        {!loading && orders.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-gray-500"><ReceiptText className="mx-auto mb-2 h-8 w-8 text-gray-300" />Belum ada transaksi.</td></tr>}
                        {orders.map(order => {
                            return <tr key={order.id}><td className="p-4 font-bold text-gray-900">#{order.id}</td><td className="p-4"><p className="font-semibold text-gray-900">{order.user || '-'}</p></td><td className="p-4 text-gray-700">{order.course_title || '-'}</td><td className="p-4 uppercase text-gray-500">{order.offer_type || '-'}</td><td className="p-4 font-bold text-gray-900">{money(order.total_amount)}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : order.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{order.status}</span></td><td className="p-4 text-gray-500">{new Date(order.created_at).toLocaleString('id-ID')}</td></tr>;
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
