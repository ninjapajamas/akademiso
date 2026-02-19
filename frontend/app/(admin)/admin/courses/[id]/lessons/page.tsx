'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash, ChevronLeft, Video, FileText, HelpCircle } from 'lucide-react';

export default function LessonListPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLessons = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/lessons/?course_id=${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setLessons(data);
            }
        } catch (error) {
            console.error('Failed to fetch lessons:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLessons();
    }, [courseId]);

    const handleDelete = async (lessonId: number) => {
        if (!confirm('Are you sure you want to delete this lesson?')) return;

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/lessons/${lessonId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                fetchLessons();
            } else {
                alert('Failed to delete lesson');
            }
        } catch (error) {
            console.error('Error deleting lesson:', error);
            alert('Error deleting lesson');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video className="w-5 h-5 text-blue-500" />;
            case 'article': return <FileText className="w-5 h-5 text-green-500" />;
            case 'quiz': return <HelpCircle className="w-5 h-5 text-orange-500" />;
            default: return <FileText className="w-5 h-5 text-gray-500" />;
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Memuat materi...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/admin/courses/${courseId}`} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Kelola Materi</h1>
                        <p className="text-gray-500">ID Kursus: {courseId}</p>
                    </div>
                </div>
                <Link
                    href={`/admin/courses/${courseId}/lessons/new`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Materi
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Urutan</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tipe</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Judul</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Durasi</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {lessons.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    Belum ada materi. Tambahkan satu untuk memulai.
                                </td>
                            </tr>
                        ) : (
                            lessons.map((lesson: any) => (
                                <tr key={lesson.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-gray-900 font-medium w-20">
                                        <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-sm">
                                            {lesson.order}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 capitalize">
                                            {getIcon(lesson.type)}
                                            {lesson.type}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 font-medium">{lesson.title}</td>
                                    <td className="px-6 py-4 text-gray-500">{lesson.duration || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(lesson.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
