'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { Loader2, MessageSquareHeart, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SatisfactionFeedbackModalProps {
    open: boolean;
    courseSlug: string;
    courseTitle: string;
    onClose: () => void;
    onSaved: () => void | Promise<void>;
}

export default function SatisfactionFeedbackModal({
    open,
    courseSlug,
    courseTitle,
    onClose,
    onSaved,
}: SatisfactionFeedbackModalProps) {
    const [score, setScore] = useState(0);
    const [criticism, setCriticism] = useState('');
    const [suggestion, setSuggestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open || !courseSlug) return;
        const controller = new AbortController();

        const fetchFeedback = async () => {
            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = getClientApiBaseUrl();
                const res = await fetch(`${apiUrl}/api/courses/${courseSlug}/satisfaction/`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error('Form kepuasan belum bisa dimuat.');
                const data = await res.json();
                setScore(Number(data.satisfaction_score || 0));
                setCriticism(data.criticism || '');
                setSuggestion(data.suggestion || '');
            } catch (fetchError) {
                if ((fetchError as Error).name !== 'AbortError') {
                    setError(fetchError instanceof Error ? fetchError.message : 'Form kepuasan belum bisa dimuat.');
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        void fetchFeedback();
        return () => controller.abort();
    }, [courseSlug, open]);

    if (!open) return null;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (score < 1) {
            setError('Pilih tingkat kepuasan dari 1 sampai 5 bintang.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const res = await fetch(`${apiUrl}/api/courses/${courseSlug}/satisfaction/`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    satisfaction_score: score,
                    criticism,
                    suggestion,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Kepuasan pelanggan belum bisa disimpan.');
            await onSaved();
            onClose();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Kepuasan pelanggan belum bisa disimpan.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
                    <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
                            <MessageSquareHeart className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">Wajib sebelum unduh</p>
                            <h2 className="mt-1 text-xl font-black text-gray-900">Kepuasan Pelanggan</h2>
                            <p className="mt-1 text-sm text-gray-500">{courseTitle}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Tutup form kepuasan" className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin" /> Memuat form kepuasan...
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="text-sm font-bold text-gray-800">Seberapa puas Anda dengan pelatihan ini? *</label>
                                <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Tingkat kepuasan">
                                    {[1, 2, 3, 4, 5].map(value => (
                                        <button
                                            key={value}
                                            type="button"
                                            role="radio"
                                            aria-checked={score === value}
                                            aria-label={`${value} bintang`}
                                            onClick={() => setScore(value)}
                                            className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition ${score >= value ? 'border-amber-300 bg-amber-50 text-amber-500' : 'border-gray-200 bg-white text-gray-300 hover:border-amber-200'}`}
                                        >
                                            <Star className={`h-6 w-6 ${score >= value ? 'fill-current' : ''}`} />
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-xs text-gray-500">1 = sangat tidak puas, 5 = sangat puas.</p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-gray-800">Apa yang masih perlu diperbaiki?</label>
                                <textarea rows={3} value={criticism} onChange={event => setCriticism(event.target.value)} placeholder="Kritik Anda (opsional)" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-gray-800">Saran untuk pelatihan berikutnya</label>
                                <textarea rows={3} value={suggestion} onChange={event => setSuggestion(event.target.value)} placeholder="Saran Anda (opsional)" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                            </div>
                        </>
                    )}

                    {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>}

                    <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50">Nanti</button>
                        <button type="submit" disabled={loading || saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving ? 'Menyimpan...' : 'Simpan & Buka Sertifikat'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
