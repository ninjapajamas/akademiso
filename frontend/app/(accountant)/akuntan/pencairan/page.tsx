'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, ReceiptText, WalletCards, XCircle } from 'lucide-react';
import { InstructorWithdrawalRequest } from '@/types';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';

interface WithdrawalSummary {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    paid: number;
    pending_amount: number;
    approved_amount: number;
    paid_amount: number;
}

interface WithdrawalResponse {
    summary: WithdrawalSummary;
    results: InstructorWithdrawalRequest[];
}

const FILTERS = [
    { key: 'ALL', label: 'Semua' },
    { key: 'PENDING', label: 'Menunggu' },
    { key: 'APPROVED', label: 'Disetujui' },
    { key: 'PAID', label: 'Sudah Cair' },
    { key: 'REJECTED', label: 'Ditolak' },
] as const;

function formatRupiah(value: number | string | undefined | null) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export default function AccountantWithdrawalsPage() {
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('ALL');
    const [data, setData] = useState<WithdrawalResponse | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [noteDraft, setNoteDraft] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const { showError, showSuccess } = useFeedbackModal();

    const fetchWithdrawals = useCallback(async (nextFilter: string) => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const query = nextFilter !== 'ALL' ? `?status=${nextFilter}` : '';
            const response = await fetch(`${apiUrl}/api/accountant/withdrawals/${query}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const payload = await response.json();
                setData(payload);
                if (payload.results?.length && !payload.results.some((item: InstructorWithdrawalRequest) => item.id === selectedId)) {
                    setSelectedId(payload.results[0].id);
                    setNoteDraft(payload.results[0].accountant_notes || '');
                } else if (!payload.results?.length) {
                    setSelectedId(null);
                    setNoteDraft('');
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    useEffect(() => {
        fetchWithdrawals(filter);
    }, [fetchWithdrawals, filter]);

    const selectedRequest = useMemo(
        () => data?.results?.find((item) => item.id === selectedId) ?? data?.results?.[0] ?? null,
        [data?.results, selectedId]
    );

    useEffect(() => {
        if (selectedRequest) {
            setSelectedId(selectedRequest.id);
            setNoteDraft(selectedRequest.accountant_notes || '');
        }
    }, [selectedRequest]);

    const summaryCards = [
        { label: 'Menunggu Review', value: data?.summary.pending ?? 0, amount: data?.summary.pending_amount ?? 0, icon: Clock3, color: 'bg-amber-100 text-amber-700' },
        { label: 'Disetujui', value: data?.summary.approved ?? 0, amount: data?.summary.approved_amount ?? 0, icon: CheckCircle2, color: 'bg-sky-100 text-sky-700' },
        { label: 'Sudah Cair', value: data?.summary.paid ?? 0, amount: data?.summary.paid_amount ?? 0, icon: WalletCards, color: 'bg-emerald-100 text-emerald-700' },
        { label: 'Ditolak', value: data?.summary.rejected ?? 0, amount: 0, icon: XCircle, color: 'bg-rose-100 text-rose-700' },
    ];

    const handleAction = async (status: 'APPROVED' | 'REJECTED' | 'PAID') => {
        if (!selectedRequest) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/accountant/withdrawals/${selectedRequest.id}/`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status,
                    accountant_notes: noteDraft.trim(),
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                await showError(payload.error || 'Status pencairan belum bisa diperbarui.', 'Aksi Gagal');
                return;
            }

            await showSuccess('Status pencairan berhasil diperbarui.', 'Aksi Tersimpan');
            await fetchWithdrawals(filter);
        } catch (error) {
            console.error(error);
            await showError('Terjadi kesalahan koneksi saat memperbarui status pencairan.', 'Koneksi Bermasalah');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-white">
                <h1 className="text-3xl font-bold">Pencairan Fee Trainer</h1>
                <p className="mt-2 max-w-3xl text-emerald-50">
                    Semua pengajuan pencairan dari trainer masuk ke sini. Tim akuntan bisa review, menyetujui, menolak, atau menandai dana sudah dicairkan.
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                    <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.color}`}>
                            <card.icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
                            <p className="text-2xl font-extrabold text-slate-900">{card.value}</p>
                            <p className="text-xs text-slate-500">{card.amount ? formatRupiah(card.amount) : 'Tidak ada nominal'}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => {
                    const active = filter === item.key;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setFilter(item.key)}
                            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                                active ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h2 className="font-bold text-slate-900">Daftar Pengajuan</h2>
                        <p className="text-sm text-slate-500">Klik salah satu pengajuan untuk melihat detail rekening dan memproses statusnya.</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {loading ? (
                            <div className="px-6 py-8 text-center text-slate-400">Memuat pengajuan...</div>
                        ) : data?.results?.length ? (
                            data.results.map((item) => {
                                const active = selectedRequest?.id === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedId(item.id);
                                            setNoteDraft(item.accountant_notes || '');
                                        }}
                                        className={`w-full px-6 py-4 text-left transition ${active ? 'bg-emerald-50/70' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-bold text-slate-900">{item.instructor_name}</p>
                                                <p className="mt-1 text-sm text-slate-500">{item.requested_by_name}</p>
                                                <p className="mt-2 text-xs text-slate-400">Diajukan {formatDate(item.created_at)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-extrabold text-slate-900">{formatRupiah(item.amount)}</p>
                                                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                                                    {item.status_label || item.status}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="px-6 py-8 text-center text-slate-400">Belum ada pengajuan pencairan.</div>
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    {selectedRequest ? (
                        <div className="space-y-5">
                            <div>
                                <p className="text-sm font-semibold text-emerald-700">Detail Pengajuan</p>
                                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">{formatRupiah(selectedRequest.amount)}</h2>
                                <p className="mt-1 text-sm text-slate-500">{selectedRequest.instructor_name} • {selectedRequest.requested_by_name}</p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Bank</p>
                                    <p className="mt-2 font-bold text-slate-900">{selectedRequest.bank_name_snapshot || '-'}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">No. Rekening</p>
                                    <p className="mt-2 font-bold text-slate-900">{selectedRequest.bank_account_number_snapshot || '-'}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pemilik Rekening</p>
                                    <p className="mt-2 font-bold text-slate-900">{selectedRequest.bank_account_holder_snapshot || '-'}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">NPWP</p>
                                    <p className="mt-2 font-bold text-slate-900">{selectedRequest.npwp_snapshot || '-'}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Catatan Trainer</p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{selectedRequest.note || 'Tidak ada catatan tambahan.'}</p>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Catatan Akuntan</label>
                                <textarea
                                    value={noteDraft}
                                    onChange={(event) => setNoteDraft(event.target.value)}
                                    placeholder="Contoh: menunggu bukti NPWP, akan diproses Jumat."
                                    className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                />
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleAction('APPROVED')}
                                    className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                                >
                                    Setujui
                                </button>
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleAction('PAID')}
                                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                                >
                                    Tandai Cair
                                </button>
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleAction('REJECTED')}
                                    className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                                >
                                    Tolak
                                </button>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                                <p><span className="font-semibold text-slate-800">Status saat ini:</span> {selectedRequest.status_label || selectedRequest.status}</p>
                                <p className="mt-1"><span className="font-semibold text-slate-800">Review terakhir:</span> {formatDate(selectedRequest.reviewed_at)}</p>
                                <p className="mt-1"><span className="font-semibold text-slate-800">Tanggal cair:</span> {formatDate(selectedRequest.paid_at)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 text-center text-slate-400">
                            <ReceiptText className="mb-3 h-10 w-10" />
                            <p className="font-medium">Belum ada pengajuan yang dipilih</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
