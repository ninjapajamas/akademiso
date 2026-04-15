'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowRight, BriefcaseBusiness, FileText, GraduationCap, Loader2,
    Lock, Mail, Phone, ShieldCheck, User
} from 'lucide-react';

type AccountType = 'student' | 'instructor';

export default function Register() {
    const router = useRouter();
    const [accountType, setAccountType] = useState<AccountType>('student');
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        phone: '',
        company: '',
        position: '',
        instructor_title: '',
        instructor_bio: '',
        password: '',
        password_confirm: ''
    });
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const getErrorMessage = (data: unknown) => {
        if (!data || typeof data !== 'object') return 'Registrasi gagal. Silakan coba lagi.';
        return Object.values(data as Record<string, unknown>)
            .flatMap((value) => Array.isArray(value) ? value : [value])
            .join(', ');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (formData.password !== formData.password_confirm) {
            setError('Password tidak sama.');
            setIsLoading(false);
            return;
        }

        if (accountType === 'instructor' && !cvFile) {
            setError('CV wajib diunggah untuk mendaftar sebagai instruktur.');
            setIsLoading(false);
            return;
        }

        try {
            const payload = new FormData();
            payload.append('account_type', accountType);
            Object.entries(formData).forEach(([key, value]) => {
                payload.append(key, value);
            });
            if (cvFile) payload.append('instructor_cv', cvFile);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/register/`, {
                method: 'POST',
                body: payload,
            });

            const data = await res.json();

            if (res.ok) {
                const params = new URLSearchParams({ registered: 'true' });
                if (accountType === 'instructor') {
                    params.set('instructor_pending', 'true');
                } else {
                    params.set('redirect', '/dashboard/settings?welcome=1');
                }
                router.push(`/login?${params.toString()}`);
            } else {
                setError(getErrorMessage(data) || 'Registrasi gagal. Silakan coba lagi.');
            }
        } catch {
            setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    const inputCls = 'w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-black';
    const labelCls = 'text-sm font-bold text-gray-700 block';

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 sm:p-8">
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 mb-6">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                <ShieldCheck className="w-6 h-6 fill-current" />
                            </div>
                            <span className="font-bold text-2xl tracking-tight text-gray-900">Akademiso</span>
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Buat Akun Baru</h1>
                        <p className="text-gray-500">Pilih jenis akun dan lengkapi data pendaftaran.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                                <div className="w-1 h-1 bg-red-500 rounded-full mt-2 shrink-0"></div>
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                            <button
                                type="button"
                                onClick={() => setAccountType('student')}
                                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition ${accountType === 'student' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                <User className="w-4 h-4" />
                                Peserta
                            </button>
                            <button
                                type="button"
                                onClick={() => setAccountType('instructor')}
                                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition ${accountType === 'instructor' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                <GraduationCap className="w-4 h-4" />
                                Instruktur
                            </button>
                        </div>

                        {accountType === 'instructor' && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                Pengajuan instruktur akan menunggu approval admin sebelum portal instruktur aktif.
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={labelCls}>Nama Depan</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="first_name"
                                        required={accountType === 'instructor'}
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        className={inputCls}
                                        placeholder="Nama depan"
                                    />
                                    <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={labelCls}>Nama Belakang</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        className={inputCls}
                                        placeholder="Nama belakang"
                                    />
                                    <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={labelCls}>Username</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="username"
                                        required
                                        value={formData.username}
                                        onChange={handleChange}
                                        className={inputCls}
                                        placeholder="username123"
                                    />
                                    <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={labelCls}>Email</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={inputCls}
                                        placeholder="nama@email.com"
                                    />
                                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {accountType === 'instructor' && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className={labelCls}>Nomor Telepon</label>
                                        <div className="relative">
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className={inputCls}
                                                placeholder="08xxxxxxxxxx"
                                            />
                                            <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className={labelCls}>Institusi / Perusahaan</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="company"
                                                value={formData.company}
                                                onChange={handleChange}
                                                className={inputCls}
                                                placeholder="Nama institusi"
                                            />
                                            <BriefcaseBusiness className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className={labelCls}>Jabatan Saat Ini</label>
                                        <input
                                            type="text"
                                            name="position"
                                            value={formData.position}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-black"
                                            placeholder="Trainer, Konsultan, Auditor"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className={labelCls}>Keahlian / Gelar Instruktur</label>
                                        <input
                                            type="text"
                                            name="instructor_title"
                                            required
                                            value={formData.instructor_title}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-black"
                                            placeholder="ISO 27001 Lead Auditor"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className={labelCls}>Ringkasan Pengalaman</label>
                                    <textarea
                                        name="instructor_bio"
                                        required
                                        rows={4}
                                        value={formData.instructor_bio}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-black"
                                        placeholder="Tuliskan pengalaman mengajar, sertifikasi, dan bidang keahlian utama."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className={labelCls}>CV</label>
                                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600 hover:border-blue-400 hover:bg-blue-50">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <span className="font-medium truncate">
                                            {cvFile ? cvFile.name : 'Unggah CV PDF/DOC/DOCX maksimal 5MB'}
                                        </span>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            required
                                            className="sr-only"
                                            onChange={(event) => setCvFile(event.target.files?.[0] || null)}
                                        />
                                    </label>
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={labelCls}>Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={inputCls}
                                        placeholder="********"
                                    />
                                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={labelCls}>Konfirmasi Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="password_confirm"
                                        required
                                        value={formData.password_confirm}
                                        onChange={handleChange}
                                        className={inputCls}
                                        placeholder="********"
                                    />
                                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                </div>
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
                                    Mendaftar...
                                </>
                            ) : (
                                <>
                                    {accountType === 'instructor' ? 'Kirim Pengajuan Instruktur' : 'Daftar Sekarang'}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        Sudah punya akun?{' '}
                        <Link href="/login" className="font-bold text-blue-600 hover:underline">
                            Masuk disini
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
