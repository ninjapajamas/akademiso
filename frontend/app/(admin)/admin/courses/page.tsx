'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { Course } from '@/types';
import { formatRupiah } from '@/types/currency';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const { confirmAction, showError, showSuccess } = useFeedbackModal();

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

    const fetchCourses = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
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
    }, []);

    const handleDelete = async (id: number) => {
        const shouldDelete = await confirmAction({
            title: 'Hapus Kursus?',
            message: 'Kursus yang dihapus tidak bisa dipulihkan lagi.',
            confirmLabel: 'Ya, Hapus',
            cancelLabel: 'Batal',
            tone: 'warning',
        });
        if (!shouldDelete) return;

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const res = await fetch(`${apiUrl}/api/courses/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                await fetchCourses();
                await showSuccess('Kursus berhasil dihapus.', 'Penghapusan Berhasil');
            } else {
                await showError('Kursus belum bisa dihapus.', 'Penghapusan Gagal');
            }
        } catch (error) {
            console.error('Error deleting:', error);
            await showError('Terjadi kesalahan saat menghapus kursus.', 'Koneksi Bermasalah');
        }
    };

    useEffect(() => {
        void fetchCourses();
    }, [fetchCourses]);

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
                                <th className="p-4 font-semibold text-gray-600">Trainer</th>
                                <th className="p-4 font-semibold text-gray-600">Tipe</th>
                                <th className="p-4 font-semibold text-gray-600">Harga</th>
                                <th className="p-4 font-semibold text-gray-600">Level</th>
                                <th className="p-4 font-semibold text-gray-600">Kehadiran</th>
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
                                        {course.type === 'course' ? (
                                            <Link href={`/admin/courses/${course.id}/attendance`} className="block min-w-[110px] rounded-xl p-2 -m-2 hover:bg-emerald-50 transition-colors">
                                                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-500">
                                                    <span>{course.attendance_summary?.present ?? 0}/{course.attendance_summary?.total ?? 0}</span>
                                                    <span>{course.attendance_summary?.percentage ?? 0}%</span>
                                                </div>
                                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                                                    <div
                                                        className="h-full rounded-full bg-emerald-500"
                                                        style={{ width: `${course.attendance_summary?.percentage ?? 0}%` }}
                                                    />
                                                </div>
                                                <p className="mt-2 text-[11px] font-bold text-emerald-700">Buka daftar hadir</p>
                                            </Link>
                                        ) : (
                                            <div className="min-w-[110px] rounded-xl border border-dashed border-gray-200 px-3 py-3 text-center text-[11px] font-semibold text-gray-400">
                                                Tidak tersedia
                                            </div>
                                        )}
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

