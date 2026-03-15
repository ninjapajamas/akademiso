'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, ExternalLink, FilePenLine, Search } from 'lucide-react';
import { Certificate } from '@/types';

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getStatusMeta(status: Certificate['approval_status']) {
    if (status === 'APPROVED') {
        return {
            label: 'Disetujui',
            className: 'bg-emerald-100 text-emerald-700',
            sortOrder: 2,
        };
    }

    if (status === 'REJECTED') {
        return {
            label: 'Ditinjau Ulang',
            className: 'bg-rose-100 text-rose-700',
            sortOrder: 3,
        };
    }

    return {
        label: 'Menunggu Validasi',
        className: 'bg-amber-100 text-amber-700',
        sortOrder: 1,
    };
}

export default function AdminCertificatesPage() {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [approvingCertificateId, setApprovingCertificateId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        window.setTimeout(() => setToast(null), 3200);
    };

    const fetchCertificates = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setLoading(false);
                return;
            }

            const res = await fetch(`${apiUrl}/api/certificates/?scope=all`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                throw new Error('Gagal memuat daftar sertifikat.');
            }

            const data = await res.json();
            setCertificates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch certificates:', error);
            showToast('Gagal memuat daftar sertifikat.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCertificates();
    }, []);

    const filteredCertificates = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const matched = certificates.filter(certificate => {
            if (!normalizedSearch) return true;

            return (
                (certificate.user_name || '').toLowerCase().includes(normalizedSearch) ||
                (certificate.course_title || '').toLowerCase().includes(normalizedSearch) ||
                (certificate.exam_title || '').toLowerCase().includes(normalizedSearch) ||
                (certificate.certificate_number || '').toLowerCase().includes(normalizedSearch)
            );
        });

        return matched.sort((left, right) => {
            const statusDelta = getStatusMeta(left.approval_status).sortOrder - getStatusMeta(right.approval_status).sortOrder;
            if (statusDelta !== 0) return statusDelta;
            return new Date(right.issue_date).getTime() - new Date(left.issue_date).getTime();
        });
    }, [certificates, search]);

    const handleApprove = async (certificateId: number) => {
        setApprovingCertificateId(certificateId);

        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${apiUrl}/api/certificates/${certificateId}/approve/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                let errorMessage = 'Gagal memvalidasi sertifikat.';

                try {
                    const errorData = await res.json();
                    errorMessage = typeof errorData === 'string'
                        ? errorData
                        : Object.entries(errorData)
                            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
                            .join(' | ');
                } catch {
                    const fallbackText = await res.text();
                    if (fallbackText) errorMessage = fallbackText;
                }

                throw new Error(errorMessage);
            }

            await fetchCertificates();
            showToast('Sertifikat berhasil divalidasi.');
        } catch (error) {
            console.error('Failed to approve certificate:', error);
            showToast(error instanceof Error ? error.message : 'Gagal memvalidasi sertifikat.', 'error');
        } finally {
            setApprovingCertificateId(null);
        }
    };

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed right-5 top-5 z-[100] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    {toast.message}
                </div>
            )}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sertifikat</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Validasi sertifikat peserta yang sudah lulus sebelum file PDF dikirim ke dashboard siswa.
                    </p>
                </div>
                <Link
                    href="/admin/certificates/templates"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                    <FilePenLine className="h-4 w-4" />
                    Edit Template Sertifikat
                </Link>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-3">
                        <div className="rounded-2xl bg-amber-50 px-4 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700">Menunggu</p>
                            <p className="mt-1 text-2xl font-black text-amber-900">{certificates.filter(item => item.approval_status === 'PENDING').length}</p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">Disetujui</p>
                            <p className="mt-1 text-2xl font-black text-emerald-900">{certificates.filter(item => item.approval_status === 'APPROVED').length}</p>
                        </div>
                    </div>

                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Cari peserta, course, ujian, nomor..."
                            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead className="bg-gray-50/80">
                                <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                                    <th className="px-4 py-3">Peserta</th>
                                    <th className="px-4 py-3">Course</th>
                                    <th className="px-4 py-3">Ujian</th>
                                    <th className="px-4 py-3">Terbit</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Validator</th>
                                    <th className="px-4 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-4" colSpan={7}>
                                                <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredCertificates.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <div className="mx-auto max-w-md">
                                                <Clock3 className="mx-auto h-10 w-10 text-gray-200" />
                                                <p className="mt-3 font-semibold text-gray-600">Belum ada data sertifikat</p>
                                                <p className="mt-1 text-sm text-gray-400">Sertifikat peserta yang lulus akan muncul di tabel ini untuk divalidasi admin.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCertificates.map(certificate => {
                                    const statusMeta = getStatusMeta(certificate.approval_status);

                                    return (
                                        <tr key={certificate.id} className="hover:bg-gray-50/70">
                                            <td className="px-4 py-4 align-top">
                                                <div className="font-semibold text-gray-900">{certificate.user_name || `User #${certificate.user}`}</div>
                                                <div className="mt-1 text-xs text-gray-400">{certificate.certificate_number || `CERT-${certificate.id}`}</div>
                                            </td>
                                            <td className="px-4 py-4 align-top">
                                                <div className="font-medium text-gray-900">{certificate.course_title || '-'}</div>
                                            </td>
                                            <td className="px-4 py-4 align-top text-gray-500">
                                                {certificate.exam_title || '-'}
                                            </td>
                                            <td className="px-4 py-4 align-top text-gray-500">
                                                {formatDate(certificate.issue_date)}
                                            </td>
                                            <td className="px-4 py-4 align-top">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusMeta.className}`}>
                                                    {statusMeta.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 align-top text-gray-500">
                                                {certificate.approved_by_name || '-'}
                                            </td>
                                            <td className="px-4 py-4 align-top">
                                                <div className="flex justify-end gap-2">
                                                    {certificate.approval_status === 'PENDING' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApprove(certificate.id)}
                                                            disabled={approvingCertificateId === certificate.id}
                                                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            {approvingCertificateId === certificate.id ? 'Memvalidasi...' : 'Validasi'}
                                                        </button>
                                                    ) : certificate.certificate_url ? (
                                                        <a
                                                            href={certificate.certificate_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                            Lihat PDF
                                                        </a>
                                                    ) : (
                                                        <span className="inline-flex rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-500">
                                                            PDF belum tersedia
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
