'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, ChevronLeft, ChevronRight, Clock, AlertCircle, Calendar, CalendarCheck2 } from 'lucide-react';
import { CertificationAnswer, CertificationAlternative, CertificationAttempt, CertificationExam, CertificationInstructorSlot } from '@/types';
import {
    formatApiDateTimeRangeForDisplay,
    formatSlotDateForDisplay,
    formatSlotTimeRangeForDisplay,
} from '@/types/datetime';

function getSlotWindow(slot?: CertificationInstructorSlot | null) {
    if (!slot) {
        return null;
    }

    const start = new Date(`${slot.date}T${slot.start_time}`);
    const end = new Date(`${slot.date}T${slot.end_time}`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    return { start, end };
}

export default function CertificationExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
    const { attemptId } = use(params);
    const router = useRouter();

    const [attempt, setAttempt] = useState<CertificationAttempt | null>(null);
    const [exam, setExam] = useState<CertificationExam | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | number>>({});

    const fetchAttemptData = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const attemptRes = await fetch(`${apiUrl}/api/certification-attempts/${attemptId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const attemptData = await attemptRes.json();
            setAttempt(attemptData);

            const examRes = await fetch(`${apiUrl}/api/certification-exams/${attemptData.exam}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const examData = await examRes.json();
            setExam(examData);

            const existingAnswers: Record<number, string | number> = {};
            attemptData.answers?.forEach((ans: CertificationAnswer) => {
                const savedValue = ans.selected_alternative ?? ans.essay_answer;
                if (typeof savedValue !== 'undefined' && savedValue !== null) {
                    existingAnswers[ans.question] = savedValue;
                }
            });

            if (attemptData.interview_slot) {
                examData.questions?.forEach((question: { id: number; question_type: string }) => {
                    if (question.question_type === 'Interview') {
                        existingAnswers[question.id] = attemptData.interview_slot;
                    }
                });
            }

            setAnswers(existingAnswers);
        } catch (error) {
            console.error('Error fetching exam data:', error);
            alert('Gagal memuat data ujian.');
        } finally {
            setLoading(false);
        }
    }, [attemptId]);

    useEffect(() => {
        void fetchAttemptData();
    }, [fetchAttemptData]);

    const handleAnswerChange = (questionId: number, value: string | number) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async () => {
        if (!confirm('Apakah Anda yakin ingin mengirim semua jawaban?')) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
            } else {
                const errorData = await res.json();
                alert(errorData.error || 'Ujian belum bisa dikirim.');
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
    const bookedSlot = attempt.interview_slot_detail || exam.slots?.find((slot) => slot.id === attempt.interview_slot) || null;
    const slotWindow = getSlotWindow(bookedSlot);
    const now = new Date();
    const isBeforeSelectedSlot = Boolean(slotWindow && now < slotWindow.start && attempt.status !== 'SUBMITTED' && attempt.status !== 'GRADED');
    const isAfterSelectedSlot = Boolean(slotWindow && now > slotWindow.end && attempt.status !== 'SUBMITTED' && attempt.status !== 'GRADED');
    const submitLabel = questions.length === 0 ? 'Konfirmasi Sesi' : 'Selesai & Kirim';

    if (isBeforeSelectedSlot) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-2xl w-full bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                            <CalendarCheck2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Jadwal Anda Sudah Terkonfirmasi</h1>
                            <p className="text-sm text-gray-500">Sesi ujian belum dimulai. Silakan kembali saat waktu yang Anda pilih sudah tiba.</p>
                        </div>
                    </div>

                    {bookedSlot && (
                        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5 space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Sesi Ujian Anda</p>
                            <p className="text-lg font-bold text-gray-900">{formatSlotDateForDisplay(bookedSlot.date)}</p>
                            <p className="text-sm text-gray-700">{formatSlotTimeRangeForDisplay(bookedSlot.start_time, bookedSlot.end_time)}</p>
                            {bookedSlot.zoom_link && (
                                <a href={bookedSlot.zoom_link} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold text-indigo-600 underline pt-1">
                                    Buka link meeting
                                </a>
                            )}
                        </div>
                    )}

                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 text-sm text-gray-600">
                        Periode sertifikasi umum: {formatApiDateTimeRangeForDisplay(exam.confirmed_start_at, exam.confirmed_end_at)}
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900"
                        >
                            <ChevronLeft className="w-4 h-4" /> Kembali
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition"
                        >
                            Cek Lagi Jadwal
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isAfterSelectedSlot) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-2xl w-full bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Jadwal Ujian Sudah Lewat</h1>
                            <p className="text-sm text-gray-500">Sesi yang Anda pilih telah berakhir. Silakan hubungi admin atau instruktur untuk penjadwalan ulang.</p>
                        </div>
                    </div>

                    <button
                        onClick={() => router.replace('/dashboard')}
                        className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition"
                    >
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 leading-tight">{exam.title}</h1>
                            <p className="text-xs text-gray-500">Percobaan Ujian Sertifikasi</p>
                            <p className="text-[11px] text-indigo-600 mt-1">
                                Periode: {formatApiDateTimeRangeForDisplay(exam.confirmed_start_at, exam.confirmed_end_at)}
                            </p>
                            {bookedSlot && (
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Sesi dipilih: {formatSlotDateForDisplay(bookedSlot.date)} • {formatSlotTimeRangeForDisplay(bookedSlot.start_time, bookedSlot.end_time)}
                                </p>
                            )}
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
                            {submitting ? 'Mengirim...' : submitLabel}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 order-2 lg:order-1">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-28">
                        <h3 className="text-sm font-bold text-gray-900 mb-4">{questions.length > 0 ? 'Navigasi Soal' : 'Ringkasan Ujian'}</h3>
                        {questions.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                                {questions.map((q, idx) => (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQuestionIdx(idx)}
                                        className={`aspect-square rounded-lg text-sm font-bold flex items-center justify-center transition-all ${
                                            currentQuestionIdx === idx
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : (answers[q.id] ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100')
                                        }`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                                Ujian ini tidak memiliki soal tertulis. Gunakan halaman ini untuk melihat materi yang diujikan dan menyelesaikan konfirmasi sesi.
                            </div>
                        )}
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

                <div className="lg:col-span-3 order-1 lg:order-2 space-y-6">
                    {exam.tested_materials && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
                            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">Materi yang Diujikan</p>
                            <p className="mt-3 text-sm text-emerald-950 whitespace-pre-line">{exam.tested_materials}</p>
                        </div>
                    )}

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

                            <div className="space-y-4">
                                {currentQuestion.question_type === 'MC' && (
                                    <div className="space-y-3">
                                        {currentQuestion.alternatives?.map((alt: CertificationAlternative) => (
                                            <label
                                                key={alt.id}
                                                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                    answers[currentQuestion.id] === alt.id
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
                                                Jadwal wawancara Anda mengikuti slot yang sudah dipilih saat konfirmasi ujian.
                                            </p>
                                        </div>

                                        {bookedSlot ? (
                                            <div className="rounded-2xl border-2 border-indigo-600 bg-indigo-50/60 p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <Calendar className="w-5 h-5 text-indigo-600" />
                                                        <div>
                                                            <div className="font-bold text-gray-900">
                                                                {formatSlotDateForDisplay(bookedSlot.date)}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {formatSlotTimeRangeForDisplay(bookedSlot.start_time, bookedSlot.end_time)}
                                                            </div>
                                                            {bookedSlot.zoom_link && (
                                                                <div className="mt-2 p-2 bg-green-50 rounded border border-green-100 text-[10px] text-green-700 font-bold">
                                                                    Link Zoom: <a href={bookedSlot.zoom_link} target="_blank" rel="noopener noreferrer" className="underline">{bookedSlot.zoom_link}</a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="radio"
                                                        name={`slot-${currentQuestion.id}`}
                                                        className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-gray-100"
                                                        checked={answers[currentQuestion.id] === bookedSlot.id}
                                                        onChange={() => handleAnswerChange(currentQuestion.id, bookedSlot.id)}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid gap-3">
                                                {exam.slots?.filter((slot) => !slot.is_booked).map((slot) => (
                                                    <label
                                                        key={slot.id}
                                                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                            answers[currentQuestion.id] === slot.id
                                                                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                                                : 'border-gray-50 hover:border-gray-100 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <Calendar className="w-5 h-5 text-gray-400" />
                                                            <div>
                                                                <div className="font-bold text-gray-900">{formatSlotDateForDisplay(slot.date)}</div>
                                                                <div className="text-xs text-gray-500">{formatSlotTimeRangeForDisplay(slot.start_time, slot.end_time)}</div>
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
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

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

                    {!currentQuestion && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-indigo-500">Mode Ujian</p>
                                <h2 className="text-2xl font-bold text-gray-900 mt-2">
                                    {exam.exam_mode === 'INTERVIEW_ONLY' ? 'Wawancara Sertifikasi' : 'Sertifikasi Tanpa Soal Tertulis'}
                                </h2>
                            </div>
                            <p className="text-sm text-gray-600">
                                Tidak ada soal tertulis yang perlu dijawab di halaman ini. Pastikan Anda mengikuti materi yang diujikan dan hadir pada sesi yang sudah dipilih.
                            </p>
                            {bookedSlot && (
                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Jadwal Anda</p>
                                    <p className="mt-2 text-sm font-semibold text-gray-900">{formatSlotDateForDisplay(bookedSlot.date)}</p>
                                    <p className="text-sm text-gray-600">{formatSlotTimeRangeForDisplay(bookedSlot.start_time, bookedSlot.end_time)}</p>
                                    {bookedSlot.zoom_link && (
                                        <a href={bookedSlot.zoom_link} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-sm font-bold text-indigo-600 underline">
                                            Buka link meeting
                                        </a>
                                    )}
                                </div>
                            )}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50"
                                >
                                    {submitting ? 'Mengirim...' : submitLabel}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
