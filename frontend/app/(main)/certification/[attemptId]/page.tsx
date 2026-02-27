'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Award, ChevronLeft, ChevronRight, Save, Clock, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { CertificationExam, CertificationQuestion, CertificationAttempt, CertificationInstructorSlot } from '@/types';

export default function CertificationExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
    const { attemptId } = use(params);
    const router = useRouter();

    const [attempt, setAttempt] = useState<CertificationAttempt | null>(null);
    const [exam, setExam] = useState<CertificationExam | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, any>>({});

    useEffect(() => {
        fetchAttemptData();
    }, [attemptId]);

    const fetchAttemptData = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            // 1. Fetch Attempt
            const attemptRes = await fetch(`${apiUrl}/api/certification-attempts/${attemptId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const attemptData = await attemptRes.json();
            setAttempt(attemptData);

            // 2. Fetch Exam Details
            const examRes = await fetch(`${apiUrl}/api/certification-exams/${attemptData.exam}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const examData = await examRes.json();
            setExam(examData);

            // 3. Pre-fill answers if any
            const existingAnswers: Record<number, any> = {};
            attemptData.answers?.forEach((ans: any) => {
                existingAnswers[ans.question] = ans.selected_alternative || ans.essay_answer;
            });
            setAnswers(existingAnswers);

        } catch (error) {
            console.error('Error fetching exam data:', error);
            alert('Gagal memuat data ujian.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId: number, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async () => {
        if (!confirm('Apakah Anda yakin ingin mengirim semua jawaban?')) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            // Note: In a real app, we might send answer by answer or all at once
            // For now, let's assume we have a bulk update or just mark as submitted
            const res = await fetch(`${apiUrl}/api/certification-attempts/${attemptId}/submit_exam/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ answers })
            });

            if (res.ok) {
                alert('Ujian berhasil dikirim!');
                router.replace('/dashboard');
            }
        } catch (error) {
            console.error('Error submitting exam:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat dokumen ujian...</div>;
    if (!exam || !attempt) return <div className="min-h-screen flex items-center justify-center">Data tidak ditemukan.</div>;

    const questions = exam.questions || [];
    const currentQuestion = questions[currentQuestionIdx];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 leading-tight">{exam.title}</h1>
                            <p className="text-xs text-gray-500">Percobaan Ujian Sertifikasi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-2 text-indigo-600 font-bold">
                            <Clock className="w-5 h-5" />
                            <span>59:12</span>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50"
                        >
                            {submitting ? 'Mengirim...' : 'Selesai & Kirim'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-1 order-2 lg:order-1">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-28">
                        <h3 className="text-sm font-bold text-gray-900 mb-4">Navigasi Soal</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIdx(idx)}
                                    className={`aspect-square rounded-lg text-sm font-bold flex items-center justify-center transition-all ${currentQuestionIdx === idx
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : (answers[q.id] ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100')
                                        }`}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <div className="w-3 h-3 rounded bg-indigo-600"></div> Telah dijawab
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <div className="w-3 h-3 rounded bg-gray-100"></div> Belum dijawab
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Question Area */}
                <div className="lg:col-span-3 order-1 lg:order-2 space-y-6">
                    {currentQuestion && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm relative">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-xs font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-3 py-1 rounded">
                                    Pertanyaan {currentQuestionIdx + 1} dari {questions.length}
                                </span>
                                <div className="text-xs font-bold text-gray-400">Poin: {currentQuestion.points}</div>
                            </div>

                            <h2 className="text-xl font-bold text-gray-900 leading-relaxed mb-8">
                                {currentQuestion.text}
                            </h2>

                            {/* Question Type Content */}
                            <div className="space-y-4">
                                {currentQuestion.question_type === 'MC' && (
                                    <div className="space-y-3">
                                        {currentQuestion.alternatives?.map((alt: any) => (
                                            <label
                                                key={alt.id}
                                                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[currentQuestion.id] === alt.id
                                                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                                    : 'border-gray-50 hover:border-gray-100 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`question-${currentQuestion.id}`}
                                                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-gray-100"
                                                    checked={answers[currentQuestion.id] === alt.id}
                                                    onChange={() => handleAnswerChange(currentQuestion.id, alt.id)}
                                                />
                                                <span className={`font-medium ${answers[currentQuestion.id] === alt.id ? 'text-indigo-900' : 'text-gray-700'}`}>
                                                    {alt.text}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {currentQuestion.question_type === 'Essay' && (
                                    <textarea
                                        rows={8}
                                        placeholder="Ketik jawaban lengkap Anda di sini..."
                                        className="w-full p-6 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                                        value={answers[currentQuestion.id] || ''}
                                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                    />
                                )}

                                {currentQuestion.question_type === 'Interview' && (
                                    <div className="space-y-6">
                                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                            <p className="text-sm text-amber-800">
                                                Untuk sesi wawancara, silakan pilih salah satu jadwal tersedia yang disediakan oleh instruktur Anda di bawah ini.
                                            </p>
                                        </div>
                                        <div className="grid gap-3">
                                            {exam.slots?.filter(s => !s.is_booked).map(slot => (
                                                <label
                                                    key={slot.id}
                                                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[currentQuestion.id] === slot.id
                                                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                                        : 'border-gray-50 hover:border-gray-100 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <Calendar className="w-5 h-5 text-gray-400" />
                                                        <div>
                                                            <div className="font-bold text-gray-900">
                                                                {new Date(slot.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)} WIB</div>
                                                            {answers[currentQuestion.id] === slot.id && slot.zoom_link && (
                                                                <div className="mt-2 p-2 bg-green-50 rounded border border-green-100 text-[10px] text-green-700 font-bold flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                                                    Link Zoom: <a href={slot.zoom_link} target="_blank" rel="noopener noreferrer" className="underline">{slot.zoom_link}</a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="radio"
                                                        name={`slot-${currentQuestion.id}`}
                                                        className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-gray-100"
                                                        checked={answers[currentQuestion.id] === slot.id}
                                                        onChange={() => handleAnswerChange(currentQuestion.id, slot.id)}
                                                    />
                                                </label>
                                            ))}
                                            {(!exam.slots || exam.slots.filter(s => !s.is_booked).length === 0) && (
                                                <div className="text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                    <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-400">Belum ada jadwal wawancara yang tersedia untuk saat ini.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div className="mt-12 pt-8 border-t border-gray-50 flex items-center justify-between">
                                <button
                                    disabled={currentQuestionIdx === 0}
                                    onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                                    className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 disabled:opacity-0 transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                                </button>
                                <button
                                    onClick={() => {
                                        if (currentQuestionIdx < questions.length - 1) {
                                            setCurrentQuestionIdx(currentQuestionIdx + 1);
                                        } else {
                                            handleSubmit();
                                        }
                                    }}
                                    className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg shadow-gray-200"
                                >
                                    {currentQuestionIdx === questions.length - 1 ? 'Selesai & Kirim' : 'Selanjutnya'} <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
