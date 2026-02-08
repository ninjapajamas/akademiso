'use client';

import { useState } from 'react';
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
    Clock
} from 'lucide-react';
import Link from 'next/link';

export default function LearningPage({ params }: { params: { slug: string } }) {
    const [activeTab, setActiveTab] = useState('deskripsi');
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    // Mock Data
    const modules = [
        {
            title: "Pengantar ISO & QMS",
            lessons: [
                { title: "Definisi dan Sejarah ISO", duration: "10:00", completed: true, type: 'video' },
                { title: "Prinsip Manajemen Mutu", duration: "15:30", completed: true, type: 'video' },
                { title: "Quiz Modul 1", duration: "5 Soal", completed: true, type: 'quiz' },
            ]
        },
        {
            title: "Strategi Mutu & Klausul",
            lessons: [
                { title: "Konteks Organisasi", duration: "08:45", completed: true, type: 'video' },
                { title: "Memahami Klausul ISO", duration: "12:45", completed: false, active: true, type: 'video' },
                { title: "Kepemimpinan", duration: "15:20", completed: false, locked: true, type: 'video' },
                { title: "Manajemen Risiko", duration: "10:10", completed: false, locked: true, type: 'video' },
            ]
        },
        {
            title: "Audit & Evaluasi",
            lessons: [
                { title: "Internal Audit", duration: "20:00", completed: false, locked: true, type: 'video' },
                { title: "Tinjauan Manajemen", duration: "15:00", completed: false, locked: true, type: 'video' },
            ]
        }
    ];

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
                    <h1 className="font-bold text-gray-900 line-clamp-1">Sertifikasi ISO 9001:2015</h1>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden px-6 pb-6">
                {/* Main Content (Video) */}
                <div className="flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
                    {/* Video Player */}
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden relative shadow-lg group">
                        <video
                            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                            className="w-full h-full object-cover"
                            controls
                            poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity bg-black/20">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <PlayCircle className="w-10 h-10 text-white fill-current" />
                            </div>
                        </div>
                    </div>

                    {/* Content Meta */}
                    <div className="mt-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">MODUL 2</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 12 mnt</span>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Pelajaran 3.1: Memahami Klausul ISO 9001:2015</h2>
                            </div>
                            <div className="flex gap-3">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">
                                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                                    Materi Selanjutnya <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-gray-200 mb-6">
                            <div className="flex gap-8">
                                {['Deskripsi', 'Sumber Daya', 'Tugas: Gap Analysis'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab.toLowerCase().split(' ')[0])}
                                        className={`pb-3 text-sm font-bold relative ${activeTab === tab.toLowerCase().split(' ')[0] ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {tab}
                                        {tab === 'Sumber Daya' && <span className="ml-2 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">2</span>}
                                        {activeTab === tab.toLowerCase().split(' ')[0] && (
                                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="prose prose-blue max-w-none text-gray-600 text-sm leading-relaxed mb-10">
                            <p>
                                Dalam sesi ini, kita akan membedah struktur tingkat tinggi (High Level Structure) dan klausul-klausul inti
                                dalam ISO 9001:2015. Anda akan mempelajari interpretasi persyaratan untuk konteks organisasi,
                                kepemimpinan, perencanaan, dukungan, operasi, evaluasi kinerja, dan peningkatan dalam Sistem
                                Manajemen Mutu.
                            </p>
                            <h3 className="text-gray-900 font-bold text-base mt-6 mb-3">Poin Penting</h3>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Memahami Struktur Tingkat Tinggi (HLS) Annex SL.</li>
                                <li>Interpretasi Klausul 4 hingga 10 untuk implementasi nyata.</li>
                                <li>Contoh penerapan Risk-Based Thinking dalam operasional harian.</li>
                            </ul>
                        </div>

                        {/* Instructor */}
                        <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden relative">
                                    {/* Mock Avatar */}
                                    <div className="absolute inset-0 bg-blue-600 flex items-center justify-center text-white font-bold text-lg">BS</div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium">Instruktur</p>
                                    <p className="font-bold text-gray-900 text-sm">Ir. Budi Santoso, Lead Auditor</p>
                                </div>
                            </div>
                            <button className="text-sm font-bold text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
                                Tanya Instruktur
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar (Module List) */}
                <div className="w-80 bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden shrink-0 sticky top-0 h-full">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Daftar Materi</h3>
                        <div className="text-xs font-semibold text-gray-500">35%</div>
                    </div>

                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {modules.map((module, idx) => (
                            <div key={idx} className="border-b border-gray-50 last:border-0">
                                <div className="px-4 py-3 bg-gray-50/50 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">MODUL {idx + 1}</p>
                                        <h4 className="font-bold text-sm text-gray-800">{module.title}</h4>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </div>
                                <div>
                                    {module.lessons.map((lesson, lessonIdx) => (
                                        <div
                                            key={lessonIdx}
                                            className={`px-4 py-3 flex gap-3 text-sm border-l-2 transition-colors cursor-pointer
                                        ${lesson.active
                                                    ? 'bg-blue-50 border-blue-600'
                                                    : 'border-transparent hover:bg-gray-50'
                                                }
                                        ${lesson.locked ? 'opacity-60 pointer-events-none' : ''}
                                    `}
                                        >
                                            <div className="mt-0.5">
                                                {lesson.completed ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : lesson.active ? (
                                                    <PlayCircle className="w-4 h-4 text-blue-600 fill-current" />
                                                ) : lesson.locked ? (
                                                    <Lock className="w-4 h-4 text-gray-300" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`font-medium ${lesson.active ? 'text-blue-700' : 'text-gray-700'}`}>
                                                    {lesson.title}
                                                </p>
                                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                    {lesson.type === 'video' ? <PlayCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                                    {lesson.duration}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
