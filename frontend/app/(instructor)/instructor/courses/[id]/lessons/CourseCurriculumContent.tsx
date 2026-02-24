'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
    GripVertical,
    Layout
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CourseCurriculumContent({ courseId }: { courseId: string }) {
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState('');
    const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({});

    const fetchCurriculum = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const res = await fetch(`${apiUrl}/api/sections/?course_id=${courseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                const sortedSections = data.sort((a: any, b: any) => a.order - b.order);
                setSections(sortedSections);

                const initialExpanded: { [key: number]: boolean } = {};
                sortedSections.forEach((s: any) => initialExpanded[s.id] = true);
                setExpandedSections(initialExpanded);
            }
        } catch (error) {
            console.error('Failed to fetch curriculum:', error);
        } finally {
            setLoading(false);
        }
    };

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
                fetchCurriculum();
            } else {
                alert('Gagal menambah modul. Periksa izin akses Anda.');
            }
        } catch (error) {
            console.error('Failed to add section:', error);
        }
    };

    const handleDeleteSection = async (sectionId: number) => {
        if (!confirm('Hapus modul ini beserta seluruh materinya?')) return;

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            await fetch(`${apiUrl}/api/sections/${sectionId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            fetchCurriculum();
        } catch (error) {
            console.error('Failed to delete section:', error);
        }
    };

    const toggleSection = (sectionId: number) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    useEffect(() => {
        fetchCurriculum();
    }, [courseId]);

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
                                    section.lessons.sort((a: any, b: any) => a.order - b.order).map((lesson: any) => (
                                        <div key={lesson.id} className="p-5 pl-12 flex items-center justify-between hover:bg-indigo-50/30 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-xl bg-gray-50 group-hover:bg-white transition-colors">
                                                    {lesson.type === 'video' ?
                                                        <PlayCircle className="w-4 h-4 text-indigo-500" /> :
                                                        <FileText className="w-4 h-4 text-emerald-500" />
                                                    }
                                                </div>
                                                <div>
                                                    <span className="text-gray-700 font-bold text-sm block">{lesson.title}</span>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lesson.type}</span>
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
        </div>
    );
}
