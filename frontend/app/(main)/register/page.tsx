'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { splitFullName } from '@/utils/profile';
import { getClientApiBaseUrl } from '@/utils/api';
import {
    ArrowRight, FileText, GraduationCap, Loader2,
    Lock, Mail, ShieldCheck, User, AlertCircle, Eye, EyeOff, X
} from 'lucide-react';

type AccountType = 'student' | 'instructor';

const trainerSkillOptions = [
    'ISO 9001 Lead Auditor',
    'ISO 9001 Internal Auditor',
    'ISO 9001 Lead Implementer',
    'ISO 14001 Lead Auditor',
    'ISO 14001 Internal Auditor',
    'ISO 14001 Lead Implementer',
    'ISO 45001 Lead Auditor',
    'ISO 45001 Internal Auditor',
    'ISO 45001 Lead Implementer',
    'ISO/IEC 27001 Lead Auditor',
    'ISO/IEC 27001 Lead Implementer',
    'ISO 22000 Lead Auditor',
    'ISO 22000 Lead Implementer',
    'ISO 13485 Lead Auditor',
    'ISO 13485 Lead Implementer',
    'ISO/IEC 17025 Lead Assessor',
    'ISO/IEC 17025 Lead Implementer',
    'ISO 22301 Lead Implementer',
    'ISO 31000 Risk Manager',
    'ISO 31000 Lead Risk Manager',
    'ISO 37001 Lead Implementer',
    'ISO 37001 Lead Auditor',
    'ISO 37301 Lead Implementer',
    'Integrated Management System (ISO 9001, ISO 14001, ISO 45001)',
    'ISO 19011 Auditing Guidelines',
    'HSE / K3 Management System',
    'Food Safety Management System',
    'Information Security Management System',
    'Quality Management System',
    'Environmental Management System',
];

const termsSections = [
    {
        title: 'Penggunaan Akun',
        items: [
            'Data yang Anda masukkan saat pendaftaran harus benar, aktif, dan dapat dipertanggungjawabkan.',
            'Anda bertanggung jawab menjaga kerahasiaan username dan password akun Akademiso.',
        ],
    },
    {
        title: 'Aktivitas Pembelajaran',
        items: [
            'Akun digunakan untuk mengakses course, materi, forum diskusi, dan layanan belajar yang tersedia di platform.',
            'Dilarang menyalahgunakan akun, menyalin materi tanpa izin, atau mengganggu aktivitas peserta lain.',
        ],
    },
    {
        title: 'Data dan Dokumen',
        items: [
            'Dokumen yang diunggah, termasuk CV untuk trainer, harus relevan dan tidak melanggar hak pihak lain.',
            'Akademiso dapat menggunakan data profil Anda untuk proses verifikasi akun, administrasi pembelajaran, dan komunikasi layanan.',
        ],
    },
    {
        title: 'Approval dan Akses',
        items: [
            'Pendaftaran trainer akan melalui proses review admin sebelum akses trainer diaktifkan.',
            'Akademiso berhak menolak, menangguhkan, atau menonaktifkan akun yang terbukti memberikan data tidak valid atau melanggar ketentuan platform.',
        ],
    },
    {
        title: 'Persetujuan Pengguna',
        items: [
            'Dengan menekan tombol setuju, Anda menyatakan telah membaca, memahami, dan menyetujui syarat dan ketentuan pendaftaran ini.',
        ],
    },
];

export default function Register() {
    const router = useRouter();
    const [accountType, setAccountType] = useState<AccountType>('student');
    const [formData, setFormData] = useState({
        full_name: '',
        username: '',
        email: '',
        instructor_title: '',
        instructor_bio: '',
        password: '',
        password_confirm: ''
    });
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [affiliateApplication, setAffiliateApplication] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setFieldErrors((current) => ({ ...current, [e.target.name]: '' }));
    };

    const parseRegisterErrors = (data: unknown) => {
        if (!data || typeof data !== 'object') {
            return {
                general: 'Registrasi gagal. Periksa kembali data yang Anda masukkan.',
                fields: {},
            };
        }

        const payload = data as Record<string, unknown>;
        const fields: Record<string, string> = {};

        Object.entries(payload).forEach(([key, value]) => {
            if (typeof value === 'string') {
                if (key === 'first_name' || key === 'last_name') {
                    fields.full_name = fields.full_name || value;
                } else {
                    fields[key] = value;
                }
                return;
            }
            if (Array.isArray(value) && typeof value[0] === 'string') {
                if (key === 'first_name' || key === 'last_name') {
                    fields.full_name = fields.full_name || value[0];
                } else {
                    fields[key] = value[0];
                }
            }
        });

        const general =
            fields.non_field_errors ||
            fields.detail ||
            (Object.keys(fields).length > 0
                ? 'Pendaftaran belum berhasil. Cek kembali data yang ditandai di bawah.'
                : 'Registrasi gagal. Silakan coba lagi.');

        return { general, fields };
    };

    const openTermsModal = () => {
        setIsTermsModalOpen(true);
    };

    const handleTermsToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            openTermsModal();
            return;
        }

        setHasAcceptedTerms(false);
        setFieldErrors((current) => ({ ...current, terms_accepted: '' }));
    };

    const handleAcceptTerms = () => {
        setHasAcceptedTerms(true);
        setIsTermsModalOpen(false);
        setFieldErrors((current) => ({ ...current, terms_accepted: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setFieldErrors({});

        const { firstName, lastName } = splitFullName(formData.full_name);

        if (!firstName) {
            setError('Nama lengkap wajib diisi.');
            setFieldErrors({ full_name: 'Nama lengkap wajib diisi.' });
            setIsLoading(false);
            return;
        }

        if (formData.password !== formData.password_confirm) {
            setError('Konfirmasi password belum sesuai.');
            setFieldErrors({ password_confirm: 'Konfirmasi password tidak cocok.' });
            setIsLoading(false);
            return;
        }

        if (accountType === 'instructor' && !cvFile) {
            setError('CV wajib diunggah untuk melengkapi pendaftaran trainer.');
            setFieldErrors({ instructor_cv: 'CV wajib diunggah untuk pendaftaran trainer.' });
            setIsLoading(false);
            return;
        }

        if (!hasAcceptedTerms) {
            setError('Anda harus menyetujui syarat dan ketentuan sebelum mendaftar.');
            setFieldErrors({ terms_accepted: 'Persetujuan syarat dan ketentuan wajib diberikan.' });
            setIsLoading(false);
            return;
        }

        try {
            const apiUrl = getClientApiBaseUrl();
            const payload = new FormData();
            payload.append('account_type', accountType);
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'full_name') return;
                payload.append(key, value);
            });
            payload.append('first_name', firstName);
            payload.append('last_name', lastName);
            payload.append('terms_accepted', String(hasAcceptedTerms));
            payload.append('affiliate_application', String(affiliateApplication));
            if (cvFile) payload.append('instructor_cv', cvFile);

            const res = await fetch(`${apiUrl}/api/register/`, {
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
                const parsed = parseRegisterErrors(data);
                setError(parsed.general);
                setFieldErrors(parsed.fields);
            }
        } catch {
            setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    const labelCls = 'text-sm font-bold text-gray-700 block';
    const getInputCls = (fieldName: string, withIcon = true) => {
        const spacingCls = withIcon ? 'pl-10 pr-4' : 'px-4';
        const stateCls = fieldErrors[fieldName]
            ? 'border-red-300 bg-red-50/70 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
        return `w-full ${spacingCls} py-3 rounded-lg border outline-none transition-all text-black ${stateCls}`;
    };

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
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <div>
                                        <p className="font-semibold text-red-800">Pendaftaran belum berhasil</p>
                                        <p className="mt-1 leading-relaxed">{error}</p>
                                    </div>
                                </div>
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
                                Trainer
                            </button>
                        </div>

                        {accountType === 'instructor' && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                Pengajuan trainer akan menunggu approval admin sebelum portal trainer aktif.
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className={labelCls}>Nama Lengkap</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="full_name"
                                    required
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className={getInputCls('full_name')}
                                    placeholder="Nama lengkap"
                                />
                                <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            </div>
                            {fieldErrors.full_name && (
                                <p className="text-xs font-medium text-red-600">{fieldErrors.full_name}</p>
                            )}
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
                                        className={getInputCls('username')}
                                        placeholder="username123"
                                    />
                                    <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                </div>
                                {fieldErrors.username && (
                                    <p className="text-xs font-medium text-red-600">{fieldErrors.username}</p>
                                )}
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
                                        className={getInputCls('email')}
                                        placeholder="nama@email.com"
                                    />
                                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                </div>
                                {fieldErrors.email && (
                                    <p className="text-xs font-medium text-red-600">{fieldErrors.email}</p>
                                )}
                            </div>
                        </div>

                        {accountType === 'instructor' && (
                            <>
                                <div className="space-y-2">
                                    <label className={labelCls}>Keahlian / Gelar Trainer</label>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            name="instructor_title"
                                            list="trainer-skill-options"
                                            required
                                            value={formData.instructor_title}
                                            onChange={handleChange}
                                            className={getInputCls('instructor_title', false)}
                                            placeholder="Ketik keahlian trainer, mis. ISO 27001 Lead Implementer"
                                            autoComplete="off"
                                        />
                                        <datalist id="trainer-skill-options">
                                            {trainerSkillOptions.map((skill) => (
                                                <option key={skill} value={skill} />
                                            ))}
                                        </datalist>
                                        <p className="text-xs leading-relaxed text-gray-500">
                                            Mulai ketik untuk mencari saran keahlian, atau isi manual jika keahlian Anda belum ada di daftar.
                                        </p>
                                        {fieldErrors.instructor_title && (
                                            <p className="text-xs font-medium text-red-600">{fieldErrors.instructor_title}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className={labelCls}>Ringkasan Profil</label>
                                    <textarea
                                        name="instructor_bio"
                                        required
                                        rows={4}
                                        value={formData.instructor_bio}
                                        onChange={handleChange}
                                        className={getInputCls('instructor_bio', false)}
                                        placeholder="Tuliskan ringkasan profil trainer, pengalaman utama, sertifikasi, dan fokus keahlian Anda."
                                    />
                                    <p className="text-xs leading-relaxed text-gray-500">
                                        Ringkasan ini akan dipakai sebagai profil publik trainer dan tampil pada halaman detail course.
                                    </p>
                                    {fieldErrors.instructor_bio && (
                                        <p className="text-xs font-medium text-red-600">{fieldErrors.instructor_bio}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className={labelCls}>CV</label>
                                    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-sm transition-colors ${
                                        fieldErrors.instructor_cv
                                            ? 'border-red-300 bg-red-50 text-red-700'
                                            : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-blue-400 hover:bg-blue-50'
                                    }`}>
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <span className="font-medium truncate">
                                            {cvFile ? cvFile.name : 'Unggah CV PDF/DOC/DOCX maksimal 5MB'}
                                        </span>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            required
                                            className="sr-only"
                                            onChange={(event) => {
                                                setCvFile(event.target.files?.[0] || null);
                                                setFieldErrors((current) => ({ ...current, instructor_cv: '' }));
                                            }}
                                        />
                                    </label>
                                    {fieldErrors.instructor_cv && (
                                        <p className="text-xs font-medium text-red-600">{fieldErrors.instructor_cv}</p>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={labelCls}>Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`${getInputCls('password')} pr-10`}
                                        placeholder="********"
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

                            <div className="space-y-2">
                                <label className={labelCls}>Konfirmasi Password</label>
                                <div className="relative">
                                    <input
                                        type={showPasswordConfirm ? 'text' : 'password'}
                                        name="password_confirm"
                                        required
                                        value={formData.password_confirm}
                                        onChange={handleChange}
                                        className={`${getInputCls('password_confirm')} pr-10`}
                                        placeholder="********"
                                    />
                                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordConfirm((current) => !current)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                                        aria-label={showPasswordConfirm ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                                    >
                                        {showPasswordConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                {fieldErrors.password_confirm && (
                                    <p className="text-xs font-medium text-red-600">{fieldErrors.password_confirm}</p>
                                )}
                            </div>
                        </div>

                        <div className={`rounded-xl border px-4 py-4 ${
                            fieldErrors.terms_accepted
                                ? 'border-red-200 bg-red-50/70'
                                : 'border-gray-200 bg-slate-50'
                        }`}>
                            <div className="flex items-start gap-3">
                                <input
                                    id="terms_accepted"
                                    type="checkbox"
                                    checked={hasAcceptedTerms}
                                    onChange={handleTermsToggle}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="space-y-2">
                                    <label htmlFor="terms_accepted" className="block text-sm font-medium leading-relaxed text-gray-700">
                                        Saya telah membaca dan menyetujui syarat dan ketentuan pendaftaran.
                                    </label>
                                    <button
                                        type="button"
                                        onClick={openTermsModal}
                                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
                                    >
                                        <FileText className="h-4 w-4" />
                                        Baca syarat dan ketentuan
                                    </button>
                                    {hasAcceptedTerms && (
                                        <p className="text-xs font-medium text-emerald-700">
                                            Persetujuan sudah diberikan dan akan dipakai saat pendaftaran dikirim.
                                        </p>
                                    )}
                                    {fieldErrors.terms_accepted && (
                                        <p className="text-xs font-medium text-red-600">{fieldErrors.terms_accepted}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={affiliateApplication}
                                    onChange={(event) => setAffiliateApplication(event.target.checked)}
                                    className="mt-1 h-4 w-4 shrink-0 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm leading-relaxed text-emerald-900">
                                    <span className="font-bold">Ajukan saya sebagai affiliator</span>
                                    <br />
                                    Jika disetujui admin, Anda akan mendapatkan kode referral pribadi untuk dibagikan dan komisinya dapat dimonitoring oleh tim akuntan.
                                </span>
                            </label>
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
                                    {accountType === 'instructor' ? 'Kirim Pengajuan Trainer' : 'Daftar Sekarang'}
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

            {isTermsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20">
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Syarat dan Ketentuan Pendaftaran</h2>
                                    <p className="mt-1 text-sm leading-6 text-gray-500">
                                        Silakan baca terlebih dahulu sebelum menyetujui proses pendaftaran akun Akademiso.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTermsModalOpen(false)}
                                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Tutup modal syarat dan ketentuan"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[65vh] space-y-6 overflow-y-auto px-6 py-6">
                            <p className="text-sm leading-7 text-gray-600">
                                Dengan membuat akun di Akademiso, Anda setuju menggunakan platform ini secara bertanggung jawab,
                                memberikan data yang valid, dan mengikuti aturan layanan yang berlaku.
                            </p>

                            {termsSections.map((section) => (
                                <section key={section.title} className="space-y-3">
                                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-900">{section.title}</h3>
                                    <ul className="space-y-2 text-sm leading-7 text-gray-600">
                                        {section.items.map((item) => (
                                            <li key={item} className="flex items-start gap-3">
                                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setIsTermsModalOpen(false)}
                                className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                            >
                                Kembali
                            </button>
                            <button
                                type="button"
                                onClick={handleAcceptTerms}
                                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                                Saya Setuju
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
