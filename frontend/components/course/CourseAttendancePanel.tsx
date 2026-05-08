'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, FileSpreadsheet, FileText, XCircle } from 'lucide-react';

interface CourseAttendanceEntry {
    order_id: number;
    user_id: number;
    user_name: string;
    email: string;
    status: string;
    enrolled_at: string;
    pre_test_completed: boolean;
    pre_test_score?: number | null;
    pre_test_completed_at?: string | null;
    post_test_completed: boolean;
    post_test_score?: number | null;
    post_test_completed_at?: string | null;
    is_present: boolean;
    attended_at?: string | null;
}

interface CourseAttendanceResponse {
    course?: {
        id: number;
        title: string;
        slug: string;
    };
    count: number;
    present_count: number;
    absent_count: number;
    requirements: {
        has_pre_test: boolean;
        has_post_test: boolean;
    };
    results: CourseAttendanceEntry[];
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

export default function CourseAttendancePanel({ courseId }: { courseId: number }) {
    const [data, setData] = useState<CourseAttendanceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');

    useEffect(() => {
        const controller = new AbortController();

        const fetchAttendance = async () => {
            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = getClientApiBaseUrl();
                const res = await fetch(`${apiUrl}/api/courses/${courseId}/attendance/`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!res.ok) {
                    const payload = await res.json().catch(() => null);
                    throw new Error(payload?.error || 'Gagal memuat daftar hadir course.');
                }

                setData(await res.json());
            } catch (err) {
                if ((err as Error).name === 'AbortError') {
                    return;
                }
                console.error('Error fetching course attendance:', err);
                setError(err instanceof Error ? err.message : 'Daftar hadir belum bisa dimuat.');
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchAttendance();
        return () => controller.abort();
    }, [courseId]);

    const attendancePercentage = data?.count ? Math.round(((data.present_count || 0) / data.count) * 100) : 0;
    const filteredResults = (data?.results || []).filter((item) => {
        if (filter === 'present') return item.is_present;
        if (filter === 'absent') return !item.is_present;
        return true;
    });

    const exportToExcel = () => {
        if (!data || data.results.length === 0) {
            return;
        }

        const rows = [
            ['Nama Peserta', 'Email', 'Pre-Test', 'Pre-Test Waktu', 'Post-Test', 'Post-Test Waktu', 'Presensi', 'Waktu Hadir'],
            ...data.results.map((item) => [
                item.user_name,
                item.email || '',
                item.pre_test_completed ? (item.pre_test_score != null ? `${Math.round(item.pre_test_score)}%` : 'Selesai') : 'Belum',
                formatDateTime(item.pre_test_completed_at),
                item.post_test_completed ? (item.post_test_score != null ? `${Math.round(item.post_test_score)}%` : 'Selesai') : 'Belum',
                formatDateTime(item.post_test_completed_at),
                item.is_present ? 'Hadir' : 'Belum Hadir',
                formatDateTime(item.attended_at),
            ]),
        ];

        const csvContent = '\uFEFF' + rows
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(data.course?.slug || 'attendance').replace(/\s+/g, '-')}-attendance.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportToPdf = () => {
        if (!data || data.results.length === 0) {
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1100,height=800');
        if (!printWindow) {
            return;
        }

        const tableRows = data.results.map((item) => `
            <tr>
                <td>${item.user_name}</td>
                <td>${item.email || '-'}</td>
                <td>${item.pre_test_completed ? (item.pre_test_score != null ? `${Math.round(item.pre_test_score)}%` : 'Selesai') : 'Belum'}</td>
                <td>${item.post_test_completed ? (item.post_test_score != null ? `${Math.round(item.post_test_score)}%` : 'Selesai') : 'Belum'}</td>
                <td>${item.is_present ? 'Hadir' : 'Belum Hadir'}</td>
                <td>${formatDateTime(item.attended_at)}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Daftar Hadir ${data.course?.title || ''}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
                        h1 { margin: 0 0 8px; font-size: 24px; }
                        p { margin: 0 0 16px; color: #4b5563; }
                        .stats { display: flex; gap: 12px; margin-bottom: 20px; }
                        .stat { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; min-width: 140px; }
                        .stat strong { display: block; font-size: 22px; margin-top: 4px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 12px; vertical-align: top; }
                        th { background: #f9fafb; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
                    </style>
                </head>
                <body>
                    <h1>Daftar Hadir Peserta</h1>
                    <p>${data.course?.title || ''}</p>
                    <div class="stats">
                        <div class="stat">Total Peserta<strong>${data.count}</strong></div>
                        <div class="stat">Hadir<strong>${data.present_count}</strong></div>
                        <div class="stat">Persentase<strong>${attendancePercentage}%</strong></div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Peserta</th>
                                <th>Email</th>
                                <th>Pre-Test</th>
                                <th>Post-Test</th>
                                <th>Presensi</th>
                                <th>Waktu Hadir</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-t border-gray-100 pt-8 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-200">
                    <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Daftar Hadir Peserta</h2>
                    <p className="text-sm text-gray-500">
                        Peserta dianggap hadir setelah mengerjakan pre-test dan post-test pada course ini.
                    </p>
                </div>
            </div>

            {data && (!data.requirements.has_pre_test || !data.requirements.has_post_test) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Presensi otomatis membutuhkan pre-test dan post-test. Saat ini course belum memiliki keduanya secara lengkap.
                </div>
            )}

            <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Total Peserta</p>
                    <p className="mt-2 text-2xl font-black text-gray-900">{loading ? '...' : data?.count ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">Hadir</p>
                    <p className="mt-2 text-2xl font-black text-emerald-800">{loading ? '...' : data?.present_count ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">Belum Hadir</p>
                    <p className="mt-2 text-2xl font-black text-amber-800">{loading ? '...' : data?.absent_count ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-600">Kehadiran</p>
                    <p className="mt-2 text-2xl font-black text-sky-800">{loading ? '...' : `${attendancePercentage}%`}</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'all', label: 'Semua' },
                            { key: 'present', label: 'Hadir' },
                            { key: 'absent', label: 'Belum Hadir' },
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setFilter(item.key as 'all' | 'present' | 'absent')}
                                className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition ${
                                    filter === item.key
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={exportToExcel}
                            disabled={loading || !data || data.results.length === 0}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Export Excel
                        </button>
                        <button
                            type="button"
                            onClick={exportToPdf}
                            disabled={loading || !data || data.results.length === 0}
                            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FileText className="h-4 w-4" />
                            Export PDF
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="px-6 py-3 text-left">Peserta</th>
                                <th className="px-6 py-3 text-left">Pre-Test</th>
                                <th className="px-6 py-3 text-left">Post-Test</th>
                                <th className="px-6 py-3 text-left">Presensi</th>
                                <th className="px-6 py-3 text-left">Waktu Hadir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Memuat daftar hadir peserta...</td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-red-500">{error}</td>
                                </tr>
                            ) : !data || filteredResults.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Tidak ada peserta yang cocok dengan filter saat ini.</td>
                                </tr>
                            ) : filteredResults.map((item) => (
                                <tr key={item.order_id} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{item.user_name}</div>
                                        <div className="mt-1 text-xs text-gray-500">{item.email || '-'}</div>
                                        <div className="mt-1 text-xs text-gray-400">
                                            Terdaftar {formatDateTime(item.enrolled_at)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {item.pre_test_completed ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-amber-500" />
                                            )}
                                            <span className="text-sm font-semibold text-gray-900">
                                                {item.pre_test_completed ? (item.pre_test_score != null ? `${Math.round(item.pre_test_score)}%` : 'Selesai') : 'Belum'}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">{formatDateTime(item.pre_test_completed_at)}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {item.post_test_completed ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-amber-500" />
                                            )}
                                            <span className="text-sm font-semibold text-gray-900">
                                                {item.post_test_completed ? (item.post_test_score != null ? `${Math.round(item.post_test_score)}%` : 'Selesai') : 'Belum'}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">{formatDateTime(item.post_test_completed_at)}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${item.is_present ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {item.is_present ? 'Hadir' : 'Belum Hadir'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {formatDateTime(item.attended_at)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

