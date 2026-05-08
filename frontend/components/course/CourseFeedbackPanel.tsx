'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { useEffect, useState } from 'react';
import { MessageSquareQuote, RefreshCcw } from 'lucide-react';
import { CourseFeedbackEntry } from '@/types';

interface CourseFeedbackPanelProps {
    courseId: number;
    managedBy: 'admin' | 'instructor';
}

interface CourseFeedbackListResponse {
    count: number;
    results: CourseFeedbackEntry[];
}

function formatDateTime(value?: string | null) {
    if (!value) return '-';

    try {
        return new Date(value).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return value;
    }
}

export default function CourseFeedbackPanel({ courseId, managedBy }: CourseFeedbackPanelProps) {
    const [feedbackEntries, setFeedbackEntries] = useState<CourseFeedbackEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchFeedback = async () => {
            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = getClientApiBaseUrl();
                const res = await fetch(`${apiUrl}/api/courses/${courseId}/feedback/`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!res.ok) {
                    throw new Error('Gagal memuat kritik dan saran peserta.');
                }

                const data: CourseFeedbackListResponse = await res.json();
                setFeedbackEntries(Array.isArray(data.results) ? data.results : []);
            } catch (err) {
                if ((err as Error).name === 'AbortError') {
                    return;
                }
                console.error('Error fetching course feedback:', err);
                setError('Kritik dan saran peserta belum bisa dimuat.');
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchFeedback();
        return () => controller.abort();
    }, [courseId]);

    const title = managedBy === 'admin' ? 'Masukan Peserta' : 'Kritik dan Saran Peserta';
    const description = managedBy === 'admin'
        ? 'Admin dapat meninjau masukan peserta setelah mereka menyelesaikan post-test.'
        : 'Masukan ini dikirim peserta setelah post-test selesai dan hanya terlihat oleh Anda serta admin.';

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-t border-gray-100 pt-8 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white shadow-lg shadow-amber-200">
                    <MessageSquareQuote className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                {loading ? (
                    <div className="px-6 py-10 text-center text-sm text-gray-400">Memuat kritik dan saran peserta...</div>
                ) : error ? (
                    <div className="px-6 py-10 text-center">
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                ) : feedbackEntries.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-gray-400">
                        Belum ada peserta yang mengirim kritik dan saran setelah post-test.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {feedbackEntries.map((entry) => (
                            <div key={entry.id} className="space-y-5 px-6 py-5">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <p className="text-base font-semibold text-gray-900">{entry.user_name}</p>
                                        <p className="text-sm text-gray-500">{entry.user_email || '-'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                        {entry.quiz_score !== null && entry.quiz_score !== undefined && (
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                                                Skor post-test: {entry.quiz_score}
                                            </span>
                                        )}
                                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                                            Update: {formatDateTime(entry.updated_at)}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl bg-rose-50 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-500">Kritik</p>
                                        <p className="mt-2 text-sm leading-6 text-gray-700">
                                            {entry.criticism || 'Peserta tidak mengisi kritik.'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-sky-50 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-500">Saran</p>
                                        <p className="mt-2 text-sm leading-6 text-gray-700">
                                            {entry.suggestion || 'Peserta tidak mengisi saran.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                    <span>Dikirim {formatDateTime(entry.created_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

