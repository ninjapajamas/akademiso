'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';
import {
    ArrowLeft,
    Plus,
    PlayCircle,
    FileText,
    Trash2,
    FolderPlus,
    ChevronDown,
    ChevronRight,
    Edit2,
    HelpCircle,
    Layout,
    Library,
    Search,
    X
} from 'lucide-react';

const ASSESSMENT_LESSON_TYPES = ['quiz', 'mid_test', 'final_test', 'exam'];
const MATERIAL_BANK_TYPE_OPTIONS = [
    { value: 'all', label: 'Semua Jenis Materi' },
    { value: 'video', label: 'Video' },
    { value: 'article', label: 'Artikel' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'mid_test', label: 'Pre-Test' },
    { value: 'final_test', label: 'Post-Test' },
    { value: 'exam', label: 'Ujian Mandiri' },
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

type LessonItem = {
    id: number;
    title: string;
    type: string;
    duration?: string;
    order: number;
};

type SectionItem = {
    id: number;
    title: string;
    order: number;
    lessons?: LessonItem[];
};

type LessonBankItem = {
    id: number;
    title: string;
    type: string;
    duration?: string;
    course_title: string;
    section_title?: string | null;
    question_count?: number;
};

export default function CourseCurriculumContent({ courseId }: { courseId: string }) {
    const [sections, setSections] = useState<SectionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState('');
    const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({});
    const [materialBankOpen, setMaterialBankOpen] = useState(false);
    const [materialBankLoading, setMaterialBankLoading] = useState(false);
    const [materialBankItems, setMaterialBankItems] = useState<LessonBankItem[]>([]);
    const [materialBankSearch, setMaterialBankSearch] = useState('');
    const [materialBankTypeFilter, setMaterialBankTypeFilter] = useState<string>('all');
    const [targetSectionId, setTargetSectionId] = useState<number | null>(null);
    const [copyingLessonId, setCopyingLessonId] = useState<number | null>(null);
    const { confirmAction, showError, showSuccess } = useFeedbackModal();

    const fetchCurriculum = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const res = await fetch(`${apiUrl}/api/sections/?course_id=${courseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data: SectionItem[] = await res.json();
                const sortedSections = [...data].sort((a, b) => a.order - b.order);
                setSections(sortedSections);

                const initialExpanded: { [key: number]: boolean } = {};
                sortedSections.forEach((section) => initialExpanded[section.id] = true);
                setExpandedSections(initialExpanded);
            }
        } catch (error) {
            console.error('Failed to fetch curriculum:', error);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    const handleAddSection = async () => {
        if (!newSectionTitle.trim()) return;

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const res = await fetch(`${apiUrl}/api/sections/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course: courseId,
                    title: newSectionTitle,
                    order: sections.length + 1
                })
            });

            if (res.ok) {
                setNewSectionTitle('');
                setIsAddingSection(false);
                await fetchCurriculum();
                await showSuccess('Modul berhasil ditambahkan ke kurikulum.', 'Penambahan Berhasil');
            } else {
                await showError('Gagal menambah modul. Periksa izin akses Anda.', 'Penambahan Gagal');
            }
        } catch (error) {
            console.error('Failed to add section:', error);
            await showError('Gagal menambah modul. Cek koneksi.', 'Koneksi Bermasalah');
        }
    };

    const handleDeleteSection = async (sectionId: number) => {
        const shouldDelete = await confirmAction({
            title: 'Hapus Modul Ini?',
            message: 'Seluruh materi di dalam modul ini juga akan ikut terhapus.',
            confirmLabel: 'Ya, Hapus',
            cancelLabel: 'Batal',
            tone: 'warning',
        });
        if (!shouldDelete) return;

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            await fetch(`${apiUrl}/api/sections/${sectionId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            await fetchCurriculum();
            await showSuccess('Modul berhasil dihapus.', 'Penghapusan Berhasil');
        } catch (error) {
            console.error('Failed to delete section:', error);
            await showError('Modul belum bisa dihapus.', 'Penghapusan Gagal');
        }
    };

    const openMaterialBank = async (sectionId: number) => {
        setTargetSectionId(sectionId);
        setMaterialBankOpen(true);
        if (materialBankItems.length > 0) return;

        try {
            setMaterialBankLoading(true);
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/lessons/bank/?content_type=lessons`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data: LessonBankItem[] = await res.json();
                setMaterialBankItems(data);
            } else {
                await showError('Gagal memuat bank materi.', 'Pemanggilan Data Gagal');
            }
        } catch (error) {
            console.error('Failed to fetch material bank:', error);
            await showError('Gagal memuat bank materi. Cek koneksi.', 'Koneksi Bermasalah');
        } finally {
            setMaterialBankLoading(false);
        }
    };

    const copyLessonFromBank = async (lessonId: number) => {
        if (!targetSectionId) return;

        try {
            setCopyingLessonId(lessonId);
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/lessons/${lessonId}/copy-to-course/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course: courseId,
                    section: targetSectionId
                })
            });

            if (res.ok) {
                await fetchCurriculum();
                setMaterialBankOpen(false);
                await showSuccess('Materi berhasil disalin ke modul ini.', 'Penyalinan Berhasil');
            } else {
                await showError('Gagal menyalin materi.', 'Penyalinan Gagal');
            }
        } catch (error) {
            console.error('Failed to copy material:', error);
            await showError('Gagal menyalin materi. Cek koneksi.', 'Koneksi Bermasalah');
        } finally {
            setCopyingLessonId(null);
        }
    };

    const toggleSection = (sectionId: number) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const filteredMaterialBankItems = materialBankItems.filter((lesson) => {
        const keyword = materialBankSearch.trim().toLowerCase();
        const matchesKeyword = !keyword || [
            lesson.title,
            lesson.course_title,
            lesson.section_title || '',
            getLessonTypeLabel(lesson.type)
        ].some((value) => value.toLowerCase().includes(keyword));
        const matchesType = materialBankTypeFilter === 'all' || lesson.type === materialBankTypeFilter;
        return matchesKeyword && matchesType;
    });

    useEffect(() => {
        void fetchCurriculum();
    }, [fetchCurriculum]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link
                    href={`/instructor/courses/${courseId}`}
                    className="p-3 hover:bg-white rounded-2xl text-gray-400 hover:text-indigo-600 transition-all border border-transparent hover:border-gray-100"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kurikulum Kursus</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola Modul (Section) dan Materi (Lesson).</p>
                </div>
            </div>

            <div className="space-y-6">
                {sections.map((section) => (
                    <div key={section.id} className="border border-gray-100 rounded-[2rem] bg-white shadow-xl shadow-gray-200/40 overflow-hidden">
                        <div className="flex items-center justify-between p-6 bg-gray-50/50 border-b border-gray-50">
                            <div className="flex items-center gap-4 cursor-pointer select-none group" onClick={() => toggleSection(section.id)}>
                                <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-indigo-50 transition-colors">
                                    {expandedSections[section.id] ?
                                        <ChevronDown className="w-5 h-5 text-indigo-600" /> :
                                        <ChevronRight className="w-5 h-5 text-indigo-600" />
                                    }
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{section.title}</h3>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5 block">
                                        {section.lessons?.length || 0} Materi Tersedia
                                    </span>
                                </div>
                             </div>
                             <div className="flex items-center gap-2">
                                 <button
                                     type="button"
                                     onClick={() => openMaterialBank(section.id)}
                                     className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all"
                                 >
                                     <Library className="w-4 h-4" /> Bank Materi
                                 </button>
                                 <Link
                                     href={`/instructor/courses/${courseId}/lessons/new?section_id=${section.id}`}
                                     className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                                 >
                                    <Plus className="w-4 h-4" /> Tambah Materi
                                </Link>
                                <button
                                    onClick={() => handleDeleteSection(section.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {expandedSections[section.id] && (
                            <div className="divide-y divide-gray-50 bg-white">
                                {section.lessons && section.lessons.length > 0 ? (
                                    [...section.lessons].sort((a, b) => a.order - b.order).map((lesson) => (
                                        <div key={lesson.id} className="p-5 pl-12 flex items-center justify-between hover:bg-indigo-50/30 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-xl bg-gray-50 group-hover:bg-white transition-colors">
                                                    {lesson.type === 'video' ? (
                                                        <PlayCircle className="w-4 h-4 text-indigo-500" />
                                                    ) : isAssessmentLesson(lesson.type) ? (
                                                        <HelpCircle className="w-4 h-4 text-indigo-500" />
                                                    ) : (
                                                        <FileText className="w-4 h-4 text-emerald-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-gray-700 font-bold text-sm block">{lesson.title}</span>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{getLessonTypeLabel(lesson.type)}</span>
                                                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{lesson.duration || '0 Min'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/instructor/courses/${courseId}/lessons/${lesson.id}`}
                                                    className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-10 text-center">
                                        <Layout className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                        <p className="text-sm text-gray-400 italic">Belum ada materi di modul ini.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {isAddingSection ? (
                    <div className="bg-indigo-50/50 border border-dashed border-indigo-200 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                        <input
                            type="text"
                            placeholder="Judul Modul (Contoh: Pengenalan ISO)"
                            className="flex-1 px-5 py-3 bg-white border-none rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium"
                            value={newSectionTitle}
                            onChange={(e) => setNewSectionTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                            autoFocus
                        />
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={handleAddSection}
                                className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-3 rounded-2xl hover:bg-indigo-700 font-bold text-sm shadow-lg shadow-indigo-600/20"
                            >
                                Simpan Modul
                            </button>
                            <button
                                onClick={() => setIsAddingSection(false)}
                                className="px-4 py-3 text-gray-500 hover:text-gray-700 font-bold text-sm"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAddingSection(true)}
                        className="w-full py-8 border-2 border-dashed border-indigo-100 rounded-[2rem] text-indigo-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-3 group"
                    >
                        <div className="p-3 bg-indigo-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <FolderPlus className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-sm uppercase tracking-widest">Tambah Modul Baru</span>
                    </button>
                )}
            </div>

            {materialBankOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4 py-6">
                    <div className="w-full max-w-3xl max-h-[86vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
                        <div className="flex items-center justify-between gap-4 border-b border-gray-100 p-5">
                            <div>
                                <h2 className="text-lg font-black text-gray-900">Bank Materi</h2>
                                <p className="text-xs font-medium text-gray-500 mt-1">{filteredMaterialBankItems.length} materi tersedia</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMaterialBankOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 border-b border-gray-100">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                                    <Search className="w-4 h-4 text-gray-400" />
                                    <input
                                        type="search"
                                        value={materialBankSearch}
                                        onChange={(e) => setMaterialBankSearch(e.target.value)}
                                        placeholder="Cari materi, modul, atau course"
                                        className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400"
                                    />
                                </div>
                                <select
                                    value={materialBankTypeFilter}
                                    onChange={(e) => setMaterialBankTypeFilter(e.target.value)}
                                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                >
                                    {MATERIAL_BANK_TYPE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="max-h-[56vh] overflow-y-auto p-5 space-y-3">
                            {materialBankLoading ? (
                                <div className="py-12 text-center text-sm font-bold text-gray-400">Memuat bank materi...</div>
                            ) : filteredMaterialBankItems.length > 0 ? (
                                filteredMaterialBankItems.map((lesson) => (
                                    <div key={lesson.id} className="rounded-2xl border border-gray-100 p-4 hover:border-indigo-100 hover:bg-gray-50 transition-all">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 leading-relaxed">{lesson.title}</p>
                                                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                                                    <span className="rounded-lg bg-indigo-50 px-2 py-1 text-indigo-600">{getLessonTypeLabel(lesson.type)}</span>
                                                    <span className="rounded-lg bg-white px-2 py-1 text-gray-500 border border-gray-100">{lesson.course_title}</span>
                                                    {lesson.section_title && (
                                                        <span className="rounded-lg bg-white px-2 py-1 text-gray-500 border border-gray-100">{lesson.section_title}</span>
                                                    )}
                                                    {lesson.question_count ? (
                                                        <span className="rounded-lg bg-white px-2 py-1 text-gray-500 border border-gray-100">{lesson.question_count} Soal</span>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={copyingLessonId === lesson.id}
                                                onClick={() => copyLessonFromBank(lesson.id)}
                                                className="rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-40"
                                            >
                                                {copyingLessonId === lesson.id ? 'Menyalin...' : 'Salin'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center text-sm font-bold text-gray-400">Belum ada materi yang cocok.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
