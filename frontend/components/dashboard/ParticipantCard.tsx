'use client';

import { BadgeCheck, BriefcaseBusiness, Building2, CalendarDays, Hash, UserRound } from 'lucide-react';
import { EnrolledCourse } from '@/types';

export interface ParticipantIdentity {
    username: string;
    fullName: string;
    company?: string;
    position?: string;
    avatar?: string | null;
}

interface ParticipantCardProps {
    enrollment: EnrolledCourse;
    participant: ParticipantIdentity | null;
}

const statusLabelMap: Record<EnrolledCourse['status'], string> = {
    Pending: 'Aktif',
    Completed: 'Selesai',
    Cancelled: 'Dibatalkan',
};

const statusClassMap: Record<EnrolledCourse['status'], string> = {
    Pending: 'bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-200/20',
    Completed: 'bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-200/20',
    Cancelled: 'bg-rose-400/15 text-rose-100 ring-1 ring-rose-200/20',
};

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function getParticipantName(participant: ParticipantIdentity | null) {
    if (participant?.fullName?.trim()) return participant.fullName.trim();
    if (participant?.username?.trim()) return participant.username.trim();
    return 'Peserta Akademiso';
}

function getParticipantInitials(participant: ParticipantIdentity | null) {
    const source = getParticipantName(participant)
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word.charAt(0).toUpperCase())
        .join('');

    return source || 'PA';
}

function getParticipantId(enrollment: EnrolledCourse) {
    return `AKD-${String(enrollment.course.id).padStart(3, '0')}-${String(enrollment.id).padStart(4, '0')}`;
}

function getProgressMessage(progress: number, status: EnrolledCourse['status']) {
    if (status === 'Cancelled') return 'Akses ke pelatihan ini saat ini dihentikan.';
    if (progress >= 100) return 'Semua materi selesai. Anda siap lanjut ke evaluasi atau sertifikasi.';
    if (progress > 0) return 'Perjalanan belajar sedang berjalan. Lanjutkan materi terakhir untuk menjaga momentum.';
    return 'Kursus sudah aktif. Anda bisa mulai belajar kapan saja dari modul pertama.';
}

export default function ParticipantCard({ enrollment, participant }: ParticipantCardProps) {
    const progress = enrollment.progress_percentage || 0;
    const participantName = getParticipantName(participant);
    const participantId = getParticipantId(enrollment);

    return (
        <aside className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#082f49_0%,#0f172a_45%,#172554_100%)] p-5 text-white shadow-lg shadow-slate-900/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.18),transparent_28%)]" />
            <div className="absolute right-4 top-4 h-20 w-20 rounded-full border border-white/10 bg-white/5" />

            <div className="relative">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-100/70">
                            Kartu Peserta
                        </p>
                        <h4 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug">
                            {enrollment.course.title}
                        </h4>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${statusClassMap[enrollment.status]}`}>
                        {statusLabelMap[enrollment.status]}
                    </span>
                </div>

                <div className="mt-6 flex items-center gap-3">
                    {participant?.avatar ? (
                        <img
                            src={participant.avatar}
                            alt={participantName}
                            className="h-14 w-14 rounded-2xl border border-white/15 object-cover"
                        />
                    ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-bold">
                            {getParticipantInitials(participant)}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.2em] text-sky-100/60">Peserta</p>
                        <p className="truncate text-base font-semibold">{participantName}</p>
                        <p className="truncate text-sm text-sky-100/70">
                            {participant?.position?.trim() || 'Peserta pelatihan Akademiso'}
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                        <div className="flex items-center gap-2 text-sky-100/75">
                            <Hash className="h-4 w-4" />
                            <span className="text-[11px] uppercase tracking-[0.18em]">ID Peserta</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold">{participantId}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                        <div className="flex items-center gap-2 text-sky-100/75">
                            <CalendarDays className="h-4 w-4" />
                            <span className="text-[11px] uppercase tracking-[0.18em]">Tanggal Masuk</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold">{formatDate(enrollment.created_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                        <div className="flex items-center gap-2 text-sky-100/75">
                            <Building2 className="h-4 w-4" />
                            <span className="text-[11px] uppercase tracking-[0.18em]">Instansi</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold">
                            {participant?.company?.trim() || 'Akademiso Member'}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                        <div className="flex items-center gap-2 text-sky-100/75">
                            <BriefcaseBusiness className="h-4 w-4" />
                            <span className="text-[11px] uppercase tracking-[0.18em]">Instruktur</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold">
                            {enrollment.course.instructor?.name || 'Tim Akademiso'}
                        </p>
                    </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100/70">
                        <span className="flex items-center gap-2">
                            <BadgeCheck className="h-4 w-4" />
                            Status Belajar
                        </span>
                        <span>{progress}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-sky-50/80">
                        {getProgressMessage(progress, enrollment.status)}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-sky-100/60">
                        <UserRound className="h-3.5 w-3.5" />
                        <span>Kartu ini otomatis tersedia untuk setiap kursus yang Anda ikuti.</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
