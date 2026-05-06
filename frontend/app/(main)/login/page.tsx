'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Suspense } from 'react';
import { decodeJwtPayload, getPortalPathForRole, getRoleFromPayload } from '@/utils/auth';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect');
    const registered = searchParams.get('registered') === 'true';
    const instructorPending = searchParams.get('instructor_pending') === 'true';
    const sessionExpired = searchParams.get('expired') === '1';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

    const parseLoginErrors = (data: unknown) => {
        if (!data || typeof data !== 'object') {
            return {
                general: 'Login gagal. Periksa kembali data yang Anda masukkan.',
                fields: {},
            };
        }

        const payload = data as Record<string, unknown>;
        const fields: { identifier?: string; password?: string } = {};

        if (typeof payload.username === 'string') fields.identifier = payload.username;
        if (Array.isArray(payload.username) && typeof payload.username[0] === 'string') {
            fields.identifier = payload.username[0];
        }

        if (typeof payload.password === 'string') fields.password = payload.password;
        if (Array.isArray(payload.password) && typeof payload.password[0] === 'string') {
            fields.password = payload.password[0];
        }

        let general = '';
        if (typeof payload.detail === 'string') {
            general = payload.detail;
        } else if (Array.isArray(payload.detail) && typeof payload.detail[0] === 'string') {
            general = payload.detail[0];
        } else if (fields.identifier || fields.password) {
            general = 'Login belum berhasil. Cek kembali data yang ditandai di bawah.';
        } else {
            general = 'Login gagal. Periksa kembali username/email dan password Anda.';
        }

        return { general, fields };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setFieldErrors({});

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/token/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                // Store tokens
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('refresh_token', data.refresh);

                // Redirect to requested page or dashboard
                const payload = decodeJwtPayload(data.access);
                const role = getRoleFromPayload(payload);
                router.push(redirect || getPortalPathForRole(role));
            } else {
                const parsed = parseLoginErrors(data);
                setError(parsed.general);
                setFieldErrors(parsed.fields);
            }
        } catch {
            setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    const identifierInputCls = `w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border outline-none transition-all text-black ${
        fieldErrors.identifier
            ? 'border-red-300 bg-red-50/70 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
    }`;

    const passwordInputCls = `w-full pl-10 pr-11 py-3 rounded-lg bg-gray-50 border outline-none transition-all text-black ${
        fieldErrors.password
            ? 'border-red-300 bg-red-50/70 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
    }`;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 mb-6">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                <ShieldCheck className="w-6 h-6 fill-current" />
                            </div>
                            <span className="font-bold text-2xl tracking-tight text-gray-900">Akademiso</span>
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Selamat Datang Kembali</h1>
                        <p className="text-gray-500">Masuk untuk melanjutkan pembelajaran Anda.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {registered && (
                            <div className="p-4 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-100">
                                {instructorPending
                                    ? 'Akun berhasil dibuat. Pengajuan trainer Anda menunggu approval admin; sementara itu akun dapat digunakan sebagai peserta.'
                                    : 'Akun berhasil dibuat. Setelah masuk, lengkapi informasi diri Anda di halaman pengaturan sebelum checkout.'}
                            </div>
                        )}

                        {sessionExpired && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                Sesi login Anda telah berakhir. Silakan masuk kembali.
                            </div>
                        )}

                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <div>
                                        <p className="font-semibold text-red-800">Login belum berhasil</p>
                                        <p className="mt-1 leading-relaxed">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 block">Username / Email</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setFieldErrors((current) => ({ ...current, identifier: undefined }));
                                    }}
                                    className={identifierInputCls}
                                    placeholder="nama@email.com"
                                />
                                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            </div>
                            {fieldErrors.identifier && (
                                <p className="text-xs font-medium text-red-600">{fieldErrors.identifier}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-bold text-gray-700 block">Password</label>
                                <Link href="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                                    Lupa password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setFieldErrors((current) => ({ ...current, password: undefined }));
                                    }}
                                    className={passwordInputCls}
                                    placeholder="••••••••"
                                />
                                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((current) => !current)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p className="text-xs font-medium text-red-600">{fieldErrors.password}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    Masuk
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        Belum punya akun?{' '}
                        <Link href="/register" className="font-bold text-blue-600 hover:underline">
                            Daftar sekarang
                        </Link>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
                    &copy; {new Date().getFullYear()} Akademiso. All rights reserved.
                </div>
            </div>
        </div>
    );
}

export default function Login() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
