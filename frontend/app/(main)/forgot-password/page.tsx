import Link from 'next/link';
import { ArrowLeft, MailQuestion, ShieldCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen bg-slate-50 px-4 py-12">
            <div className="mx-auto max-w-lg">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="p-8">
                        <Link href="/" className="mb-8 inline-flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <ShieldCheck className="h-6 w-6 fill-current" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight text-slate-900">Akademiso</span>
                        </Link>

                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                            <MailQuestion className="h-7 w-7" />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900">Lupa Kata Sandi</h1>
                        <p className="mt-3 leading-relaxed text-slate-600">
                            Fitur reset kata sandi mandiri belum diaktifkan pada versi ini. Untuk sementara,
                            silakan hubungi admin agar kata sandi Anda dapat dibantu reset secara manual.
                        </p>

                        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-800">
                            Email bantuan yang bisa digunakan sementara: <span className="font-semibold">admin@example.com</span>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Kembali ke Login
                            </Link>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                Kembali ke Beranda
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
