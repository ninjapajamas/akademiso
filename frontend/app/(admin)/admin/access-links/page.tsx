'use client';

import { Fragment, useEffect, useState } from 'react';
import { Copy, KeyRound, Link2, Plus, Power, Trash2, Users } from 'lucide-react';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';
import { getClientApiBaseUrl } from '@/utils/api';

type StudentAccessLinkClaim = {
    id: number;
    username: string;
    email: string;
    full_name: string;
    created_at: string;
};

type StudentAccessLink = {
    id: number;
    name: string;
    description: string;
    token: string;
    max_uses: number | null;
    used_count: number;
    remaining_uses: number | null;
    expires_at: string | null;
    redirect_path: string;
    is_active: boolean;
    claim_path: string;
    claims: StudentAccessLinkClaim[];
    created_at: string;
};

const emptyForm = {
    name: '',
    description: '',
    max_uses: '',
    expires_at: '',
    redirect_path: '/dashboard/settings?welcome=1&claimed=1',
};

export default function StudentAccessLinksPage() {
    const apiUrl = getClientApiBaseUrl();
    const token = () => localStorage.getItem('access_token');
    const [links, setLinks] = useState<StudentAccessLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const { showError, showSuccess, confirmAction } = useFeedbackModal();
    const frontendOrigin = typeof window === 'undefined' ? '' : window.location.origin;

    const fetchLinks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/student-access-links/`, {
                headers: {
                    Authorization: `Bearer ${token()}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                setLinks(Array.isArray(data) ? data : data.results || []);
            } else {
                await showError('Daftar link akses belum bisa dimuat.', 'Memuat Gagal');
            }
        } catch (error) {
            console.error(error);
            await showError('Terjadi kendala koneksi saat memuat link akses.', 'Koneksi Bermasalah');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchLinks();
    }, []);

    const handleCreate = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim(),
                max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
                expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
                redirect_path: form.redirect_path.trim() || '/dashboard/settings?welcome=1&claimed=1',
            };

            const res = await fetch(`${apiUrl}/api/student-access-links/`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setForm(emptyForm);
                setShowCreateForm(false);
                await fetchLinks();
                await showSuccess('Link akses student berhasil dibuat.', 'Link Dibuat');
            } else {
                const data = await res.json().catch(() => null);
                await showError(JSON.stringify(data || { error: 'Gagal membuat link akses.' }), 'Pembuatan Gagal');
            }
        } catch (error) {
            console.error(error);
            await showError('Terjadi kendala koneksi saat membuat link akses.', 'Koneksi Bermasalah');
        } finally {
            setSaving(false);
        }
    };

    const handleCopyLink = async (link: StudentAccessLink) => {
        const fullUrl = `${frontendOrigin}${link.claim_path}`;
        try {
            await navigator.clipboard.writeText(fullUrl);
            await showSuccess(`Link berhasil disalin:\n${fullUrl}`, 'Link Disalin');
        } catch {
            await showError(fullUrl, 'Salin Manual Link Ini');
        }
    };

    const toggleActive = async (link: StudentAccessLink) => {
        try {
            const res = await fetch(`${apiUrl}/api/student-access-links/${link.id}/`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_active: !link.is_active }),
            });

            if (res.ok) {
                await fetchLinks();
                await showSuccess(
                    !link.is_active ? 'Link akses berhasil diaktifkan kembali.' : 'Link akses berhasil dinonaktifkan.',
                    'Status Diperbarui'
                );
            } else {
                await showError('Status link akses belum bisa diubah.', 'Perubahan Gagal');
            }
        } catch (error) {
            console.error(error);
            await showError('Terjadi kendala koneksi saat mengubah status link.', 'Koneksi Bermasalah');
        }
    };

    const handleDelete = async (link: StudentAccessLink) => {
        const confirmed = await confirmAction({
            title: `Hapus link "${link.name}"?`,
            message: 'Riwayat klaim pada link ini juga akan ikut hilang.',
            confirmLabel: 'Ya, Hapus',
            cancelLabel: 'Batal',
            tone: 'warning',
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`${apiUrl}/api/student-access-links/${link.id}/`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (res.ok) {
                await fetchLinks();
                await showSuccess('Link akses berhasil dihapus.', 'Link Dihapus');
            } else {
                await showError('Link akses belum bisa dihapus.', 'Penghapusan Gagal');
            }
        } catch (error) {
            console.error(error);
            await showError('Terjadi kendala koneksi saat menghapus link.', 'Koneksi Bermasalah');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Student Access Links</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Generate link yang otomatis membuat akun student baru saat dibuka. Cocok untuk peserta inhouse atau onboarding massal.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowCreateForm((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    Buat Link Akses
                </button>
            </div>

            {showCreateForm && (
                <form onSubmit={handleCreate} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Nama Link</label>
                            <input
                                required
                                value={form.name}
                                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                placeholder="Contoh: Peserta Inhouse Batch Mei"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Batas Klik / Akun</label>
                            <input
                                type="number"
                                min={1}
                                value={form.max_uses}
                                onChange={(event) => setForm((current) => ({ ...current, max_uses: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                placeholder="Kosongkan jika tanpa batas"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Masa Berlaku Sampai</label>
                            <input
                                type="datetime-local"
                                value={form.expires_at}
                                onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Redirect Setelah Klaim</label>
                            <input
                                value={form.redirect_path}
                                onChange={(event) => setForm((current) => ({ ...current, redirect_path: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                placeholder="/dashboard/settings?welcome=1&claimed=1"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Catatan</label>
                        <textarea
                            rows={3}
                            value={form.description}
                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            placeholder="Contoh: Link ini dipakai untuk 100 peserta seminar internal."
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setShowCreateForm(false);
                                setForm(emptyForm);
                            }}
                            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {saving ? 'Membuat...' : 'Simpan Link'}
                        </button>
                    </div>
                </form>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="px-5 py-3">Link</th>
                                <th className="px-5 py-3">Kuota</th>
                                <th className="px-5 py-3">Masa Berlaku</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">Memuat link akses...</td>
                                </tr>
                            ) : links.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">Belum ada link akses student yang dibuat.</td>
                                </tr>
                            ) : links.map((link) => (
                                <Fragment key={link.id}>
                                    <tr className="align-top">
                                        <td className="px-5 py-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                                    <Link2 className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{link.name}</div>
                                                    <div className="mt-1 text-xs text-gray-500 break-all">{frontendOrigin}{link.claim_path}</div>
                                                    {link.description && (
                                                        <p className="mt-2 text-sm text-gray-500">{link.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            <div className="font-semibold">
                                                {link.used_count} terpakai
                                                {link.max_uses != null ? ` / ${link.max_uses}` : ' / tanpa batas'}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                Sisa: {link.remaining_uses == null ? 'Tidak dibatasi' : link.remaining_uses}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            {link.expires_at ? new Date(link.expires_at).toLocaleString('id-ID') : 'Tidak dibatasi'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                                link.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {link.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedId((current) => current === link.id ? null : link.id)}
                                                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                                                >
                                                    <Users className="mr-1 inline h-3.5 w-3.5" />
                                                    Akun
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyLink(link)}
                                                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                                                >
                                                    <Copy className="mr-1 inline h-3.5 w-3.5" />
                                                    Copy
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleActive(link)}
                                                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50"
                                                >
                                                    <Power className="mr-1 inline h-3.5 w-3.5" />
                                                    {link.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(link)}
                                                    className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedId === link.id && (
                                        <tr>
                                            <td colSpan={5} className="bg-gray-50 px-5 py-4">
                                                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                                                        <KeyRound className="h-4 w-4 text-blue-600" />
                                                        Akun yang Dihasilkan
                                                    </div>
                                                    {link.claims.length === 0 ? (
                                                        <p className="text-sm text-gray-500">Belum ada akun student yang dibuat dari link ini.</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {link.claims.map((claim) => (
                                                                <div key={claim.id} className="flex flex-col gap-1 rounded-xl border border-gray-100 px-3 py-3 text-sm text-gray-700 md:flex-row md:items-center md:justify-between">
                                                                    <div>
                                                                        <div className="font-semibold text-gray-900">{claim.username}</div>
                                                                        <div className="text-xs text-gray-500">{claim.email || 'Belum isi email'} • {claim.full_name}</div>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {new Date(claim.created_at).toLocaleString('id-ID')}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
