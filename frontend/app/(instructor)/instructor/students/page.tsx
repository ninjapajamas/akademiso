'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { useState, useEffect } from 'react';
import { Users, Search, BookOpen, CheckCircle, Clock } from 'lucide-react';

interface Student {
    id: number;
    user_id: number;
    username: string;
    full_name: string;
    email: string;
    course: string;
    course_slug: string;
    status: string;
    enrolled_at: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    Completed: { label: 'Selesai', cls: 'bg-green-100 text-green-700' },
    Pending: { label: 'Aktif', cls: 'bg-blue-100 text-blue-700' },
    Cancelled: { label: 'Batal', cls: 'bg-red-100 text-red-700' },
};

export default function InstructorStudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [courseFilter, setCourseFilter] = useState('all');

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = getClientApiBaseUrl();
                const res = await fetch(`${apiUrl}/api/instructor/students/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setStudents(await res.json());
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetch_();
    }, []);

    const courses = Array.from(new Set(students.map(s => s.course)));
    const filtered = students.filter(s => {
        const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
            s.username.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase());
        const matchCourse = courseFilter === 'all' || s.course === courseFilter;
        return matchSearch && matchCourse;
    });

    const completedCount = students.filter(s => s.status === 'Completed').length;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Siswa Saya</h1>
                <p className="text-gray-500 mt-1">Semua peserta yang terdaftar di kursus Anda.</p>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Siswa', value: students.length, icon: Users, color: 'bg-indigo-100 text-indigo-600' },
                    { label: 'Selesai', value: completedCount, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
                    { label: 'Kursus Aktif', value: courses.length, icon: BookOpen, color: 'bg-purple-100 text-purple-600' },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${s.color}`}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
                            <p className="text-xs text-gray-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Cari nama atau email siswa..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                </div>
                {courses.length > 1 && (
                    <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 outline-none bg-white">
                        <option value="all">Semua Kursus</option>
                        {courses.map(c => <option key={c} value={c}>{c.length > 40 ? c.substring(0, 40) + '...' : c}</option>)}
                    </select>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3 text-left">Siswa</th>
                                <th className="px-5 py-3 text-left">Kursus</th>
                                <th className="px-5 py-3 text-center">Status</th>
                                <th className="px-5 py-3 text-right">Terdaftar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={4} className="py-10 text-center text-gray-400">Memuat...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={4} className="py-10 text-center text-gray-400">Tidak ada siswa yang cocok.</td></tr>
                            ) : filtered.map(s => {
                                const st = STATUS_MAP[s.status] || { label: s.status, cls: 'bg-gray-100 text-gray-600' };
                                return (
                                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                                    {(s.full_name || s.username).charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{s.full_name || s.username}</p>
                                                    <p className="text-xs text-gray-400">{s.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-sm text-gray-600 max-w-[220px]">
                                            <span className="truncate block">{s.course}</span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-gray-400 text-right">{s.enrolled_at}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

