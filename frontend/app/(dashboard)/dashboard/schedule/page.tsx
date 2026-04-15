'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, ChevronRight, Clock, MapPin } from 'lucide-react';
import { CertificationAttempt, CertificationExam, CertificationInstructorSlot, EnrolledCourse } from '@/types';
import {
    formatApiDateTimeRangeForDisplay,
    formatSlotTimeRangeForDisplay,
} from '@/types/datetime';

type ScheduleTab = 'upcoming' | 'completed';
type ScheduleKind = 'training' | 'exam';

interface ScheduleItem {
    id: string;
    title: string;
    typeLabel: string;
    kind: ScheduleKind;
    startAt: Date;
    endAt: Date;
    location: string;
    instructor: string;
    notes: string;
    status: ScheduleTab;
    phase: 'pending' | 'ongoing' | 'done';
    phaseLabel: string;
    phaseClassName: string;
    cardClassName: string;
    timeLabel: string;
    isSelectedSlot?: boolean;
    actionHref?: string;
    actionLabel?: string;
}

function parseApiDate(value?: string | null) {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function parseSlotDateTime(slot?: CertificationInstructorSlot | null) {
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

function formatDateBadge(date: Date) {
    return {
        day: date.toLocaleDateString('id-ID', { day: '2-digit' }),
        month: date.toLocaleDateString('id-ID', { month: 'short' }),
        year: date.toLocaleDateString('id-ID', { year: 'numeric' }),
    };
}

function getPhaseMeta(startAt: Date, endAt: Date, now: Date) {
    if (now > endAt) {
        return {
            phase: 'done' as const,
            phaseLabel: 'Selesai Dilaksanakan',
            phaseClassName: 'bg-slate-100 text-slate-700',
            cardClassName: 'border-slate-200 bg-slate-50/40',
        };
    }

    if (now >= startAt && now <= endAt) {
        return {
            phase: 'ongoing' as const,
            phaseLabel: 'Sedang Dilaksanakan',
            phaseClassName: 'bg-emerald-100 text-emerald-700',
            cardClassName: 'border-emerald-200 bg-emerald-50/40',
        };
    }

    return {
        phase: 'pending' as const,
        phaseLabel: 'Belum Dilaksanakan',
        phaseClassName: 'bg-amber-100 text-amber-700',
        cardClassName: 'border-amber-200 bg-amber-50/40',
    };
}

function getSelectedSlot(exam: CertificationExam, attempt?: CertificationAttempt) {
    if (attempt?.interview_slot_detail) {
        return attempt.interview_slot_detail;
    }

    if (!attempt?.interview_slot) {
        return null;
    }

    return exam.slots?.find((slot) => slot.id === attempt.interview_slot) || null;
}

function getExamAction(
    exam: CertificationExam,
    attempt: CertificationAttempt | undefined,
    slot: CertificationInstructorSlot | null,
    now: Date
) {
    if (attempt?.status === 'GRADED') {
        return {
            actionHref: '/dashboard/certificates',
            actionLabel: 'Lihat Sertifikat',
        };
    }

    if (attempt?.status === 'SUBMITTED') {
        return {
            actionHref: '/dashboard/certificates',
            actionLabel: 'Lihat Hasil',
        };
    }

    if (attempt && slot) {
        const window = parseSlotDateTime(slot);
        if (window && now >= window.start && now <= window.end) {
            return {
                actionHref: `/certification/${attempt.id}`,
                actionLabel: 'Masuk Ujian',
            };
        }

        if (window && now < window.start) {
            return {
                actionHref: '/dashboard/courses',
                actionLabel: 'Pilih Slot',
            };
        }
    }

    if (attempt) {
        return {
            actionHref: `/certification/${attempt.id}`,
            actionLabel: 'Buka Ujian',
        };
    }

    if ((exam.slots || []).length > 0) {
        return {
            actionHref: '/dashboard/courses',
            actionLabel: 'Pilih Slot',
        };
    }

    return {
        actionHref: '/dashboard/courses',
        actionLabel: 'Lihat Course',
    };
}

function buildSchedules(enrollments: EnrolledCourse[], attempts: CertificationAttempt[]) {
    const now = new Date();
    const items: ScheduleItem[] = [];
    const selectedExamIds = new Set<number>();

    attempts.forEach((attempt) => {
        const selectedSlot = attempt.interview_slot_detail;
        if (!selectedSlot) {
            return;
        }

        const slotWindow = parseSlotDateTime(selectedSlot);
        if (!slotWindow) {
            return;
        }

        const phaseMeta = getPhaseMeta(slotWindow.start, slotWindow.end, now);
        selectedExamIds.add(attempt.exam);
        items.push({
            id: `attempt-selected-${attempt.id}-${selectedSlot.id}`,
            title: attempt.exam_title || 'Ujian Akhir',
            typeLabel: 'Slot Ujian Terpilih',
            kind: 'exam',
            startAt: slotWindow.start,
            endAt: slotWindow.end,
            location: selectedSlot.zoom_link ? 'Online / link meeting tersedia' : 'Sesi bersama instruktur',
            instructor: selectedSlot.instructor_name || 'Instruktur belum ditentukan',
            notes: phaseMeta.phase === 'pending'
                ? 'Anda sudah memilih slot ini. Jika belum dimulai, Anda masih bisa memilih slot lain dari halaman course.'
                : phaseMeta.phase === 'ongoing'
                    ? 'Sesi pilihan Anda sedang berlangsung sekarang.'
                    : 'Sesi pilihan ini sudah selesai.',
            status: phaseMeta.phase === 'done' ? 'completed' : 'upcoming',
            phase: phaseMeta.phase,
            phaseLabel: phaseMeta.phaseLabel,
            phaseClassName: phaseMeta.phaseClassName,
            cardClassName: phaseMeta.cardClassName,
            timeLabel: formatSlotTimeRangeForDisplay(selectedSlot.start_time, selectedSlot.end_time),
            isSelectedSlot: true,
            actionHref: phaseMeta.phase === 'ongoing' ? `/certification/${attempt.id}` : '/dashboard/courses',
            actionLabel: phaseMeta.phase === 'ongoing' ? 'Masuk Ujian' : 'Lihat Slot',
        });
    });

    enrollments.forEach((enrollment) => {
        const course = enrollment.course;
        const courseStart = parseApiDate(course.scheduled_at);
        const courseEnd = parseApiDate(course.scheduled_end_at) || courseStart;

        if (courseStart && courseEnd) {
            const phaseMeta = getPhaseMeta(courseStart, courseEnd, now);
            items.push({
                id: `course-${enrollment.id}`,
                title: course.title,
                typeLabel: course.type === 'course' ? 'Pelatihan' : course.type === 'webinar' ? 'Webinar' : 'Workshop',
                kind: 'training',
                startAt: courseStart,
                endAt: courseEnd,
                location: course.zoom_link ? 'Online / link meeting tersedia' : (course.location || 'Lokasi akan diinformasikan'),
                instructor: course.instructor?.name || 'Instruktur belum ditentukan',
                notes: course.zoom_link
                    ? 'Gunakan link meeting yang tersedia saat sesi dimulai.'
                    : 'Pantau halaman course Anda untuk detail sesi pelatihan.',
                status: phaseMeta.phase === 'done' ? 'completed' : 'upcoming',
                phase: phaseMeta.phase,
                phaseLabel: phaseMeta.phaseLabel,
                phaseClassName: phaseMeta.phaseClassName,
                cardClassName: phaseMeta.cardClassName,
                timeLabel: formatApiDateTimeRangeForDisplay(course.scheduled_at, course.scheduled_end_at),
                actionHref: course.last_accessed_lesson_id
                    ? `/learn/${course.slug}?lesson=${course.last_accessed_lesson_id}`
                    : `/learn/${course.slug}`,
                actionLabel: phaseMeta.phase === 'done' ? 'Buka Materi' : 'Lihat Course',
            });
        }

        (course.certification_exams || []).forEach((exam) => {
            if (selectedExamIds.has(exam.id)) {
                return;
            }

            const attempt = attempts.find((item) => item.exam === exam.id);
            const selectedSlot = getSelectedSlot(exam, attempt);
            const action = getExamAction(exam, attempt, selectedSlot, now);

            if (selectedSlot) {
                const slotWindow = parseSlotDateTime(selectedSlot);
                if (!slotWindow) {
                    return;
                }

                const phaseMeta = getPhaseMeta(slotWindow.start, slotWindow.end, now);
                items.push({
                    id: `exam-selected-${exam.id}-${selectedSlot.id}`,
                    title: course.title,
                    typeLabel: exam.exam_mode === 'INTERVIEW_ONLY' ? 'Sesi Wawancara' : 'Sesi Ujian Akhir',
                    kind: 'exam',
                    startAt: slotWindow.start,
                    endAt: slotWindow.end,
                    location: selectedSlot.zoom_link ? 'Online / link meeting tersedia' : 'Sesi bersama instruktur',
                    instructor: selectedSlot.instructor_name || course.instructor?.name || 'Instruktur belum ditentukan',
                    notes: phaseMeta.phase === 'pending'
                        ? 'Anda sudah memilih slot ini. Jika belum cocok, pilih slot lain dari halaman course.'
                        : (phaseMeta.phase === 'done'
                            ? 'Sesi ini sudah selesai.'
                            : 'Sesi Anda sedang aktif dan siap dibuka.'),
                    status: phaseMeta.phase === 'done' ? 'completed' : 'upcoming',
                    phase: phaseMeta.phase,
                    phaseLabel: phaseMeta.phaseLabel,
                    phaseClassName: phaseMeta.phaseClassName,
                    cardClassName: phaseMeta.cardClassName,
                    timeLabel: formatSlotTimeRangeForDisplay(selectedSlot.start_time, selectedSlot.end_time),
                    isSelectedSlot: true,
                    actionHref: action.actionHref,
                    actionLabel: action.actionLabel,
                });
                return;
            }

            const availableSlots = (exam.slots || [])
                .filter((slot) => !slot.is_booked)
                .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));

            if (availableSlots.length > 0) {
                availableSlots.forEach((slot) => {
                    const slotWindow = parseSlotDateTime(slot);
                    if (!slotWindow) {
                        return;
                    }

                    const phaseMeta = getPhaseMeta(slotWindow.start, slotWindow.end, now);
                    items.push({
                        id: `exam-option-${exam.id}-${slot.id}`,
                        title: course.title,
                        typeLabel: exam.exam_mode === 'INTERVIEW_ONLY' ? 'Pilihan Sesi Wawancara' : 'Pilihan Sesi Ujian',
                        kind: 'exam',
                        startAt: slotWindow.start,
                        endAt: slotWindow.end,
                        location: slot.zoom_link ? 'Online / link meeting tersedia' : 'Sesi bersama instruktur',
                        instructor: slot.instructor_name || course.instructor?.name || 'Instruktur belum ditentukan',
                        notes: 'Slot ini tersedia. Pilih dari halaman course untuk mengonfirmasi jadwal Anda.',
                        status: phaseMeta.phase === 'done' ? 'completed' : 'upcoming',
                        phase: phaseMeta.phase,
                        phaseLabel: phaseMeta.phaseLabel,
                        phaseClassName: phaseMeta.phaseClassName,
                        cardClassName: phaseMeta.cardClassName,
                        timeLabel: formatSlotTimeRangeForDisplay(slot.start_time, slot.end_time),
                        actionHref: '/dashboard/courses',
                        actionLabel: 'Pilih Slot',
                    });
                });
                return;
            }

            const examStart = parseApiDate(exam.confirmed_start_at);
            const examEnd = parseApiDate(exam.confirmed_end_at) || examStart;

            if (examStart && examEnd) {
                const phaseMeta = getPhaseMeta(examStart, examEnd, now);
                items.push({
                    id: `exam-window-${exam.id}`,
                    title: course.title,
                    typeLabel: 'Periode Ujian Akhir',
                    kind: 'exam',
                    startAt: examStart,
                    endAt: examEnd,
                    location: 'Ikuti instruksi pada halaman course Anda',
                    instructor: course.instructor?.name || 'Instruktur belum ditentukan',
                    notes: exam.schedule_is_closed
                        ? 'Periode ujian ini sudah selesai.'
                        : 'Ujian ini mengikuti periode umum yang sudah dikonfirmasi instruktur.',
                    status: phaseMeta.phase === 'done' ? 'completed' : 'upcoming',
                    phase: phaseMeta.phase,
                    phaseLabel: phaseMeta.phaseLabel,
                    phaseClassName: phaseMeta.phaseClassName,
                    cardClassName: phaseMeta.cardClassName,
                    timeLabel: formatApiDateTimeRangeForDisplay(exam.confirmed_start_at, exam.confirmed_end_at),
                    actionHref: '/dashboard/courses',
                    actionLabel: 'Lihat Course',
                });
            }
        });
    });

    return items.sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === 'upcoming' ? -1 : 1;
        }

        return a.status === 'upcoming'
            ? a.startAt.getTime() - b.startAt.getTime()
            : b.startAt.getTime() - a.startAt.getTime();
    });
}

export default function SchedulePage() {
    const [tab, setTab] = useState<ScheduleTab>('upcoming');
    const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
    const [attempts, setAttempts] = useState<CertificationAttempt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchSchedules = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    window.location.href = '/login';
                    return;
                }

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const [coursesRes, attemptsRes] = await Promise.all([
                    fetch(`${apiUrl}/api/my-courses/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${apiUrl}/api/certification-attempts/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                ]);

                if (coursesRes.status === 401 || attemptsRes.status === 401) {
                    window.location.href = '/login';
                    return;
                }

                if (!coursesRes.ok || !attemptsRes.ok) {
                    throw new Error('Jadwal belum bisa dimuat saat ini.');
                }

                const [coursesData, attemptsData] = await Promise.all([
                    coursesRes.json(),
                    attemptsRes.json(),
                ]);

                setEnrollments(Array.isArray(coursesData) ? coursesData : []);
                setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
            } catch (error) {
                console.error(error);
                setErrorMessage(error instanceof Error ? error.message : 'Jadwal belum bisa dimuat saat ini.');
            } finally {
                setIsLoading(false);
            }
        };

        void fetchSchedules();
    }, []);

    const schedules = buildSchedules(enrollments, attempts);
    const filtered = schedules.filter((item) => item.status === tab);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Jadwal Pelatihan & Ujian</h1>
                <p className="text-gray-500 mt-1">Pantau jadwal pelatihan, pilihan slot ujian, dan sesi ujian akhir Anda.</p>
            </div>

            {errorMessage && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {tab === 'upcoming' && filtered.length > 0 && (
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                    <span>
                        Anda memiliki <strong>{filtered.length}</strong> jadwal aktif atau mendatang. Pastikan Anda mengecek detail tiap sesi.
                    </span>
                </div>
            )}

            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {(['upcoming', 'completed'] as const).map((currentTab) => (
                    <button
                        key={currentTab}
                        onClick={() => setTab(currentTab)}
                        className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
                            tab === currentTab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {currentTab === 'upcoming' ? 'Mendatang' : 'Selesai'}
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                            tab === currentTab ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                            {schedules.filter((item) => item.status === currentTab).length}
                        </span>
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    [1, 2, 3].map((item) => (
                        <div key={item} className="h-36 rounded-2xl border border-gray-100 bg-white animate-pulse" />
                    ))
                ) : filtered.length > 0 ? filtered.map((item) => {
                    const badge = formatDateBadge(item.startAt);
                    return (
                        <div key={item.id} className={`rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${item.cardClassName}`}>
                            <div className="flex">
                                <div className={`flex-shrink-0 w-20 flex flex-col items-center justify-center text-white py-4 ${
                                    item.phase === 'done'
                                        ? 'bg-slate-500'
                                        : item.phase === 'ongoing'
                                            ? 'bg-emerald-600'
                                            : 'bg-amber-500'
                                }`}>
                                    <span className="text-2xl font-extrabold leading-none">{badge.day}</span>
                                    <span className="text-xs font-bold opacity-80 uppercase tracking-wider">{badge.month}</span>
                                    <span className="text-[10px] opacity-60">{badge.year}</span>
                                </div>

                                <div className="flex-1 px-5 py-4">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mr-2 ${
                                                item.kind === 'exam' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {item.typeLabel}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mr-2 ${item.phaseClassName}`}>
                                                {item.phaseLabel}
                                            </span>
                                            {item.isSelectedSlot && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                    Slot Dipilih
                                                </span>
                                            )}
                                            <h3 className="font-bold text-gray-900 mt-1.5 text-base">{item.title}</h3>
                                        </div>
                                        {item.phase === 'done' && (
                                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {item.timeLabel}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {item.location}
                                        </span>
                                        <span className="flex items-center gap-1">Instruktur: {item.instructor}</span>
                                    </div>

                                    {item.notes && (
                                        <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                                            Catatan: {item.notes}
                                        </p>
                                    )}

                                    {item.actionHref && item.actionLabel && (
                                        <div className="mt-4">
                                            <Link
                                                href={item.actionHref}
                                                className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                            >
                                                {item.actionLabel}
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">
                            Tidak ada jadwal {tab === 'upcoming' ? 'mendatang' : 'yang selesai'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
