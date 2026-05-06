'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { clearStoredAuth } from '@/utils/auth';
import { getClientApiBaseUrl } from '@/utils/api';

export default function AccessClaimContent({ token }: { token: string }) {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'error'>('loading');
    const [message, setMessage] = useState('Sedang menyiapkan akses Anda ke Akademiso...');

    useEffect(() => {
        const claimAccess = async () => {
            try {
                clearStoredAuth();
                const apiUrl = getClientApiBaseUrl();
                const res = await fetch(`${apiUrl}/api/student-access-links/${token}/claim/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    setStatus('error');
                    setMessage(
                        data?.error ||
                        'Link akses ini sudah tidak dapat dipakai. Silakan hubungi admin atau tim Akademiso.'
                    );
                    return;
                }

                localStorage.setItem('access_token', data.access);
                localStorage.setItem('refresh_token', data.refresh);
                window.dispatchEvent(new Event('auth-change'));
                router.replace(data.redirect_to || '/dashboard/settings?welcome=1&claimed=1');
            } catch (error) {
                console.error(error);
                setStatus('error');
                setMessage('Terjadi kendala koneksi saat membuat akun student otomatis.');
            }
        };

        void claimAccess();
    }, [router, token]);

    return (
        <div className="min-h-[70vh] bg-slate-50 px-4 py-10">
            <div className="mx-auto max-w-xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl shadow-gray-200/50">
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
                    status === 'loading' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                }`}>
                    {status === 'loading' ? <Loader2 className="h-7 w-7 animate-spin" /> : <AlertCircle className="h-7 w-7" />}
                </div>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Akses Student Akademiso
                </div>

                <h1 className="mt-4 text-2xl font-bold text-gray-900">
                    {status === 'loading' ? 'Membuat Akun Anda...' : 'Link Tidak Bisa Dipakai'}
                </h1>
                <p className="mt-3 text-sm leading-7 text-gray-600">{message}</p>

                {status === 'error' && (
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link
                            href="/login"
                            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            Ke Halaman Login
                        </Link>
                        <Link
                            href="/"
                            className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                            Kembali ke Beranda
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
