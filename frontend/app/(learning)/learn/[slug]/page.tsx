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
    AlertCircle
} from 'lucide-react';
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
                                <div className="w-full aspect-video md:aspect-[16/9] lg:aspect-[21/9] bg-black rounded-[2.5rem]  relative shadow-2xl border-4 border-white">
                                    <VideoPlayer url={activeLesson.video_url} poster={activeLesson.image} />
                                </div>
                            )}

                            {/* Content Meta */}
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
                                        <button className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                                            <ChevronLeft className="w-4 h-4" /> Sebelumnya
                                        </button>
                                        <button className="flex items-center gap-2 px-5 py-3 bg-blue-600 rounded-2xl text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
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
                                                    <style jsx global>{`
                                                        .rich-text-content {
                                                            color: #374151;
                                                            line-height: 1.8;
                                                        }
                                                        .rich-text-content h1, .rich-text-content h2, .rich-text-content h3 {
                                                            color: #111827;
                                                            font-weight: 800;
                                                            margin-top: 2rem;
                                                            margin-bottom: 1rem;
                                                            letter-spacing: -0.025em;
                                                        }
                                                        .rich-text-content h1 { font-size: 2rem; }
                                                        .rich-text-content h2 { font-size: 1.5rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 0.5rem; }
                                                        .rich-text-content h3 { font-size: 1.25rem; }
                                                        .rich-text-content p { margin-bottom: 1.25rem; }
                                                        .rich-text-content ul, .rich-text-content ol {
                                                            margin-bottom: 1.25rem;
                                                            padding-left: 1.5rem;
                                                        }
                                                        .rich-text-content ul { list-style-type: disc; }
                                                        .rich-text-content ol { list-style-type: decimal; }
                                                        .rich-text-content li { margin-bottom: 0.5rem; }
                                                        .rich-text-content img {
                                                            border-radius: 1.5rem;
                                                            margin: 2rem 0;
                                                        }
                                                        .rich-text-content blockquote {
                                                            border-left: 4px solid #3b82f6;
                                                            padding-left: 1.5rem;
                                                            font-style: italic;
                                                            color: #4b5563;
                                                            margin: 1.5rem 0;
                                                        }
                                                        .rich-text-content a {
                                                            color: #2563eb;
                                                            text-decoration: underline;
                                                            font-weight: 600;
                                                        }
                                                    `}</style>
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
                                <circle cx="24" cy="24" r="20" fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray="125.6" strokeDashoffset="80" strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-[10px] font-black text-blue-600">35%</span>
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
                                        return (
                                            <div
                                                key={lesson.id}
                                                onClick={() => setActiveLesson(lesson)}
                                                className={`px-4 py-4 flex gap-4 text-sm rounded-2xl transition-all cursor-pointer relative group
                                                    ${isActive
                                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-[1.02]'
                                                        : 'hover:bg-gray-50 text-gray-700'
                                                    }
                                                `}
                                            >
                                                <div className={`mt-0.5 flex-shrink-0`}>
                                                    {lesson.completed ? (
                                                        <CheckCircle className={`w-5 h-5 ${isActive ? 'text-white' : 'text-green-500'}`} />
                                                    ) : (
                                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors
                                                            ${isActive ? 'border-white/50' : 'border-gray-200 group-hover:border-blue-400'}
                                                        `}>
                                                            {lesson.type === 'video' ? <PlayCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
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
