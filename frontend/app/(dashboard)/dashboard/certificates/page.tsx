'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Clock3, Download, ExternalLink, Search } from 'lucide-react';
import { Certificate } from '@/types';

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getGradient(index: number) {
    const gradients = [
        'from-blue-600 to-blue-800',
        'from-emerald-600 to-emerald-800',
        'from-indigo-600 to-indigo-800',
        'from-amber-500 to-orange-700',
    ];
    return gradients[index % gradients.length];
}

function getStatusMeta(certificate: Certificate) {
    if (certificate.approval_status === 'APPROVED') {
        return {
            label: 'Siap Dicetak',
            badgeClass: 'bg-emerald-100 text-emerald-700',
            helper: certificate.approved_at
                ? `Sertifikat siap diunduh sejak ${formatDate(certificate.approved_at)}`
                : 'Sertifikat sudah siap diunduh.',
        };
    }

    if (certificate.approval_status === 'REJECTED') {
        return {
            label: 'Perlu Tinjauan Ulang',
            badgeClass: 'bg-rose-100 text-rose-700',
            helper: 'Sertifikat ini masih perlu ditinjau ulang oleh admin.',
        };
    }

    return {
        label: 'Menunggu Penilaian',
        badgeClass: 'bg-amber-100 text-amber-700',
        helper: 'Sertifikat akan otomatis tersedia setelah hasil assessment dinyatakan siap.',
    };
}

export default function CertificatesPage() {
    const [search, setSearch] = useState('');
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'pending'>('all');

    useEffect(() => {
        const fetchCertificates = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    setLoading(false);
                    return;
                }

                const apiUrl = getClientApiBaseUrl();
                const res = await fetch(`${apiUrl}/api/certificates/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    setCertificates(await res.json());
                }
            } catch (error) {
                console.error('Failed to fetch certificates:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCertificates();
    }, []);

    const certificateStats = useMemo(() => ([
        {
            key: 'all' as const,
            label: 'Total Sertifikat',
            value: loading ? '...' : certificates.length,
            icon: Award,
            color: 'bg-blue-50 text-blue-600',
            activeClass: 'border-blue-200 ring-2 ring-blue-100 bg-blue-50/70',
        },
        {
            key: 'ready' as const,
            label: 'Siap Diunduh',
            value: loading ? '...' : certificates.filter(cert => cert.approval_status === 'APPROVED' && !!cert.certificate_url).length,
            icon: CheckCircle2,
            color: 'bg-green-50 text-green-600',
            activeClass: 'border-emerald-200 ring-2 ring-emerald-100 bg-emerald-50/70',
        },
        {
            key: 'pending' as const,
            label: 'Menunggu Penilaian',
            value: loading ? '...' : certificates.filter(cert => cert.approval_status === 'PENDING').length,
            icon: Clock3,
            color: 'bg-amber-50 text-amber-600',
            activeClass: 'border-amber-200 ring-2 ring-amber-100 bg-amber-50/70',
        },
    ]), [certificates, loading]);

    const filteredCertificates = useMemo(() => (
        certificates.filter(cert => {
            const matchesSearch =
                (cert.course_title || '').toLowerCase().includes(search.toLowerCase()) ||
                (cert.exam_title || '').toLowerCase().includes(search.toLowerCase()) ||
                (cert.certificate_number || '').toLowerCase().includes(search.toLowerCase());

            const matchesStatus = statusFilter === 'all'
                || (statusFilter === 'ready' && cert.approval_status === 'APPROVED' && !!cert.certificate_url)
                || (statusFilter === 'pending' && cert.approval_status === 'PENDING');

            return matchesSearch && matchesStatus;
        })
    ), [certificates, search, statusFilter]);

    const handleDownload = (certificate: Certificate) => {
        if (!certificate.certificate_url) return;
        window.open(certificate.certificate_url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Sertifikat Saya</h1>
                <p className="text-gray-500 mt-1">Unduh sertifikat resmi yang sudah siap tanpa menunggu validasi manual.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                {certificateStats.map((stat) => {
                    const isActive = statusFilter === stat.key;

                    return (
                        <button
                            key={stat.key}
                            type="button"
                            onClick={() => setStatusFilter(stat.key)}
                            className={`rounded-2xl border shadow-sm p-4 flex items-center gap-3 text-left transition-all ${
                                isActive
                                    ? stat.activeClass
                                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xl font-extrabold text-gray-900">{stat.value}</p>
                                <p className="text-xs text-gray-500">{stat.label}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                isActive ? 'bg-white text-gray-700 shadow-sm' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {isActive ? 'Aktif' : 'Filter'}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari sertifikat, assessment, atau nomor sertifikat..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
                {loading ? (
                    [1, 2].map(item => (
                        <div key={item} className="h-72 animate-pulse rounded-2xl border border-gray-100 bg-white" />
                    ))
                ) : filteredCertificates.map((certificate, index) => {
                    const statusMeta = getStatusMeta(certificate);

                    return (
                        <div key={certificate.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                            <div className={`bg-gradient-to-r ${getGradient(index)} p-5 relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="relative z-10">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                                        <Award className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-white font-bold text-sm leading-snug">
                                        {certificate.course_title || 'Sertifikat Akademiso'}
                                    </h3>
                                    <span className="text-white/70 text-[11px] font-medium">
                                        {certificate.exam_title || 'Pelatihan Bersertifikat'}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="text-xs text-gray-500">
                                        Diterbitkan: <strong className="text-gray-700">{formatDate(certificate.issue_date)}</strong>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${statusMeta.badgeClass}`}>
                                        {statusMeta.label}
                                    </span>
                                </div>
                                <div className="text-[11px] text-gray-400 mb-2">
                                    Nomor Sertifikat: {certificate.certificate_number || `CERT-${certificate.id}`}
                                </div>
                                <p className="mb-4 text-xs text-gray-500">
                                    {statusMeta.helper}
                                </p>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDownload(certificate)}
                                        disabled={!certificate.certificate_url}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Unduh PDF
                                    </button>
                                    {certificate.certificate_url && (
                                        <a
                                            href={certificate.certificate_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 py-2 rounded-lg transition-colors"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Buka
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {!loading && filteredCertificates.length === 0 && (
                    <div className="col-span-2 text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Award className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Belum ada sertifikat yang tersedia</p>
                        <p className="text-sm text-gray-400 mt-1">Sertifikat akan muncul setelah assessment Anda dinyatakan siap dan PDF berhasil dibuat.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

