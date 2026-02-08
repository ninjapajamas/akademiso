'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { Suspense } from 'react';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

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
                router.push(redirect || '/dashboard');
            } else {
                setError(data.detail || 'Login gagal. Periksa kembali email dan password Anda.');
            }
        } catch (err) {
            setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

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
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                                <div className="w-1 h-1 bg-red-500 rounded-full mt-2 shrink-0"></div>
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 block">Username / Email</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    placeholder="nama@email.com"
                                />
                                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            </div>
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
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            </div>
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
