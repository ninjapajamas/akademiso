'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Award, Calendar, CheckCircle, Clock } from 'lucide-react';

import { EnrolledCourse } from '@/types';

function decodeJwt(token: string) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

export default function DashboardPage() {
    const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [username, setUsername] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const payload = decodeJwt(token);
        if (payload?.username) {
            setUsername(payload.username);
        }

        const fetchCourses = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/my-courses/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    setEnrolledCourses(await res.json());
                } else if (res.status === 401) {
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCourses();
    }, []);

    const completed = enrolledCourses.filter((enrollment) => (enrollment.progress_percentage || 0) === 100).length;
    const pending = enrolledCourses.filter((enrollment) => (enrollment.progress_percentage || 0) < 100).length;

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">
                        Selamat Datang{username ? `, ${username}` : ''}!
                    </h1>
                    <p className="text-blue-100 max-w-xl text-base leading-relaxed">
                        {pending > 0
                            ? `Anda memiliki ${pending} kursus yang sedang berlangsung. Lanjutkan perjalanan sertifikasi ISO Anda hari ini.`
                            : 'Siap memulai perjalanan sertifikasi ISO? Jelajahi program pelatihan kami.'}
                    </p>
                    <Link
                        href="/courses"
                        className="inline-flex items-center gap-2 mt-5 bg-white text-blue-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
                    >
                        Jelajahi Kursus <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="absolute right-20 bottom-0 w-32 h-32 bg-white opacity-10 rounded-full translate-y-1/2" />
                <div className="absolute top-1/2 right-10 -translate-y-1/2 hidden md:flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[90px] border border-white/10">
                        <div className="text-3xl font-bold">{isLoading ? '-' : enrolledCourses.length}</div>
                        <div className="text-xs font-medium uppercase tracking-wider text-blue-200 mt-1">Kursus</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[90px] border border-white/10">
                        <div className="text-3xl font-bold">{isLoading ? '-' : completed}</div>
                        <div className="text-xs font-medium uppercase tracking-wider text-blue-200 mt-1">Selesai</div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {[
                    { icon: Clock, label: 'Total Kursus', value: isLoading ? '...' : String(enrolledCourses.length), color: 'bg-blue-100 text-blue-600' },
                    { icon: CheckCircle, label: 'Kursus Selesai', value: isLoading ? '...' : String(completed), color: 'bg-green-100 text-green-600' },
                    { icon: Calendar, label: 'Ujian Berikutnya', value: '15 Mar', color: 'bg-orange-100 text-orange-600' },
                ].map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">{stat.label}</p>
                            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-5">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Kursus Aktif</h2>
                    <Link href="/dashboard/courses" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {isLoading ? (
                        [1, 2].map((item) => (
                            <div key={item} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 h-40 animate-pulse" />
                        ))
                    ) : enrolledCourses.length > 0 ? (
                        enrolledCourses.slice(0, 4).map((enrollment) => (
                            <div key={enrollment.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow">
                                <div className="w-20 h-20 rounded-xl flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden">
                                    {enrollment.course.thumbnail ? (
                                        <img src={enrollment.course.thumbnail} alt={enrollment.course.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <Award className="w-8 h-8 text-white/70" />
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between min-w-0">
                                    <div>
                                        <div className="flex justify-between items-start mb-1 gap-2">
                                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                {enrollment.course.category?.name || 'ISO'}
                                            </span>
                                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                                                {new Date(enrollment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-sm line-clamp-2">{enrollment.course.title}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {enrollment.course.instructor?.name || '-'}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5 mt-2">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-gray-500">Progres</span>
                                            <span className="text-blue-600">{enrollment.progress_percentage || 0}%</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${enrollment.progress_percentage || 0}%` }} />
                                        </div>
                                        <Link
                                            href={enrollment.course.last_accessed_lesson_id ? `/learn/${enrollment.course.slug}?lesson=${enrollment.course.last_accessed_lesson_id}` : `/learn/${enrollment.course.slug}`}
                                            className="w-full mt-1.5 bg-blue-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1"
                                        >
                                            {enrollment.course.last_accessed_lesson_id || (enrollment.progress_percentage && enrollment.progress_percentage > 0) ? 'Lanjut Belajar' : 'Mulai Belajar'}{' '}
                                            <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-gray-100">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-7 h-7 text-blue-400" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">Belum ada kursus aktif</h3>
                            <p className="text-sm text-gray-500 mb-5">Anda belum mendaftar di kursus manapun saat ini.</p>
                            <Link
                                href="/courses"
                                className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm"
                            >
                                Jelajahi Kursus <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { href: '/dashboard/courses', label: 'Kursus Saya', emoji: '📚', desc: 'Lihat semua kursus' },
                    { href: '/dashboard/schedule', label: 'Jadwal', emoji: '📅', desc: 'Ujian & kelas mendatang' },
                    { href: '/dashboard/certificates', label: 'Sertifikat', emoji: '🏆', desc: 'Unduh sertifikat' },
                    { href: '/dashboard/settings', label: 'Pengaturan', emoji: '⚙️', desc: 'Kelola akun' },
                ].map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                        <div className="text-2xl mb-2">{item.emoji}</div>
                        <p className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </Link>
                ))}
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Sertifikat Terbaru</h2>
                    <Link href="/dashboard/certificates" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
                    {[
                        { title: 'ISO 9001:2015 Manajemen Mutu', sub: 'Lead Implementer • Lulus 12 Okt 2024' },
                        { title: 'ISO 14001:2015 Manajemen Lingkungan', sub: 'Internal Auditor • Lulus 18 Jan 2024' },
                    ].map((certificate, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50/40 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                                    <Award className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">{certificate.title}</h4>
                                    <p className="text-xs text-gray-500">{certificate.sub}</p>
                                </div>
                            </div>
                            <Link href="/dashboard/certificates" className="text-xs font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-700">
                                Unduh
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
