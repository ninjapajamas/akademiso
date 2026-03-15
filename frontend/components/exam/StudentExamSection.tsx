'use client';

import { useEffect, useState } from 'react';
import { Award, CalendarCheck2, CalendarRange, CheckCircle2, ChevronRight, Clock, Lock } from 'lucide-react';
import { CertificationAttempt, CertificationExam, CertificationInstructorSlot, Course } from '@/types';
import { formatApiDateTimeRangeForDisplay, formatSlotDateForDisplay, formatSlotTimeRangeForDisplay } from '@/types/datetime';

interface StudentExamSectionProps {
    course: Course;
    variant?: 'standalone' | 'embedded';
    attempts?: CertificationAttempt[];
    attemptsLoading?: boolean;
    onAttemptsRefresh?: () => Promise<void>;
}

function getExamAvailability(exam: CertificationExam) {
    if (!exam.is_active) {
        return {
            tone: 'slate',
            label: 'Belum Diaktifkan',
            message: 'Admin belum mengaktifkan ujian sertifikasi ini.',
        };
    }

    if (!exam.instructor_confirmed || !exam.confirmed_start_at) {
        return {
            tone: 'amber',
            label: 'Menunggu Jadwal',
            message: 'Instruktur belum mengonfirmasi jadwal pelaksanaan sertifikasi.',
        };
    }

    if (exam.schedule_is_closed) {
        return {
            tone: 'rose',
            label: 'Jadwal Berakhir',
            message: 'Rentang waktu ujian sertifikasi ini sudah selesai.',
        };
    }

    if (exam.schedule_is_open) {
        return {
            tone: 'emerald',
            label: 'Sedang Dibuka',
            message: 'Sesi sertifikasi sedang berada pada periode aktif.',
        };
    }

    return {
        tone: 'blue',
        label: 'Akan Dibuka',
        message: 'Periode sertifikasi sudah dijadwalkan, tetapi belum mulai.',
    };
}

function getExamModeCopy(exam: CertificationExam) {
    if (exam.exam_mode === 'INTERVIEW_ONLY') {
        return {
            title: 'Wawancara Sertifikasi',
            description: 'Pilih salah satu slot sesi yang tersedia, lalu ikuti wawancara sesuai jadwal yang Anda konfirmasi.',
        };
    }

    if (exam.exam_mode === 'HYBRID') {
        return {
            title: 'Ujian & Wawancara Sertifikasi',
            description: 'Kerjakan soal sertifikasi pada sesi yang diawasi instruktur, lalu lanjutkan dengan wawancara bila diperlukan.',
        };
    }

    return {
        title: 'Ujian Sertifikasi',
        description: 'Pilih slot sesi yang tersedia bila ujian diawasi instruktur, atau mulai ujian saat periode dibuka.',
    };
}

function getSlotDateTime(slot?: CertificationInstructorSlot) {
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

function getSlotState(slot?: CertificationInstructorSlot) {
    const window = getSlotDateTime(slot);
    if (!window) {
        return {
            canEnter: false,
            message: 'Jadwal belum lengkap.',
            label: 'Perlu Dicek',
            tone: 'slate',
        };
    }

    const now = new Date();
    if (now < window.start) {
        return {
            canEnter: false,
            message: 'Sesi yang Anda pilih belum dimulai.',
            label: 'Menunggu Sesi',
            tone: 'amber',
        };
    }

    if (now > window.end) {
        return {
            canEnter: false,
            message: 'Jadwal yang dipilih sudah lewat. Hubungi admin atau instruktur untuk penjadwalan ulang.',
            label: 'Jadwal Terlewat',
            tone: 'rose',
        };
    }

    return {
        canEnter: true,
        message: 'Sesi yang Anda pilih sedang aktif dan sudah bisa dibuka.',
        label: 'Sesi Aktif',
        tone: 'emerald',
    };
}

function findSelectedSlot(exam: CertificationExam, attempt?: CertificationAttempt | null) {
    if (attempt?.interview_slot_detail) {
        return attempt.interview_slot_detail;
    }

    if (!attempt?.interview_slot) {
        return undefined;
    }

    return exam.slots?.find((slot) => slot.id === attempt.interview_slot);
}

export default function StudentExamSection({
    course,
    variant = 'standalone',
    attempts: controlledAttempts,
    attemptsLoading = false,
    onAttemptsRefresh,
}: StudentExamSectionProps) {
    const exams = course.certification_exams || [];
    const [internalAttempts, setInternalAttempts] = useState<CertificationAttempt[]>([]);
    const [internalLoading, setInternalLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [submittingExamId, setSubmittingExamId] = useState<number | null>(null);
    const [selectedSlots, setSelectedSlots] = useState<Record<number, number>>({});
    const usesExternalAttempts = typeof controlledAttempts !== 'undefined';
    const attempts = controlledAttempts ?? internalAttempts;
    const loading = usesExternalAttempts ? attemptsLoading : internalLoading;
    const isEmbedded = variant === 'embedded';
    const examSectionCopy = exams[0] ? getExamModeCopy(exams[0]) : getExamModeCopy({ exam_mode: 'QUESTIONS_ONLY' } as CertificationExam);

    useEffect(() => {
        if (usesExternalAttempts) {
            setInternalLoading(false);
            return;
        }

        if (course.is_enrolled) {
            const loadAttempts = async () => {
                try {
                    const token = localStorage.getItem('access_token');
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                    const res = await fetch(`${apiUrl}/api/certification-attempts/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    setInternalAttempts(Array.isArray(data) ? data : []);
                } catch (error) {
                    console.error('Error fetching attempts:', error);
                } finally {
                    setInternalLoading(false);
                }
            };

            void loadAttempts();
        } else {
            setInternalLoading(false);
        }
    }, [course.id, course.is_enrolled, usesExternalAttempts]);

    const fetchAttempts = async () => {
        if (usesExternalAttempts) {
            if (onAttemptsRefresh) {
                await onAttemptsRefresh();
            }
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-attempts/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setInternalAttempts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching attempts:', error);
        } finally {
            setInternalLoading(false);
        }
    };

    const handleExamAction = async (exam: CertificationExam, attempt?: CertificationAttempt) => {
        setErrorMessage('');
        setSuccessMessage('');

        const bookedSlot = findSelectedSlot(exam, attempt);
        const slotState = getSlotState(bookedSlot);
        const canContinueAttempt = attempt && (attempt.status === 'PENDING' || attempt.status === 'IN_PROGRESS');
        const selectedSlotId = selectedSlots[exam.id] || bookedSlot?.id;
        const isChangingPendingSlot = Boolean(
            attempt
            && attempt.status === 'PENDING'
            && selectedSlotId
            && selectedSlotId !== bookedSlot?.id
        );

        if (attempt && canContinueAttempt) {
            if (!isChangingPendingSlot && bookedSlot && !slotState.canEnter) {
                setErrorMessage(slotState.message);
                return;
            }

            if (!isChangingPendingSlot) {
                window.location.href = `/certification/${attempt.id}`;
                return;
            }
        }

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            setSubmittingExamId(exam.id);

            const res = await fetch(`${apiUrl}/api/certification-attempts/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    exam: exam.id,
                    interview_slot: selectedSlotId || null,
                })
            });

            const data = await res.json();
            if (!res.ok) {
                setErrorMessage(data.error || 'Jadwal ujian belum bisa dikonfirmasi.');
                return;
            }

            await fetchAttempts();

            const chosenSlot = exam.slots?.find((slot) => slot.id === (data.interview_slot_detail?.id || data.interview_slot || selectedSlotId));
            if (data.status === 'IN_PROGRESS') {
                window.location.href = `/certification/${data.id}`;
                return;
            }

            setSuccessMessage(
                chosenSlot
                    ? `Jadwal ujian berhasil dikonfirmasi untuk ${formatSlotDateForDisplay(chosenSlot.date)} pukul ${formatSlotTimeRangeForDisplay(chosenSlot.start_time, chosenSlot.end_time)}.`
                    : 'Jadwal ujian berhasil dikonfirmasi.'
            );
        } catch (error) {
            console.error('Error starting exam:', error);
            setErrorMessage('Terjadi kendala saat menyimpan jadwal ujian sertifikasi.');
        } finally {
            setSubmittingExamId(null);
        }
    };

    if (!course.is_enrolled) return null;
    if (exams.length === 0) return null;

    const progress = course.progress_percentage || 0;
    const isLocked = progress < 100;

    return (
        <div className={isEmbedded ? 'rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/80' : 'bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mt-8'}>
            <div className={isEmbedded ? 'bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 text-white' : 'bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white'}>
                <div className="flex items-center gap-3 mb-2">
                    <Award className={isEmbedded ? 'w-6 h-6' : 'w-8 h-8'} />
                    <h2 className={isEmbedded ? 'text-lg font-bold' : 'text-xl font-bold'}>{examSectionCopy.title}</h2>
                </div>
                <p className="text-indigo-100 text-sm">{examSectionCopy.description}</p>
            </div>

            <div className={isEmbedded ? 'p-5 space-y-5' : 'p-6 space-y-6'}>
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
                            <h4 className="font-bold text-green-900">Syarat Materi Sudah Lengkap</h4>
                            <p className="text-sm text-green-700 mt-1">
                                Anda sudah menyelesaikan seluruh materi. Langkah berikutnya adalah mengikuti mekanisme sertifikasi sesuai mode ujian yang ditetapkan.
                            </p>
                        </div>
                    </div>
                )}

                {errorMessage && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-700">
                        {errorMessage}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-700">
                        {successMessage}
                    </div>
                )}

                <div className="space-y-4">
                    {exams.map((exam) => {
                        const availability = getExamAvailability(exam);
                        const attempt = attempts.find((item) => item.exam === exam.id);
                        const selectedSlot = findSelectedSlot(exam, attempt);
                        const slotState = getSlotState(selectedSlot);
                        const availableSlots = (exam.slots || [])
                            .filter((slot) => !slot.is_booked || slot.id === selectedSlot?.id)
                            .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));
                        const requiresSlotSelection = (exam.slots || []).length > 0;
                        const selectedSlotId = selectedSlots[exam.id] ?? selectedSlot?.id;
                        const hasContinuableAttempt = attempt?.status === 'PENDING' || attempt?.status === 'IN_PROGRESS';
                        const canChangePendingSlot = Boolean(
                            attempt?.status === 'PENDING'
                            && selectedSlot
                            && !slotState.canEnter
                        );
                        const canCreateAttempt = !isLocked && !attempt && !exam.schedule_is_closed && (
                            requiresSlotSelection
                                ? availableSlots.length > 0 && Boolean(selectedSlotId)
                                : Boolean(exam.schedule_is_open)
                        );
                        const canEnterAttempt = Boolean(hasContinuableAttempt && (!selectedSlot || slotState.canEnter));
                        const canSavePendingSlotChange = Boolean(
                            canChangePendingSlot
                            && selectedSlotId
                            && selectedSlotId !== selectedSlot?.id
                        );
                        const isProcessing = submittingExamId === exam.id;

                        return (
                            <div key={exam.id} className={`border rounded-xl p-5 transition-all ${isLocked ? 'opacity-60 grayscale' : 'hover:border-indigo-200'}`}>
                                <div className="space-y-5">
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-bold text-gray-900 text-lg">{exam.title}</h3>
                                                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                                                    availability.tone === 'emerald'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : availability.tone === 'amber'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : availability.tone === 'rose'
                                                                ? 'bg-rose-100 text-rose-700'
                                                                : availability.tone === 'blue'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {availability.label}
                                                </span>
                                                {attempt && (
                                                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                                                        attempt.status === 'GRADED'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : attempt.status === 'SUBMITTED'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : slotState.tone === 'amber'
                                                                    ? 'bg-amber-100 text-amber-700'
                                                                    : slotState.tone === 'rose'
                                                                        ? 'bg-rose-100 text-rose-700'
                                                                        : 'bg-indigo-100 text-indigo-700'
                                                    }`}>
                                                        {attempt.status === 'GRADED'
                                                            ? `Selesai Dinilai (${attempt.score})`
                                                            : attempt.status === 'SUBMITTED'
                                                                ? 'Sudah Dikirim'
                                                                : selectedSlot
                                                                    ? slotState.label
                                                                    : 'Lanjutkan Ujian'}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-gray-500 line-clamp-2">{exam.description}</p>

                                            {exam.tested_materials && (
                                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                                                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">Materi yang Diujikan</p>
                                                    <p className="mt-2 text-sm text-emerald-900 whitespace-pre-line">{exam.tested_materials}</p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3">
                                                    <CalendarRange className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Periode Sertifikasi</p>
                                                        <p className="text-sm font-semibold text-gray-800 mt-1">
                                                            {formatApiDateTimeRangeForDisplay(exam.confirmed_start_at, exam.confirmed_end_at)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3">
                                                    <Clock className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Status Sesi Anda</p>
                                                        <p className="text-sm font-semibold text-gray-800 mt-1">
                                                            {selectedSlot ? slotState.message : availability.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {!loading && (
                                            <div className="flex flex-col gap-2 min-w-[240px]">
                                                {attempt && !(attempt.status === 'PENDING' || attempt.status === 'IN_PROGRESS') ? (
                                                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                                                        {attempt.status === 'GRADED'
                                                            ? 'Penilaian sudah selesai. Nilai Anda tersimpan di sistem.'
                                                            : 'Jawaban Anda sudah dikirim dan sedang menunggu proses berikutnya.'}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleExamAction(exam, attempt)}
                                                        disabled={
                                                            isProcessing
                                                            || isLocked
                                                            || (
                                                                !attempt
                                                                    ? !canCreateAttempt
                                                                    : !(canEnterAttempt || canSavePendingSlotChange)
                                                            )
                                                        }
                                                        className={`font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-sm shadow-lg ${
                                                            (attempt ? (canEnterAttempt || canSavePendingSlotChange) : canCreateAttempt)
                                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                                                                : 'bg-gray-200 text-gray-500 shadow-transparent cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {isProcessing
                                                            ? 'Menyimpan Jadwal...'
                                                            : attempt
                                                                ? (
                                                                    canSavePendingSlotChange
                                                                        ? 'Pilih Slot Ini'
                                                                        : (canEnterAttempt ? 'Masuk ke Ujian' : 'Menunggu Jadwal')
                                                                )
                                                                : (requiresSlotSelection ? 'Konfirmasi Jadwal' : 'Mulai Ujian')}
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {selectedSlot && (
                                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-4">
                                            <div className="flex items-start gap-3">
                                                <CalendarCheck2 className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Jadwal yang Sudah Anda Pilih</p>
                                                    <p className="text-sm font-semibold text-gray-900 mt-1">{formatSlotDateForDisplay(selectedSlot.date)}</p>
                                                    <p className="text-sm text-gray-600">{formatSlotTimeRangeForDisplay(selectedSlot.start_time, selectedSlot.end_time)}</p>
                                                    {selectedSlot.zoom_link && (
                                                        <a href={selectedSlot.zoom_link} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs font-bold text-indigo-600 underline">
                                                            Buka link meeting
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {(!attempt || canChangePendingSlot) && availableSlots.length > 0 && (
                                        <div className="space-y-3">
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">Pilih Slot Sesi dari Instruktur</h4>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {canChangePendingSlot
                                                        ? 'Sesi Anda belum dimulai, jadi Anda masih bisa memilih slot lain sebelum waktu mulai.'
                                                        : 'Pilih satu sesi yang paling sesuai. Setelah dikonfirmasi, slot tersebut akan terkunci untuk Anda.'}
                                                </p>
                                            </div>
                                            <div className="grid gap-3">
                                                {availableSlots.map((slot) => {
                                                    const isSelected = selectedSlotId === slot.id;
                                                    return (
                                                        <label
                                                            key={slot.id}
                                                            className={`flex items-start justify-between gap-4 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                                                                isSelected
                                                                    ? 'border-indigo-600 bg-indigo-50/60 shadow-sm'
                                                                    : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <div>
                                                                <p className="font-bold text-gray-900">{formatSlotDateForDisplay(slot.date)}</p>
                                                                <p className="text-sm text-gray-600 mt-1">{formatSlotTimeRangeForDisplay(slot.start_time, slot.end_time)}</p>
                                                                {slot.zoom_link && (
                                                                    <p className="text-xs text-indigo-600 font-semibold mt-2">Link meeting sudah tersedia</p>
                                                                )}
                                                            </div>
                                                            <input
                                                                type="radio"
                                                                name={`exam-slot-${exam.id}`}
                                                                checked={isSelected}
                                                                onChange={() => setSelectedSlots((prev) => ({ ...prev, [exam.id]: slot.id }))}
                                                                className="w-5 h-5 mt-1 text-indigo-600 focus:ring-indigo-500 border-gray-200"
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {(!attempt || canChangePendingSlot) && requiresSlotSelection && availableSlots.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                            Semua slot dari instruktur saat ini sudah terisi. Silakan tunggu pembaruan jadwal berikutnya.
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
