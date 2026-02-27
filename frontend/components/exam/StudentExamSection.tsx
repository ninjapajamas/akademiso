'use client';

import { useState, useEffect } from 'react';
import { Award, CheckCircle2, AlertCircle, Clock, Calendar, ChevronRight, Lock } from 'lucide-react';
import { CertificationExam, CertificationAttempt, Course } from '@/types';

interface StudentExamSectionProps {
    course: Course;
}

export default function StudentExamSection({ course }: StudentExamSectionProps) {
    const exams = (course as any).certification_exams || [];
    const [attempts, setAttempts] = useState<CertificationAttempt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (course.is_enrolled) {
            fetchAttempts();
        } else {
            setLoading(false);
        }
    }, [course.id, course.is_enrolled]);

    const fetchAttempts = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-attempts/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setAttempts(data);
        } catch (error) {
            console.error('Error fetching attempts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartExam = async (examId: number) => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            // Check if attempt already exists
            const existing = attempts.find(a => a.exam === examId && (a.status === 'PENDING' || a.status === 'IN_PROGRESS'));
            if (existing) {
                window.location.href = `/certification/${existing.id}`;
                return;
            }

            const res = await fetch(`${apiUrl}/api/certification-attempts/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ exam: examId })
            });

            if (res.ok) {
                const data = await res.json();
                window.location.href = `/certification/${data.id}`;
            }
        } catch (error) {
            console.error('Error starting exam:', error);
        }
    };

    if (!course.is_enrolled) return null;
    if (exams.length === 0) return null;

    const progress = course.progress_percentage || 0;
    const isLocked = progress < 100;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mt-8">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Award className="w-8 h-8" />
                    <h2 className="text-xl font-bold">Ujian Sertifikasi</h2>
                </div>
                <p className="text-indigo-100 text-sm">Selesaikan seluruh materi untuk membuka ujian sertifikasi dan dapatkan sertifikat resmi.</p>
            </div>

            <div className="p-6 space-y-6">
                {isLocked ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-4">
                        <Lock className="w-6 h-6 text-amber-600 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-amber-900">Ujian Terkunci</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                Anda baru menyelesaikan {progress}% materi. Selesaikan hingga 100% untuk dapat mengikuti ujian sertifikasi.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-start gap-4">
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-green-900">Ujian Terbuka!</h4>
                            <p className="text-sm text-green-700 mt-1">
                                Selamat! Seluruh materi telah selesai. Anda sekarang dapat mengikuti ujian untuk mendapatkan sertifikasi.
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {exams.map((exam: any) => {
                        const attempt = attempts.find(a => a.exam === exam.id);
                        return (
                            <div key={exam.id} className={`border rounded-xl p-5 transition-all ${isLocked ? 'opacity-50 grayscale' : 'hover:border-indigo-200'}`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{exam.title}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{exam.description}</p>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 60 Menit</span>
                                            <span className="flex items-center gap-1 text-indigo-600 font-bold">
                                                {exam.questions?.length || 0} Pertanyaan (MC, Essay, Interview)
                                            </span>
                                        </div>
                                    </div>

                                    {!isLocked && (
                                        <div className="flex flex-col gap-2 min-w-[150px]">
                                            {attempt ? (
                                                <div className="text-center">
                                                    <div className={`text-xs font-bold px-3 py-1 rounded-full mb-2 ${attempt.status === 'GRADED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {attempt.status === 'GRADED' ? `LULUS (Skor: ${attempt.score})` : 'TELAH DIKERJAKAN'}
                                                    </div>
                                                    <button className="text-indigo-600 text-xs font-bold">Lihat Detail</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleStartExam(exam.id)}
                                                    className="bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-100"
                                                >
                                                    Mulai Ujian <ChevronRight className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
