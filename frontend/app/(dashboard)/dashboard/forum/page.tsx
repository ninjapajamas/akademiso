'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronRight, MessageSquare, Search } from 'lucide-react';

import { EnrolledCourse } from '@/types';

export default function DashboardForumPage() {
    const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    window.location.href = '/login';
                    return;
                }

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const response = await fetch(`${apiUrl}/api/my-courses/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                    const data = await response.json();
                    setEnrollments(Array.isArray(data) ? data : []);
                } else if (response.status === 401) {
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchCourses();
    }, []);

    const filteredEnrollments = enrollments.filter((enrollment) => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return true;
        return (
            enrollment.course.title.toLowerCase().includes(keyword) ||
            (enrollment.course.instructor?.name || '').toLowerCase().includes(keyword)
        );
    });

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-800 to-blue-800 p-8 text-white shadow-xl shadow-slate-900/20">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-200">Forum Diskusi</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight">Pilih course untuk masuk ke halaman topiknya</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
                    Dari sini Anda bisa memilih salah satu course yang diikuti. Setelah course diklik, Anda akan masuk ke halaman
                    khusus berisi topik-topik yang sudah ada dan form untuk menambah topik baru.
                </p>
            </div>

            <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari course yang ingin didiskusikan..."
                        className="w-full rounded-2xl border border-gray-200 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {isLoading ? (
                        [1, 2, 3, 4].map((item) => (
                            <div key={item} className="h-52 animate-pulse rounded-[2rem] bg-gray-100" />
                        ))
                    ) : filteredEnrollments.length > 0 ? (
                        filteredEnrollments.map((enrollment) => (
                            <Link
                                key={enrollment.id}
                                href={`/dashboard/forum/${enrollment.course.slug}`}
                                className="group rounded-[2rem] border border-gray-100 bg-slate-50/80 p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-lg hover:shadow-blue-100/40"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-base font-black tracking-tight text-gray-900 group-hover:text-blue-700">
                                            {enrollment.course.title}
                                        </p>
                                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                                            {enrollment.course.instructor?.name || 'Instruktur Akademiso'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
                                    <span>{enrollment.progress_percentage || 0}% progres</span>
                                    <span className="capitalize">{enrollment.course.type}</span>
                                </div>

                                <div className="mt-5 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                                    <span>Buka halaman topik</span>
                                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="md:col-span-2 xl:col-span-3 rounded-[2rem] border border-dashed border-gray-200 bg-gray-50 px-8 py-16 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-600">
                                <MessageSquare className="h-7 w-7" />
                            </div>
                            <h2 className="mt-5 text-2xl font-black text-gray-900">Belum ada course untuk dibuka</h2>
                            <p className="mt-3 text-sm leading-7 text-gray-500">
                                {enrollments.length > 0
                                    ? 'Tidak ada course yang cocok dengan pencarian Anda.'
                                    : 'Anda belum memiliki course aktif untuk forum diskusi.'}
                            </p>
                            <Link
                                href="/courses"
                                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                            >
                                Jelajahi Kursus <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
