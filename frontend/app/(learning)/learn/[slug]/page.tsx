'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { useState, useEffect, use, useMemo, useCallback, useRef } from 'react';
import {
    PlayCircle,
    CheckCircle,
    Lock,
    FileText,
    Download,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    ChevronDown,
    Clock,
    AlertCircle,
    HelpCircle,
    Trophy,
    CheckCircle2,
    RotateCcw,
    ArrowRight,
    Sparkles,
    Video,
    Medal,
    Crown,
    PartyPopper,
    UserRound,
    Rocket,
    Star
} from 'lucide-react';
import Link from 'next/link';
import { QuizLeaderboard } from '@/types';

const ASSESSMENT_LESSON_TYPES = ['quiz', 'mid_test', 'final_test', 'exam'];
const QUESTION_TYPE_SHORT_ANSWER = 'SHORT_ANSWER';
const LESSON_TABS = [
    { key: 'deskripsi', label: 'Deskripsi' },
    { key: 'sumber-daya', label: 'File Penunjang' },
] as const;
const isAssessmentLesson = (type?: string) => ASSESSMENT_LESSON_TYPES.includes(type || '');
const getLessonTypeLabel = (type?: string) => {
    if (type === 'quiz') return 'Quiz';
    if (type === 'mid_test') return 'Pre-Test';
    if (type === 'final_test') return 'Post-Test';
    if (type === 'exam') return 'Ujian Mandiri';
    if (type === 'video') return 'Video';
    if (type === 'article') return 'Artikel';
    return type || 'Materi';
};
const normalizeTabKey = (value?: string | null) => {
    if (!value) return 'deskripsi';
    const normalizedValue = value.trim().toLowerCase();
    return LESSON_TABS.some((tab) => tab.key === normalizedValue) ? normalizedValue : 'deskripsi';
};
const getAttachmentLabel = (lesson: { attachment?: string | null; attachment_name?: string } | null) => {
    if (!lesson) return '';
    if (lesson.attachment_name) return lesson.attachment_name;
    if (!lesson.attachment) return '';

    const segments = lesson.attachment.split('/');
    const filename = segments[segments.length - 1] || '';
    return decodeURIComponent(filename.split('?')[0] || '');
};

const shuffleQuestions = <T,>(items: T[]) => {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
};

const quizConfettiColors = ['#2563eb', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];

const getGamificationBadgeIcon = (icon?: string) => {
    const className = 'h-4 w-4';
    if (icon === 'medal') return <Medal className={className} />;
    if (icon === 'crown') return <Crown className={className} />;
    if (icon === 'rocket') return <Rocket className={className} />;
    if (icon === 'star') return <Star className={className} />;
    if (icon === 'brain') return <HelpCircle className={className} />;
    if (icon === 'award') return <Trophy className={className} />;
    return <Sparkles className={className} />;
};

const QuizLeaderboardPanel = ({ leaderboard, loading }: { leaderboard: QuizLeaderboard | null; loading: boolean }) => {
    if (loading) {
        return <div className="h-52 animate-pulse rounded-[2rem] bg-gradient-to-r from-fuchsia-50 via-amber-50 to-cyan-50" />;
    }
    if (!leaderboard) return null;

    const rows = leaderboard.leaders || [];
    const barTones = [
        'from-amber-300 via-orange-400 to-rose-400',
        'from-cyan-300 via-sky-400 to-blue-500',
        'from-fuchsia-300 via-pink-400 to-rose-500',
        'from-violet-300 via-purple-400 to-indigo-500',
        'from-emerald-300 via-teal-400 to-cyan-500',
    ];
    const rankTones = [
        'bg-amber-100 text-amber-700 ring-amber-200',
        'bg-sky-100 text-sky-700 ring-sky-200',
        'bg-pink-100 text-pink-700 ring-pink-200',
        'bg-violet-100 text-violet-700 ring-violet-200',
        'bg-emerald-100 text-emerald-700 ring-emerald-200',
    ];

    return (
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50 p-5 text-left shadow-sm sm:p-6">
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-amber-200/35 blur-3xl" />
            <div className="absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-cyan-200/35 blur-3xl" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20">
                        <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-500">Top 5 {leaderboard.lesson_label}</p>
                        <h4 className="text-lg font-black text-slate-950">Leaderboard Ceria</h4>
                    </div>
                </div>
                <span className="relative inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-600 shadow-sm">
                    <Medal className="h-3.5 w-3.5" /> Masuk Top 5 dapat badge
                </span>
            </div>

            {rows.length > 0 ? (
                <div className="relative mt-5 grid gap-3">
                    {rows.map((entry, index) => {
                        const score = Math.max(0, Math.min(100, Math.round(entry.score)));
                        return (
                            <div key={entry.user_id} className={`rounded-2xl border p-3 transition sm:grid sm:grid-cols-[2.5rem_minmax(9rem,13rem)_1fr_3.5rem] sm:items-center sm:gap-3 ${entry.is_current_user ? 'border-blue-300 bg-blue-50/90 shadow-md shadow-blue-100' : 'border-white bg-white/90 shadow-sm'}`}>
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black ring-1 ${rankTones[index] || rankTones[4]}`}>
                                    {entry.rank === 1 ? <Crown className="h-4 w-4" /> : `#${entry.rank}`}
                                </div>
                                <div className="mt-3 flex min-w-0 items-center gap-2 sm:mt-0">
                                    {entry.avatar_url ? (
                                        <img src={entry.avatar_url} alt={entry.full_name} className="h-9 w-9 shrink-0 rounded-xl object-cover" />
                                    ) : (
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700"><UserRound className="h-4 w-4" /></div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-slate-900">{entry.full_name}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{entry.is_current_user ? 'Anda' : `Peringkat ${entry.rank}`}</p>
                                    </div>
                                </div>
                                <div className="mt-3 h-8 overflow-hidden rounded-xl bg-slate-100 p-1 sm:mt-0" role="progressbar" aria-label={`Skor ${entry.full_name}`} aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
                                    <div className={`flex h-full min-w-8 items-center justify-end rounded-lg bg-gradient-to-r px-2 shadow-sm ${barTones[index] || barTones[4]}`} style={{ width: `${Math.max(score, 8)}%` }}>
                                        <Sparkles className="h-3 w-3 text-white/80" />
                                    </div>
                                </div>
                                <div className="mt-2 text-right text-lg font-black text-slate-900 sm:mt-0">{score}%</div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-fuchsia-200 bg-white/70 p-5 text-center text-sm text-slate-500">
                    Belum ada skor. Jadilah peserta pertama yang mengisi leaderboard!
                </div>
            )}

            {leaderboard.current_user_entry && (
                <p className="mt-3 rounded-xl bg-white/80 px-4 py-2 text-xs font-bold text-slate-600">
                    Posisi Anda saat ini #{leaderboard.current_user_entry.rank} dengan skor {Math.round(leaderboard.current_user_entry.score)}%.
                </p>
            )}
        </section>
    );
};

const QuizPlayer = ({
    lesson,
    onComplete,
    onProgressChange,
}: {
    lesson: any;
    onComplete?: () => void;
    onProgressChange?: (inProgress: boolean) => void;
}) => {
    const quiz = lesson.quiz_data as { questions?: any[]; pass_score?: number; time_limit?: number | null } | undefined;
    const timeLimitSeconds = Math.max(0, Number(quiz?.time_limit || 0) * 60);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [feedbackForm, setFeedbackForm] = useState({ criticism: '', suggestion: '' });
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackSaving, setFeedbackSaving] = useState(false);
    const [feedbackLoaded, setFeedbackLoaded] = useState(false);
    const [hasFeedback, setHasFeedback] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    const [secondsRemaining, setSecondsRemaining] = useState(timeLimitSeconds);
    const [hasStarted, setHasStarted] = useState(false);
    const [leaderboard, setLeaderboard] = useState<QuizLeaderboard | null>(null);
    const [leaderboardLoading, setLeaderboardLoading] = useState(true);
    const [showPostTestConfetti, setShowPostTestConfetti] = useState(false);
    const autoSubmittedRef = useRef(false);

    const isPostTestLesson = lesson.type === 'final_test';
    const questions = quiz?.questions;
    const orderedQuestions = useMemo<any[]>(() => {
        if (!questions?.length) {
            return [];
        }
        return shuffleQuestions(questions);
    }, [questions]);

    const handleSubmit = useCallback(async () => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const res = await fetch(`${apiUrl}/api/lessons/${lesson.id}/quiz-attempt/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ answers })
            });
            if (res.ok) {
                const data = await res.json();
                setResult(data);
                if (data.leaderboard) setLeaderboard(data.leaderboard);
            } else {
                alert('Gagal mengirim jawaban. Silakan coba lagi.');
            }
        } catch (error) {
            console.error('Quiz submission error:', error);
            alert('Terjadi kesalahan koneksi.');
        } finally {
            setSubmitting(false);
        }
    }, [answers, lesson.id]);

    useEffect(() => {
        setSecondsRemaining(timeLimitSeconds);
        setHasStarted(false);
        autoSubmittedRef.current = false;
    }, [lesson.id, timeLimitSeconds]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchLeaderboard = async () => {
            setLeaderboardLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = getClientApiBaseUrl();
                const response = await fetch(`${apiUrl}/api/lessons/${lesson.id}/quiz-leaderboard/`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                if (response.ok) setLeaderboard(await response.json());
            } catch (error) {
                if ((error as Error).name !== 'AbortError') console.error('Leaderboard fetch error:', error);
            } finally {
                if (!controller.signal.aborted) setLeaderboardLoading(false);
            }
        };
        void fetchLeaderboard();
        return () => controller.abort();
    }, [lesson.id]);

    useEffect(() => {
        if (!result || !isPostTestLesson) return;
        setShowPostTestConfetti(true);
        const timer = window.setTimeout(() => setShowPostTestConfetti(false), 2300);
        return () => window.clearTimeout(timer);
    }, [isPostTestLesson, result]);

    useEffect(() => {
        if (!hasStarted || !timeLimitSeconds || result) return;
        const timer = window.setInterval(() => {
            setSecondsRemaining(previous => Math.max(previous - 1, 0));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [hasStarted, result, timeLimitSeconds]);

    useEffect(() => {
        const inProgress = hasStarted && !result;
        onProgressChange?.(inProgress);
        if (!inProgress) return;

        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', warnBeforeUnload);
            onProgressChange?.(false);
        };
    }, [hasStarted, onProgressChange, result]);

    useEffect(() => {
        if (
            timeLimitSeconds > 0
            && secondsRemaining === 0
            && !result
            && !submitting
            && !autoSubmittedRef.current
        ) {
            autoSubmittedRef.current = true;
            void handleSubmit();
        }
    }, [handleSubmit, result, secondsRemaining, submitting, timeLimitSeconds]);

    useEffect(() => {
        if (!result || !isPostTestLesson) {
            return;
        }

        const controller = new AbortController();

        const fetchExistingFeedback = async () => {
            setFeedbackLoading(true);
            setFeedbackError(null);

            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = getClientApiBaseUrl();
                const res = await fetch(`${apiUrl}/api/lessons/${lesson.id}/post-test-feedback/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!res.ok) {
                    throw new Error('Gagal memuat feedback post-test.');
                }

                const data = await res.json();
                setFeedbackForm({
                    criticism: data.criticism || '',
                    suggestion: data.suggestion || '',
                });
                setHasFeedback(Boolean(data.has_feedback));
                setFeedbackLoaded(true);
            } catch (error) {
                if ((error as Error).name === 'AbortError') {
                    return;
                }
                console.error('Post-test feedback fetch error:', error);
                setFeedbackError('Form kritik dan saran belum bisa dimuat. Anda tetap bisa mencoba lagi.');
            } finally {
                if (!controller.signal.aborted) {
                    setFeedbackLoading(false);
                }
            }
        };

        void fetchExistingFeedback();
        return () => controller.abort();
    }, [result, lesson.id, isPostTestLesson]);

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        return (
            <div className="bg-white rounded-[2rem] p-10 text-center border border-gray-100 shadow-sm">
                <HelpCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">{getLessonTypeLabel(lesson.type)} Kosong</h3>
                <p className="text-gray-500">Trainer belum menambahkan pertanyaan untuk materi ini.</p>
            </div>
        );
    }

    if (!hasStarted && !result) {
        return (
            <div className="space-y-6 pb-8">
                <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-xl">
                    <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-6 py-8 text-white sm:px-10 sm:py-10">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-100">Persiapan {getLessonTypeLabel(lesson.type)}</p>
                            <h3 className="mt-3 text-2xl font-black sm:text-3xl">{lesson.title}</h3>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Baca ketentuan berikut sebelum memulai. Waktu baru berjalan setelah tombol mulai ditekan.</p>
                        </div>
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                    </div>
                </div>

                    <div className="p-6 sm:p-10">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                            <HelpCircle className="h-5 w-5 text-blue-600" />
                            <p className="mt-3 text-2xl font-black text-gray-900">{orderedQuestions.length}</p>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Pertanyaan</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            <p className="mt-3 text-2xl font-black text-gray-900">{quiz.pass_score || 70}%</p>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Minimal Lulus</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                            <Clock className="h-5 w-5 text-emerald-600" />
                            <p className="mt-3 text-2xl font-black text-gray-900">{quiz.time_limit ? `${quiz.time_limit} menit` : 'Tanpa batas'}</p>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Durasi</p>
                        </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <div>
                                <p className="font-bold text-amber-900">Pengerjaan tidak disimpan sementara</p>
                                <p className="mt-1 text-sm leading-6 text-amber-800">Jika Anda keluar, kembali ke materi lain, menutup tab, atau memuat ulang halaman sebelum mengirim jawaban, pengerjaan akan hilang dan dimulai lagi dari 0.</p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setSecondsRemaining(timeLimitSeconds);
                            setHasStarted(true);
                        }}
                        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:w-auto"
                    >
                        Mulai {getLessonTypeLabel(lesson.type)}
                        <ArrowRight className="h-4 w-4" />
                    </button>

                    </div>
                </div>
                <QuizLeaderboardPanel leaderboard={leaderboard} loading={leaderboardLoading} />
            </div>
        );
    }

    const currentQuestion = orderedQuestions[currentQuestionIdx];
    const progress = ((currentQuestionIdx + 1) / orderedQuestions.length) * 100;
    const currentQuestionId = currentQuestion.id.toString();
    const currentAnswer = answers[currentQuestionId] || '';
    const hasCurrentAnswer = currentAnswer.trim().length > 0;
    const isShortAnswerQuestion = currentQuestion.question_type === QUESTION_TYPE_SHORT_ANSWER;

    const handleAnswerSelect = (answer: string | number) => {
        setAnswers({
            ...answers,
            [currentQuestionId]: String(answer)
        });
    };

    const handleFeedbackSubmit = async () => {
        if (!feedbackForm.criticism.trim() && !feedbackForm.suggestion.trim()) {
            setFeedbackError('Isi kritik, saran, atau keduanya terlebih dahulu.');
            setFeedbackMessage(null);
            return;
        }

        setFeedbackSaving(true);
        setFeedbackError(null);
        setFeedbackMessage(null);

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const res = await fetch(`${apiUrl}/api/lessons/${lesson.id}/post-test-feedback/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackForm),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal menyimpan kritik dan saran.');
            }

            setFeedbackForm({
                criticism: data.criticism || '',
                suggestion: data.suggestion || '',
            });
            setHasFeedback(true);
            setFeedbackLoaded(true);
            setFeedbackMessage('Kritik dan saran Anda sudah tersimpan dan dapat dilihat admin serta instruktur terkait.');
        } catch (error) {
            console.error('Post-test feedback submit error:', error);
            setFeedbackError(error instanceof Error ? error.message : 'Gagal menyimpan kritik dan saran.');
        } finally {
            setFeedbackSaving(false);
        }
    };

    const resetQuiz = () => {
        setResult(null);
        setCurrentQuestionIdx(0);
        setAnswers({});
        setFeedbackForm({ criticism: '', suggestion: '' });
        setFeedbackLoading(false);
        setFeedbackSaving(false);
        setFeedbackLoaded(false);
        setHasFeedback(false);
        setFeedbackMessage(null);
        setFeedbackError(null);
        setSecondsRemaining(timeLimitSeconds);
        setHasStarted(false);
        setShowPostTestConfetti(false);
        autoSubmittedRef.current = false;
    };

    if (result) {
        return (
            <>
            {showPostTestConfetti && (
                <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden" aria-hidden="true">
                    {Array.from({ length: 28 }).map((_, index) => (
                        <span
                            key={index}
                            className="quiz-confetti absolute -top-8 h-3 w-2 rounded-sm"
                            style={{
                                left: `${3 + ((index * 29) % 94)}%`,
                                backgroundColor: quizConfettiColors[index % quizConfettiColors.length],
                                animationDelay: `${(index % 7) * 70}ms`,
                                animationDuration: `${1400 + (index % 5) * 140}ms`,
                            }}
                        />
                    ))}
                    <div className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-white/95 px-6 py-3 font-black text-fuchsia-600 shadow-xl backdrop-blur">
                        <span className="flex items-center gap-2"><PartyPopper className="h-5 w-5" /> Post-Test Selesai!</span>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-xl animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center space-y-6">
                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${result.is_passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {result.is_passed ? <Trophy className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                            {result.is_passed ? 'Selamat! Anda Lulus' : 'Maaf, Anda Belum Lulus'}
                        </h3>
                        <p className="text-gray-500 mt-2 font-medium">Hasil pengerjaan {lesson.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                        <div className="bg-gray-50 p-6 rounded-3xl text-center">
                            <span className="block text-3xl font-black text-gray-900">{Math.round(result.score)}%</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Skor Anda</span>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-3xl text-center">
                            <span className="block text-3xl font-black text-gray-900">{result.correct_answers}/{result.total_questions}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Benar</span>
                        </div>
                    </div>

                    {result.gamification && (
                        <div className="mx-auto grid max-w-2xl gap-3 text-left md:grid-cols-3">
                            <div className="rounded-3xl bg-blue-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">XP Didapat</p>
                                <p className="mt-2 text-2xl font-black text-blue-700">+{result.gamification.earned_xp || 0}</p>
                            </div>
                            <div className="rounded-3xl bg-orange-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Streak Aktif</p>
                                <p className="mt-2 text-2xl font-black text-orange-700">{result.gamification.current_streak || 0} Hari</p>
                            </div>
                            <div className="rounded-3xl bg-emerald-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Badge Terbuka</p>
                                <p className="mt-2 text-2xl font-black text-emerald-700">{result.gamification.total_badges || 0}</p>
                            </div>
                        </div>
                    )}

                    {result.gamification?.new_badges?.length > 0 && (
                        <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50 p-5 text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Badge Baru</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {result.gamification.new_badges.map((badge: any) => (
                                    <span
                                        key={badge.key}
                                        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-700 shadow-sm"
                                    >
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-fuchsia-100 text-fuchsia-600">
                                            {getGamificationBadgeIcon(badge.icon)}
                                        </span>
                                        {badge.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <QuizLeaderboardPanel leaderboard={leaderboard} loading={leaderboardLoading} />

                    <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={resetQuiz}
                            className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all uppercase tracking-widest text-[10px]"
                        >
                            <RotateCcw className="w-4 h-4" /> Ulangi {getLessonTypeLabel(lesson.type)}
                        </button>
                        {result.is_passed && (
                            <button
                                onClick={onComplete}
                                className="flex items-center justify-center gap-2 px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 uppercase tracking-widest text-[10px]"
                            >
                                Lanjut Materi <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {isPostTestLesson && (
                        <div className="mx-auto mt-6 w-full max-w-3xl rounded-[2rem] border border-amber-100 bg-amber-50/70 p-6 text-left">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 rounded-2xl bg-white p-3 text-amber-500 shadow-sm">
                                    <MessageSquare className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-500">Kritik dan Saran</p>
                                    <h4 className="mt-2 text-xl font-black text-gray-900">Bantu kami meningkatkan kualitas course ini</h4>
                                    <p className="mt-2 text-sm leading-6 text-gray-600">
                                        Masukan ini akan terlihat oleh admin dan instruktur terkait setelah Anda menyelesaikan post-test.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                <div>
                                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Kritik</label>
                                    <textarea
                                        rows={4}
                                        value={feedbackForm.criticism}
                                        onChange={(e) => setFeedbackForm((prev) => ({ ...prev, criticism: e.target.value }))}
                                        placeholder="Apa yang masih kurang dari materi, penyampaian, atau alurnya?"
                                        className="w-full rounded-3xl border border-amber-100 bg-white px-5 py-4 text-sm text-gray-800 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Saran</label>
                                    <textarea
                                        rows={4}
                                        value={feedbackForm.suggestion}
                                        onChange={(e) => setFeedbackForm((prev) => ({ ...prev, suggestion: e.target.value }))}
                                        placeholder="Apa yang sebaiknya ditambahkan atau diperbaiki untuk peserta berikutnya?"
                                        className="w-full rounded-3xl border border-amber-100 bg-white px-5 py-4 text-sm text-gray-800 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
                                    />
                                </div>

                                {feedbackLoading && (
                                    <p className="text-sm text-gray-500">Memuat kritik dan saran yang pernah Anda simpan...</p>
                                )}
                                {feedbackError && (
                                    <p className="text-sm font-medium text-red-500">{feedbackError}</p>
                                )}
                                {feedbackMessage && (
                                    <p className="text-sm font-medium text-emerald-600">{feedbackMessage}</p>
                                )}

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-gray-500">
                                        {feedbackLoaded && hasFeedback
                                            ? 'Masukan terakhir Anda sudah tersimpan dan bisa diperbarui kapan saja.'
                                            : 'Anda bisa mengisi salah satu field saja jika perlu.'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleFeedbackSubmit}
                                        disabled={feedbackSaving || feedbackLoading}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {feedbackSaving ? 'Menyimpan...' : hasFeedback ? 'Perbarui Masukan' : 'Simpan Kritik & Saran'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                @keyframes quiz-confetti-fall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }
                .quiz-confetti { animation-name: quiz-confetti-fall; animation-timing-function: cubic-bezier(.2,.7,.2,1); animation-fill-mode: forwards; }
            `}</style>
            </>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quiz Info Sidebar */}
            <div className="w-full md:w-72 bg-gray-50 p-8 border-r border-gray-100 flex flex-col">
                <div className="flex-1">
                    <div className="flex items-center gap-3 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg"><HelpCircle className="w-4 h-4" /></div>
                        {getLessonTypeLabel(lesson.type)}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6 leading-tight">{lesson.title}</h3>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-xs font-bold text-gray-600">{orderedQuestions.length} Pertanyaan</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-xs font-bold text-gray-600">Minimal Lulus {quiz.pass_score}%</span>
                        </div>
                        {quiz.time_limit && (
                            <div className={`rounded-2xl border p-4 ${secondsRemaining <= 60 ? 'border-red-200 bg-red-50' : 'border-blue-100 bg-white'}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                        <Clock className="h-4 w-4" /> Sisa Waktu
                                    </span>
                                    <span className={`font-mono text-xl font-black tabular-nums ${secondsRemaining <= 60 ? 'text-red-600' : 'text-blue-700'}`}>
                                        {String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:{String(secondsRemaining % 60).padStart(2, '0')}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] leading-4 text-gray-500">Jawaban dikirim otomatis saat waktu habis.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200">
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Questions Area */}
            <div className="flex-1 p-8 md:p-12 flex flex-col">
                <div className="flex-1">
                    <div className="mb-8">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pertanyaan {currentQuestionIdx + 1} dari {orderedQuestions.length}</span>
                        <h4 className="text-2xl font-bold text-gray-900 mt-4 leading-snug">{currentQuestion.text}</h4>
                        {currentQuestion.image_url && (
                            <div className="mt-5 overflow-hidden rounded-3xl border border-gray-100 bg-gray-50 p-4">
                                { }
                                <img
                                    src={currentQuestion.image_url}
                                    alt={`Gambar pertanyaan ${currentQuestionIdx + 1}`}
                                    className="max-h-80 w-full rounded-2xl object-contain"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {isShortAnswerQuestion ? (
                            <div className="rounded-3xl border-2 border-gray-100 bg-gray-50 p-5">
                                <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-gray-400">Jawaban Anda</label>
                                <input
                                    type="text"
                                    value={currentAnswer}
                                    onChange={(e) => handleAnswerSelect(e.target.value)}
                                    placeholder="Ketik jawaban singkat..."
                                    className="w-full rounded-2xl border-none bg-white px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        ) : (
                            (currentQuestion.alternatives || []).map((alt: any) => (
                                <button
                                    key={alt.id}
                                    onClick={() => handleAnswerSelect(alt.id)}
                                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group
                                        ${currentAnswer === alt.id.toString()
                                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                                            : 'border-gray-50 hover:border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <span className="font-bold text-sm">{alt.text}</span>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                        ${currentAnswer === alt.id.toString()
                                            ? 'border-blue-600 bg-blue-600 text-white'
                                            : 'border-gray-200 group-hover:border-gray-300'
                                        }
                                    `}>
                                        {currentAnswer === alt.id.toString() && <CheckCircle2 className="w-4 h-4" />}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="mt-12 flex items-center justify-between pt-8 border-t border-gray-50">
                    <button
                        disabled={currentQuestionIdx === 0}
                        onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                        className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-900 transition-all disabled:opacity-0"
                    >
                        Sebelumnya
                    </button>

                    {currentQuestionIdx < orderedQuestions.length - 1 ? (
                        <button
                            disabled={!hasCurrentAnswer}
                            onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:grayscale"
                        >
                            Pertanyaan Selanjutnya
                        </button>
                    ) : (
                        <button
                            disabled={!hasCurrentAnswer || submitting}
                            onClick={handleSubmit}
                            className="bg-green-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                        >
                            {submitting ? 'Mengirim...' : 'Kirim Jawaban'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper to get embed URL for external videos
const getEmbedUrl = (url: string) => {
    if (!url) return '';

    // YouTube
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

    // Google Drive
    const gdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (gdMatch) return `https://drive.google.com/file/d/${gdMatch[1]}/preview`;

    return url;
};

const VideoPlayer = ({ url, poster }: { url: string; poster?: string }) => {
    const embedUrl = getEmbedUrl(url);
    const isEmbed = embedUrl.includes('youtube.com') || embedUrl.includes('drive.google.com');

    if (isEmbed) {
        return (
            <iframe
                src={embedUrl}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        );
    }

    return (
        <video
            src={url}
            className="w-full h-full object-cover"
            controls
            poster={poster || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop"}
        />
    );
};

export default function LearningPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [course, setCourse] = useState<any>(null);
    const [activeLesson, setActiveLesson] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('deskripsi');
    const [rewardSummary, setRewardSummary] = useState<any>(null);
    const [assessmentInProgress, setAssessmentInProgress] = useState(false);

    const confirmAssessmentExit = () => (
        !assessmentInProgress
        || window.confirm('Pengerjaan belum tersimpan. Jika keluar sekarang, jawaban akan hilang dan Anda harus memulai lagi dari 0. Tetap keluar?')
    );

    const handleNextLesson = async () => {
        if (!activeLesson) return;
        if (!confirmAssessmentExit()) return;

        // 1. Mark current lesson as complete in backend
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const res = await fetch(`${apiUrl}/api/lessons/${activeLesson.id}/complete/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Failed to mark lesson complete:', errorText);
            } else {
                const payload = await res.json();
                if (payload?.gamification) {
                    setRewardSummary(payload.gamification);
                }
            }

            // Update local state to show checkmark immediately regardless of error for now,
            // but in a real app you might want to only update on success.
            // Let's at least log it.
            console.log(`Lesson ${activeLesson.id} marked complete`);

            const updatedSections = course.sections.map((s: any) => ({
                ...s,
                lessons: s.lessons.map((l: any) =>
                    l.id === activeLesson.id ? { ...l, is_completed: true } : l
                )
            }));
            setCourse({ ...course, sections: updatedSections });

        } catch (error) {
            console.error('Network error marking lesson complete:', error);
        }

        // 2. Find next lesson
        const allLessons = course.sections
            .sort((a: any, b: any) => a.order - b.order)
            .flatMap((s: any) => s.lessons.sort((a: any, b: any) => a.order - b.order));

        const currentIdx = allLessons.findIndex((l: any) => l.id === activeLesson.id);
        if (currentIdx < allLessons.length - 1) {
            setActiveLesson(allLessons[currentIdx + 1]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevLesson = () => {
        if (!activeLesson) return;
        if (!confirmAssessmentExit()) return;
        const allLessons = course.sections
            .sort((a: any, b: any) => a.order - b.order)
            .flatMap((s: any) => s.lessons.sort((a: any, b: any) => a.order - b.order));

        const currentIdx = allLessons.findIndex((l: any) => l.id === activeLesson.id);
        if (currentIdx > 0) {
            setActiveLesson(allLessons[currentIdx - 1]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = getClientApiBaseUrl();
                const res = await fetch(`${apiUrl}/api/courses/${slug}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCourse(data);
                    const params = new URLSearchParams(window.location.search);
                    const urlTab = params.get('tab');
                    setActiveTab(normalizeTabKey(urlTab));

                    // Resume Logic: Find exact lesson from URL, or fallback to first incomplete
                    if (data.sections && data.sections.length > 0) {
                        const allLessons = data.sections
                            .sort((a: any, b: any) => a.order - b.order)
                            .flatMap((s: any) => (s.lessons || []).sort((a: any, b: any) => a.order - b.order));

                        // Use standard DOM API to avoid Next.js Suspense boundary errors
                        const urlLessonId = params.get('lesson');
                        let resumeLesson;

                        if (urlLessonId) {
                            resumeLesson = allLessons.find((l: any) => l.id.toString() === urlLessonId);
                        }

                        if (!resumeLesson) {
                            resumeLesson = allLessons.find((l: any) => !l.is_completed) || allLessons[0];
                        }

                        if (resumeLesson) {
                            setActiveLesson(resumeLesson);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch course:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [slug]);

    // Track when active lesson is accessed
    useEffect(() => {
        if (!activeLesson) return;

        const trackAccess = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = getClientApiBaseUrl();
                const res = await fetch(`${apiUrl}/api/lessons/${activeLesson.id}/access/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    console.log(`Access tracked for lesson ${activeLesson.id}`);
                } else {
                    console.error('Failed to track lesson access:', await res.text());
                }
            } catch (error) {
                console.error('Failed to track lesson access:', error);
            }
        };

        trackAccess();
    }, [activeLesson]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!course) return (
        <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
            <AlertCircle className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl font-bold">Kursus tidak ditemukan</p>
            <Link href="/dashboard" className="mt-4 text-blue-600 font-bold hover:underline">Kembali ke Dashboard</Link>
        </div>
    );

    const sections = course.sections || [];
    const openLessonView = (lesson: any) => {
        if (lesson.id !== activeLesson?.id && !confirmAssessmentExit()) return;
        setActiveLesson(lesson);
    };
    const isActiveAssessmentLesson = isAssessmentLesson(activeLesson?.type);

    // Calculate real progress dynamically from the lessons' is_completed status
    const allLessons = sections.flatMap((s: any) => s.lessons || []);
    const completedCount = allLessons.filter((l: any) => l.is_completed).length;
    const progressPercentage = allLessons.length > 0
        ? Math.round((completedCount / allLessons.length) * 100)
        : 0;

    const dashOffset = 125.6 - (125.6 * progressPercentage) / 100;

    return (
        <div className="flex min-h-screen flex-col lg:h-[calc(100vh-6rem)] lg:min-h-0">
            {/* Header Navigation specific to Learning */}
            <div className="flex items-center gap-4 mb-6 px-6 pt-6">
                <Link
                    href="/dashboard/courses"
                    onClick={(event) => {
                        if (!confirmAssessmentExit()) event.preventDefault();
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Kembali ke Kursus
                </Link>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded text-blue-600 flex items-center justify-center">
                        <ShieldCheck className="w-3 h-3" />
                    </div>
                    <h1 className="font-bold text-gray-900 line-clamp-1">{course.title}</h1>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6 sm:px-6 lg:flex-row lg:overflow-hidden">
                {/* Main Content */}
                <div className="flex w-full min-w-0 flex-1 flex-col overflow-visible custom-scrollbar lg:overflow-y-auto lg:pr-2">
                    {/* Webinar Link Banner */}
                    {course.type === 'webinar' && course.zoom_link && (
                        <div className="relative mb-8 min-h-[15rem] shrink-0 overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 to-rose-700 p-6 text-white shadow-xl shadow-rose-600/20 sm:p-8">
                            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                            <Video className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-rose-100">Live Webinar Session</span>
                                    </div>
                                    <h2 className="text-2xl font-black mb-1">Sudah Siap Belajar Live?</h2>
                                    <p className="max-w-2xl text-sm text-rose-100">Klik tombol di samping untuk bergabung ke sesi webinar melalui Zoom. Pengisian presensi dilakukan dari halaman Kursus Saya dan hanya bisa dikirim satu kali.</p>
                                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                                        {course.webinar_attendance?.is_present ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                                                Presensi tercatat{course.webinar_attendance?.attended_at ? ` pada ${new Date(course.webinar_attendance.attended_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                                            </>
                                        ) : (
                                            <>
                                                <Clock className="w-4 h-4 text-rose-100" />
                                                Presensi diisi dari halaman Kursus Saya
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex w-full flex-col gap-3 lg:max-w-sm lg:self-start">
                                    <a
                                        href={course.zoom_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white text-rose-600 px-8 py-4 rounded-2xl font-black hover:bg-rose-50 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        Join Zoom Meeting <ArrowRight className="w-5 h-5" />
                                    </a>
                                    <Link
                                        href="/dashboard/courses"
                                        className="flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3 font-bold text-white transition-all hover:bg-white/20"
                                    >
                                        Isi Presensi di Kursus Saya
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                            {/* Decorative bubbles */}
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                            <div className="absolute bottom-4 left-1/4 h-24 w-24 rounded-full bg-rose-400/20 blur-xl" />
                        </div>
                    )}

                    {rewardSummary && (rewardSummary.earned_xp > 0 || rewardSummary.new_badges?.length > 0) && (
                        <div className="mb-6 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 p-5 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                        <Sparkles className="w-4 h-4" />
                                        Reward Terkumpul
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900">
                                        +{rewardSummary.earned_xp || 0} XP didapat dari progres terbaru Anda
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Streak aktif {rewardSummary.current_streak || 0} hari
                                        {rewardSummary.level?.label ? ` · Level ${rewardSummary.level.current} ${rewardSummary.level.label}` : ''}
                                    </p>
                                </div>
                                {rewardSummary.new_badges?.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {rewardSummary.new_badges.map((badge: any) => (
                                            <span
                                                key={badge.key}
                                                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm"
                                            >
                                                {badge.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeLesson ? (
                        <>
                            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <span className={`rounded-full px-3 py-1 text-white ${isActiveAssessmentLesson ? 'bg-amber-500' : 'bg-blue-600'}`}>
                                            {isActiveAssessmentLesson ? 'Sesi Test' : 'Materi Sekarang'}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" /> {activeLesson.duration || '-'}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <MessageSquare className="w-3 h-3" /> {getLessonTypeLabel(activeLesson.type)}
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">{activeLesson.title}</h2>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={handlePrevLesson}
                                        className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-5 py-3 text-xs font-bold text-gray-600 transition-all shadow-sm hover:bg-gray-50"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Sebelumnya
                                    </button>
                                    {!isActiveAssessmentLesson && (
                                        <button
                                            onClick={handleNextLesson}
                                            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95"
                                        >
                                            Materi Selanjutnya <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {activeLesson.type === 'video' && (
                                <div className="w-full min-h-[280px] sm:min-h-[360px] lg:min-h-[460px] aspect-[4/3] md:aspect-[16/10] xl:aspect-[16/9] bg-black rounded-[2.5rem] relative shadow-2xl border-4 border-white overflow-hidden">
                                    {activeLesson.is_locked ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
                                            <Lock className="w-16 h-16 text-blue-500 mb-4 animate-bounce" />
                                            <h3 className="text-xl font-bold mb-2">Materi Terkunci</h3>
                                            <p className="text-gray-400 max-w-md">Selesaikan pembayaran Anda untuk mengakses seluruh materi eksklusif di kursus ini.</p>
                                            <Link href={`/courses/${course.slug}`} className="mt-6 px-8 py-3 bg-blue-600 rounded-2xl font-bold hover:bg-blue-700 transition-all">
                                                Daftar Sekarang
                                            </Link>
                                        </div>
                                    ) : (
                                        <VideoPlayer url={activeLesson.video_url} poster={activeLesson.image} />
                                    )}
                                </div>
                            )}

                            {isAssessmentLesson(activeLesson.type) && (
                                <QuizPlayer
                                    lesson={activeLesson}
                                    onProgressChange={setAssessmentInProgress}
                                    onComplete={() => {
                                        // Refresh course status to show marks
                                        const fetchCourseStatus = async () => {
                                            const token = localStorage.getItem('access_token');
                                            const apiUrl = getClientApiBaseUrl();
                                            const res = await fetch(`${apiUrl}/api/courses/${slug}/`, {
                                                headers: { 'Authorization': `Bearer ${token}` }
                                            });
                                            if (res.ok) {
                                                const data = await res.json();
                                                setCourse(data);
                                                handleNextLesson();
                                            } else {
                                                handleNextLesson();
                                            }
                                        };
                                        fetchCourseStatus();
                                    }}
                                />
                            )}

                            {!isActiveAssessmentLesson && (
                                <div className="mt-8">
                                <div className="mb-8 overflow-x-auto border-b border-gray-100">
                                    <div className="flex min-w-max gap-10">
                                        {LESSON_TABS.map((tab) => (
                                            <button
                                                key={tab.key}
                                                onClick={() => setActiveTab(tab.key)}
                                                className={`relative pb-4 text-xs font-black uppercase tracking-widest transition-all ${
                                                    activeTab === tab.key ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                            >
                                                {tab.label}
                                                {activeTab === tab.key && (
                                                    <div className="absolute bottom-0 left-0 h-1 w-full animate-in fade-in zoom-in-50 rounded-full bg-blue-600 duration-300"></div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-10 max-w-none pb-10 text-base leading-relaxed text-gray-600">
                                    {activeTab === 'deskripsi' && (
                                        <div className="animate-in slide-in-from-bottom-2 fade-in">
                                            {activeLesson.type === 'article' ? (
                                                <div className="rich-text-content prose prose-blue max-w-none rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
                                                    <div dangerouslySetInnerHTML={{ __html: activeLesson.content || '' }} />
                                                </div>
                                            ) : (
                                                <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
                                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">Ringkasan Materi</p>
                                                    <p className="mt-4 text-lg leading-relaxed text-gray-600">
                                                        {activeLesson.content || 'Belum ada deskripsi tambahan untuk materi ini.'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'sumber-daya' && (
                                        activeLesson.attachment ? (
                                            <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
                                                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
                                                            <FileText className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">File Penunjang</p>
                                                            <p className="mt-2 text-lg font-bold text-gray-900">{getAttachmentLabel(activeLesson) || 'Dokumen Materi'}</p>
                                                            <p className="mt-2 text-sm text-gray-500">Unduh file pendukung yang dibagikan trainer untuk materi ini.</p>
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={activeLesson.attachment}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        Unduh File
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-[2rem] border border-dashed border-gray-200 bg-gray-50 px-8 py-12 text-center">
                                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm">
                                                    <Download className="h-6 w-6" />
                                                </div>
                                                <p className="mt-5 font-semibold text-gray-700">Belum ada file penunjang yang dapat diunduh.</p>
                                                <p className="mt-2 text-sm text-gray-400">Jika trainer menambahkan lampiran atau bahan pendukung, file-nya akan muncul di tab ini.</p>
                                            </div>
                                        )
                                    )}
                                </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50">
                            <p className="text-gray-400">Pilih materi untuk memulai belajar.</p>
                        </div>
                    )}
                </div>

                {/* Sidebar (Module List) */}
                <div className="flex h-auto max-h-[60vh] w-full shrink-0 flex-col overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl shadow-gray-200/50 lg:sticky lg:top-0 lg:h-full lg:max-h-none lg:w-96">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Materi Kursus</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-1">{sections.length} Modul • {sections.reduce((acc: number, s: any) => acc + (s.lessons?.length || 0), 0)} Pelajaran</p>
                        </div>
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="24" cy="24" r="20" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                                <circle
                                    cx="24" cy="24" r="20" fill="none" stroke="#2563eb" strokeWidth="4"
                                    strokeDasharray="125.6"
                                    strokeDashoffset={dashOffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <span className="absolute text-[10px] font-black text-blue-600">{progressPercentage}%</span>
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 custom-scrollbar px-4 py-6 space-y-4">
                        {sections.sort((a: any, b: any) => a.order - b.order).map((section: any, idx: number) => (
                            <div key={section.id} className="space-y-2">
                                <div className="px-4 py-3 flex justify-between items-center cursor-pointer group">
                                    <div>
                                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Modul {idx + 1}</p>
                                        <h4 className="font-bold text-sm text-gray-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{section.title}</h4>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-300" />
                                </div>
                                <div className="space-y-1">
                                    {(section.lessons || []).sort((a: any, b: any) => a.order - b.order).map((lesson: any) => {
                                        const isActive = activeLesson?.id === lesson.id;

                                        // Check if lesson is locked (cannot be clicked)
                                        // Logic: Can click if is_completed OR it is the FIRST lesson that is NOT completed
                                        const currentLessonIdx = allLessons.findIndex((l: any) => l.id === lesson.id);
                                        const firstIncompleteIdx = allLessons.findIndex((l: any) => !l.is_completed);
                                        const isLocked = !lesson.is_completed && currentLessonIdx !== firstIncompleteIdx && firstIncompleteIdx !== -1 && currentLessonIdx > firstIncompleteIdx;

                                        return (
                                            <div
                                                key={lesson.id}
                                                onClick={() => !isLocked && openLessonView(lesson)}
                                                className={`px-4 py-4 flex gap-4 text-sm rounded-2xl transition-all relative group
                                                    ${isLocked ? 'opacity-50 cursor-not-allowed filter grayscale-[0.5]' : 'cursor-pointer'}
                                                    ${isActive
                                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-[1.02]'
                                                        : isLocked ? 'bg-gray-50/50' : 'hover:bg-gray-50 text-gray-700'
                                                    }
                                                `}
                                            >
                                                <div className={`mt-0.5 flex-shrink-0`}>
                                                    {lesson.is_completed ? (
                                                        <CheckCircle className={`w-5 h-5 ${isActive ? 'text-white' : 'text-green-500'}`} />
                                                    ) : isLocked ? (
                                                        <Lock className="w-5 h-5 text-gray-300" />
                                                    ) : (
                                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors
                                                            ${isActive ? 'border-white/50' : 'border-gray-200 group-hover:border-blue-400'}
                                                        `}>
                                                            {lesson.type === 'video' ? <PlayCircle className="w-3 h-3" /> : lesson.type === 'article' ? <FileText className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`font-bold tracking-tight leading-snug ${isActive ? 'text-white' : 'text-gray-800'}`}>
                                                        {lesson.title}
                                                    </p>
                                                    <div className={`flex items-center gap-3 mt-1.5 text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                                                        <span>{getLessonTypeLabel(lesson.type)}</span>
                                                        <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-white/40' : 'bg-gray-200'}`} />
                                                        <span>{lesson.duration || '0 Min'}</span>
                                                        {lesson.is_locked && (
                                                            <>
                                                                <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-white/40' : 'bg-gray-200'}`} />
                                                                <Lock className="w-3 h-3 text-amber-500" />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {isActive && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

