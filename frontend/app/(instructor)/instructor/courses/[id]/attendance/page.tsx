'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ClipboardList } from 'lucide-react';

import CourseAttendancePanel from '@/components/course/CourseAttendancePanel';

export default function InstructorCourseAttendancePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [courseTitle, setCourseTitle] = useState('Daftar Hadir Peserta');

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/courses/${id}/`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) {
                    return;
                }

                const data = await res.json();
                setCourseTitle(data.title || 'Daftar Hadir Peserta');
            } catch (error) {
                console.error('Error fetching course title:', error);
            }
        };

        void fetchCourse();
    }, [id]);

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/instructor/courses/${id}`} className="p-3 hover:bg-white rounded-2xl text-gray-400 hover:text-indigo-600 transition-all border border-transparent hover:border-gray-100 hover:shadow-sm">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">
                        <ClipboardList className="h-4 w-4" />
                        Kehadiran Course
                    </div>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{courseTitle}</h1>
                    <p className="text-sm text-gray-500">Lihat daftar hadir peserta berdasarkan penyelesaian pre-test dan post-test.</p>
                </div>
            </div>

            <CourseAttendancePanel courseId={parseInt(id)} />
        </div>
    );
}
