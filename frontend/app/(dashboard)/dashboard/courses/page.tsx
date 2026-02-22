'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Clock, ArrowRight, Search, Filter, BarChart } from 'lucide-react';
import { EnrolledCourse } from '@/types';

export default function MyCoursesPage() {
    const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Completed' | 'Cancelled'>('all');

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) { window.location.href = '/login'; return; }

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/my-courses/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setEnrollments(data);
                } else if (res.status === 401) {
                    window.location.href = '/login';
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const filtered = enrollments.filter(e => {
        const matchSearch = e.course.title.toLowerCase().includes(search.toLowerCase()) ||
            e.course.instructor?.name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || e.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            Completed: 'bg-green-100 text-green-700',
            Pending: 'bg-yellow-100 text-yellow-700',
            Cancelled: 'bg-red-100 text-red-700',
        };
        const label: Record<string, string> = {
            Completed: 'Selesai',
            Pending: 'Berlangsung',
            Cancelled: 'Dibatalkan',
        };
        return (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>
                {label[status] || status}
            </span>
        );
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Kursus Saya</h1>
                <p className="text-gray-500 mt-1">Semua pelatihan ISO yang telah Anda daftarkan.</p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari kursus..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="border-none outline-none bg-transparent font-medium text-gray-700 cursor-pointer"
                    >
                        <option value="all">Semua Status</option>
                        <option value="Pending">Berlangsung</option>
                        <option value="Completed">Selesai</option>
                        <option value="Cancelled">Dibatalkan</option>
                    </select>
                </div>
            </div>

            {/* Course List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-gray-100" />
                    ))}
                </div>
            ) : filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map(enrollment => (
                        <div key={enrollment.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-5 hover:shadow-md transition-shadow">
                            {/* Thumbnail */}
                            <div className="w-24 h-24 rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                {enrollment.course.thumbnail ? (
                                    <img src={enrollment.course.thumbnail} alt={enrollment.course.title} className="w-full h-full object-cover" />
                                ) : (
                                    <BookOpen className="w-8 h-8 text-white/80" />
                                )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <div>
                                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-2">
                                            {enrollment.course.category?.name || 'ISO'}
                                        </span>
                                        {statusBadge(enrollment.status)}
                                    </div>
                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                        {new Date(enrollment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <h3 className="font-bold text-gray-900 mb-0.5 line-clamp-1">{enrollment.course.title}</h3>
                                <p className="text-xs text-gray-500 mb-3">
                                    {enrollment.course.instructor?.name} &bull; {enrollment.course.level} &bull; {enrollment.course.duration}
                                </p>
                                {/* Progress */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 rounded-full" style={{ width: enrollment.status === 'Completed' ? '100%' : '0%' }} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 flex-shrink-0">
                                        {enrollment.status === 'Completed' ? '100%' : '0%'}
                                    </span>
                                    <Link
                                        href={`/learn/${enrollment.course.slug}`}
                                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                                    >
                                        {enrollment.status === 'Completed' ? 'Ulang' : 'Mulai'} <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-7 h-7 text-blue-400" />
                    </div>
                    <p className="font-semibold text-gray-700 mb-1">
                        {search || statusFilter !== 'all' ? 'Tidak ada kursus yang cocok' : 'Belum ada kursus'}
                    </p>
                    <p className="text-sm text-gray-400 mb-5">
                        {search || statusFilter !== 'all' ? 'Coba ubah filter pencarian.' : 'Jelajahi dan daftar ke program pelatihan ISO.'}
                    </p>
                    <Link href="/courses" className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 text-sm">
                        Jelajahi Kursus <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

            {/* Summary */}
            {!isLoading && enrollments.length > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-2">
                    {[
                        { label: 'Total Kursus', value: enrollments.length, color: 'text-blue-600' },
                        { label: 'Selesai', value: enrollments.filter(e => e.status === 'Completed').length, color: 'text-green-600' },
                        { label: 'Berlangsung', value: enrollments.filter(e => e.status === 'Pending').length, color: 'text-yellow-600' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
