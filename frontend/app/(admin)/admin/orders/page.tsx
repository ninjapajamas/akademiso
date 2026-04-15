'use client';

import Link from 'next/link';
import { ArrowRight, ReceiptText } from 'lucide-react';

export default function AdminOrdersMovedPage() {
    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
                    <ReceiptText className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Menu transaksi sudah dipindahkan</h1>
                <p className="mt-3 text-slate-600 leading-relaxed">
                    Pengelolaan order, pembayaran, dan transaksi uang tidak lagi berada di portal admin.
                    Seluruh fitur tersebut sekarang khusus ditangani oleh role <span className="font-bold">akuntan</span>.
                </p>
                <div className="mt-6">
                    <Link href="/admin" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">
                        Kembali ke Dashboard Admin <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
