'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';
import {
    Plus, Search, Edit3, Trash2, KeyRound, LogIn, X, CheckCircle, XCircle,
    AlertTriangle, FileText, Clock3, Eye, EyeOff
} from 'lucide-react';

interface InstructorData {
    id: number;
    user: number | null;
    user_email?: string | null;
    user_username?: string | null;
    name: string;
    title: string;
    bio: string;
    expertise_areas?: string[];
    photo: string | null;
    signature_image?: string | null;
    cv?: string | null;
    approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejection_reason?: string | null;
    approved_at?: string | null;
    approved_by_name?: string | null;
}

type InstructorFormState = {
    name: string;
    title: string;
    bio: string;
    expertise_areas: string[];
    photo: File | null;
    signature_image: File | null;
    cv: File | null;
};

interface CategoryOption {
    id: number;
    name: string;
}

const emptyFormData = (): InstructorFormState => ({
    name: '',
    title: '',
    bio: '',
    expertise_areas: [],
    photo: null,
    signature_image: null,
    cv: null,
});

type Modal =
    | null
    | { type: 'add' }
    | { type: 'edit'; instructor: InstructorData }
    | { type: 'reset-pw'; instructor: InstructorData }
    | { type: 'hijack'; instructor: InstructorData };

export default function InstructorsPage() {
    const router = useRouter();
    const [instructors, setInstructors] = useState<InstructorData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [modal, setModal] = useState<Modal>(null);
    const [saving, setSaving] = useState(false);

    // Form states
    const [formData, setFormData] = useState<InstructorFormState>(emptyFormData);
    const [newPassword, setNewPassword] = useState('');
    const [showResetPw, setShowResetPw] = useState(false);
    const { confirmAction, promptAction, showError, showSuccess } = useFeedbackModal();

    const token = () => localStorage.getItem('access_token');
    const apiUrl = getClientApiBaseUrl();

    const fetchInstructors = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/instructors/`, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInstructors(data);
            }

            const categoryRes = await fetch(`${apiUrl}/api/categories/`);
            if (categoryRes.ok) {
                setCategories(await categoryRes.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    const openCreateModal = () => {
        setFormData(emptyFormData());
        setModal({ type: 'add' });
    };

    const openEditModal = (instructor: InstructorData) => {
        setFormData({
            name: instructor.name,
            title: instructor.title,
            bio: instructor.bio,
            expertise_areas: instructor.expertise_areas || [],
            photo: null,
            signature_image: null,
            cv: null,
        });
        setModal({ type: 'edit', instructor });
    };

    const handleDelete = async (id: number, name: string) => {
        const shouldDelete = await confirmAction({
            title: `Hapus Trainer "${name}"?`,
            message: 'Tindakan ini tidak bisa dibatalkan.',
            confirmLabel: 'Ya, Hapus',
            cancelLabel: 'Batal',
            tone: 'warning',
        });
        if (!shouldDelete) return;

        try {
            const res = await fetch(`${apiUrl}/api/instructors/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token()}` }
            });

            if (res.ok) {
                await fetchInstructors();
                await showSuccess(`Trainer ${name} berhasil dihapus.`, 'Penghapusan Berhasil');
            } else {
                await showError('Trainer belum bisa dihapus.', 'Penghapusan Gagal');
            }
        } catch (error) {
            console.error('Error deleting:', error);
            await showError('Terjadi kesalahan saat menghapus trainer.', 'Koneksi Bermasalah');
        }
    };

    const handleReview = async (instructor: InstructorData, action: 'approve' | 'reject') => {
        const reason = action === 'reject'
            ? await promptAction({
                title: `Tolak Pengajuan ${instructor.name}`,
                message: 'Tuliskan alasan penolakan agar trainer tahu apa yang perlu diperbaiki.',
                tone: 'warning',
                confirmLabel: 'Kirim Penolakan',
                cancelLabel: 'Batal',
                initialValue: instructor.rejection_reason || '',
                placeholder: 'Contoh: lengkapi pengalaman kerja, sertifikat, atau deskripsi profil.',
                multiline: true,
            })
            : '';

        if (action === 'reject' && reason === null) return;

        setSaving(true);
        try {
            const res = await fetch(`${apiUrl}/api/instructors/${instructor.id}/${action}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
                body: JSON.stringify({ reason }),
            });

            if (res.ok) {
                await fetchInstructors();
                await showSuccess(
                    action === 'approve' ? 'Trainer berhasil disetujui.' : 'Pengajuan trainer berhasil ditolak.',
                    action === 'approve' ? 'Persetujuan Berhasil' : 'Penolakan Berhasil'
                );
            } else {
                const err = await res.json();
                await showError(JSON.stringify(err) || 'Gagal memproses pengajuan.', 'Proses Pengajuan Gagal');
            }
        } catch (error) {
            console.error('Error reviewing instructor:', error);
            await showError('Terjadi kesalahan saat memproses pengajuan.', 'Koneksi Bermasalah');
        } finally {
            setSaving(false);
        }
    };

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modal) return;
        setSaving(true);

        try {
            let res;
            if (modal.type === 'add') {
                const payload = new FormData();
                payload.append('name', formData.name);
                payload.append('title', formData.title);
                payload.append('bio', formData.bio);
                payload.append('expertise_areas', JSON.stringify(formData.expertise_areas));
                if (formData.photo) payload.append('photo', formData.photo);
                if (formData.signature_image) payload.append('signature_image', formData.signature_image);
                if (formData.cv) payload.append('cv', formData.cv);
                res = await fetch(`${apiUrl}/api/instructors/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token()}` },
                    body: payload,
                });
            } else if (modal.type === 'edit') {
                const payload = new FormData();
                payload.append('name', formData.name);
                payload.append('title', formData.title);
                payload.append('bio', formData.bio);
                payload.append('expertise_areas', JSON.stringify(formData.expertise_areas));
                if (formData.photo) payload.append('photo', formData.photo);
                if (formData.signature_image) payload.append('signature_image', formData.signature_image);
                if (formData.cv) payload.append('cv', formData.cv);
                res = await fetch(`${apiUrl}/api/instructors/${modal.instructor.id}/`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token()}` },
                    body: payload,
                });
            } else if (modal.type === 'reset-pw') {
                if (!modal.instructor.user) throw new Error('Trainer tidak memiliki user terkait.');
                res = await fetch(`${apiUrl}/api/users/${modal.instructor.user}/reset-password/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
                    body: JSON.stringify({ new_password: newPassword }),
                });
            }

            if (res?.ok) {
                setModal(null);
                await fetchInstructors();
                await showSuccess('Perubahan data trainer berhasil disimpan.', 'Perubahan Tersimpan');
            } else {
                const err = await res?.json();
                await showError(JSON.stringify(err) || 'Terjadi kesalahan.', 'Operasi Gagal');
            }
        } catch (err: unknown) {
            await showError(err instanceof Error ? err.message : 'Terjadi kesalahan.', 'Operasi Gagal');
        } finally {
            setSaving(false);
        }
    };

    const handleHijack = async () => {
        if (modal?.type !== 'hijack') return;
        if (!modal.instructor.user) {
            await showError('Trainer tidak memiliki user terkait.', 'Impersonasi Gagal');
            return;
        }
        setSaving(true);
        const res = await fetch(`${apiUrl}/api/users/${modal.instructor.user}/impersonate/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
        });
        setSaving(false);
        if (res.ok) {
            const data = await res.json();
            const originalAccess = localStorage.getItem('access_token');
            const originalRefresh = localStorage.getItem('refresh_token');
            if (originalAccess) localStorage.setItem('admin_original_access', originalAccess);
            if (originalRefresh) localStorage.setItem('admin_original_refresh', originalRefresh);
            localStorage.setItem('admin_hijack_user', data.username);
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            setModal(null);
            await showSuccess(`Login sebagai ${data.username} berhasil. Anda akan segera dialihkan.`, 'Impersonasi Aktif');
            setTimeout(() => router.push('/dashboard'), 1500);
        } else {
            const err = await res.json();
            await showError(err.error || 'Gagal melakukan impersonasi.', 'Impersonasi Gagal');
        }
    };

    useEffect(() => {
        void fetchInstructors();
    }, [fetchInstructors]);

    const filtered = instructors.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        (i.user_email || '').toLowerCase().includes(search.toLowerCase())
    );

    const pendingCount = instructors.filter(i => i.approval_status === 'PENDING').length;
    const getFileUrl = (url?: string | null) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `${apiUrl}${url}`;
    };
    const getStatusMeta = (status: InstructorData['approval_status']) => {
        if (status === 'APPROVED') return { label: 'Disetujui', cls: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle };
        if (status === 'REJECTED') return { label: 'Ditolak', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle };
        return { label: 'Menunggu', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock3 };
    };

    const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none';
    const fileInputCls = 'block w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-700';
    const toggleExpertiseArea = (name: string) => {
        setFormData((current) => ({
            ...current,
            expertise_areas: current.expertise_areas.includes(name)
                ? current.expertise_areas.filter((item) => item !== name)
                : [...current.expertise_areas, name],
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Trainer</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {instructors.length} trainer terdaftar. {pendingCount > 0 ? `${pendingCount} menunggu approval.` : 'Tidak ada pengajuan pending.'}
                    </p>
                </div>
                <button onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                    <Plus className="w-4 h-4" /> Tambah Trainer
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cari nama atau gelar..."
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100 outline-none" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">
                        <tr>
                            <th className="px-5 py-3">Trainer</th>
                            <th className="px-5 py-3">Gelar</th>
                            <th className="px-5 py-3">Bidang</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">CV</th>
                            <th className="px-5 py-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-black">
                        {loading ? (
                            <tr><td colSpan={6} className="py-10 text-center text-gray-400">Memuat...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="py-10 text-center text-gray-400">Tidak ada trainer ditemukan.</td></tr>
                        ) : filtered.map(i => {
                            const status = getStatusMeta(i.approval_status);
                            const StatusIcon = status.icon;

                            return (
                                <tr key={i.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {i.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="block text-sm font-bold text-gray-900">{i.name}</span>
                                                <span className="block text-xs text-gray-400">{i.user_email || i.user_username || '-'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600">{i.title}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex max-w-[220px] flex-wrap gap-1.5">
                                            {(i.expertise_areas || []).length > 0 ? (i.expertise_areas || []).slice(0, 3).map((area) => (
                                                <span key={area} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                                                    {area}
                                                </span>
                                            )) : <span className="text-sm text-gray-400">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${status.cls}`}>
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        {i.cv ? (
                                            <a
                                                href={getFileUrl(i.cv)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700"
                                            >
                                                <FileText className="w-4 h-4" />
                                                Lihat
                                            </a>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-center gap-1">
                                            {i.approval_status !== 'APPROVED' && (
                                                <button onClick={() => handleReview(i, 'approve')} disabled={saving}
                                                    title="Approve" className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50">
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            {i.approval_status !== 'REJECTED' && (
                                                <button onClick={() => handleReview(i, 'reject')} disabled={saving}
                                                    title="Reject" className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button onClick={() => openEditModal(i)}
                                                title="Edit Data" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => { setNewPassword(''); setShowResetPw(false); setModal({ type: 'reset-pw', instructor: i }); }}
                                                title="Reset Password" className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg">
                                                <KeyRound className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setModal({ type: 'hijack', instructor: i })}
                                                title="Login Sebagai" className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg">
                                                <LogIn className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(i.id, i.name)}
                                                title="Hapus" className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        {modal.type === 'add' || modal.type === 'edit' ? (
                            <form onSubmit={handleAction} className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-lg text-gray-900">{modal.type === 'add' ? 'Tambah Trainer' : 'Edit Trainer'}</h2>
                                    <button type="button" onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                                    <input required className={inputCls} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Gelar / Jabatan</label>
                                    <input required className={inputCls} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Bio</label>
                                    <textarea required className={inputCls + ' h-24'} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} /></div>
                                <div>
                                    <label className="mb-2 block text-xs font-semibold text-gray-700">Bidang Trainer</label>
                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map((category) => {
                                                const active = formData.expertise_areas.includes(category.name);
                                                return (
                                                    <button
                                                        key={category.id}
                                                        type="button"
                                                        onClick={() => toggleExpertiseArea(category.name)}
                                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-blue-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'}`}
                                                    >
                                                        {category.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="mt-3 text-xs text-gray-500">Pilih satu atau beberapa bidang utama yang dikuasai trainer.</p>
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-gray-700">Foto Trainer</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className={fileInputCls}
                                            onChange={e => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
                                        />
                                        {modal.type === 'edit' && modal.instructor.photo && (
                                            <p className="mt-2 text-xs text-gray-500">Foto saat ini tersimpan. Pilih file baru jika ingin mengganti.</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-gray-700">Tanda Tangan Trainer</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className={fileInputCls}
                                            onChange={e => setFormData({ ...formData, signature_image: e.target.files?.[0] || null })}
                                        />
                                        {modal.type === 'edit' && modal.instructor.signature_image && (
                                            <p className="mt-2 text-xs text-gray-500">Tanda tangan saat ini tersimpan. Pilih file baru jika ingin mengganti.</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-700">CV Trainer</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        className={fileInputCls}
                                        onChange={e => setFormData({ ...formData, cv: e.target.files?.[0] || null })}
                                    />
                                    {modal.type === 'edit' && modal.instructor.cv && (
                                        <p className="mt-2 text-xs text-gray-500">CV saat ini tersimpan. Upload file baru jika ingin mengganti.</p>
                                    )}
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">Batal</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                                </div>
                            </form>
                        ) : modal.type === 'reset-pw' ? (
                            <form onSubmit={handleAction} className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-lg text-gray-900">Reset Password</h2>
                                    <button type="button" onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700 flex gap-2">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    Password user terkait akan langsung diubah.
                                </div>
                                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Password Baru</label>
                                    <div className="relative">
                                        <input type={showResetPw ? 'text' : 'password'} required minLength={6} className={`${inputCls} pr-10`} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                        <button
                                            type="button"
                                            onClick={() => setShowResetPw(!showResetPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700"
                                            aria-label={showResetPw ? 'Sembunyikan password baru' : 'Tampilkan password baru'}
                                        >
                                            {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">Batal</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-bold">Reset Password</button>
                                </div>
                            </form>
                        ) : modal.type === 'hijack' && (
                            <div className="p-6 space-y-4 text-center">
                                <h2 className="font-bold text-lg text-gray-900">Login Sebagai Trainer</h2>
                                <p className="text-sm text-gray-500 italic">Anda akan masuk sebagai {modal.instructor.name}</p>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">Batal</button>
                                    <button onClick={handleHijack} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold">{saving ? 'Redirecting...' : 'Confirm Login'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

