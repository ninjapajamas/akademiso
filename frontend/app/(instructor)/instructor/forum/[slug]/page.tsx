'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, MessageSquarePlus } from 'lucide-react';

import CourseDiscussionForum from '@/components/forum/CourseDiscussionForum';
import { Course } from '@/types';
import { getClientApiBaseUrl } from '@/utils/api';

export default function InstructorForumCoursePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

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
                    const matchedCourse = Array.isArray(data?.courses)
                        ? data.courses.find((item: Course) => item.slug === slug)
                        : null;

                    setCourse(matchedCourse || null);
                    setNotFound(!matchedCourse);
                } else if (response.status === 401) {
                    window.location.href = '/login';
                } else {
                    setNotFound(true);
                }
            } catch (error) {
                console.error(error);
                setNotFound(true);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchCourses();
    }, [slug]);

    if (isLoading) {
        return (
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="h-40 animate-pulse rounded-[2rem] bg-gray-100" />
                <div className="h-[520px] animate-pulse rounded-[2rem] bg-gray-100" />
            </div>
        );
    }

    if (notFound || !course) {
        return (
            <div className="mx-auto max-w-4xl rounded-[2rem] border border-dashed border-gray-200 bg-white px-8 py-16 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-600">
                    <BookOpen className="h-7 w-7" />
                </div>
                <h1 className="mt-5 text-2xl font-black text-gray-900">Forum course tidak ditemukan</h1>
                <p className="mt-3 text-sm leading-7 text-gray-500">
                    Course yang Anda pilih tidak ada di daftar course yang sedang Anda ampu.
                </p>
                <Link
                    href="/instructor/forum"
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Daftar Forum
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="rounded-[2rem] bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-700 p-8 text-white shadow-xl shadow-slate-900/20">
                <Link
                    href="/instructor/forum"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-100 transition hover:bg-white/15"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Daftar Forum
                </Link>
                <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-indigo-200">Forum Diskusi Course</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight">{course.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
                    Dari sini Anda bisa membaca diskusi peserta, menjawab pertanyaan, dan membuka topik baru untuk mengarahkan percakapan course.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                    <MessageSquarePlus className="h-4 w-4 text-indigo-200" />
                    Forum aktif untuk trainer dan peserta course ini
                </div>
            </div>

            <CourseDiscussionForum
                courseSlug={course.slug}
                courseTitle={course.title}
                canParticipate
            />
        </div>
    );
}
