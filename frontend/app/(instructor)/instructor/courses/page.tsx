'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Star, Clock, BarChart } from 'lucide-react';

const LEVEL_MAP: Record<string, { label: string; cls: string }> = {
    Beginner: { label: 'Pemula', cls: 'bg-green-100 text-green-700' },
    Intermediate: { label: 'Menengah', cls: 'bg-yellow-100 text-yellow-700' },
    Advanced: { label: 'Lanjutan', cls: 'bg-red-100 text-red-700' },
};

export default function InstructorCoursesPage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/instructor/courses/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCourses(data.courses || []);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetch_();
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Kursus Saya</h1>
                <p className="text-gray-500 mt-1">Daftar kursus yang Anda ampu sebagai instruktur.</p>
            </div>

            {loading ? (
                <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-gray-100" />)}</div>
            ) : courses.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="font-semibold text-gray-600">Belum ada kursus</p>
                    <p className="text-sm text-gray-400 mt-1">Hubungi admin untuk ditambahkan ke kursus.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {courses.map((c: any) => {
                        const lvl = LEVEL_MAP[c.level] || { label: c.level, cls: 'bg-gray-100 text-gray-600' };
                        return (
                            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-5 hover:shadow-md transition-shadow">
                                {/* thumbnail / icon */}
                                <div className="w-[90px] h-[90px] rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {c.thumbnail
                                        ? <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                                        : <BookOpen className="w-8 h-8 text-white/70" />
                                    }
                                </div>
                                {/* info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{c.category?.name}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${lvl.cls}`}>{lvl.label}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 truncate text-base">{c.title}</h3>
                                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {c.duration}</span>
                                        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400" /> {c.rating}</span>
                                        <span className="flex items-center gap-1">
                                            💰 Rp {Number(c.price).toLocaleString('id-ID')}
                                            {c.discount_price && <span className="text-green-600 font-semibold"> → Rp {Number(c.discount_price).toLocaleString('id-ID')}</span>}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
