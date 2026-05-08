'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, ExternalLink, FilePenLine, Search } from 'lucide-react';
import { Certificate, CertificateTemplate } from '@/types';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';

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
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [selectedTemplateByCertificate, setSelectedTemplateByCertificate] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [approvingCertificateId, setApprovingCertificateId] = useState<number | null>(null);
    const { showError, showSuccess } = useFeedbackModal();

    const apiUrl = getClientApiBaseUrl();

    const fetchCertificates = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setLoading(false);
                return;
            }

            const [certificatesRes, templatesRes] = await Promise.all([
                fetch(`${apiUrl}/api/certificates/?scope=all`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${apiUrl}/api/certificate-templates/`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            if (!certificatesRes.ok) {
                throw new Error('Gagal memuat daftar sertifikat.');
            }

            const data = await certificatesRes.json();
            const certificateData = Array.isArray(data) ? data : [];
            setCertificates(certificateData);

            if (templatesRes.ok) {
                const templateData = await templatesRes.json();
                setTemplates(Array.isArray(templateData) ? templateData : []);
            }

            setSelectedTemplateByCertificate(prev => {
                const next: Record<number, string> = {};
                certificateData.forEach((certificate: Certificate) => {
                    next[certificate.id] = prev[certificate.id] || (certificate.template ? String(certificate.template) : '');
                });
                return next;
            });
        } catch (error) {
            console.error('Failed to fetch certificates:', error);
            await showError('Gagal memuat daftar sertifikat.', 'Pemanggilan Data Gagal');
        } finally {
            setLoading(false);
        }
    }, [apiUrl, showError]);

    useEffect(() => {
        fetchCertificates();
    }, [fetchCertificates]);

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
            const selectedTemplate = selectedTemplateByCertificate[certificateId];
            const res = await fetch(`${apiUrl}/api/certificates/${certificateId}/approve/`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(selectedTemplate ? { template_id: selectedTemplate } : {}),
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
            await showSuccess('Sertifikat berhasil divalidasi.', 'Validasi Berhasil');
        } catch (error) {
            console.error('Failed to approve certificate:', error);
            await showError(error instanceof Error ? error.message : 'Gagal memvalidasi sertifikat.', 'Validasi Gagal');
        } finally {
            setApprovingCertificateId(null);
        }
    };

    const getAvailableTemplates = (courseId: number) => {
        return templates.filter(template => template.is_active && (template.course === courseId || template.course === null));
    };

    return (
        <div className="space-y-6">
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
                            placeholder="Cari peserta, course, assessment, nomor..."
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
                                    <th className="px-4 py-3">Template</th>
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
                                            <td className="px-4 py-4" colSpan={8}>
                                                <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredCertificates.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center">
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
                                                {certificate.template_name || 'Otomatis'}
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
                                                        <div className="flex flex-col items-end gap-2">
                                                            {getAvailableTemplates(certificate.course).length > 0 && (
                                                                <select
                                                                    value={selectedTemplateByCertificate[certificate.id] || ''}
                                                                    onChange={event => setSelectedTemplateByCertificate(prev => ({
                                                                        ...prev,
                                                                        [certificate.id]: event.target.value,
                                                                    }))}
                                                                    className="max-w-[220px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                                                >
                                                                    <option value="">Otomatis</option>
                                                                    {getAvailableTemplates(certificate.course).map(template => (
                                                                        <option key={template.id} value={template.id}>
                                                                            {template.name}{template.course ? '' : ' (Global)'}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleApprove(certificate.id)}
                                                                disabled={approvingCertificateId === certificate.id}
                                                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                {approvingCertificateId === certificate.id ? 'Memvalidasi...' : 'Validasi'}
                                                            </button>
                                                        </div>
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

