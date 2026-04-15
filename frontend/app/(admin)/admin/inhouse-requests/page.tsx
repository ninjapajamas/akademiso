'use client';

import { useEffect, useState } from 'react';
import { BriefcaseBusiness, Building2, Mail, Phone } from 'lucide-react';
import { InhouseTrainingRequest } from '@/types';

const STATUS_OPTIONS: Array<{ value: InhouseTrainingRequest['status']; label: string }> = [
    { value: 'new', label: 'Baru' },
    { value: 'contacted', label: 'Sudah Dihubungi' },
    { value: 'quoted', label: 'Penawaran Dikirim' },
    { value: 'closed', label: 'Selesai' },
];

const statusClassName: Record<InhouseTrainingRequest['status'], string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-amber-100 text-amber-700',
    quoted: 'bg-violet-100 text-violet-700',
    closed: 'bg-emerald-100 text-emerald-700',
};

export default function InhouseRequestsPage() {
    const [requests, setRequests] = useState<InhouseTrainingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/inhouse-requests/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            setRequests(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch inhouse requests:', error);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const updateStatus = async (requestId: number, status: InhouseTrainingRequest['status']) => {
        setSavingId(requestId);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/inhouse-requests/${requestId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (!res.ok) {
                throw new Error('Failed to update status');
            }

            setRequests(prev => prev.map(item => item.id === requestId ? { ...item, status } : item));
        } catch (error) {
            console.error('Failed to update inhouse request status:', error);
            alert('Gagal memperbarui status request inhouse.');
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <BriefcaseBusiness className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inhouse Requests</h1>
                    <p className="text-sm text-gray-500">Kelola lead dari form inhouse training yang masuk dari halaman detail pelatihan.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-[1080px] w-full">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-6 py-4 text-left font-bold">Pelatihan</th>
                                <th className="px-6 py-4 text-left font-bold">Perusahaan</th>
                                <th className="px-6 py-4 text-left font-bold">Kontak</th>
                                <th className="px-6 py-4 text-left font-bold">Kebutuhan</th>
                                <th className="px-6 py-4 text-left font-bold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">Memuat request inhouse...</td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">Belum ada request inhouse yang masuk.</td>
                                </tr>
                            ) : requests.map((request) => (
                                <tr key={request.id} className="align-top">
                                    <td className="px-6 py-5">
                                        <div className="font-semibold text-gray-900">{request.course_title || `Course #${request.course}`}</div>
                                        <div className="mt-2 text-xs text-gray-500">
                                            Masuk {new Date(request.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-start gap-2 text-sm text-gray-700">
                                            <Building2 className="w-4 h-4 mt-0.5 text-gray-400" />
                                            <div>
                                                <div className="font-semibold text-gray-900">{request.company_name}</div>
                                                <div className="text-gray-500">{request.position || 'Jabatan belum diisi'}</div>
                                                <div className="mt-2 text-xs text-gray-500">
                                                    {request.participants_count} peserta • {request.preferred_mode.toUpperCase()}
                                                    {request.target_date ? ` • Target ${new Date(request.target_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="font-semibold text-gray-900">{request.contact_name}</div>
                                        <div className="mt-2 space-y-2 text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <span>{request.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                <span>{request.phone}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{request.training_goals}</p>
                                        {request.notes && (
                                            <p className="mt-3 text-xs text-gray-500 whitespace-pre-line">Catatan: {request.notes}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="space-y-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusClassName[request.status]}`}>
                                                {STATUS_OPTIONS.find(option => option.value === request.status)?.label || request.status}
                                            </span>
                                            <select
                                                value={request.status}
                                                onChange={(e) => updateStatus(request.id, e.target.value as InhouseTrainingRequest['status'])}
                                                disabled={savingId === request.id}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50"
                                            >
                                                {STATUS_OPTIONS.map(option => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>
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
