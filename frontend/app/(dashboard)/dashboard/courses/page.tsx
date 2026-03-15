'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, Search, Filter, BarChart, CreditCard } from 'lucide-react';
import { CertificationAttempt, EnrolledCourse } from '@/types';
import { ParticipantIdentity } from '@/components/dashboard/ParticipantCard';
import ParticipantCardModal from '@/components/dashboard/ParticipantCardModal';
import StudentExamSection from '@/components/exam/StudentExamSection';

interface ProfileResponse {
    username: string;
    first_name: string;
    last_name: string;
    profile?: {
        avatar?: string | null;
        company?: string;
        position?: string;
    } | null;
}

interface WebinarAttendanceFormState {
    attendee_name: string;
    attendee_email: string;
    attendee_phone: string;
    attendee_company: string;
    attendee_position: string;
    notes: string;
}

function buildWebinarAttendanceForm(enrollment: EnrolledCourse): WebinarAttendanceFormState {
    return {
        attendee_name: enrollment.course.webinar_attendance?.attendee_name || '',
        attendee_email: enrollment.course.webinar_attendance?.attendee_email || '',
        attendee_phone: enrollment.course.webinar_attendance?.attendee_phone || '',
        attendee_company: enrollment.course.webinar_attendance?.attendee_company || '',
        attendee_position: enrollment.course.webinar_attendance?.attendee_position || '',
        notes: enrollment.course.webinar_attendance?.notes || '',
    };
}

function mapParticipantIdentity(data: ProfileResponse): ParticipantIdentity {
    return {
        username: data.username || '',
        fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.username || 'Peserta Akademiso',
        avatar: data.profile?.avatar || null,
        company: data.profile?.company || '',
        position: data.profile?.position || '',
    };
}

export default function MyCoursesPage() {
    const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAttemptsLoading, setIsAttemptsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Completed' | 'Cancelled'>('all');
    const [participant, setParticipant] = useState<ParticipantIdentity | null>(null);
    const [activeEnrollment, setActiveEnrollment] = useState<EnrolledCourse | null>(null);
    const [attempts, setAttempts] = useState<CertificationAttempt[]>([]);
    const [markingAttendanceCourseId, setMarkingAttendanceCourseId] = useState<number | null>(null);
    const [attendanceForms, setAttendanceForms] = useState<Record<number, WebinarAttendanceFormState>>({});

    const fetchAttempts = async (token?: string) => {
        try {
            const accessToken = token || localStorage.getItem('access_token');
            if (!accessToken) {
                setAttempts([]);
                return;
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const attemptsRes = await fetch(`${apiUrl}/api/certification-attempts/`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (attemptsRes.ok) {
                const attemptsData = await attemptsRes.json();
                setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
            } else if (attemptsRes.status === 401) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsAttemptsLoading(false);
        }
    };

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) { window.location.href = '/login'; return; }

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const [coursesRes, profileRes, attemptsRes] = await Promise.all([
                    fetch(`${apiUrl}/api/my-courses/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${apiUrl}/api/profile/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${apiUrl}/api/certification-attempts/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (coursesRes.ok) {
                    const data = await coursesRes.json();
                    setEnrollments(data);
                } else if (coursesRes.status === 401) {
                    window.location.href = '/login';
                }

                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setParticipant(mapParticipantIdentity(profileData));
                }

                if (attemptsRes.ok) {
                    const attemptsData = await attemptsRes.json();
                    setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
                } else if (attemptsRes.status === 401) {
                    window.location.href = '/login';
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
                setIsAttemptsLoading(false);
            }
        };
        void fetchCourses();
    }, []);

    const filtered = enrollments.filter(e => {
        const matchSearch = e.course.title.toLowerCase().includes(search.toLowerCase()) ||
            e.course.instructor?.name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || e.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            Completed: 'bg-green-100 text-green-700',
            Pending: 'bg-yellow-100 text-yellow-700',
            Cancelled: 'bg-red-100 text-red-700',
        };
        const label: Record<string, string> = {
            Completed: 'Selesai',
            Pending: 'Berlangsung',
            Cancelled: 'Dibatalkan',
        };
        return (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>
                {label[status] || status}
            </span>
        );
    };

    useEffect(() => {
        setAttendanceForms(prev => {
            const next = { ...prev };

            enrollments.forEach(enrollment => {
                if (enrollment.course.type !== 'webinar') return;
                next[enrollment.course.id] = {
                    ...(next[enrollment.course.id] || buildWebinarAttendanceForm(enrollment)),
                    ...buildWebinarAttendanceForm(enrollment),
                };
            });

            return next;
        });
    }, [enrollments]);

    const handleAttendanceFormChange = (courseId: number, field: keyof WebinarAttendanceFormState, value: string) => {
        setAttendanceForms(prev => ({
            ...prev,
            [courseId]: {
                ...(prev[courseId] || {
                    attendee_name: '',
                    attendee_email: '',
                    attendee_phone: '',
                    attendee_company: '',
                    attendee_position: '',
                    notes: '',
                }),
                [field]: value,
            }
        }));
    };

    const handleMarkWebinarAttendance = async (courseId: number) => {
        setMarkingAttendanceCourseId(courseId);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const form = attendanceForms[courseId] || {
                attendee_name: '',
                attendee_email: '',
                attendee_phone: '',
                attendee_company: '',
                attendee_position: '',
                notes: '',
            };
            const res = await fetch(`${apiUrl}/api/courses/${courseId}/webinar-attendance/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(form)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                alert(errorData?.error || 'Gagal mengirim presensi webinar.');
                return;
            }

            const attendance = await res.json();
            setEnrollments(prev => prev.map(enrollment => (
                enrollment.course.id === courseId
                    ? {
                        ...enrollment,
                        course: {
                            ...enrollment.course,
                            webinar_attendance: attendance,
                        }
                    }
                    : enrollment
            )));
            setAttendanceForms(prev => ({
                ...prev,
                [courseId]: {
                    attendee_name: attendance.attendee_name || '',
                    attendee_email: attendance.attendee_email || '',
                    attendee_phone: attendance.attendee_phone || '',
                    attendee_company: attendance.attendee_company || '',
                    attendee_position: attendance.attendee_position || '',
                    notes: attendance.notes || '',
                }
            }));
        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan saat mengirim presensi webinar.');
        } finally {
            setMarkingAttendanceCourseId(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Kursus Saya</h1>
                <p className="text-gray-500 mt-1">Semua pelatihan ISO yang telah Anda daftarkan.</p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari kursus..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as 'all' | 'Pending' | 'Completed' | 'Cancelled')}
                        className="border-none outline-none bg-transparent font-medium text-gray-700 cursor-pointer"
                    >
                        <option value="all">Semua Status</option>
                        <option value="Pending">Berlangsung</option>
                        <option value="Completed">Selesai</option>
                        <option value="Cancelled">Dibatalkan</option>
                    </select>
                </div>
            </div>

            {/* Course List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-72 bg-white rounded-3xl animate-pulse border border-gray-100" />
                    ))}
                </div>
            ) : filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map(enrollment => (
                        <div key={enrollment.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                            <div className="min-w-0">
                                <div className="flex flex-col gap-5 sm:flex-row">
                                    <div className="w-full h-40 sm:h-28 sm:w-28 rounded-2xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                        {enrollment.course.thumbnail ? (
                                            <img src={enrollment.course.thumbnail} alt={enrollment.course.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <BookOpen className="w-10 h-10 text-white/80" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                    {enrollment.course.category?.name || 'ISO'}
                                                </span>
                                                {statusBadge(enrollment.status)}
                                            </div>
                                            <span className="text-xs text-gray-400 flex-shrink-0">
                                                {new Date(enrollment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">{enrollment.course.title}</h3>
                                        <p className="text-sm text-gray-500">
                                            {enrollment.course.instructor?.name} &bull; {enrollment.course.level} &bull; {enrollment.course.duration}
                                        </p>

                                        <div className="grid gap-3 sm:grid-cols-3 mt-4">
                                            <div className="rounded-2xl border border-gray-100 bg-slate-50 px-4 py-3">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Progres</p>
                                                <p className="mt-1 text-xl font-bold text-gray-900">{enrollment.progress_percentage || 0}%</p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-slate-50 px-4 py-3">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Tipe</p>
                                                <p className="mt-1 text-sm font-semibold text-gray-900 capitalize">{enrollment.course.type || 'course'}</p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-slate-50 px-4 py-3">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Durasi</p>
                                                <p className="mt-1 text-sm font-semibold text-gray-900">{enrollment.course.duration}</p>
                                            </div>
                                        </div>

                                        <div className="mt-5">
                                            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-gray-500 mb-2">
                                                <span className="flex items-center gap-2">
                                                    <BarChart className="w-3.5 h-3.5 text-blue-500" />
                                                    Perkembangan belajar
                                                </span>
                                                <span>{enrollment.progress_percentage || 0}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${enrollment.progress_percentage || 0}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-wrap items-center gap-3">
                                    <Link
                                        href={enrollment.course.last_accessed_lesson_id ? `/learn/${enrollment.course.slug}?lesson=${enrollment.course.last_accessed_lesson_id}` : `/learn/${enrollment.course.slug}`}
                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                                    >
                                        {(enrollment.progress_percentage || 0) === 100 ? 'Pelajari Lagi' : (enrollment.course.last_accessed_lesson_id || (enrollment.progress_percentage || 0) > 0 ? 'Lanjut Belajar' : 'Mulai Belajar')}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => setActiveEnrollment(enrollment)}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        Kartu Peserta
                                    </button>
                                    <span className="text-xs text-gray-500">
                                        Klik tombol untuk melihat kartu peserta dan mencetaknya.
                                    </span>
                                </div>

                                {enrollment.course.type === 'webinar' && (
                                    <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500">Presensi Webinar</p>
                                                <p className="mt-1 text-sm font-semibold text-gray-900">
                                                    {enrollment.course.webinar_attendance?.is_present
                                                        ? 'Kehadiran Anda sudah tercatat. Presensi webinar hanya bisa dikirim satu kali.'
                                                        : 'Setelah mengikuti webinar, lengkapi data presensi lalu kirim satu kali agar sertifikat webinar bisa diproses.'}
                                                </p>
                                                {enrollment.course.webinar_attendance?.attended_at && (
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Presensi tercatat pada {new Date(enrollment.course.webinar_attendance.attended_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-2">
                                                <input
                                                    value={attendanceForms[enrollment.course.id]?.attendee_name || ''}
                                                    onChange={event => handleAttendanceFormChange(enrollment.course.id, 'attendee_name', event.target.value)}
                                                    placeholder="Nama lengkap"
                                                    disabled={Boolean(enrollment.course.webinar_attendance?.is_present)}
                                                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-rose-100/70 disabled:text-gray-500"
                                                />
                                                <input
                                                    value={attendanceForms[enrollment.course.id]?.attendee_email || ''}
                                                    onChange={event => handleAttendanceFormChange(enrollment.course.id, 'attendee_email', event.target.value)}
                                                    placeholder="Email aktif"
                                                    disabled={Boolean(enrollment.course.webinar_attendance?.is_present)}
                                                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-rose-100/70 disabled:text-gray-500"
                                                />
                                                <input
                                                    value={attendanceForms[enrollment.course.id]?.attendee_phone || ''}
                                                    onChange={event => handleAttendanceFormChange(enrollment.course.id, 'attendee_phone', event.target.value)}
                                                    placeholder="No. HP / WhatsApp"
                                                    disabled={Boolean(enrollment.course.webinar_attendance?.is_present)}
                                                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-rose-100/70 disabled:text-gray-500"
                                                />
                                                <input
                                                    value={attendanceForms[enrollment.course.id]?.attendee_company || ''}
                                                    onChange={event => handleAttendanceFormChange(enrollment.course.id, 'attendee_company', event.target.value)}
                                                    placeholder="Instansi / perusahaan"
                                                    disabled={Boolean(enrollment.course.webinar_attendance?.is_present)}
                                                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-rose-100/70 disabled:text-gray-500"
                                                />
                                                <input
                                                    value={attendanceForms[enrollment.course.id]?.attendee_position || ''}
                                                    onChange={event => handleAttendanceFormChange(enrollment.course.id, 'attendee_position', event.target.value)}
                                                    placeholder="Jabatan"
                                                    disabled={Boolean(enrollment.course.webinar_attendance?.is_present)}
                                                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-rose-100/70 disabled:text-gray-500 md:col-span-2"
                                                />
                                                <textarea
                                                    value={attendanceForms[enrollment.course.id]?.notes || ''}
                                                    onChange={event => handleAttendanceFormChange(enrollment.course.id, 'notes', event.target.value)}
                                                    placeholder="Catatan tambahan presensi"
                                                    rows={3}
                                                    disabled={Boolean(enrollment.course.webinar_attendance?.is_present)}
                                                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-rose-100/70 disabled:text-gray-500 md:col-span-2"
                                                />
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                <Link
                                                    href={enrollment.course.last_accessed_lesson_id ? `/learn/${enrollment.course.slug}?lesson=${enrollment.course.last_accessed_lesson_id}` : `/learn/${enrollment.course.slug}`}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100"
                                                >
                                                    Buka Webinar
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMarkWebinarAttendance(enrollment.course.id)}
                                                    disabled={markingAttendanceCourseId === enrollment.course.id || Boolean(enrollment.course.webinar_attendance?.is_present)}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                                                >
                                                    {markingAttendanceCourseId === enrollment.course.id
                                                        ? 'Menyimpan...'
                                                        : enrollment.course.webinar_attendance?.is_present
                                                            ? 'Presensi Sudah Terkirim'
                                                            : 'Kirim Presensi'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {(enrollment.course.certification_exams || []).length > 0 && (
                                    <div className="mt-6">
                                        <StudentExamSection
                                            course={{
                                                ...enrollment.course,
                                                is_enrolled: true,
                                                progress_percentage: enrollment.progress_percentage ?? enrollment.course.progress_percentage,
                                            }}
                                            variant="embedded"
                                            attempts={attempts}
                                            attemptsLoading={isAttemptsLoading}
                                            onAttemptsRefresh={() => fetchAttempts()}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-7 h-7 text-blue-400" />
                    </div>
                    <p className="font-semibold text-gray-700 mb-1">
                        {search || statusFilter !== 'all' ? 'Tidak ada kursus yang cocok' : 'Belum ada kursus'}
                    </p>
                    <p className="text-sm text-gray-400 mb-5">
                        {search || statusFilter !== 'all' ? 'Coba ubah filter pencarian.' : 'Jelajahi dan daftar ke program pelatihan ISO.'}
                    </p>
                    <Link href="/courses" className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 text-sm">
                        Jelajahi Kursus <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

            {/* Summary */}
            {!isLoading && enrollments.length > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-2">
                    {[
                        { label: 'Total Kursus', value: enrollments.length, color: 'text-blue-600' },
                        { label: 'Selesai', value: enrollments.filter(e => (e.progress_percentage || 0) === 100).length, color: 'text-green-600' },
                        { label: 'Berlangsung', value: enrollments.filter(e => (e.progress_percentage || 0) < 100).length, color: 'text-yellow-600' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            <ParticipantCardModal
                enrollment={activeEnrollment}
                participant={participant}
                onClose={() => setActiveEnrollment(null)}
            />
        </div>
    );
}
