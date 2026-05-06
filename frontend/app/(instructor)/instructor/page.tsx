'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    BanknoteArrowDown,
    BookOpen,
    CalendarDays,
    Clock3,
    MessageCircleMore,
    Star,
    Target,
    Users,
    Wallet,
} from 'lucide-react';
import {
    Course,
    Instructor,
    InstructorFinanceSummary,
    InstructorScheduleItem,
    InstructorWithdrawalRequest,
    Project,
} from '@/types';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';
import { getInstructorExpertiseBadges, getInstructorProfileSummary } from '@/utils/instructorProfile';

interface InstructorDashboardData {
    instructor: Instructor | null;
    courses: Course[];
    assigned_projects: Project[];
    total_students: number;
    total_courses: number;
    finance_summary: InstructorFinanceSummary | null;
    upcoming_schedule: InstructorScheduleItem[];
    recent_withdrawals: InstructorWithdrawalRequest[];
    accountant_contact?: {
        whatsapp_number?: string;
        whatsapp_url?: string;
    } | null;
}

const WITHDRAWAL_STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    APPROVED: 'bg-sky-100 text-sky-700 border-sky-200',
    REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
    PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const SCHEDULE_TYPE_STYLES: Record<string, string> = {
    pelatihan: 'bg-indigo-100 text-indigo-700',
    assessment: 'bg-amber-100 text-amber-700',
    project: 'bg-sky-100 text-sky-700',
};

function formatRupiah(value: number | string | undefined | null) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function formatDateTimeRange(start?: string | null, end?: string | null) {
    if (!start) return 'Jadwal menyusul';

    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return 'Jadwal menyusul';

    const startLabel = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(startDate);

    if (!end) return startLabel;

    const endDate = new Date(end);
    if (Number.isNaN(endDate.getTime())) return startLabel;

    const endLabel = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(endDate);

    return `${startLabel} - ${endLabel}`;
}

function getAssignmentStatusLabel(value?: string) {
    const labels: Record<string, string> = {
        assigned: 'Baru Ditugaskan',
        in_progress: 'Sedang Dikerjakan',
        review: 'Siap Direview',
        completed: 'Selesai',
        blocked: 'Tertahan',
    };

    return labels[value || ''] || 'Baru Ditugaskan';
}

export default function InstructorDashboard() {
    const [data, setData] = useState<InstructorDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawNote, setWithdrawNote] = useState('');
    const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
    const { showError, showSuccess } = useFeedbackModal();

    useEffect(() => {
        try {
            const token = localStorage.getItem('access_token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUsername(payload.username || '');
            }
        } catch {}

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/instructor/courses/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, []);

    const instructor = data?.instructor ?? null;
    const financeSummary = data?.finance_summary ?? null;
    const accountantContact = data?.accountant_contact ?? null;
    const upcomingSchedule = data?.upcoming_schedule ?? [];
    const expertiseBadges = getInstructorExpertiseBadges(instructor?.title, instructor?.expertise_areas);
    const profileSummary = getInstructorProfileSummary(instructor?.bio, instructor?.title, instructor?.expertise_areas);

    const avgRating = data?.courses?.length
        ? (data.courses.reduce((sum: number, course) => sum + Number(course.rating || 0), 0) / data.courses.length).toFixed(1)
        : '0.0';

    const statCards = useMemo(() => [
        { icon: BookOpen, label: 'Total Pelatihan', value: loading ? '...' : String(data?.total_courses ?? 0), color: 'bg-indigo-100 text-indigo-600' },
        { icon: Users, label: 'Total Siswa', value: loading ? '...' : String(data?.total_students ?? 0), color: 'bg-emerald-100 text-emerald-600' },
        { icon: Star, label: 'Rating Rata-rata', value: loading ? '...' : avgRating, color: 'bg-amber-100 text-amber-600' },
        { icon: BanknoteArrowDown, label: 'Pendapatan Saya', value: loading ? '...' : formatRupiah(financeSummary?.instructor_earnings ?? 0), color: 'bg-emerald-100 text-emerald-700' },
        { icon: Wallet, label: 'Saldo Tersedia', value: loading ? '...' : formatRupiah(financeSummary?.available_balance ?? 0), color: 'bg-sky-100 text-sky-600' },
    ], [avgRating, data?.total_courses, data?.total_students, financeSummary?.available_balance, financeSummary?.instructor_earnings, loading]);

    const handleSubmitWithdrawal = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!withdrawAmount.trim()) {
            await showError('Masukkan nominal pencairan yang ingin diajukan.', 'Nominal Belum Diisi');
            return;
        }

        setSubmittingWithdrawal(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const normalizedAmount = withdrawAmount.replace(/\./g, '').replace(/,/g, '.').trim();

            const response = await fetch(`${apiUrl}/api/instructor/withdrawals/`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: normalizedAmount,
                    note: withdrawNote.trim(),
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                await showError(payload.error || 'Pengajuan pencairan belum bisa dikirim.', 'Pengajuan Gagal');
                return;
            }

            setData((current) => current ? {
                ...current,
                finance_summary: payload.finance_summary ?? current.finance_summary,
                recent_withdrawals: [payload.withdrawal, ...(current.recent_withdrawals || [])].slice(0, 5),
            } : current);
            setWithdrawAmount('');
            setWithdrawNote('');
            await showSuccess('Pengajuan pencairan sudah masuk ke akunting.', 'Pengajuan Terkirim');

            if (payload.whatsapp_url && typeof window !== 'undefined') {
                window.open(payload.whatsapp_url, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.error(error);
            await showError('Terjadi kesalahan koneksi saat mengirim pengajuan pencairan.', 'Koneksi Bermasalah');
        } finally {
            setSubmittingWithdrawal(false);
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-700 to-sky-600 p-8 text-white">
                <div className="relative z-10 max-w-3xl">
                    <p className="mb-1 text-sm font-semibold text-indigo-100">Portal Trainer</p>
                    <h1 className="mb-2 text-3xl font-bold">
                        Selamat Datang{instructor?.name ? `, ${instructor.name}` : username ? `, ${username}` : ''}!
                    </h1>
                    <p className="max-w-2xl text-base text-indigo-50">
                        Kelola pelatihan, pantau pendapatan, lihat agenda terdekat, dan ajukan pencairan fee trainer dari satu dasbor yang lebih rapi.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link href="/instructor/courses" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50">
                            Kelola Pelatihan <ArrowRight className="h-4 w-4" />
                        </Link>
                        <a
                            href={accountantContact?.whatsapp_url || 'https://wa.me/6281390012014'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                        >
                            Hubungi Akuntan <MessageCircleMore className="h-4 w-4" />
                        </a>
                    </div>
                </div>
                <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/10" />
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                {statCards.map((item) => (
                    <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.color}`}>
                            <item.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{item.label}</p>
                            <p className="text-xl font-extrabold text-gray-900">{item.value}</p>
                        </div>
                    </div>
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                            {expertiseBadges.length > 0 && (
                                <div className="mb-3 flex flex-wrap gap-2">
                                    {expertiseBadges.map((badge) => (
                                        <span
                                            key={badge}
                                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700"
                                        >
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <h2 className="text-xl font-bold text-gray-900">
                                {instructor?.name || username || 'Trainer Akademiso'}
                            </h2>
                            <p className="mt-2 text-sm leading-7 text-gray-600">{profileSummary}</p>
                        </div>
                        <Link
                            href="/instructor/settings"
                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                        >
                            Edit Profil Publik
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-emerald-700">Ringkasan Fee Trainer</p>
                            <h2 className="mt-1 text-2xl font-extrabold text-gray-900">
                                {formatRupiah(financeSummary?.instructor_earnings ?? 0)}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">Total pendapatan bersih trainer dari order yang sudah selesai.</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                            <BanknoteArrowDown className="h-6 w-6" />
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo Tersedia</p>
                            <p className="mt-2 text-lg font-extrabold text-slate-900">{formatRupiah(financeSummary?.available_balance ?? 0)}</p>
                        </div>
                        <div className="rounded-2xl bg-amber-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Menunggu Approval</p>
                            <p className="mt-2 text-lg font-extrabold text-amber-900">{formatRupiah(financeSummary?.pending_withdrawals ?? 0)}</p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Sudah Cair</p>
                            <p className="mt-2 text-lg font-extrabold text-emerald-900">{formatRupiah(financeSummary?.paid_withdrawals ?? 0)}</p>
                        </div>
                    </div>

                    {!financeSummary?.payout_profile_ready && (
                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            Lengkapi dulu `NPWP`, `nama bank`, `nomor rekening`, dan `nama pemilik rekening` di halaman pengaturan sebelum mengajukan pencairan.
                        </div>
                    )}

                    <form onSubmit={handleSubmitWithdrawal} className="mt-5 space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nominal Pencairan</label>
                            <input
                                value={withdrawAmount}
                                onChange={(event) => setWithdrawAmount(event.target.value)}
                                placeholder="Contoh: 1500000"
                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Catatan untuk Akuntan</label>
                            <textarea
                                value={withdrawNote}
                                onChange={(event) => setWithdrawNote(event.target.value)}
                                placeholder="Contoh: mohon dicairkan minggu ini, rekening atas nama pribadi."
                                className="min-h-[96px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="submit"
                                disabled={submittingWithdrawal || !financeSummary?.payout_profile_ready}
                                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                            >
                                {submittingWithdrawal ? 'Mengirim...' : 'Ajukan Pencairan'}
                            </button>
                            <Link
                                href="/instructor/settings"
                                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                            >
                                Lengkapi Data Rekening
                            </Link>
                        </div>
                    </form>
                </div>
            </section>

            <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Jadwal Saya</h2>
                        <p className="text-sm text-gray-500">Ringkasan agenda pelatihan, deadline project, dan periode assessment yang paling dekat.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                        <CalendarDays className="h-4 w-4" />
                        {upcomingSchedule.length} agenda
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-sky-100 bg-sky-50/40" />)}
                    </div>
                ) : upcomingSchedule.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 px-6 py-10 text-center text-sm text-gray-500">
                        Belum ada agenda mendatang. Jadwal pelatihan, project, dan assessment akan muncul di sini saat sudah tersedia.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {upcomingSchedule.map((item, index) => (
                            <div key={`${item.type}-${item.title}-${index}`} className="rounded-2xl border border-sky-100 bg-sky-50/30 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${SCHEDULE_TYPE_STYLES[item.type] || 'bg-slate-100 text-slate-700'}`}>
                                            {item.type}
                                        </span>
                                        <h3 className="mt-3 text-base font-bold text-gray-900">{item.title}</h3>
                                    </div>
                                    <Target className="h-5 w-5 text-sky-500" />
                                </div>
                                <p className="mt-2 text-sm leading-6 text-gray-600">{item.subtitle || 'Agenda trainer terdekat.'}</p>
                                <div className="mt-4 rounded-2xl bg-white px-4 py-3">
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Waktu</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-900">
                                        {formatDateTimeRange(item.scheduled_at, item.scheduled_end_at)}
                                    </p>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <span className="text-xs font-semibold text-sky-700">{item.status || 'Terjadwal'}</span>
                                    {item.action_url ? (
                                        <Link href={item.action_url} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                            Buka
                                        </Link>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <section className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm xl:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Project dari Project Manager</h2>
                            <p className="text-sm text-gray-500">Assignment non-pelatihan yang sedang ditugaskan ke Anda.</p>
                        </div>
                    </div>
                    {loading ? (
                        <div className="space-y-3">{[1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl border border-amber-100 bg-amber-50/50" />)}</div>
                    ) : data?.assigned_projects?.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-amber-200 p-8 text-center text-sm text-gray-500">
                            Belum ada project manager yang menugaskan project ke Anda.
                        </div>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {data?.assigned_projects?.slice(0, 4).map((project) => {
                                const myAssignment = (project.assignments || []).find((assignment) => assignment.instructor_user_id === instructor?.user);
                                return (
                                    <div key={project.id} className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{project.title}</h3>
                                                <p className="mt-1 text-sm text-gray-500">{project.client_name || 'Klien internal Akademiso'}</p>
                                            </div>
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700">
                                                {getAssignmentStatusLabel(myAssignment?.status)}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-gray-600">{project.description || 'Project ini belum memiliki deskripsi detail.'}</p>
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                                            <span className="rounded-full bg-white px-3 py-1">Target {formatDate(project.due_date)}</span>
                                            {project.related_course_title && (
                                                <span className="rounded-full bg-white px-3 py-1">Pelatihan: {project.related_course_title}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Pelatihan Saya</h2>
                            <p className="text-sm text-gray-500">Program yang sedang Anda ampu saat ini.</p>
                        </div>
                        <Link href="/instructor/courses" className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700">
                            Kelola Semua <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    {loading ? (
                        <div className="space-y-3">{[1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />)}</div>
                    ) : data?.courses?.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                            <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                            <p className="font-medium text-gray-500">Belum ada pelatihan</p>
                            <p className="mt-1 text-xs text-gray-400">Hubungi admin untuk ditambahkan sebagai trainer course.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data?.courses?.slice(0, 5).map((course) => (
                                <div key={course.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md">
                                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600">
                                        <BookOpen className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-sm font-bold text-gray-900">{course.title}</h3>
                                        <p className="text-xs text-gray-500">{course.category?.name || 'Tanpa kategori'} • {course.level} • ★ {course.rating}</p>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <p className="text-sm font-extrabold text-gray-900">{formatRupiah(course.price)}</p>
                                        <p className="text-xs text-gray-400">{course.enrolled_count} siswa</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Status Pencairan</h2>
                            <p className="text-sm text-gray-500">Pantau approval akuntan dan histori pencairan fee Anda.</p>
                        </div>
                        <a
                            href={accountantContact?.whatsapp_url || 'https://wa.me/6281390012014'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                        >
                            WhatsApp Akuntan
                        </a>
                    </div>

                    <div className="space-y-3">
                        {data?.recent_withdrawals?.length ? data.recent_withdrawals.map((request) => (
                            <div key={request.id} className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{formatRupiah(request.amount)}</p>
                                        <p className="mt-1 text-xs text-gray-500">Diajukan {formatDate(request.created_at)}</p>
                                    </div>
                                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${WITHDRAWAL_STATUS_STYLES[request.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                        {request.status_label || request.status}
                                    </span>
                                </div>
                                {request.note && (
                                    <p className="mt-3 text-sm text-gray-600">{request.note}</p>
                                )}
                                {request.accountant_notes && (
                                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-gray-600">
                                        Catatan akuntan: {request.accountant_notes}
                                    </p>
                                )}
                                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {request.paid_at ? `Dicairkan ${formatDate(request.paid_at)}` : request.reviewed_at ? `Direview ${formatDate(request.reviewed_at)}` : 'Menunggu review akuntan'}
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                                Belum ada pengajuan pencairan. Ajukan saat saldo Anda sudah siap dicairkan.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
