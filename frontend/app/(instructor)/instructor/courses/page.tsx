'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    BookOpen,
    Plus,
    Search,
    Edit2,
    Eye,
    MessageSquare,
    Users,
    Star,
    LayoutGrid,
    List as ListIcon
} from 'lucide-react';
import { Course } from '@/types';
import { formatRupiah } from '@/types/currency';

export default function InstructorCoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/instructor/courses/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setCourses(data.courses || []);
            }
        } catch (error) {
            console.error('Failed to fetch courses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kursus Saya</h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola materi dan kurikulum kursus yang Anda ampu.</p>
                </div>
                <Link
                    href="/instructor/courses/new"
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Buat Kursus Baru
                </Link>
            </div>

            {/* Filters & Tools */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari kursus..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <ListIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {filteredCourses.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Belum ada kursus</h3>
                    <p className="text-gray-500 mt-1 mb-6">Mulai buat kursus pertama Anda hari ini.</p>
                    <Link href="/instructor/courses/new" className="text-indigo-600 font-bold hover:underline">
                        Buat Kursus Sekarang
                    </Link>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => (
                        <div key={course.id} className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                            <div className="aspect-video relative overflow-hidden">
                                {course.thumbnail ? (
                                    <img
                                        src={course.thumbnail}
                                        alt={course.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                                        <BookOpen className="w-10 h-10 text-indigo-200" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3">
                                    <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-indigo-600 shadow-sm uppercase tracking-wider">
                                        {course.level}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                        {course.category?.name || 'UMUM'}
                                    </span>
                                    <div className="flex items-center gap-1 text-amber-500">
                                        <Star className="w-3 h-3 fill-current" />
                                        <span className="text-xs font-bold">{course.rating}</span>
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-900 line-clamp-2 min-h-[3rem] group-hover:text-indigo-600 transition-colors">
                                    {course.title}
                                </h3>

                                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4" />
                                        <span>{course.enrolled_count} Siswa</span>
                                    </div>
                                    <span className="font-bold text-indigo-600">
                                        {formatRupiah(course.price)}
                                    </span>
                                </div>

                                {course.type === 'course' ? (
                                    <Link href={`/instructor/courses/${course.id}/attendance`} className="mt-4 block rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50">
                                        <div className="flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                                            <span>Kehadiran</span>
                                            <span>{course.attendance_summary?.percentage ?? 0}%</span>
                                        </div>
                                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/90">
                                            <div
                                                className="h-full rounded-full bg-emerald-500"
                                                style={{ width: `${course.attendance_summary?.percentage ?? 0}%` }}
                                            />
                                        </div>
                                        <p className="mt-2 text-xs font-semibold text-emerald-800">
                                            {course.attendance_summary?.present ?? 0} dari {course.attendance_summary?.total ?? 0} peserta sudah hadir
                                        </p>
                                        <p className="mt-2 text-[11px] font-bold text-emerald-700">Klik untuk buka daftar hadir peserta</p>
                                    </Link>
                                ) : (
                                    <div className="mt-4 rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-xs font-semibold text-gray-400">
                                        Kehadiran peserta hanya tersedia untuk course.
                                    </div>
                                )}

                                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center gap-2">
                                    <Link
                                        href={`/instructor/courses/${course.id}`}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-100 transition-colors"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        Edit Kursus
                                    </Link>
                                    <Link
                                        href={`/instructor/courses/${course.id}/lessons`}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors"
                                    >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        Materi
                                    </Link>
                                    <Link
                                        href={`/instructor/forum/${course.slug}`}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                                        title="Buka Forum Diskusi"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                                <th className="px-6 py-4">Kursus</th>
                                <th className="px-6 py-4">Info</th>
                                <th className="px-6 py-4">Harga</th>
                                <th className="px-6 py-4">Kehadiran</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredCourses.map((course) => (
                                <tr key={course.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-50 overflow-hidden flex-shrink-0">
                                                {course.thumbnail ? (
                                                    <img src={course.thumbnail} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <BookOpen className="w-5 h-5 text-indigo-200" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors decoration-indigo-600/30 underline-offset-4 line-clamp-1">{course.title}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{course.category?.name || 'UMUM'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Users className="w-3 h-3 text-indigo-400" />
                                                <span>{course.enrolled_count} Siswa</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Star className="w-3 h-3 text-amber-400" />
                                                <span>{course.rating} Rating</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 text-sm">{formatRupiah(course.price)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {course.type === 'course' ? (
                                            <Link href={`/instructor/courses/${course.id}/attendance`} className="block min-w-[120px] rounded-xl p-2 -m-2 transition hover:bg-emerald-50">
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
                                            <div className="min-w-[120px] rounded-xl border border-dashed border-gray-200 px-3 py-3 text-center text-[11px] font-semibold text-gray-400">
                                                Tidak tersedia
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${course.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {course.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/instructor/courses/${course.id}`}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Edit Kursus"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href={`/instructor/courses/${course.id}/lessons`}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Kelola Materi"
                                            >
                                                <BookOpen className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href={`/courses/${course.slug}`}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Lihat Detail"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href={`/instructor/forum/${course.slug}`}
                                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                                title="Buka Forum Diskusi"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
