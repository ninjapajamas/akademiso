'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, MessageSquarePlus } from 'lucide-react';

import CourseDiscussionForum from '@/components/forum/CourseDiscussionForum';
import { EnrolledCourse } from '@/types';

export default function DashboardForumCoursePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [enrollment, setEnrollment] = useState<EnrolledCourse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchEnrollment = async () => {
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
                    const matchedEnrollment = Array.isArray(data)
                        ? data.find((item: EnrolledCourse) => item.course.slug === slug)
                        : null;

                    setEnrollment(matchedEnrollment || null);
                    setNotFound(!matchedEnrollment);
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

        void fetchEnrollment();
    }, [slug]);

    if (isLoading) {
        return (
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="h-40 animate-pulse rounded-[2rem] bg-gray-100" />
                <div className="h-[520px] animate-pulse rounded-[2rem] bg-gray-100" />
            </div>
        );
    }

    if (notFound || !enrollment) {
        return (
            <div className="mx-auto max-w-4xl rounded-[2rem] border border-dashed border-gray-200 bg-white px-8 py-16 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-600">
                    <BookOpen className="h-7 w-7" />
                </div>
                <h1 className="mt-5 text-2xl font-black text-gray-900">Course forum tidak ditemukan</h1>
                <p className="mt-3 text-sm leading-7 text-gray-500">
                    Course yang Anda pilih tidak ada di daftar course yang sedang Anda ikuti.
                </p>
                <Link
                    href="/dashboard/forum"
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Daftar Course
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-800 to-blue-800 p-8 text-white shadow-xl shadow-slate-900/20">
                <Link
                    href="/dashboard/forum"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-100 transition hover:bg-white/15"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Daftar Course
                </Link>
                <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-blue-200">Topik Diskusi Course</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight">{enrollment.course.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
                    Di halaman ini Anda bisa membaca topik yang sudah ada, memilih topik untuk melihat komentar, atau membuat
                    topik baru untuk course yang sedang diikuti.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                    <MessageSquarePlus className="h-4 w-4 text-blue-200" />
                    Forum aktif untuk peserta {enrollment.course.instructor?.name || 'Akademiso'}
                </div>
            </div>

            <CourseDiscussionForum
                courseSlug={enrollment.course.slug}
                courseTitle={enrollment.course.title}
                canParticipate
            />
        </div>
    );
}
