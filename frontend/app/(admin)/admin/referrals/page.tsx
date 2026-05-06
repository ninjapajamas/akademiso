'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Pencil, RefreshCw, Tags, UserCheck, XCircle } from 'lucide-react';

type ReferralCodeItem = {
    id: number;
    code: string;
    label?: string;
    description?: string;
    discount_type: 'percent' | 'fixed';
    discount_value: string;
    is_active: boolean;
    valid_until?: string | null;
    max_uses?: number | null;
    usage_count?: number;
    owner_name?: string | null;
};

type AffiliateApplication = {
    user_id: number;
    username: string;
    full_name: string;
    email: string;
    affiliate_status: 'pending' | 'approved' | 'rejected';
    affiliate_requested_at?: string | null;
    affiliate_review_notes?: string;
    personal_referral_code?: string;
    affiliate_commission_total?: number;
    referred_completed_orders?: number;
};

type CodeStatusFilter = 'all' | 'active' | 'inactive' | 'affiliate' | 'general';
type ApplicationStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const discountTypeOptions = [
    { value: 'percent', label: 'Persen' },
    { value: 'fixed', label: 'Nominal' },
] as const;

const initialForm = {
    code: '',
    label: '',
    description: '',
    discount_type: 'percent',
    discount_value: '10',
    max_uses: '',
    valid_until: '',
    is_active: true,
};

export default function AdminReferralsPage() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const [codes, setCodes] = useState<ReferralCodeItem[]>([]);
    const [applications, setApplications] = useState<AffiliateApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingCodeId, setEditingCodeId] = useState<number | null>(null);
    const [reviewingUserId, setReviewingUserId] = useState<number | null>(null);
    const [codeStatusFilter, setCodeStatusFilter] = useState<CodeStatusFilter>('all');
    const [applicationStatusFilter, setApplicationStatusFilter] = useState<ApplicationStatusFilter>('all');
    const [form, setForm] = useState(initialForm);

    const resetForm = useCallback(() => {
        setForm(initialForm);
        setEditingCodeId(null);
    }, []);

    const pendingApplications = useMemo(
        () => applications.filter((item) => item.affiliate_status === 'pending'),
        [applications]
    );

    const filteredCodes = useMemo(() => {
        return codes.filter((item) => {
            if (codeStatusFilter === 'active') return item.is_active;
            if (codeStatusFilter === 'inactive') return !item.is_active;
            if (codeStatusFilter === 'affiliate') return Boolean(item.owner_name);
            if (codeStatusFilter === 'general') return !item.owner_name;
            return true;
        });
    }, [codes, codeStatusFilter]);

    const filteredApplications = useMemo(() => {
        if (applicationStatusFilter === 'all') {
            return applications;
        }
        return applications.filter((item) => item.affiliate_status === applicationStatusFilter);
    }, [applications, applicationStatusFilter]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const [codesRes, appsRes] = await Promise.all([
                fetch(`${apiUrl}/api/referrals/`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${apiUrl}/api/affiliate-applications/`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            if (codesRes.ok) {
                const codeData = await codesRes.json();
                setCodes(Array.isArray(codeData) ? codeData : codeData.results || []);
            }

            if (appsRes.ok) {
                const appData = await appsRes.json();
                setApplications(Array.isArray(appData) ? appData : []);
            }
        } catch (error) {
            console.error('Gagal memuat referral:', error);
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        void fetchAll();
    }, [fetchAll]);

    const handleCreateOrUpdateCode = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('access_token');
            const payload = {
                code: form.code.trim(),
                label: form.label.trim(),
                description: form.description.trim(),
                discount_type: form.discount_type,
                discount_value: form.discount_value,
                max_uses: form.max_uses ? Number(form.max_uses) : null,
                valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
                is_active: form.is_active,
            };
            const targetUrl = editingCodeId ? `${apiUrl}/api/referrals/${editingCodeId}/` : `${apiUrl}/api/referrals/`;
            const res = await fetch(targetUrl, {
                method: editingCodeId ? 'PATCH' : 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                resetForm();
                await fetchAll();
            } else {
                const data = await res.json();
                alert(data.code?.[0] || data.discount_value?.[0] || data.detail || 'Gagal menyimpan kode referral.');
            }
        } catch (error) {
            console.error('Gagal menyimpan kode referral:', error);
            alert('Terjadi kendala saat menyimpan kode referral.');
        } finally {
            setSaving(false);
        }
    };

    const startEditCode = (item: ReferralCodeItem) => {
        setEditingCodeId(item.id);
        setForm({
            code: item.code,
            label: item.label || '',
            description: item.description || '',
            discount_type: item.discount_type,
            discount_value: item.discount_value,
            max_uses: item.max_uses ? String(item.max_uses) : '',
            valid_until: item.valid_until ? new Date(item.valid_until).toISOString().slice(0, 16) : '',
            is_active: item.is_active,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleCodeStatus = async (item: ReferralCodeItem) => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${apiUrl}/api/referrals/${item.id}/`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_active: !item.is_active }),
            });

            if (res.ok) {
                await fetchAll();
            } else {
                const data = await res.json();
                alert(data.detail || 'Gagal memperbarui status kode referral.');
            }
        } catch (error) {
            console.error('Gagal mengubah status referral:', error);
            alert('Terjadi kendala saat mengubah status kode referral.');
        }
    };

    const reviewApplication = async (userId: number, action: 'approve' | 'reject') => {
        const note = window.prompt(
            action === 'approve'
                ? 'Catatan untuk affiliator ini (opsional):'
                : 'Alasan penolakan affiliator ini:'
        ) || '';

        setReviewingUserId(userId);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${apiUrl}/api/affiliate-applications/${userId}/`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action, note }),
            });

            if (res.ok) {
                await fetchAll();
            } else {
                const data = await res.json();
                alert(data.detail || 'Gagal memperbarui status affiliator.');
            }
        } catch (error) {
            console.error('Gagal review affiliator:', error);
            alert('Terjadi kendala saat memproses pengajuan affiliator.');
        } finally {
            setReviewingUserId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-white">
                <h1 className="text-3xl font-bold">Referral & Affiliator</h1>
                <p className="mt-2 max-w-3xl text-sm text-emerald-50">
                    Admin dapat membuat kode referral promosi, memfilter status kode, mengedit parameter promo, dan meninjau pengajuan affiliator dari siswa.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Kode Referral</p>
                    <p className="mt-2 text-3xl font-black text-gray-900">{codes.length}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pengajuan Pending</p>
                    <p className="mt-2 text-3xl font-black text-amber-600">{pendingApplications.length}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Affiliator Aktif</p>
                    <p className="mt-2 text-3xl font-black text-emerald-700">
                        {applications.filter((item) => item.affiliate_status === 'approved').length}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{editingCodeId ? 'Edit Kode Referral' : 'Buat Kode Referral'}</h2>
                            <p className="text-sm text-gray-500">
                                {editingCodeId
                                    ? 'Perbarui status aktif, masa berlaku, dan nilai diskon referral.'
                                    : 'Kosongkan kode jika ingin dibuat otomatis oleh sistem.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void fetchAll()}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                    </div>

                    <form onSubmit={handleCreateOrUpdateCode} className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Kode</label>
                            <input
                                value={form.code}
                                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50"
                                placeholder="Otomatis jika kosong"
                                disabled={editingCodeId !== null}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Label</label>
                            <input
                                value={form.label}
                                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-100"
                                placeholder="Promo Mei / Referal Partner"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Deskripsi</label>
                            <textarea
                                value={form.description}
                                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                rows={3}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-100"
                                placeholder="Keterangan singkat tujuan kode referral ini."
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Jenis Diskon</label>
                            <select
                                value={form.discount_type}
                                onChange={(event) => setForm((current) => ({ ...current, discount_type: event.target.value as 'percent' | 'fixed' }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-100"
                            >
                                {discountTypeOptions.map((item) => (
                                    <option key={item.value} value={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Nilai Diskon</label>
                            <input
                                value={form.discount_value}
                                onChange={(event) => setForm((current) => ({ ...current, discount_value: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-100"
                                placeholder={form.discount_type === 'percent' ? '10' : '50000'}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Maksimal Penggunaan</label>
                            <input
                                value={form.max_uses}
                                onChange={(event) => setForm((current) => ({ ...current, max_uses: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-100"
                                placeholder="Kosongkan jika tanpa batas"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Berlaku Sampai</label>
                            <input
                                type="datetime-local"
                                value={form.valid_until}
                                onChange={(event) => setForm((current) => ({ ...current, valid_until: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-100"
                            />
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                            <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                Kode aktif
                            </label>
                            <div className="flex items-center gap-2">
                                {editingCodeId !== null && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                                    >
                                        Batal
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {saving ? 'Menyimpan...' : editingCodeId ? 'Simpan Perubahan' : 'Simpan Kode'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                                <UserCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Pengajuan Affiliator</h2>
                                <p className="text-sm text-gray-500">Review siswa yang ingin mendapatkan kode referral pribadi.</p>
                            </div>
                        </div>
                        <select
                            value={applicationStatusFilter}
                            onChange={(event) => setApplicationStatusFilter(event.target.value as ApplicationStatusFilter)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-amber-100"
                        >
                            <option value="all">Semua Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                                Memuat data affiliator...
                            </div>
                        ) : filteredApplications.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                                Tidak ada pengajuan affiliator pada filter ini.
                            </div>
                        ) : filteredApplications.map((item) => (
                            <div key={item.user_id} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-gray-900">{item.full_name}</p>
                                        <p className="text-sm text-gray-500">@{item.username} • {item.email}</p>
                                        <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                                            item.affiliate_status === 'pending'
                                                ? 'bg-amber-100 text-amber-800'
                                                : item.affiliate_status === 'approved'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-rose-100 text-rose-800'
                                        }`}>
                                            {item.affiliate_status}
                                        </p>
                                    </div>
                                    {item.personal_referral_code && (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
                                            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Kode Pribadi</p>
                                            <p className="mt-1 text-sm font-black tracking-[0.12em] text-emerald-900">{item.personal_referral_code}</p>
                                        </div>
                                    )}
                                </div>
                                {item.affiliate_review_notes && (
                                    <p className="mt-3 text-sm text-gray-600">{item.affiliate_review_notes}</p>
                                )}
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                                        Order sukses: {item.referred_completed_orders || 0}
                                    </span>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                                        Komisi: Rp {Number(item.affiliate_commission_total || 0).toLocaleString('id-ID')}
                                    </span>
                                </div>
                                {item.affiliate_status === 'pending' && (
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => reviewApplication(item.user_id, 'approve')}
                                            disabled={reviewingUserId === item.user_id}
                                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            Setujui
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => reviewApplication(item.user_id, 'reject')}
                                            disabled={reviewingUserId === item.user_id}
                                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Tolak
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <Tags className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Daftar Kode Referral</h2>
                            <p className="text-sm text-gray-500">Filter kode aktif, nonaktif, milik affiliator, atau promo umum dalam satu tampilan.</p>
                        </div>
                    </div>
                    <select
                        value={codeStatusFilter}
                        onChange={(event) => setCodeStatusFilter(event.target.value as CodeStatusFilter)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="all">Semua Kode</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                        <option value="affiliate">Milik Affiliator</option>
                        <option value="general">Promo Umum</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px]">
                        <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Kode</th>
                                <th className="px-4 py-3">Label</th>
                                <th className="px-4 py-3">Diskon</th>
                                <th className="px-4 py-3">Pemilik</th>
                                <th className="px-4 py-3">Penggunaan</th>
                                <th className="px-4 py-3">Berlaku Sampai</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Memuat kode referral...</td>
                                </tr>
                            ) : filteredCodes.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Tidak ada kode referral pada filter ini.</td>
                                </tr>
                            ) : filteredCodes.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 font-black tracking-[0.14em] text-gray-900">{item.code}</td>
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-gray-900">{item.label || '-'}</p>
                                        {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-emerald-700">
                                        {item.discount_type === 'percent' ? `${item.discount_value}%` : `Rp ${Number(item.discount_value).toLocaleString('id-ID')}`}
                                    </td>
                                    <td className="px-4 py-3">{item.owner_name || 'Promo Umum'}</td>
                                    <td className="px-4 py-3">
                                        {item.usage_count || 0}{item.max_uses ? ` / ${item.max_uses}` : ''}
                                    </td>
                                    <td className="px-4 py-3">{item.valid_until ? new Date(item.valid_until).toLocaleString('id-ID') : 'Tanpa batas'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                                            item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                                        }`}>
                                            {item.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => startEditCode(item)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void toggleCodeStatus(item)}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                                                    item.is_active
                                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                }`}
                                            >
                                                {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                            </button>
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
