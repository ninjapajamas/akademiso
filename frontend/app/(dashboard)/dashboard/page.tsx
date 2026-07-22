'use client';

import CourseThumbnail from '@/components/CourseThumbnail';
import { Course, EnrolledCourse, GamificationBadge, GamificationSummary } from '@/types';
import { getClientApiBaseUrl } from '@/utils/api';
import {
    ArrowRight,
    Award,
    BadgeCheck,
    BookOpen,
    Brain,
    CalendarDays,
    Clock3,
    Crown,
    Flame,
    Gift,
    Medal,
    Rocket,
    ShieldCheck,
    Sparkles,
    Star,
    Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type AssessmentScheduleItem = {
    id: string;
    title: string;
    courseTitle: string;
    scheduledAt?: string | null;
};

function decodeJwt(token: string) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

function formatDate(value?: string | null, includeTime = false) {
    if (!value) return 'Jadwal menyusul';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Jadwal menyusul';
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
}

function getBadgeIcon(icon: string) {
    const className = 'h-4 w-4';
    if (icon === 'brain') return <Brain className={className} />;
    if (icon === 'star') return <Star className={className} />;
    if (icon === 'award') return <Award className={className} />;
    if (icon === 'medal') return <Medal className={className} />;
    if (icon === 'rocket') return <Rocket className={className} />;
    if (icon === 'crown') return <Crown className={className} />;
    if (icon === 'book-open') return <BookOpen className={className} />;
    return <Sparkles className={className} />;
}

function getBadgeTone(color: string) {
    if (color === 'orange') return 'border-orange-200 bg-orange-50 text-orange-700';
    if (color === 'amber') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (color === 'emerald') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (color === 'rose') return 'border-rose-200 bg-rose-50 text-rose-700';
    if (color === 'cyan') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
    if (color === 'violet') return 'border-violet-200 bg-violet-50 text-violet-700';
    return 'border-blue-200 bg-blue-50 text-blue-700';
}

function getLearningLabel(progress: number) {
    if (progress >= 100) return 'Lihat Lagi';
    if (progress > 0) return 'Lanjutkan';
    return 'Mulai Belajar';
}

function SectionTitle({
    eyebrow,
    title,
    description,
    action,
}: {
    eyebrow: string;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">{eyebrow}</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>
            {action}
        </div>
    );
}

function CourseFocusCard({ enrollment, tone }: { enrollment: EnrolledCourse; tone: 'active' | 'upcoming' }) {
    const progress = Math.max(0, Math.min(100, enrollment.progress_percentage || 0));
    const course = enrollment.course;
    const href = course.last_accessed_lesson_id
        ? `/learn/${course.slug}?lesson=${course.last_accessed_lesson_id}`
        : `/learn/${course.slug}`;

    return (
        <article className="group overflow-hidden rounded-[1.8rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="grid sm:grid-cols-[11rem_1fr]">
                <div className="relative min-h-40 overflow-hidden bg-slate-100">
                    <CourseThumbnail imageUrl={course.thumbnail} title={course.title} />
                    <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm ${tone === 'upcoming' ? 'bg-fuchsia-500' : 'bg-emerald-500'}`}>
                        {tone === 'upcoming' ? 'Akan Datang' : 'Berlangsung'}
                    </span>
                </div>
                <div className="flex min-w-0 flex-col justify-between p-5">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{course.category?.name || 'Pelatihan ISO'}</p>
                        <h3 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-slate-950">{course.title}</h3>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1"><Clock3 className="h-3.5 w-3.5" />{course.duration}</span>
                            {course.scheduled_at && <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-50 px-2.5 py-1 text-fuchsia-700"><CalendarDays className="h-3.5 w-3.5" />{formatDate(course.scheduled_at)}</span>}
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                            <span>Progres belajar</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400" style={{ width: `${progress}%` }} />
                        </div>
                        <Link href={href} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-700 transition group-hover:gap-3">
                            {getLearningLabel(progress)} <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </article>
    );
}

function RecommendationCard({ course }: { course: Course }) {
    return (
        <article className="overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="relative h-36 overflow-hidden bg-slate-100">
                <CourseThumbnail imageUrl={course.thumbnail} title={course.title} />
                {course.is_free && <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Gratis</span>}
            </div>
            <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-500">{course.category?.name || 'Pilihan Akademiso'}</p>
                <h3 className="mt-2 line-clamp-2 min-h-12 font-black leading-6 text-slate-950">{course.title}</h3>
                <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-500">{course.level} • {course.duration}</span>
                    <Link href={`/courses/${course.slug}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-blue-600" aria-label={`Lihat ${course.title}`}>
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </article>
    );
}

export default function DashboardPage() {
    const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
    const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);
    const [gamification, setGamification] = useState<GamificationSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [username, setUsername] = useState('Peserta');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const payload = decodeJwt(token);
        if (payload?.username) setUsername(payload.username);

        const fetchDashboardData = async () => {
            try {
                const apiUrl = getClientApiBaseUrl();
                const headers = { Authorization: `Bearer ${token}` };
                const [coursesResponse, catalogResponse, gamificationResponse] = await Promise.all([
                    fetch(`${apiUrl}/api/my-courses/`, { headers }),
                    fetch(`${apiUrl}/api/courses/`, { headers }),
                    fetch(`${apiUrl}/api/gamification/summary/`, { headers }),
                ]);

                if ([coursesResponse, catalogResponse, gamificationResponse].some(response => response.status === 401)) {
                    window.location.href = '/login';
                    return;
                }
                if (coursesResponse.ok) setEnrolledCourses(await coursesResponse.json());
                if (catalogResponse.ok) setCatalogCourses(await catalogResponse.json());
                if (gamificationResponse.ok) setGamification(await gamificationResponse.json());
            } catch (error) {
                console.error('Dashboard fetch error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchDashboardData();
    }, []);

    const now = useMemo(() => new Date(), []);
    const upcomingCourses = enrolledCourses
        .filter(enrollment => enrollment.course.scheduled_at && new Date(enrollment.course.scheduled_at) > now && (enrollment.progress_percentage || 0) === 0)
        .sort((left, right) => new Date(left.course.scheduled_at || 0).getTime() - new Date(right.course.scheduled_at || 0).getTime());
    const upcomingIds = new Set(upcomingCourses.map(enrollment => enrollment.id));
    const ongoingCourses = enrolledCourses
        .filter(enrollment => (enrollment.progress_percentage || 0) < 100 && !upcomingIds.has(enrollment.id))
        .sort((left, right) => (right.progress_percentage || 0) - (left.progress_percentage || 0));
    const focusCourses = [
        ...ongoingCourses.slice(0, 2).map(enrollment => ({ enrollment, tone: 'active' as const })),
        ...upcomingCourses.slice(0, 2).map(enrollment => ({ enrollment, tone: 'upcoming' as const })),
    ].slice(0, 3);

    const assessmentSchedules = enrolledCourses
        .flatMap<AssessmentScheduleItem>(enrollment => (enrollment.course.certification_exams || [])
            .filter(exam => exam.is_active)
            .map(exam => ({
                id: `${enrollment.id}-${exam.id}`,
                title: exam.title,
                courseTitle: enrollment.course.title,
                scheduledAt: exam.confirmed_start_at || null,
            })))
        .sort((left, right) => {
            if (!left.scheduledAt) return 1;
            if (!right.scheduledAt) return -1;
            return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
        })
        .slice(0, 3);

    const enrolledCourseIds = new Set(enrolledCourses.map(enrollment => enrollment.course.id));
    const recommendations = catalogCourses
        .filter(course => course.is_active && !enrolledCourseIds.has(course.id))
        .sort((left, right) => Number(right.is_featured) - Number(left.is_featured) || (right.enrolled_count || 0) - (left.enrolled_count || 0))
        .slice(0, 3);

    const earnedBadges = (gamification?.badges || []).filter((badge: GamificationBadge) => badge.earned).slice(0, 4);
    const levelProgress = Math.max(0, Math.min(100, gamification?.level.progress_percentage || 0));

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-8">
            <section className="relative isolate overflow-hidden rounded-[2.2rem] border border-blue-100 bg-gradient-to-br from-blue-600 via-indigo-600 to-fuchsia-500 p-6 text-white shadow-xl shadow-blue-600/15 sm:p-8">
                <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
                <div className="absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-cyan-300/20 blur-2xl" />
                <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] backdrop-blur">
                            <Sparkles className="h-3.5 w-3.5" /> Ruang Belajar Anda
                        </div>
                        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Halo, {username}! 👋</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">Lanjutkan satu langkah kecil hari ini. Semua yang penting sudah kami rapikan di satu tempat.</p>
                    </div>
                    <Link href="/dashboard/courses" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg transition hover:-translate-y-0.5">
                        Buka Kursus Saya <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <section className="space-y-5">
                <SectionTitle
                    eyebrow="Fokus Belajar"
                    title="Kursus Anda"
                    description="Kursus yang sedang berjalan dan agenda belajar terdekat."
                    action={<Link href="/dashboard/courses" className="text-sm font-black text-blue-700 hover:underline">Lihat semua</Link>}
                />
                {isLoading ? (
                    <div className="grid gap-4 lg:grid-cols-2"><div className="h-56 animate-pulse rounded-[1.8rem] bg-blue-50" /><div className="h-56 animate-pulse rounded-[1.8rem] bg-fuchsia-50" /></div>
                ) : focusCourses.length > 0 ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {focusCourses.map(({ enrollment, tone }) => <CourseFocusCard key={enrollment.id} enrollment={enrollment} tone={tone} />)}
                    </div>
                ) : (
                    <div className="rounded-[1.8rem] border border-dashed border-blue-200 bg-blue-50/60 p-7 text-center">
                        <BookOpen className="mx-auto h-9 w-9 text-blue-500" />
                        <p className="mt-3 font-black text-slate-900">Belum ada kursus aktif</p>
                        <p className="mt-1 text-sm text-slate-500">Pilih pelatihan baru dari rekomendasi di bawah untuk memulai.</p>
                    </div>
                )}
            </section>

            <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                <section className="rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6 shadow-sm">
                    <SectionTitle eyebrow="Agenda" title="Jadwal Assessment" description="Jadwal ujian dan evaluasi terdekat." />
                    <div className="mt-5 space-y-3">
                        {assessmentSchedules.length > 0 ? assessmentSchedules.map((item, index) => (
                            <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${index === 0 ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'}`}><CalendarDays className="h-5 w-5" /></div>
                                <div className="min-w-0">
                                    <p className="line-clamp-1 font-black text-slate-950">{item.title}</p>
                                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.courseTitle}</p>
                                    <p className="mt-2 text-xs font-bold text-violet-700">{formatDate(item.scheduledAt, true)}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-2xl border border-dashed border-violet-200 bg-white/60 p-5 text-center text-sm text-slate-500">Belum ada assessment yang dijadwalkan.</div>
                        )}
                    </div>
                    <Link href="/dashboard/schedule" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-violet-700 hover:underline">Buka jadwal lengkap <ArrowRight className="h-4 w-4" /></Link>
                </section>

                <section className="relative overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-cyan-50 p-6 shadow-sm">
                    <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-200/35 blur-2xl" />
                    <div className="relative">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">Gamifikasi</p>
                                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Progres yang terasa menyenangkan</h2>
                                <p className="mt-1 text-sm text-slate-500">XP, level, streak, dan badge Anda dalam satu ringkasan.</p>
                            </div>
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-400/25"><Trophy className="h-7 w-7" /></div>
                        </div>

                        <div className="mt-6 grid grid-cols-3 gap-3">
                            <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total XP</p><p className="mt-1 text-xl font-black text-blue-700">{isLoading ? '...' : gamification?.total_xp || 0}</p></div>
                            <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Badge</p><p className="mt-1 text-xl font-black text-fuchsia-700">{isLoading ? '...' : gamification?.earned_badges_count || 0}</p></div>
                            <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Streak</p><p className="mt-1 inline-flex items-center gap-1 text-xl font-black text-orange-600"><Flame className="h-5 w-5" />{isLoading ? '...' : gamification?.streak.current || 0}</p></div>
                        </div>

                        <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
                            <div className="flex items-center justify-between gap-3 text-xs font-bold"><span>Level {gamification?.level.current || 1} • {gamification?.level.label || 'Explorer'}</span><span>{Math.round(levelProgress)}%</span></div>
                            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-amber-300 to-fuchsia-400" style={{ width: `${levelProgress}%` }} /></div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            {earnedBadges.length > 0 ? earnedBadges.map(badge => (
                                <span key={badge.key} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${getBadgeTone(badge.accent_color)}`}>
                                    {getBadgeIcon(badge.icon)} {badge.label}
                                </span>
                            )) : <span className="text-sm text-slate-500">Badge pertama akan muncul setelah Anda mulai belajar.</span>}
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link href="/dashboard/rewards" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-amber-600"><Gift className="h-4 w-4" /> Lihat Reward</Link>
                            <Link href="/dashboard/certificates" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:text-blue-700"><BadgeCheck className="h-4 w-4" /> Badge & Sertifikat</Link>
                        </div>
                    </div>
                </section>
            </div>

            <section className="space-y-5">
                <SectionTitle
                    eyebrow="Temukan Hal Baru"
                    title="Rekomendasi pelatihan"
                    description="Pilihan lain yang bisa melanjutkan perjalanan belajar Anda."
                    action={<Link href="/courses" className="text-sm font-black text-blue-700 hover:underline">Jelajahi katalog</Link>}
                />
                {recommendations.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{recommendations.map(course => <RecommendationCard key={course.id} course={course} />)}</div>
                ) : (
                    <div className="rounded-[1.8rem] border border-dashed border-cyan-200 bg-cyan-50/60 p-7 text-center text-sm text-slate-500">Semua rekomendasi yang tersedia sudah Anda ikuti. Hebat!</div>
                )}
            </section>

            <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Progres Anda tersimpan otomatis
            </div>
        </div>
    );
}
