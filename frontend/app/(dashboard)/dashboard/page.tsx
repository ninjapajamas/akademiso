'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    ArrowRight,
    Award,
    BadgeCheck,
    BookOpen,
    Brain,
    Calendar,
    CheckCircle2,
    Flame,
    Flag,
    Gem,
    Medal,
    Rocket,
    Settings,
    ShieldCheck,
    Sparkles,
    Star,
    Target,
    Trophy,
    Zap,
} from 'lucide-react';

import {
    Certificate,
    Course,
    EnrolledCourse,
    GamificationActivityItem,
    GamificationBadge,
    GamificationLeaderboard,
    GamificationLeaderboardEntry,
    GamificationSummary,
} from '@/types';

type SkillChip = {
    courseId: number;
    courseTitle: string;
    label: string;
};

type SkillGroup = {
    courseId: number;
    courseTitle: string;
    skills: string[];
};

function decodeJwt(token: string) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

function formatShortDate(value?: string | null) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function getBadgeIcon(icon: string) {
    const className = 'h-4 w-4';

    switch (icon) {
        case 'sparkles':
            return <Sparkles className={className} />;
        case 'flame':
            return <Flame className={className} />;
        case 'brain':
            return <Brain className={className} />;
        case 'star':
            return <Star className={className} />;
        case 'flag':
            return <Flag className={className} />;
        case 'award':
            return <Award className={className} />;
        case 'book-open':
            return <BookOpen className={className} />;
        default:
            return <ShieldCheck className={className} />;
    }
}

function getAccentClass(color: string) {
    switch (color) {
        case 'orange':
            return 'border-orange-200 bg-orange-50 text-orange-700';
        case 'indigo':
            return 'border-indigo-200 bg-indigo-50 text-indigo-700';
        case 'amber':
            return 'border-amber-200 bg-amber-50 text-amber-700';
        case 'emerald':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'rose':
            return 'border-rose-200 bg-rose-50 text-rose-700';
        case 'cyan':
            return 'border-cyan-200 bg-cyan-50 text-cyan-700';
        default:
            return 'border-blue-200 bg-blue-50 text-blue-700';
    }
}

function getLearningActionLabel(progress?: number | null) {
    const normalizedProgress = progress || 0;

    if (normalizedProgress >= 100) return 'Lihat Lagi';
    if (normalizedProgress > 0) return 'Lanjutkan Belajar';
    return 'Mulai Belajar';
}

function getHeroMessage(pendingCount: number, streak: number) {
    if (pendingCount > 1) {
        return `Ada ${pendingCount} course yang bisa Anda dorong hari ini. Pilih satu, jaga ritme, lalu nikmati progres kecil yang terus menumpuk.`;
    }
    if (pendingCount === 1) {
        return 'Satu course lagi sedang menunggu untuk diteruskan. Sedikit progres hari ini akan terasa besar saat konsisten.';
    }
    if (streak > 0) {
        return `Semua course utama sudah rapi. Pertahankan streak ${streak} hari Anda dengan membuka materi baru atau mengulang yang paling penting.`;
    }
    return 'Semua progres utama sudah rapi. Ini saat yang pas untuk memulai course baru dan bikin dashboard Anda terasa hidup lagi.';
}

function getCourseMood(progress: number) {
    if (progress >= 100) return 'Semua materi sudah selesai. Waktunya review santai biar ilmunya makin nempel.';
    if (progress > 65) return 'Sedikit lagi tuntas. Satu sesi belajar lagi bisa bikin progress bar ini penuh.';
    if (progress > 0) return 'Anda sudah punya pijakan yang bagus. Lanjutkan dari materi terakhir supaya ritmenya tetap enak.';
    return 'Start yang ringan lebih baik daripada menunggu momen sempurna. Buka modul pertama dan mulai jalan.';
}

function getRecommendationReason(course: Course, enrolledCategoryIds: Set<number>) {
    if (course.category?.id && enrolledCategoryIds.has(course.category.id)) {
        return `Masih satu jalur dengan minat Anda di kategori ${course.category.name}.`;
    }
    if (course.is_featured) {
        return 'Sedang di-highlight dan cocok untuk menambah ritme belajar baru.';
    }
    if (course.level === 'Beginner') {
        return 'Ringan untuk dibuka sebagai course berikutnya tanpa terasa berat.';
    }
    return 'Bisa jadi alternatif segar untuk memperluas skill Anda berikutnya.';
}

function normalizeSkillLabel(value?: string | null) {
    const normalized = (value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    return normalized.length > 72 ? `${normalized.slice(0, 69).trim()}...` : normalized;
}

function getSkillCandidatesFromCourse(enrollment: EnrolledCourse) {
    const preferredSections = (enrollment.course.detail_sections || []).filter((section) => {
        const title = (section.title || '').toLowerCase();
        return (
            title.includes('hasil') ||
            title.includes('didapat') ||
            title.includes('tujuan') ||
            title.includes('pembelajaran')
        );
    });
    const sourceSections = preferredSections.length > 0
        ? preferredSections
        : (enrollment.course.detail_sections || []);

    const itemSkills = sourceSections
        .flatMap((section) => section.items || [])
        .map((item) => normalizeSkillLabel(item))
        .filter(Boolean);

    if (itemSkills.length > 0) {
        return itemSkills;
    }

    const fallbackTitle = normalizeSkillLabel(enrollment.course.title);
    return fallbackTitle ? [fallbackTitle] : [];
}

function SectionHeader({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>
            {action}
        </div>
    );
}

function EmptyCard({ message }: { message: string }) {
    return (
        <div className="rounded-[1.6rem] border border-dashed border-sky-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.8),rgba(255,255,255,0.95))] px-5 py-6 text-sm leading-6 text-slate-500">
            {message}
        </div>
    );
}

function MiniStat({
    label,
    value,
    caption,
    icon,
    tone,
}: {
    label: string;
    value: string;
    caption: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
}) {
    const Icon = icon;

    return (
        <div className={`rounded-[1.6rem] p-[1px] shadow-sm ${tone}`}>
            <div className="rounded-[calc(1.6rem-1px)] bg-white/88 p-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
                        <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{caption}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
    const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);
    const [gamification, setGamification] = useState<GamificationSummary | null>(null);
    const [leaderboard, setLeaderboard] = useState<GamificationLeaderboard | null>(null);
    const [activity, setActivity] = useState<GamificationActivityItem[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [username, setUsername] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const payload = decodeJwt(token);
        if (payload?.username) {
            setUsername(payload.username);
        }

        const fetchDashboardData = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const headers = { Authorization: `Bearer ${token}` };
                const [coursesRes, catalogRes, gamificationRes, leaderboardRes, activityRes, certificatesRes] = await Promise.all([
                    fetch(`${apiUrl}/api/my-courses/`, { headers }),
                    fetch(`${apiUrl}/api/courses/`, { headers }),
                    fetch(`${apiUrl}/api/gamification/summary/`, { headers }),
                    fetch(`${apiUrl}/api/gamification/leaderboard/`, { headers }),
                    fetch(`${apiUrl}/api/gamification/activity/`, { headers }),
                    fetch(`${apiUrl}/api/certificates/`, { headers }),
                ]);

                if (
                    coursesRes.status === 401 ||
                    catalogRes.status === 401 ||
                    gamificationRes.status === 401 ||
                    leaderboardRes.status === 401 ||
                    activityRes.status === 401 ||
                    certificatesRes.status === 401
                ) {
                    window.location.href = '/login';
                    return;
                }

                if (coursesRes.ok) {
                    setEnrolledCourses(await coursesRes.json());
                }
                if (catalogRes.ok) {
                    setCatalogCourses(await catalogRes.json());
                }
                if (gamificationRes.ok) {
                    setGamification(await gamificationRes.json());
                }
                if (leaderboardRes.ok) {
                    setLeaderboard(await leaderboardRes.json());
                }
                if (activityRes.ok) {
                    setActivity(await activityRes.json());
                }
                if (certificatesRes.ok) {
                    setCertificates(await certificatesRes.json());
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const latestCertificates = certificates.slice(0, 2);
    const earnedBadges = gamification?.badges.filter((badge) => badge.earned).slice(0, 3) || [];
    const nextBadges = gamification?.next_badges || [];
    const activeCourses = enrolledCourses.filter((course) => (course.progress_percentage || 0) < 100);
    const primaryCourse = activeCourses[0] || enrolledCourses[0] || null;
    const otherCourses = activeCourses.filter((course) => course.id !== primaryCourse?.id).slice(0, 3);
    const pendingCount = activeCourses.length;
    const enrolledCourseIds = new Set(enrolledCourses.map((enrollment) => enrollment.course.id));
    const enrolledCategoryIds = new Set(
        enrolledCourses
            .map((enrollment) => enrollment.course.category?.id)
            .filter((value): value is number => typeof value === 'number')
    );
    const approvedCertificateCourseIds = new Set(
        certificates
            .filter((certificate) => certificate.approval_status === 'APPROVED')
            .map((certificate) => certificate.course)
    );
    const unlockedSkills = enrolledCourses.reduce<SkillChip[]>((accumulator, enrollment) => {
        const isCourseCompleted = (enrollment.progress_percentage || 0) >= 100;
        const hasPostTestOrFinalExamScore = enrollment.post_test_score !== null && enrollment.post_test_score !== undefined;
        const hasApprovedCertificate = approvedCertificateCourseIds.has(enrollment.course.id);

        if (!isCourseCompleted || !hasPostTestOrFinalExamScore || !hasApprovedCertificate) {
            return accumulator;
        }

        const courseSkills = getSkillCandidatesFromCourse(enrollment);
        courseSkills.forEach((label) => {
            if (!accumulator.some((skill) => skill.label.toLowerCase() === label.toLowerCase())) {
                accumulator.push({
                    courseId: enrollment.course.id,
                    courseTitle: enrollment.course.title,
                    label,
                });
            }
        });

        return accumulator;
    }, []);
    const unlockedSkillGroups = unlockedSkills.reduce<SkillGroup[]>((accumulator, skill) => {
        const existingGroup = accumulator.find((group) => group.courseId === skill.courseId);
        if (existingGroup) {
            if (!existingGroup.skills.includes(skill.label)) {
                existingGroup.skills.push(skill.label);
            }
            return accumulator;
        }

        accumulator.push({
            courseId: skill.courseId,
            courseTitle: skill.courseTitle,
            skills: [skill.label],
        });
        return accumulator;
    }, []);
    const levelProgress = gamification?.level.progress_percentage || 0;
    const levelProgressBackground = `conic-gradient(#0ea5e9 0% ${levelProgress}%, #38bdf8 ${levelProgress}% ${Math.min(levelProgress + 10, 100)}%, rgba(148, 163, 184, 0.18) ${Math.min(levelProgress + 10, 100)}% 100%)`;
    const leaderboardRows = leaderboard?.leaders || [];
    const leaderboardEntries = leaderboard?.current_user_entry && !leaderboardRows.some((entry) => entry.user_id === leaderboard.current_user_entry?.user_id)
        ? [...leaderboardRows, leaderboard.current_user_entry].sort((left, right) => left.rank - right.rank)
        : leaderboardRows;
    const topLeaderboard = leaderboardEntries.slice(0, 3);
    const restLeaderboard = leaderboardEntries.slice(3, 6);
    const recommendedCourses = catalogCourses
        .filter((course) => (
            course.type === 'course' &&
            course.is_active &&
            course.elearning_enabled !== false &&
            !enrolledCourseIds.has(course.id)
        ))
        .sort((left, right) => {
            const leftCategoryMatch = left.category?.id && enrolledCategoryIds.has(left.category.id) ? 1 : 0;
            const rightCategoryMatch = right.category?.id && enrolledCategoryIds.has(right.category.id) ? 1 : 0;

            if (rightCategoryMatch !== leftCategoryMatch) {
                return rightCategoryMatch - leftCategoryMatch;
            }
            if (Number(right.is_featured) !== Number(left.is_featured)) {
                return Number(right.is_featured) - Number(left.is_featured);
            }
            if ((right.enrolled_count || 0) !== (left.enrolled_count || 0)) {
                return (right.enrolled_count || 0) - (left.enrolled_count || 0);
            }
            return Number(right.rating || 0) - Number(left.rating || 0);
        })
        .slice(0, 4);
    const heroMissionCards = [
        {
            label: 'Focus Hari Ini',
            value: primaryCourse ? primaryCourse.course.title : 'Cari course baru',
            icon: Target,
            tone: 'from-cyan-100 via-sky-50 to-white',
        },
        {
            label: 'Streak Aman',
            value: isLoading || !gamification ? '...' : `${gamification.streak.current} hari`,
            icon: Flame,
            tone: 'from-amber-100 via-orange-50 to-white',
        },
        {
            label: 'XP Berikutnya',
            value: isLoading || !gamification || gamification.level.next_level_xp === null ? 'Maks' : `${gamification.level.xp_to_next_level} XP`,
            icon: Rocket,
            tone: 'from-fuchsia-100 via-rose-50 to-white',
        },
        {
            label: 'Skill Unlock',
            value: isLoading ? '...' : `${unlockedSkills.length} skill`,
            icon: BadgeCheck,
            tone: 'from-emerald-100 via-lime-50 to-white',
        },
    ];
    const quickActions = [
        {
            href: '/dashboard/courses',
            label: 'Kursus Saya',
            desc: 'Lanjutkan materi aktif dan pantau semua progress.',
            icon: BookOpen,
            tone: 'from-cyan-400 via-sky-400 to-blue-500',
        },
        {
            href: '/dashboard/schedule',
            label: 'Jadwal',
            desc: 'Lihat kelas, webinar, dan assessment yang menunggu.',
            icon: Calendar,
            tone: 'from-violet-400 via-fuchsia-400 to-pink-500',
        },
        {
            href: '/dashboard/certificates',
            label: 'Sertifikat',
            desc: 'Buka dokumen resmi yang sudah berhasil diraih.',
            icon: Award,
            tone: 'from-amber-400 via-orange-400 to-rose-400',
        },
        {
            href: '/dashboard/settings',
            label: 'Pengaturan',
            desc: 'Atur profil, akun, dan detail belajar Anda.',
            icon: Settings,
            tone: 'from-emerald-400 via-teal-400 to-cyan-400',
        },
    ];
    const studyStats = [
        {
            label: 'Materi Selesai',
            value: gamification?.stats.completed_lessons ?? 0,
            tone: 'bg-cyan-50 text-cyan-700',
        },
        {
            label: 'Quiz Lulus',
            value: gamification?.stats.passed_quizzes ?? 0,
            tone: 'bg-violet-50 text-violet-700',
        },
        {
            label: 'Skor 100',
            value: gamification?.stats.perfect_quizzes ?? 0,
            tone: 'bg-amber-50 text-amber-700',
        },
        {
            label: 'Hari Aktif',
            value: gamification?.streak.active_days_this_week ?? 0,
            tone: 'bg-emerald-50 text-emerald-700',
        },
    ];

    const renderLeaderboardRow = (entry: GamificationLeaderboardEntry) => (
        <div
            key={`${entry.user_id}-${entry.rank}`}
            className={`flex items-center gap-3 rounded-[1.4rem] border px-3 py-3 ${
                entry.is_current_user
                    ? 'border-cyan-200 bg-[linear-gradient(135deg,rgba(236,254,255,0.95),rgba(239,246,255,0.95))]'
                    : 'border-slate-100 bg-slate-50/90'
            }`}
        >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-700 shadow-sm">
                #{entry.rank}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-slate-950">{entry.full_name}</p>
                    {entry.is_current_user && (
                        <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                            Anda
                        </span>
                    )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                    Level {entry.level.current} - {entry.total_xp} XP - Streak {entry.current_streak} hari
                </p>
            </div>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
            <section className="relative isolate overflow-hidden rounded-[2.4rem] border border-cyan-200/70 bg-[linear-gradient(135deg,rgba(236,254,255,1)_0%,rgba(239,246,255,0.95)_35%,rgba(253,242,248,0.95)_100%)] p-6 shadow-[0_32px_90px_rgba(14,116,144,0.16)] sm:p-8">
                <div className="absolute -left-10 top-10 h-28 w-28 rounded-full bg-cyan-300/30 blur-3xl" />
                <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-fuchsia-200/30 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-amber-200/20 blur-3xl" />
                <div className="absolute right-10 top-20 hidden h-24 w-24 rounded-[2rem] border border-white/50 bg-white/30 rotate-12 xl:block" />
                <div className="absolute left-16 bottom-10 hidden h-16 w-16 rounded-full border border-white/70 bg-white/20 xl:block" />

                <div className="relative z-10 grid gap-6 xl:grid-cols-[1.24fr_0.96fr]">
                    <div className="space-y-6">
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-sky-700 shadow-sm backdrop-blur">
                            <Sparkles className="h-3.5 w-3.5" />
                            Mode Belajar Aktif
                        </div>

                        <div>
                            <h1 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl xl:text-[2.75rem] xl:leading-[1.05]">
                                Dashboard yang lebih seru untuk bikin progres terasa dekat{username ? `, ${username}` : ''}.
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                {getHeroMessage(pendingCount, gamification?.streak.current || 0)}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link
                                href={primaryCourse ? `/learn/${primaryCourse.course.slug}${primaryCourse.course.last_accessed_lesson_id ? `?lesson=${primaryCourse.course.last_accessed_lesson_id}` : ''}` : '/courses'}
                                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition-transform hover:-translate-y-0.5"
                            >
                                {primaryCourse ? getLearningActionLabel(primaryCourse.progress_percentage) : 'Jelajahi Kursus'}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/dashboard/certificates"
                                className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/85 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5 hover:border-cyan-200 hover:text-sky-700"
                            >
                                Lihat Sertifikat
                                <Award className="h-4 w-4" />
                            </Link>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <MiniStat
                                label="Course Aktif"
                                value={isLoading ? '...' : String(activeCourses.length || enrolledCourses.length)}
                                caption="Semua jalur belajar yang masih berjalan."
                                icon={BookOpen}
                                tone="bg-[linear-gradient(135deg,rgba(34,211,238,0.48),rgba(96,165,250,0.28),rgba(255,255,255,0.8))]"
                            />
                            <MiniStat
                                label="Total XP"
                                value={isLoading || !gamification ? '...' : `${gamification.total_xp}`}
                                caption="Poin yang terus mengisi level Anda."
                                icon={Zap}
                                tone="bg-[linear-gradient(135deg,rgba(251,191,36,0.42),rgba(253,186,116,0.26),rgba(255,255,255,0.85))]"
                            />
                            <MiniStat
                                label="Streak"
                                value={isLoading || !gamification ? '...' : `${gamification.streak.current} hari`}
                                caption="Irama belajar yang sedang Anda jaga."
                                icon={Flame}
                                tone="bg-[linear-gradient(135deg,rgba(251,146,60,0.38),rgba(244,114,182,0.22),rgba(255,255,255,0.82))]"
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {heroMissionCards.map((card) => (
                                <div
                                    key={card.label}
                                    className={`rounded-[1.6rem] border border-white/60 bg-gradient-to-br ${card.tone} p-4 shadow-sm`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                                            <p className="mt-2 text-sm font-bold leading-6 text-slate-950">{card.value}</p>
                                        </div>
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-slate-700 shadow-sm">
                                            <card.icon className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>

                    <div className="rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur xl:self-start">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">Quest Board</p>
                                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                                    {isLoading || !gamification ? 'Memuat progres...' : `Level ${gamification.level.current} - ${gamification.level.label}`}
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {isLoading || !gamification ? 'Ringkasan progres sedang disiapkan.' : gamification.next_focus}
                                </p>
                            </div>
                            <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,#0f172a,#0ea5e9)] text-white shadow-lg shadow-sky-500/20">
                                <Trophy className="h-6 w-6" />
                            </div>
                        </div>

                        <div className="mt-5 rounded-[1.6rem] bg-[linear-gradient(135deg,rgba(15,23,42,0.03),rgba(14,165,233,0.04))] p-1">
                            <div className="rounded-[calc(1.6rem-4px)] bg-white/85 p-4">
                                <div className="grid gap-4 lg:grid-cols-[170px_1fr] xl:grid-cols-1 2xl:grid-cols-[170px_1fr]">
                                    <div className="flex items-center justify-center rounded-[1.6rem] bg-slate-950 p-4 text-white shadow-xl shadow-slate-950/10">
                                        <div className="relative flex h-36 w-36 items-center justify-center rounded-full" style={{ background: levelProgressBackground }}>
                                            <div className="absolute inset-[12px] rounded-full bg-slate-950" />
                                            <div className="relative z-10 text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Progress XP</p>
                                                <p className="mt-2 text-3xl font-black text-white">{isLoading ? '...' : `${levelProgress}%`}</p>
                                                <p className="mt-1 text-[11px] text-cyan-300">
                                                    {isLoading || !gamification || gamification.level.next_level_xp === null
                                                        ? 'Level maksimum'
                                                        : `${gamification.level.xp_to_next_level} XP lagi`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="rounded-[1.4rem] bg-[linear-gradient(135deg,rgba(240,249,255,0.95),rgba(255,255,255,0.92))] p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Menuju Level Berikutnya</p>
                                                    <p className="mt-2 text-lg font-black text-slate-950">
                                                        {isLoading || !gamification || gamification.level.next_level_xp === null
                                                            ? 'Semua level sudah terbuka'
                                                            : `${gamification.level.xp_to_next_level} XP lagi`}
                                                    </p>
                                                </div>
                                                <Rocket className="h-5 w-5 text-sky-500" />
                                            </div>
                                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                                                <div
                                                    className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6)]"
                                                    style={{ width: `${levelProgress}%` }}
                                                />
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                                                <span>{gamification?.level.current_level_xp || 0} XP</span>
                                                <span>{gamification?.level.next_level_xp ?? 'MAX'} XP</span>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-[1.4rem] bg-[linear-gradient(135deg,rgba(250,245,255,0.95),rgba(255,255,255,0.92))] p-4">
                                                <div className="flex items-center gap-2 text-violet-600">
                                                    <Gem className="h-4 w-4" />
                                                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">Badge Terbuka</p>
                                                </div>
                                                <p className="mt-3 text-3xl font-black text-slate-950">
                                                    {isLoading || !gamification ? '...' : gamification.earned_badges_count}
                                                </p>
                                            </div>
                                            <div className="rounded-[1.4rem] bg-[linear-gradient(135deg,rgba(254,252,232,0.95),rgba(255,255,255,0.92))] p-4">
                                                <div className="flex items-center gap-2 text-amber-600">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">Course Selesai</p>
                                                </div>
                                                <p className="mt-3 text-3xl font-black text-slate-950">
                                                    {isLoading || !gamification ? '...' : gamification.stats.completed_courses}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="rounded-[1.4rem] border border-dashed border-cyan-200 bg-cyan-50/70 p-4">
                                            <div className="flex items-center gap-2 text-cyan-700">
                                                <Target className="h-4 w-4" />
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em]">Mood Belajar</p>
                                            </div>
                                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                                                {pendingCount > 0
                                                    ? 'Masih ada progress yang bisa dikejar. Pilih satu target kecil dan tuntaskan sebelum pindah ke hal lain.'
                                                    : 'Dashboard Anda sedang rapi. Waktu yang bagus untuk eksplor materi baru atau review poin penting.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.8rem] border border-white/70 bg-white/82 p-5 shadow-sm backdrop-blur xl:col-span-2">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                    <BadgeCheck className="h-3.5 w-3.5" />
                                    Skill Sudah Dimiliki
                                </div>
                                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                                    Koleksi skill Anda mulai terbentuk dari course yang benar-benar selesai.
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Skill akan muncul setelah course selesai 100%, post-test atau assessment akhir sudah dikerjakan, dan sertifikatnya sudah didapatkan.
                                </p>
                            </div>
                            <div className="rounded-[1.4rem] bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(59,130,246,0.12))] px-4 py-3 text-left shadow-sm lg:min-w-[220px]">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Skill Terkumpul</p>
                                <p className="mt-2 text-3xl font-black text-slate-950">{isLoading ? '...' : unlockedSkills.length}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">Siap dipakai sebagai bukti kompetensi belajar.</p>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                            {isLoading ? (
                                [1, 2].map((item) => (
                                    <div key={item} className="h-44 animate-pulse rounded-[1.6rem] bg-slate-100" />
                                ))
                            ) : unlockedSkillGroups.length > 0 ? (
                                unlockedSkillGroups.map((group, index) => (
                                    <div
                                        key={group.courseId}
                                        className={`rounded-[1.6rem] border p-4 shadow-sm transition-transform hover:-translate-y-0.5 ${
                                            index % 4 === 0
                                                ? 'border-cyan-100 bg-[linear-gradient(135deg,rgba(236,254,255,0.95),rgba(255,255,255,1))]'
                                                : index % 4 === 1
                                                    ? 'border-fuchsia-100 bg-[linear-gradient(135deg,rgba(253,242,248,0.95),rgba(255,255,255,1))]'
                                                    : index % 4 === 2
                                                        ? 'border-amber-100 bg-[linear-gradient(135deg,rgba(255,251,235,0.95),rgba(255,255,255,1))]'
                                                        : 'border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(255,255,255,1))]'
                                        }`}
                                        title={group.courseTitle}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Unlocked dari Course</p>
                                                <h3 className="mt-2 text-base font-black leading-6 text-slate-950">{group.courseTitle}</h3>
                                            </div>
                                            <div className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                                                {group.skills.length} skill
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {group.skills.map((skillLabel, skillIndex) => (
                                                <div
                                                    key={`${group.courseId}-${skillLabel}`}
                                                    className={`rounded-full px-3 py-2 text-xs font-bold shadow-sm ${
                                                        skillIndex % 3 === 0
                                                            ? 'bg-white text-cyan-700'
                                                            : skillIndex % 3 === 1
                                                                ? 'bg-white text-fuchsia-700'
                                                                : 'bg-white text-emerald-700'
                                                    }`}
                                                >
                                                    <span className="inline-flex items-center gap-2">
                                                        <Sparkles className="h-3.5 w-3.5" />
                                                        {skillLabel}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-[1.4rem] border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-4 text-sm leading-6 text-slate-600 lg:col-span-2">
                                    Belum ada skill yang terkunci. Selesaikan course, kerjakan post-test atau assessment akhir, lalu dapatkan sertifikat untuk membuka skill pertama Anda.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                <div className="rounded-[1.9rem] border border-slate-100 bg-white p-6 shadow-sm">
                    <SectionHeader
                        title="Lanjutkan Perjalanan Belajar"
                        description="Course utama yang paling pas untuk Anda buka sekarang."
                        action={
                            <Link href="/dashboard/courses" className="hidden items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700 sm:inline-flex">
                                Semua Course <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        }
                    />

                    <div className="mt-5">
                        {isLoading ? (
                            <div className="h-80 animate-pulse rounded-[1.7rem] bg-slate-50" />
                        ) : primaryCourse ? (
                            <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
                                <div className="relative overflow-hidden rounded-[1.8rem] border border-cyan-100 bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(255,255,255,1),rgba(253,242,248,0.9))] p-5">
                                    <div className="absolute -right-8 top-4 h-24 w-24 rounded-full bg-cyan-200/30 blur-2xl" />
                                    <div className="absolute bottom-0 right-0 h-28 w-28 rounded-full bg-fuchsia-100/40 blur-2xl" />

                                    <div className="relative z-10 flex items-start justify-between gap-3">
                                        <div>
                                            <span className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                                {primaryCourse.course.category?.name || 'ISO'}
                                            </span>
                                            <h3 className="mt-4 text-2xl font-black leading-tight tracking-tight text-slate-950">
                                                {primaryCourse.course.title}
                                            </h3>
                                            <p className="mt-2 text-sm text-slate-600">
                                                Trainer {primaryCourse.course.instructor?.name || '-'} - Terdaftar {formatShortDate(primaryCourse.created_at)}
                                            </p>
                                            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
                                                {getCourseMood(primaryCourse.progress_percentage || 0)}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.3rem] bg-white px-3 py-2 text-right shadow-sm">
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Progress</p>
                                            <p className="mt-1 text-2xl font-black text-sky-700">{primaryCourse.progress_percentage || 0}%</p>
                                        </div>
                                    </div>

                                    <div className="relative z-10 mt-6">
                                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                                            <span>Checkpoint utama</span>
                                            <span>{primaryCourse.progress_percentage || 0}% selesai</span>
                                        </div>
                                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white shadow-inner">
                                            <div
                                                className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6)]"
                                                style={{ width: `${primaryCourse.progress_percentage || 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="relative z-10 mt-5 flex flex-wrap gap-2">
                                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                                            {primaryCourse.course.last_accessed_lesson_id ? 'Materi terakhir tersimpan' : 'Siap mulai dari awal'}
                                        </span>
                                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                                            {primaryCourse.progress_percentage === 100 ? 'Review mode' : 'Momentum mode'}
                                        </span>
                                    </div>

                                    <div className="relative z-10 mt-6 flex flex-wrap gap-3">
                                        <Link
                                            href={primaryCourse.course.last_accessed_lesson_id ? `/learn/${primaryCourse.course.slug}?lesson=${primaryCourse.course.last_accessed_lesson_id}` : `/learn/${primaryCourse.course.slug}`}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition-transform hover:-translate-y-0.5"
                                        >
                                            {getLearningActionLabel(primaryCourse.progress_percentage)}
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                        <Link
                                            href="/dashboard/schedule"
                                            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-100 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-transform hover:-translate-y-0.5 hover:border-cyan-200 hover:text-sky-700"
                                        >
                                            Cek Jadwal
                                            <Calendar className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="rounded-[1.7rem] border border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))] p-5">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <Sparkles className="h-4 w-4 text-sky-500" />
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Ringkasan Belajar</p>
                                        </div>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                            {studyStats.map((item) => (
                                                <div key={item.label} className={`rounded-[1.3rem] p-4 ${item.tone}`}>
                                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">{item.label}</p>
                                                    <p className="mt-2 text-2xl font-black">{item.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-[1.7rem] border border-dashed border-fuchsia-200 bg-fuchsia-50/60 p-5">
                                        <div className="flex items-center gap-2 text-fuchsia-700">
                                            <Medal className="h-4 w-4" />
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em]">Mini Checklist</p>
                                        </div>
                                        <div className="mt-4 space-y-3 text-sm">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-fuchsia-600" />
                                                <p className="leading-6 text-slate-700">Buka lagi course utama agar progres tetap terasa hidup.</p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-fuchsia-600" />
                                                <p className="leading-6 text-slate-700">Kejar satu kemenangan kecil, entah satu materi atau satu quiz.</p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-fuchsia-600" />
                                                <p className="leading-6 text-slate-700">Setelah selesai, cek leaderboard dan lihat hasilnya bertambah.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <EmptyCard message="Belum ada course aktif. Mulai dari course pertama Anda supaya dashboard ini langsung terasa hidup dengan progress dan badge baru." />
                        )}
                    </div>

                    {!isLoading && otherCourses.length > 0 && (
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {otherCourses.map((enrollment, index) => (
                                <div
                                    key={enrollment.id}
                                    className={`rounded-[1.5rem] border p-4 shadow-sm ${
                                        index === 0
                                            ? 'border-cyan-100 bg-cyan-50/70'
                                            : index === 1
                                                ? 'border-violet-100 bg-violet-50/70'
                                                : 'border-amber-100 bg-amber-50/70'
                                    }`}
                                >
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        {enrollment.course.category?.name || 'ISO'}
                                    </p>
                                    <h4 className="mt-2 line-clamp-2 text-sm font-bold text-slate-950">{enrollment.course.title}</h4>
                                    <p className="mt-1 text-xs text-slate-500">{enrollment.progress_percentage || 0}% selesai</p>
                                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/90">
                                        <div
                                            className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4,#3b82f6)]"
                                            style={{ width: `${enrollment.progress_percentage || 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="rounded-[1.9rem] border border-slate-100 bg-white p-6 shadow-sm">
                        <SectionHeader
                            title="Quick Access"
                            description="Pintu masuk cepat ke area yang paling sering Anda butuhkan."
                        />
                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {quickActions.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`group rounded-[1.5rem] bg-gradient-to-br ${item.tone} p-[1px] transition-transform hover:-translate-y-1`}
                                >
                                    <div className="rounded-[calc(1.5rem-1px)] bg-white/90 p-4 backdrop-blur">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <p className="mt-4 text-sm font-black text-slate-950">{item.label}</p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[1.9rem] border border-slate-100 bg-white p-6 shadow-sm">
                        <SectionHeader
                            title="Badge dan Target"
                            description="Sedikit rasa koleksi supaya progres terasa lebih menyenangkan."
                        />

                        <div className="mt-5 space-y-3">
                            {isLoading ? (
                                [1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-[1.5rem] bg-slate-50" />)
                            ) : earnedBadges.length > 0 ? (
                                earnedBadges.map((badge: GamificationBadge) => (
                                    <div key={badge.key} className={`rounded-[1.5rem] border p-4 ${getAccentClass(badge.accent_color)}`}>
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 shadow-sm">
                                                {getBadgeIcon(badge.icon)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-black">{badge.label}</p>
                                                    <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                                                        unlocked
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs leading-5 opacity-90">{badge.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyCard message="Belum ada badge yang terbuka. Selesaikan satu materi dulu dan bagian ini akan langsung terasa lebih seru." />
                            )}
                        </div>

                        <div className="mt-5 space-y-3">
                            {nextBadges.slice(0, 2).map((badge) => (
                                <div key={badge.key} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/90 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border bg-white ${getAccentClass(badge.accent_color)}`}>
                                            {getBadgeIcon(badge.icon)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-black text-slate-950">{badge.label}</p>
                                                <p className="text-xs font-bold text-slate-500">{badge.progress_percentage}%</p>
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">{badge.description}</p>
                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                                                <div
                                                    className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6,#ec4899,#f59e0b)]"
                                                    style={{ width: `${badge.progress_percentage}%` }}
                                                />
                                            </div>
                                            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                {badge.progress_current} / {badge.progress_target}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <SectionHeader
                    title="Pusat Aktivitas"
                    description="Aktivitas terbaru, posisi leaderboard, dan sertifikat Anda kini dirapikan dalam satu area yang lebih nyaman dipantau."
                    action={
                        <Link href="/dashboard/certificates" className="hidden items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700 sm:inline-flex">
                            Lihat Sertifikat <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    }
                />

                <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_1fr_0.92fr]">
                    <div className="rounded-[1.7rem] border border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))] p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Aktivitas Terbaru</p>
                                <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">Semua kemenangan kecil Anda</h3>
                            </div>
                            <div className="rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
                                <Sparkles className="h-5 w-5" />
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            {isLoading ? (
                                [1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-[1.5rem] bg-slate-100" />)
                            ) : activity.length > 0 ? (
                                activity.slice(0, 4).map((item) => (
                                    <div key={item.id} className="rounded-[1.5rem] border border-slate-100 bg-white/90 p-4 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border bg-white ${getAccentClass(item.accent_color)}`}>
                                                {getBadgeIcon(item.icon)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-sm font-black text-slate-950">{item.title}</p>
                                                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700">
                                                        +{item.xp_earned} XP
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                                                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                    {formatShortDate(item.occurred_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyCard message="Aktivitas belajar akan muncul di sini setelah Anda menyelesaikan materi atau quiz." />
                            )}
                        </div>
                    </div>

                    <div className="rounded-[1.7rem] border border-slate-100 bg-[linear-gradient(180deg,rgba(255,251,235,0.6),rgba(255,255,255,1))] p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Leaderboard Peserta</p>
                                <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">Kompetitif tapi tetap sehat</h3>
                            </div>
                            <div className="rounded-full bg-amber-50 px-3 py-2 text-sm font-black text-amber-700">
                                Top {isLoading ? '...' : leaderboardEntries.length}
                            </div>
                        </div>

                        <div className="mt-5 space-y-4">
                            {isLoading ? (
                                [1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-[1.5rem] bg-slate-100" />)
                            ) : leaderboardEntries.length > 0 ? (
                                <>
                                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                                        {topLeaderboard.map((entry, index) => (
                                            <div
                                                key={`${entry.user_id}-${entry.rank}-hero`}
                                                className={`rounded-[1.5rem] p-4 ${
                                                    index === 0
                                                        ? 'bg-[linear-gradient(180deg,rgba(254,243,199,0.95),rgba(255,255,255,1))]'
                                                        : index === 1
                                                            ? 'bg-[linear-gradient(180deg,rgba(226,232,240,0.95),rgba(255,255,255,1))]'
                                                            : 'bg-[linear-gradient(180deg,rgba(254,215,170,0.95),rgba(255,255,255,1))]'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-slate-700 shadow-sm">
                                                        {index === 0 ? <Trophy className="h-5 w-5 text-amber-500" /> : <Medal className="h-5 w-5 text-slate-500" />}
                                                    </div>
                                                    <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                        #{entry.rank}
                                                    </span>
                                                </div>
                                                <p className="mt-4 text-sm font-black text-slate-950">{entry.full_name}</p>
                                                <p className="mt-1 text-xs text-slate-500">{entry.total_xp} XP</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-3">
                                        {restLeaderboard.map(renderLeaderboardRow)}
                                        {leaderboardEntries.length <= 3 && leaderboardEntries.map((entry) => entry.is_current_user && !topLeaderboard.some((item) => item.user_id === entry.user_id) ? renderLeaderboardRow(entry) : null)}
                                    </div>
                                </>
                            ) : (
                                <EmptyCard message="Leaderboard akan muncul setelah peserta mulai mengumpulkan progres belajar." />
                            )}
                        </div>
                    </div>

                    <div className="rounded-[1.7rem] border border-slate-100 bg-[linear-gradient(180deg,rgba(255,247,237,0.8),rgba(255,255,255,1))] p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Sertifikat Terbaru</p>
                                <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">Trofi resmi Anda</h3>
                            </div>
                            <div className="rounded-2xl bg-white p-3 text-amber-600 shadow-sm">
                                <Award className="h-5 w-5" />
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            {isLoading ? (
                                [1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-[1.5rem] bg-slate-100" />)
                            ) : latestCertificates.length > 0 ? (
                                latestCertificates.map((certificate) => (
                                    <div
                                        key={certificate.id}
                                        className="rounded-[1.5rem] border border-amber-100 bg-white/90 p-4 shadow-sm"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm">
                                                <Award className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-slate-950">{certificate.course_title || 'Sertifikat Akademiso'}</p>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    {certificate.exam_title || 'Pelatihan Bersertifikat'} - {formatShortDate(certificate.issue_date)}
                                                </p>
                                                <Link
                                                    href="/dashboard/certificates"
                                                    className="mt-3 inline-flex items-center gap-1 text-xs font-black text-amber-700 hover:text-amber-800"
                                                >
                                                    Buka Sertifikat <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyCard message="Sertifikat akan muncul di sini setelah Anda lulus assessment dan sudah disetujui admin." />
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <SectionHeader
                    title="Rekomendasi Course"
                    description="Pilihan course berikutnya yang paling mungkin terasa nyambung dengan perjalanan belajar Anda sekarang."
                    action={
                        <Link href="/courses" className="hidden items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700 sm:inline-flex">
                            Lihat Katalog <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    }
                />

                <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
                    {isLoading ? (
                        [1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="h-44 min-w-[340px] flex-shrink-0 animate-pulse rounded-[1.7rem] bg-slate-100 lg:min-w-[420px]"
                            />
                        ))
                    ) : recommendedCourses.length > 0 ? (
                        recommendedCourses.map((course, index) => (
                            <div
                                key={course.id}
                                className={`min-w-[340px] flex-shrink-0 rounded-[1.7rem] border p-5 shadow-sm transition-transform hover:-translate-y-1 lg:min-w-[420px] ${
                                    index % 4 === 0
                                        ? 'border-cyan-100 bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(255,255,255,1))]'
                                        : index % 4 === 1
                                            ? 'border-violet-100 bg-[linear-gradient(135deg,rgba(245,243,255,1),rgba(255,255,255,1))]'
                                            : index % 4 === 2
                                                ? 'border-amber-100 bg-[linear-gradient(135deg,rgba(255,251,235,1),rgba(255,255,255,1))]'
                                                : 'border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,1),rgba(255,255,255,1))]'
                                }`}
                            >
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex min-w-0 items-start gap-4">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] bg-white/90 text-slate-700 shadow-sm">
                                            <BookOpen className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap gap-2">
                                                <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                                                    {course.category?.name || 'ISO'}
                                                </span>
                                                {course.is_featured && (
                                                    <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                                        Pilihan Editor
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="mt-3 text-lg font-black leading-7 tracking-tight text-slate-950">
                                                {course.title}
                                            </h3>
                                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                                {getRecommendationReason(course, enrolledCategoryIds)}
                                            </p>

                                            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                                                <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                                                    Level {course.level}
                                                </span>
                                                <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                                                    {course.duration}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 lg:justify-end">
                                        <Link
                                            href={`/courses/${course.slug}`}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition-transform hover:-translate-y-0.5"
                                        >
                                            Lihat Detail
                                        <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <EmptyCard message="Belum ada rekomendasi course baru untuk ditampilkan. Coba cek katalog untuk melihat program lain yang tersedia." />
                    )}
                </div>
            </section>
        </div>
    );
}
