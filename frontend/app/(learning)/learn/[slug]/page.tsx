'use client';

import { useState, useEffect, use } from 'react';
import {
    PlayCircle,
    CheckCircle,
    Lock,
    FileText,
    Download,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    ShieldCheck,
    ChevronDown,
    Clock,
    AlertCircle,
    HelpCircle,
    Trophy,
    CheckCircle2,
    RotateCcw,
    ArrowRight
} from 'lucide-react';

const QuizPlayer = ({ lesson, onComplete }: { lesson: any, onComplete?: () => void }) => {
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const quiz = lesson.quiz_data;
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        return (
            <div className="bg-white rounded-[2rem] p-10 text-center border border-gray-100 shadow-sm">
                <HelpCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Quiz Kosong</h3>
                <p className="text-gray-500">Instruktur belum menambahkan pertanyaan untuk kuis ini.</p>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIdx];
    const progress = ((currentQuestionIdx + 1) / quiz.questions.length) * 100;

    const handleAnswerSelect = (alternativeId: string) => {
        setAnswers({
            ...answers,
            [currentQuestion.id.toString()]: alternativeId
        });
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
            } else {
                alert('Gagal mengirim jawaban. Silakan coba lagi.');
            }
        } catch (error) {
            console.error('Quiz submission error:', error);
            alert('Terjadi kesalahan koneksi.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetQuiz = () => {
        setResult(null);
        setCurrentQuestionIdx(0);
        setAnswers({});
    };

    if (result) {
        return (
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

                    <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={resetQuiz}
                            className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all uppercase tracking-widest text-[10px]"
                        >
                            <RotateCcw className="w-4 h-4" /> Ulangi Kuis
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
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quiz Info Sidebar */}
            <div className="w-full md:w-72 bg-gray-50 p-8 border-r border-gray-100 flex flex-col">
                <div className="flex-1">
                    <div className="flex items-center gap-3 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg"><HelpCircle className="w-4 h-4" /></div>
                        {lesson.type.toUpperCase().replace('_', ' ')}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6 leading-tight">{lesson.title}</h3>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-xs font-bold text-gray-600">{quiz.questions.length} Pertanyaan</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-xs font-bold text-gray-600">Minimal Lulus {quiz.pass_score}%</span>
                        </div>
                        {quiz.time_limit && (
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span className="text-xs font-bold text-gray-600">Batas Waktu {quiz.time_limit} Menit</span>
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
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pertanyaan {currentQuestionIdx + 1} dari {quiz.questions.length}</span>
                        <h4 className="text-2xl font-bold text-gray-900 mt-4 leading-snug">{currentQuestion.text}</h4>
                    </div>

                    <div className="space-y-3">
                        {currentQuestion.alternatives.map((alt: any) => (
                            <button
                                key={alt.id}
                                onClick={() => handleAnswerSelect(alt.id)}
                                className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group
                                    ${answers[currentQuestion.id.toString()] === alt.id
                                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                                        : 'border-gray-50 hover:border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <span className="font-bold text-sm">{alt.text}</span>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                    ${answers[currentQuestion.id.toString()] === alt.id
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : 'border-gray-200 group-hover:border-gray-300'
                                    }
                                `}>
                                    {answers[currentQuestion.id.toString()] === alt.id && <CheckCircle2 className="w-4 h-4" />}
                                </div>
                            </button>
                        ))}
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

                    {currentQuestionIdx < quiz.questions.length - 1 ? (
                        <button
                            disabled={!answers[currentQuestion.id.toString()]}
                            onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:grayscale"
                        >
                            Pertanyaan Selanjutnya
                        </button>
                    ) : (
                        <button
                            disabled={!answers[currentQuestion.id.toString()] || submitting}
                            onClick={handleSubmit}
                            className="bg-green-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                        >
                            {submitting ? 'Mengirim...' : 'Selesaikan Ujian'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
import Link from 'next/link';

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

    const handleNextLesson = async () => {
        if (!activeLesson) return;

        // 1. Mark current lesson as complete in backend
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            await fetch(`${apiUrl}/api/lessons/${activeLesson.id}/complete/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Update local state to show checkmark immediately
            const updatedSections = course.sections.map((s: any) => ({
                ...s,
                lessons: s.lessons.map((l: any) =>
                    l.id === activeLesson.id ? { ...l, is_completed: true } : l
                )
            }));
            setCourse({ ...course, sections: updatedSections });

        } catch (error) {
            console.error('Failed to mark lesson complete:', error);
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
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/courses/${slug}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCourse(data);

                    // Set first lesson as active by default
                    if (data.sections && data.sections.length > 0) {
                        const firstSection = data.sections.sort((a: any, b: any) => a.order - b.order)[0];
                        if (firstSection.lessons && firstSection.lessons.length > 0) {
                            setActiveLesson(firstSection.lessons.sort((a: any, b: any) => a.order - b.order)[0]);
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

    // Calculate real progress
    const allLessons = sections.flatMap((s: any) => s.lessons || []);
    const totalLessons = allLessons.length;
    const completedLessons = allLessons.filter((l: any) => l.is_completed).length;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const dashOffset = 125.6 - (125.6 * progressPercentage) / 100;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            {/* Header Navigation specific to Learning */}
            <div className="flex items-center gap-4 mb-6 px-6 pt-6">
                <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
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

            <div className="flex flex-1 gap-6 overflow-hidden px-6 pb-6">
                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
                    {/* Video Player / Article Content */}
                    {activeLesson ? (
                        <>
                            {activeLesson.type === 'video' && (
                                <div className="w-full aspect-video md:aspect-[16/9] lg:aspect-[21/9] bg-black rounded-[2.5rem]  relative shadow-2xl border-4 border-white overflow-hidden">
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

                            {['quiz', 'mid_test', 'final_test', 'exam'].includes(activeLesson.type) && (
                                <QuizPlayer
                                    lesson={activeLesson}
                                    onComplete={() => {
                                        // Refresh course status to show marks
                                        const fetchCourseStatus = async () => {
                                            const token = localStorage.getItem('access_token');
                                            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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

                            {/* Content Meta - Only show for video/article */}
                            {['video', 'article'].includes(activeLesson.type) && (
                                <div className="mt-8">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                                <span className="bg-blue-600 text-white px-3 py-1 rounded-full">MATERI SEKARANG</span>
                                                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {activeLesson.duration || '-'}</span>
                                            </div>
                                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{activeLesson.title}</h2>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handlePrevLesson}
                                                className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                                            >
                                                <ChevronLeft className="w-4 h-4" /> Sebelumnya
                                            </button>
                                            <button
                                                onClick={handleNextLesson}
                                                className="flex items-center gap-2 px-5 py-3 bg-blue-600 rounded-2xl text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                            >
                                                Materi Selanjutnya <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="border-b border-gray-100 mb-8 overflow-x-auto">
                                        <div className="flex gap-10 min-w-max">
                                            {['Deskripsi', 'Sumber Daya', 'Diskusi'].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setActiveTab(tab.toLowerCase())}
                                                    className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all ${activeTab === tab.toLowerCase() ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    {tab}
                                                    {activeTab === tab.toLowerCase() && (
                                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-full animate-in fade-in zoom-in-50 duration-300"></div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tab Content */}
                                    <div className="max-w-none text-gray-600 text-base leading-relaxed mb-10 pb-10">
                                        {activeTab === 'deskripsi' && (
                                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                                {activeLesson.type === 'article' ? (
                                                    <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm rich-text-content prose prose-blue max-w-none">
                                                        <div dangerouslySetInnerHTML={{ __html: activeLesson.content || '' }} />
                                                    </div>
                                                ) : (
                                                    <div className="prose prose-blue max-w-none">
                                                        <p className="text-gray-600 leading-relaxed text-lg">
                                                            {activeLesson.content || 'Tidak ada deskripsi tambahan untuk materi ini.'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {activeTab === 'sumber' && <p className="text-gray-400 font-medium">Belum ada sumber daya yang dapat diunduh.</p>}
                                        {activeTab === 'diskusi' && <p className="text-gray-400 font-medium">Fitur diskusi akan segera hadir.</p>}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400">Pilih materi untuk memulai belajar.</p>
                        </div>
                    )}
                </div>

                {/* Sidebar (Module List) */}
                <div className="w-96 bg-white border border-gray-100 rounded-[2.5rem] flex flex-col overflow-hidden shrink-0 sticky top-0 h-full shadow-2xl shadow-gray-200/50">
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
                                                onClick={() => !isLocked && setActiveLesson(lesson)}
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
                                                        <span>{lesson.type}</span>
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
