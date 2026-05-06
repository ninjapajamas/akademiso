'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronRight, MessageSquare, Search } from 'lucide-react';

import { Course } from '@/types';
import { getClientApiBaseUrl } from '@/utils/api';
import { getForumReadState, isCourseDiscussionUnread } from '@/utils/forumReadState';

export default function InstructorForumPage() {
    const [courses, setCourses] = useState<Course[]>([]);
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

                const apiUrl = getClientApiBaseUrl();
                const response = await fetch(`${apiUrl}/api/instructor/courses/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                    const data = await response.json();
                    setCourses(Array.isArray(data?.courses) ? data.courses : []);
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

    const filteredCourses = courses.filter((course) => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return true;
        return (
            course.title.toLowerCase().includes(keyword) ||
            (course.category?.name || '').toLowerCase().includes(keyword)
        );
    });
    const readState = getForumReadState();

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="rounded-[2rem] bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-700 p-8 text-white shadow-xl shadow-slate-900/20">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-indigo-200">Forum Instruktur</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight">Pantau diskusi per course yang Anda ampu</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
                    Pilih salah satu course untuk membaca topik peserta, menjawab pertanyaan, dan menjaga forum diskusi tetap aktif.
                </p>
            </div>

            <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari course yang ingin dibuka forum diskusinya..."
                        className="w-full rounded-2xl border border-gray-200 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {isLoading ? (
                        [1, 2, 3].map((item) => (
                            <div key={item} className="h-52 animate-pulse rounded-[2rem] bg-gray-100" />
                        ))
                    ) : filteredCourses.length > 0 ? (
                        filteredCourses.map((course) => (
                            <Link
                                key={course.id}
                                href={`/instructor/forum/${course.slug}`}
                                className="group rounded-[2rem] border border-gray-100 bg-slate-50/80 p-5 transition hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:shadow-indigo-100/40"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-base font-black tracking-tight text-gray-900 group-hover:text-indigo-700">
                                            {course.title}
                                        </p>
                                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                                            {course.category?.name || 'Kursus Akademiso'}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {isCourseDiscussionUnread(course, readState) && (
                                                <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">
                                                    Belum Dibaca
                                                </span>
                                            )}
                                            {course.discussion_summary?.topic_count ? (
                                                <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
                                                    {course.discussion_summary.topic_count} topik aktif
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
                                    <span>{course.enrolled_count || 0} peserta</span>
                                    <span className="capitalize">{course.type}</span>
                                </div>

                                <div className="mt-5 flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700">
                                    <span>Buka forum course</span>
                                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="md:col-span-2 xl:col-span-3 rounded-[2rem] border border-dashed border-gray-200 bg-gray-50 px-8 py-16 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-600">
                                <MessageSquare className="h-7 w-7" />
                            </div>
                            <h2 className="mt-5 text-2xl font-black text-gray-900">Belum ada forum yang bisa dibuka</h2>
                            <p className="mt-3 text-sm leading-7 text-gray-500">
                                {courses.length > 0
                                    ? 'Tidak ada course yang cocok dengan pencarian Anda.'
                                    : 'Anda belum memiliki course yang tampil di portal instruktur.'}
                            </p>
                            <Link
                                href="/instructor/courses"
                                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                            >
                                Lihat Kursus Saya <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
