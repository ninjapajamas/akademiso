'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Users, Star, ArrowRight, TrendingUp } from 'lucide-react';

interface InstructorData {
    instructor: any;
    courses: any[];
    total_students: number;
    total_courses: number;
}

export default function InstructorDashboard() {
    const [data, setData] = useState<InstructorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');

    useEffect(() => {
        try {
            const token = localStorage.getItem('access_token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUsername(payload.username || '');
            }
        } catch (_) { }

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/instructor/courses/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setData(await res.json());
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const avgRating = data?.courses?.length
        ? (data.courses.reduce((s: number, c: any) => s + Number(c.rating || 0), 0) / data.courses.length).toFixed(1)
        : '0.0';

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-indigo-200 text-sm font-semibold mb-1">Portal Instruktur</p>
                    <h1 className="text-3xl font-bold mb-2">
                        Selamat Datang{data?.instructor?.name ? `, ${data.instructor.name}` : username ? `, ${username}` : ''}!
                    </h1>
                    <p className="text-indigo-100 text-base max-w-md">
                        {data?.instructor?.title || 'Instruktur Akademiso'}
                    </p>
                    <Link href="/instructor/courses" className="inline-flex items-center gap-2 mt-5 bg-white text-indigo-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50">
                        Kelola Kursus <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/3 translate-x-1/3" />
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-5">
                {[
                    { icon: BookOpen, label: 'Total Kursus', value: loading ? '...' : String(data?.total_courses ?? 0), color: 'bg-indigo-100 text-indigo-600' },
                    { icon: Users, label: 'Total Siswa', value: loading ? '...' : String(data?.total_students ?? 0), color: 'bg-green-100 text-green-600' },
                    { icon: Star, label: 'Rating Rata-rata', value: loading ? '...' : avgRating, color: 'bg-yellow-100 text-yellow-600' },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.color}`}>
                            <s.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">{s.label}</p>
                            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* My Courses */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Kursus Saya</h2>
                    <Link href="/instructor/courses" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                        Kelola Semua <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                {loading ? (
                    <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-100" />)}</div>
                ) : data?.courses?.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                        <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Belum ada kursus</p>
                        <p className="text-xs text-gray-400 mt-1">Hubungi admin untuk ditambahkan sebagai instruktur kursus.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data?.courses?.slice(0, 5).map((c: any) => (
                            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-sm truncate">{c.title}</h3>
                                    <p className="text-xs text-gray-500">{c.category?.name} &bull; {c.level} &bull; ⭐ {c.rating}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-extrabold text-gray-900">Rp {Number(c.price).toLocaleString('id-ID')}</p>
                                    <p className="text-xs text-gray-400">{c.enrolled_count} siswa</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
