'use client';

import { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { EnrolledCourse } from '@/types';
import ParticipantCard, { ParticipantIdentity } from './ParticipantCard';

interface ParticipantCardModalProps {
    enrollment: EnrolledCourse | null;
    participant: ParticipantIdentity | null;
    onClose: () => void;
}

export default function ParticipantCardModal({ enrollment, participant, onClose }: ParticipantCardModalProps) {
    useEffect(() => {
        if (!enrollment) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [enrollment, onClose]);

    if (!enrollment) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
                onClick={onClose}
            >
                <div
                    className="w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl"
                    onClick={event => event.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Kartu Peserta</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">{enrollment.course.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                <Printer className="h-4 w-4" />
                                Cetak
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                aria-label="Tutup kartu peserta"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[calc(100vh-160px)] overflow-y-auto bg-slate-100/70 p-5">
                        <div className="mx-auto max-w-md printable-participant-card">
                            <ParticipantCard enrollment={enrollment} participant={participant} />
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }

                    .printable-participant-card,
                    .printable-participant-card * {
                        visibility: visible;
                    }

                    .printable-participant-card {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        max-width: 100%;
                        padding: 24px;
                    }
                }
            `}</style>
        </>
    );
}
