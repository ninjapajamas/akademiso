'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { Course } from '@/types';
import { formatRupiah } from '@/types/currency';

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const normalizeCoursesResponse = (payload: unknown): Course[] => {
        if (Array.isArray(payload)) {
            return payload as Course[];
        }

        if (payload && typeof payload === 'object') {
            const candidate = (payload as { results?: unknown; courses?: unknown }).results
                ?? (payload as { results?: unknown; courses?: unknown }).courses;

            if (Array.isArray(candidate)) {
                return candidate as Course[];
            }
        }

        return [];
    };

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/courses/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (!res.ok) {
                console.error('Failed to fetch courses:', data);
                setCourses([]);
                return;
            }

            setCourses(normalizeCoursesResponse(data));
        } catch (error) {
            console.error('Failed to fetch courses:', error);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this course?')) return;

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/courses/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                fetchCourses();
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Manajemen Kursus</h1>
                <Link
                    href="/admin/courses/new"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Kursus
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70 text-xs text-gray-500">
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-[920px] w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Judul</th>
                                <th className="p-4 font-semibold text-gray-600">Instruktur</th>
                                <th className="p-4 font-semibold text-gray-600">Tipe</th>
                                <th className="p-4 font-semibold text-gray-600">Harga</th>
                                <th className="p-4 font-semibold text-gray-600">Level</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="sticky right-0 z-10 min-w-[120px] bg-gray-50 p-4 font-semibold text-gray-600 text-right shadow-[-10px_0_14px_-14px_rgba(15,23,42,0.5)]">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={7} className="p-4 text-center">Memuat...</td></tr>
                            ) : courses.map((course) => (
                                <tr key={course.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-900">
                                        <div className="flex items-center gap-3 min-w-[250px]">
                                            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600 shrink-0">
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="line-clamp-1">{course.title}</div>
                                                <div className="text-xs text-gray-500">{course.category?.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600 text-sm whitespace-nowrap">{course.instructor?.name}</td>
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${course.type === 'webinar' ? 'bg-rose-500' :
                                                    course.type === 'workshop' ? 'bg-amber-500' :
                                                        'bg-indigo-500'
                                                }`}>
                                                {(course.type || 'course').toUpperCase()}
                                            </span>
                                            {course.delivery_mode && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${course.delivery_mode === 'online' ? 'bg-sky-50 text-sky-700' : 'bg-stone-100 text-stone-700'}`}>
                                                    {course.delivery_mode === 'online' ? 'ONLINE' : 'OFFLINE'}
                                                </span>
                                            )}
                                            {course.type === 'webinar' && course.is_free && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                                    GRATIS
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-900 font-medium whitespace-nowrap">
                                        {course.type === 'webinar' && course.is_free ? 'Gratis' : formatRupiah(course.price)}
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">{course.level}</span>
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${course.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {course.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="sticky right-0 z-10 min-w-[120px] bg-white p-4 text-right shadow-[-10px_0_14px_-14px_rgba(15,23,42,0.5)]">
                                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                            <Link
                                                href={`/admin/courses/${course.id}`}
                                                className="inline-flex p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(course.id)}
                                                className="inline-flex p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
