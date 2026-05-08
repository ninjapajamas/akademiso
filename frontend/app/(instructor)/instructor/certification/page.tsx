'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, Calendar, Clock, Plus, Trash2, CheckCircle2, ChevronRight, X, AlertTriangle, CircleAlert, CircleCheckBig, Info } from 'lucide-react';
import { CertificationAttempt, CertificationExam, CertificationInstructorSlot } from '@/types';

type ApiListPayload<T> = T[] | { results?: T[] };
type ApiErrorPayload = Record<string, string[] | string | undefined>;

async function readJsonSafely<T>(res: Response): Promise<T | null> {
    const text = await res.text();
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(
            text.startsWith('<!DOCTYPE')
                ? 'Server mengembalikan halaman HTML, bukan JSON. Biasanya endpoint sedang error.'
                : 'Respons server tidak valid.'
        );
    }
}

function getListPayload<T>(payload: ApiListPayload<T> | null): T[] {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.results)) {
        return payload.results;
    }

    return [];
}

function getApiErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
    if (!payload) {
        return fallback;
    }

    const firstValue = Object.values(payload)[0];
    if (Array.isArray(firstValue)) {
        return firstValue[0] || fallback;
    }

    if (typeof firstValue === 'string') {
        return firstValue;
    }

    return fallback;
}

function getSlotDateParts(dateValue: string) {
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return { day: '--', month: '' };
    }

    return {
        day: date.toLocaleDateString('id-ID', { day: '2-digit' }),
        month: date.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase(),
    };
}

type FeedbackModalState = {
    tone: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
} | null;

function FeedbackModal({
    modal,
    onClose,
}: {
    modal: FeedbackModalState;
    onClose: () => void;
}) {
    if (!modal) {
        return null;
    }

    const toneStyles = {
        success: {
            icon: CircleCheckBig,
            iconClassName: 'text-emerald-600',
            badgeClassName: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            buttonClassName: 'bg-emerald-600 hover:bg-emerald-700',
            label: 'Berhasil',
        },
        error: {
            icon: CircleAlert,
            iconClassName: 'text-rose-600',
            badgeClassName: 'bg-rose-50 text-rose-700 border-rose-100',
            buttonClassName: 'bg-rose-600 hover:bg-rose-700',
            label: 'Error',
        },
        warning: {
            icon: AlertTriangle,
            iconClassName: 'text-amber-600',
            badgeClassName: 'bg-amber-50 text-amber-700 border-amber-100',
            buttonClassName: 'bg-amber-500 hover:bg-amber-600',
            label: 'Peringatan',
        },
        info: {
            icon: Info,
            iconClassName: 'text-indigo-600',
            badgeClassName: 'bg-indigo-50 text-indigo-700 border-indigo-100',
            buttonClassName: 'bg-indigo-600 hover:bg-indigo-700',
            label: 'Informasi',
        },
    } as const;

    const tone = toneStyles[modal.tone];
    const Icon = tone.icon;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50">
                            <Icon className={`h-6 w-6 ${tone.iconClassName}`} />
                        </div>
                        <div>
                            <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${tone.badgeClassName}`}>
                                {tone.label}
                            </div>
                            <h3 className="mt-3 text-lg font-bold text-slate-900">{modal.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{modal.message}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Tutup modal"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition ${tone.buttonClassName}`}
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

function ConfirmModal({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    busy,
    onConfirm,
    onClose,
}: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    busy?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
                            <AlertTriangle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <div className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                                Konfirmasi
                            </div>
                            <h3 className="mt-3 text-lg font-bold text-slate-900">{title}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Tutup modal"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {busy ? 'Memproses...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function InstructorCertificationPage() {
    const [exams, setExams] = useState<CertificationExam[]>([]);
    const [slots, setSlots] = useState<CertificationInstructorSlot[]>([]);
    const [attempts, setAttempts] = useState<CertificationAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>(null);
    const [slotToDelete, setSlotToDelete] = useState<CertificationInstructorSlot | null>(null);
    const [deletingSlotId, setDeletingSlotId] = useState<number | null>(null);
    const [reviewingAttemptId, setReviewingAttemptId] = useState<number | null>(null);
    const [exportingExamKey, setExportingExamKey] = useState<string | null>(null);
    const [interviewDrafts, setInterviewDrafts] = useState<Record<number, { reason: string; feedback: string }>>({});

    // New slot form
    const [newSlot, setNewSlot] = useState({
        exam: '',
        date: '',
        start_time: '',
        end_time: '',
        zoom_link: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();

            const [examRes, slotRes, attemptRes] = await Promise.all([
                fetch(`${apiUrl}/api/certification-exams/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/api/certification-slots/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/api/certification-attempts/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const examData = await readJsonSafely<ApiListPayload<CertificationExam> | ApiErrorPayload>(examRes);
            const slotData = await readJsonSafely<ApiListPayload<CertificationInstructorSlot> | ApiErrorPayload>(slotRes);
            const attemptData = await readJsonSafely<ApiListPayload<CertificationAttempt> | ApiErrorPayload>(attemptRes);

            if (!examRes.ok) {
                throw new Error(getApiErrorMessage(examData as ApiErrorPayload | null, 'Data assessment akhir belum bisa dimuat.'));
            }

            if (!slotRes.ok) {
                throw new Error(getApiErrorMessage(slotData as ApiErrorPayload | null, 'Data slot assessment belum bisa dimuat.'));
            }

            if (!attemptRes.ok) {
                throw new Error(getApiErrorMessage(attemptData as ApiErrorPayload | null, 'Data peserta assessment belum bisa dimuat.'));
            }

            setExams(getListPayload(examData as ApiListPayload<CertificationExam> | null));
            setSlots(getListPayload(slotData as ApiListPayload<CertificationInstructorSlot> | null));
            setAttempts(getListPayload(attemptData as ApiListPayload<CertificationAttempt> | null));
        } catch (error) {
            console.error('Error fetching data:', error);
            setExams([]);
            setSlots([]);
            setAttempts([]);
            setFeedbackModal({
                tone: 'error',
                title: 'Data Belum Bisa Dimuat',
                message: error instanceof Error ? error.message : 'Data assessment akhir belum bisa dimuat.',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();

            const res = await fetch(`${apiUrl}/api/certification-slots/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newSlot)
            });

            if (res.ok) {
                await fetchData();
                setNewSlot({ exam: '', date: '', start_time: '', end_time: '', zoom_link: '' });
                setFeedbackModal({
                    tone: 'success',
                    title: 'Slot Berhasil Ditambahkan',
                    message: 'Slot ketersediaan baru sudah tersimpan dan siap dipakai peserta.',
                });
            } else {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                setFeedbackModal({
                    tone: 'error',
                    title: 'Slot Belum Bisa Ditambahkan',
                    message: getApiErrorMessage(errorData, 'Slot ketersediaan belum bisa ditambahkan.'),
                });
            }
        } catch (error) {
            console.error('Error adding slot:', error);
            setFeedbackModal({
                tone: 'error',
                title: 'Koneksi Bermasalah',
                message: error instanceof Error ? error.message : 'Slot ketersediaan belum bisa ditambahkan.',
            });
        }
    };

    const handleDeleteSlot = async () => {
        if (!slotToDelete) {
            return;
        }

        try {
            setDeletingSlotId(slotToDelete.id);
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const res = await fetch(`${apiUrl}/api/certification-slots/${slotToDelete.id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                setFeedbackModal({
                    tone: 'error',
                    title: 'Slot Belum Bisa Dihapus',
                    message: getApiErrorMessage(errorData, 'Slot sesi assessment belum bisa dihapus.'),
                });
                return;
            }

            await fetchData();
            setFeedbackModal({
                tone: 'success',
                title: 'Slot Berhasil Dihapus',
                message: `Jadwal ${slotToDelete.exam_title || 'assessment'} sudah dihapus dari daftar slot Anda.`,
            });
            setSlotToDelete(null);
        } catch (error) {
            console.error('Error deleting slot:', error);
            setFeedbackModal({
                tone: 'error',
                title: 'Penghapusan Gagal',
                message: error instanceof Error ? error.message : 'Slot sesi assessment belum bisa dihapus.',
            });
        } finally {
            setDeletingSlotId(null);
        }
    };

    const getInterviewDraft = (attempt: CertificationAttempt) => (
        interviewDrafts[attempt.id] || {
            reason: attempt.interview_reason || '',
            feedback: attempt.interview_feedback || '',
        }
    );

    const handleInterviewDraftChange = (
        attemptId: number,
        field: 'reason' | 'feedback',
        value: string,
    ) => {
        setInterviewDrafts((prev) => {
            const current = prev[attemptId] || { reason: '', feedback: '' };
            return {
                ...prev,
                [attemptId]: {
                    ...current,
                    [field]: value,
                },
            };
        });
    };

    const handleInterviewReview = async (
        attempt: CertificationAttempt,
        result: 'PASSED' | 'FAILED',
    ) => {
        const draft = getInterviewDraft(attempt);
        try {
            setReviewingAttemptId(attempt.id);
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const res = await fetch(`${apiUrl}/api/certification-attempts/${attempt.id}/review_interview/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    interview_result: result,
                    interview_reason: draft.reason,
                    interview_feedback: draft.feedback,
                }),
            });

            if (!res.ok) {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                setFeedbackModal({
                    tone: 'error',
                    title: 'Review Belum Bisa Disimpan',
                    message: getApiErrorMessage(errorData, 'Hasil wawancara belum bisa disimpan.'),
                });
                return;
            }

            await fetchData();
            setFeedbackModal({
                tone: 'success',
                title: result === 'PASSED' ? 'Peserta Dinyatakan Lolos' : 'Keputusan Interview Tersimpan',
                message: result === 'PASSED'
                    ? 'Hasil wawancara berhasil disimpan sebagai lolos.'
                    : 'Hasil wawancara berhasil disimpan sebagai tidak lolos.',
            });
        } catch (error) {
            console.error('Error reviewing interview attempt:', error);
            setFeedbackModal({
                tone: 'error',
                title: 'Koneksi Bermasalah',
                message: error instanceof Error ? error.message : 'Hasil wawancara belum bisa disimpan.',
            });
        } finally {
            setReviewingAttemptId(null);
        }
    };

    const handleExportExamData = async (
        examId: number,
        dataset: 'questions' | 'attempts',
        format: 'xlsx' | 'pdf',
    ) => {
        const exportKey = `${examId}-${dataset}-${format}`;
        setExportingExamKey(exportKey);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const endpoint = dataset === 'questions' ? 'export_questions' : 'export_attempts';
            const res = await fetch(`${apiUrl}/api/certification-exams/${examId}/${endpoint}/?format=${format}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                throw new Error(getApiErrorMessage(errorData, 'Data assessment belum bisa diekspor.'));
            }

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `${dataset === 'questions' ? 'bank-soal' : 'hasil-assessment'}-${examId}.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error('Error exporting assessment data:', error);
            setFeedbackModal({
                tone: 'error',
                title: 'Export Gagal',
                message: error instanceof Error ? error.message : 'Data assessment belum bisa diekspor.',
            });
        } finally {
            setExportingExamKey(null);
        }
    };

    if (loading) return <div>Memuat data assessment...</div>;

    const examsById = new Map(exams.map((exam) => [exam.id, exam]));
    const interviewAttempts = attempts
        .filter((attempt) => {
            const exam = examsById.get(attempt.exam);
            return Boolean(attempt.interview_slot || exam?.exam_mode !== 'QUESTIONS_ONLY');
        })
        .sort((left, right) => {
            const leftTime = new Date(left.started_at).getTime();
            const rightTime = new Date(right.started_at).getTime();
            return rightTime - leftTime;
        });

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Assessment</h1>
                <p className="text-gray-500">Kelola permintaan assessment dan atur slot sesi yang diawasi trainer untuk siswa.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Exam Requests */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Award className="w-5 h-5 text-indigo-600" />
                        Permintaan Assessment Aktif
                    </h2>

                    {exams.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">Belum ada permintaan assessment baru.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {exams.map(exam => {
                                const examSlots = slots.filter(slot => slot.exam === exam.id);
                                const availableSlots = examSlots.filter(slot => !slot.is_booked).length;
                                const waitingStudents = attempts.filter(attempt => attempt.exam === exam.id && attempt.status !== 'GRADED').length;

                                return (
                                    <div key={exam.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded mb-2 inline-block">
                                                    {exam.course_title}
                                                </span>
                                                <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                                                <p className="text-sm text-gray-500 mt-1">{exam.description}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${exam.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {exam.is_active ? 'AKTIF' : 'NONAKTIF'}
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${exam.instructor_confirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {exam.instructor_confirmed ? 'DIKONFIRMASI' : 'MENUNGGU JADWAL'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void handleExportExamData(exam.id, 'questions', 'xlsx')}
                                                disabled={exportingExamKey === `${exam.id}-questions-xlsx`}
                                                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {exportingExamKey === `${exam.id}-questions-xlsx` ? 'Mengekspor...' : 'Bank Soal Excel'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleExportExamData(exam.id, 'questions', 'pdf')}
                                                disabled={exportingExamKey === `${exam.id}-questions-pdf`}
                                                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {exportingExamKey === `${exam.id}-questions-pdf` ? 'Mengekspor...' : 'Bank Soal PDF'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleExportExamData(exam.id, 'attempts', 'xlsx')}
                                                disabled={exportingExamKey === `${exam.id}-attempts-xlsx`}
                                                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {exportingExamKey === `${exam.id}-attempts-xlsx` ? 'Mengekspor...' : 'Peserta Excel'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleExportExamData(exam.id, 'attempts', 'pdf')}
                                                disabled={exportingExamKey === `${exam.id}-attempts-pdf`}
                                                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {exportingExamKey === `${exam.id}-attempts-pdf` ? 'Mengekspor...' : 'Peserta PDF'}
                                            </button>
                                        </div>
                                        <div className="mt-6 pt-6 border-t border-gray-50 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" /> {waitingStudents} Siswa Menunggu
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" /> {availableSlots} Slot Tersedia
                                                </span>
                                            </div>
                                            <Link
                                                href={`/instructor/courses/${exam.course}`}
                                                className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                                            >
                                                Kelola Assessment <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Slot Management Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Slot Sesi Assessment
                    </h2>

                    {/* Add Slot Form */}
                    <form onSubmit={handleAddSlot} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm shadow-indigo-100/50 space-y-4">
                        <h3 className="text-sm font-bold text-gray-900">Tambah Slot Baru</h3>
                        <div>
                            <select
                                required
                                value={newSlot.exam}
                                onChange={e => setNewSlot({ ...newSlot, exam: e.target.value })}
                                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Pilih Assessment</option>
                                {exams.map(e => (
                                    <option key={e.id} value={e.id}>{e.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <input
                                type="date"
                                required
                                value={newSlot.date}
                                onChange={e => setNewSlot({ ...newSlot, date: e.target.value })}
                                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="time"
                                required
                                value={newSlot.start_time}
                                onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })}
                                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <input
                                type="time"
                                required
                                value={newSlot.end_time}
                                onChange={e => setNewSlot({ ...newSlot, end_time: e.target.value })}
                                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Tambah Slot
                        </button>
                    </form>

                    {/* Slots List */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Jadwal Anda</h3>
                        {slots.map(slot => {
                            const slotDate = getSlotDateParts(slot.date);

                            return (
                                <div key={slot.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold text-gray-500 line-clamp-1">
                                            <span className="text-gray-900">{slotDate.day}</span>
                                            <span>{slotDate.month}</span>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase text-indigo-500 mb-0.5">{slot.exam_title}</div>
                                            <div className="text-sm font-bold text-gray-900">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] text-gray-400 font-medium">
                                                    {slot.is_booked ? <span className="text-red-500">Terpesan</span> : 'Tersedia'}
                                                </div>
                                                {slot.zoom_link && <div className="text-[10px] text-indigo-500 font-bold truncate max-w-[100px]">{slot.zoom_link}</div>}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSlotToDelete(slot)}
                                        className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                        {slots.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Belum ada jadwal ditambahkan.</p>}
                    </div>
                </div>
            </div>

            <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Review Wawancara Peserta</h2>
                        <p className="text-sm text-gray-500">Tentukan hasil interview, tambahkan alasan, dan beri feedback yang nanti bisa dibaca peserta.</p>
                    </div>
                    <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-indigo-700">
                        {interviewAttempts.length} Peserta
                    </div>
                </div>

                {interviewAttempts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
                        Belum ada peserta dengan sesi wawancara yang perlu direview.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {interviewAttempts.map((attempt) => {
                            const exam = examsById.get(attempt.exam);
                            const draft = getInterviewDraft(attempt);
                            const slot = attempt.interview_slot_detail;
                            const isPending = attempt.interview_result === 'PENDING' || !attempt.interview_result;
                            const resultLabel = attempt.interview_result === 'PASSED'
                                ? 'Lolos'
                                : attempt.interview_result === 'FAILED'
                                    ? 'Tidak Lolos'
                                    : 'Menunggu Review';
                            const resultClassName = attempt.interview_result === 'PASSED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : attempt.interview_result === 'FAILED'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700';

                            return (
                                <div key={attempt.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                                                    {exam?.course_title || 'Pelatihan'}
                                                </span>
                                                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${resultClassName}`}>
                                                    {resultLabel}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900">{attempt.user_name || 'Peserta'}</h3>
                                            <p className="text-sm text-gray-500">{attempt.exam_title || exam?.title}</p>
                                            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                                <span>Status assessment: {attempt.status}</span>
                                                <span>Skor tertulis: {attempt.score || '0'}</span>
                                                {slot && <span>Sesi: {slot.date} {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600 lg:max-w-sm">
                                            {isPending
                                                ? 'Peserta belum mendapat keputusan interview. Isi alasan dan feedback bila diperlukan, lalu pilih Lolos atau Tidak Lolos.'
                                                : `Review terakhir oleh ${attempt.interview_reviewed_by_name || 'trainer'}${attempt.interview_reviewed_at ? ` pada ${new Date(attempt.interview_reviewed_at).toLocaleString('id-ID')}` : ''}.`}
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                        <label className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Alasan Keputusan</span>
                                            <textarea
                                                value={draft.reason}
                                                onChange={(e) => handleInterviewDraftChange(attempt.id, 'reason', e.target.value)}
                                                rows={4}
                                                placeholder="Jelaskan alasan peserta dinyatakan lolos atau tidak lolos."
                                                className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                            />
                                        </label>
                                        <label className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Feedback untuk Peserta</span>
                                            <textarea
                                                value={draft.feedback}
                                                onChange={(e) => handleInterviewDraftChange(attempt.id, 'feedback', e.target.value)}
                                                rows={4}
                                                placeholder="Tambahkan masukan, catatan perbaikan, atau apresiasi untuk peserta."
                                                className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                            />
                                        </label>
                                    </div>

                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => void handleInterviewReview(attempt, 'PASSED')}
                                            disabled={reviewingAttemptId === attempt.id}
                                            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {reviewingAttemptId === attempt.id ? 'Menyimpan...' : 'Lolos'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleInterviewReview(attempt, 'FAILED')}
                                            disabled={reviewingAttemptId === attempt.id}
                                            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {reviewingAttemptId === attempt.id ? 'Menyimpan...' : 'Tidak Lolos'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
            <FeedbackModal modal={feedbackModal} onClose={() => setFeedbackModal(null)} />
            <ConfirmModal
                open={Boolean(slotToDelete)}
                title="Hapus Slot Sesi?"
                message={slotToDelete ? `Slot ${slotToDelete.exam_title || 'assessment'} pada ${slotToDelete.date} ${slotToDelete.start_time.slice(0, 5)} akan dihapus dari jadwal trainer.` : ''}
                confirmLabel="Ya, Hapus"
                cancelLabel="Batal"
                busy={Boolean(slotToDelete && deletingSlotId === slotToDelete.id)}
                onConfirm={handleDeleteSlot}
                onClose={() => {
                    if (!deletingSlotId) {
                        setSlotToDelete(null);
                    }
                }}
            />
        </div>
    );
}

