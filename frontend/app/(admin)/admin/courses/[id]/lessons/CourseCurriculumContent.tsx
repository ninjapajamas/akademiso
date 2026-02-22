'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, PlayCircle, FileText, Trash2, FolderPlus, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
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

            // Fetch sections for this course
            const res = await fetch(`${apiUrl}/api/sections/?course_id=${courseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                // Sort sections by order
                const sortedSections = data.sort((a: any, b: any) => a.order - b.order);
                setSections(sortedSections);

                // Expand all sections by default
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
                const errorData = await res.json();
                console.error('Failed to add section:', res.status, errorData);
                alert(`Gagal menambah modul: ${JSON.stringify(errorData)}`);
            }
        } catch (error) {
            console.error('Failed to add section:', error);
            alert('Gagal menambah modul. Cek koneksi.');
        }
    };

    const handleDeleteSection = async (sectionId: number) => {
        if (!confirm('Are you sure? All lessons in this section will be unlinked or deleted.')) return;

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
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Memuat kurikulum...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href={`/admin/courses/${courseId}`}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kurikulum Kursus</h1>
                    <p className="text-gray-500">Atur Modul dan Materi</p>
                </div>
            </div>

            <div className="space-y-4">
                {sections.map((section) => (
                    <div key={section.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleSection(section.id)}>
                                {expandedSections[section.id] ?
                                    <ChevronDown className="w-5 h-5 text-gray-400" /> :
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                }
                                <h3 className="font-bold text-gray-900">{section.title}</h3>
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                    {section.lessons?.length || 0} Materi
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/admin/courses/${courseId}/lessons/new?section_id=${section.id}`}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> Materi
                                </Link>
                                <button
                                    onClick={() => handleDeleteSection(section.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {expandedSections[section.id] && (
                            <div className="divide-y divide-gray-100">
                                {section.lessons && section.lessons.length > 0 ? (
                                    section.lessons.sort((a: any, b: any) => a.order - b.order).map((lesson: any) => (
                                        <div key={lesson.id} className="p-4 pl-12 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                {lesson.type === 'video' ?
                                                    <PlayCircle className="w-4 h-4 text-blue-500" /> :
                                                    <FileText className="w-4 h-4 text-green-500" />
                                                }
                                                <span className="text-gray-700 font-medium">{lesson.title}</span>
                                                <span className="text-xs text-gray-400 ml-2">{lesson.duration || '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-gray-400 italic">
                                        Belum ada materi di modul ini.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {isAddingSection ? (
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="Judul Modul (Contoh: Pengenalan)"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            value={newSectionTitle}
                            onChange={(e) => setNewSectionTitle(e.target.value)}
                            autoFocus
                        />
                        <button
                            onClick={handleAddSection}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Simpan
                        </button>
                        <button
                            onClick={() => setIsAddingSection(false)}
                            className="text-gray-500 hover:text-gray-700 font-medium px-2"
                        >
                            Batal
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAddingSection(true)}
                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition flex items-center justify-center gap-2 catch-action"
                    >
                        <FolderPlus className="w-5 h-5" />
                        Tambah Modul Baru
                    </button>
                )}
            </div>
        </div>
    );
}
