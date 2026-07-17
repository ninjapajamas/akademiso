'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { Edit3, FolderTree, Plus, Save, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';

type Category = {
    id: number;
    name: string;
    slug: string;
    icon?: string | null;
};

const emptyForm = { name: '', slug: '', icon: '' };

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { confirmAction, showError, showSuccess } = useFeedbackModal();

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch(`${getClientApiBaseUrl()}/api/categories/`);
            const payload = await response.json();
            setCategories(Array.isArray(payload) ? payload : []);
        } catch {
            await showError('Kategori belum bisa dimuat.', 'Koneksi Bermasalah');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        void fetchCategories();
    }, [fetchCategories]);

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('access_token');
            const endpoint = editingId
                ? `${getClientApiBaseUrl()}/api/categories/${editingId}/`
                : `${getClientApiBaseUrl()}/api/categories/`;
            const response = await fetch(endpoint, {
                method: editingId ? 'PATCH' : 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                await showError(Object.values(payload).flat().join(' ') || 'Kategori belum bisa disimpan.', 'Penyimpanan Gagal');
                return;
            }

            resetForm();
            await fetchCategories();
            await showSuccess('Kategori berhasil disimpan.', 'Kategori Tersimpan');
        } catch {
            await showError('Terjadi kesalahan jaringan saat menyimpan kategori.', 'Koneksi Bermasalah');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (category: Category) => {
        const confirmed = await confirmAction({
            title: 'Hapus kategori?',
            message: `Kategori “${category.name}” akan dihapus. Course yang sudah ada tidak ikut terhapus.`,
            confirmLabel: 'Hapus Kategori',
            cancelLabel: 'Batal',
            tone: 'error',
        });
        if (!confirmed) return;

        const token = localStorage.getItem('access_token');
        const response = await fetch(`${getClientApiBaseUrl()}/api/categories/${category.id}/`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            await showError('Kategori belum bisa dihapus.', 'Penghapusan Gagal');
            return;
        }
        if (editingId === category.id) resetForm();
        await fetchCategories();
        await showSuccess('Kategori berhasil dihapus.', 'Penghapusan Berhasil');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Kategori Pelatihan</h1>
                <p className="mt-1 text-sm text-gray-500">Kelola kategori yang dipakai pada katalog dan formulir course.</p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                <label className="text-sm font-semibold text-gray-700">
                    Nama kategori
                    <input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal text-gray-900 outline-none focus:border-blue-500" placeholder="Contoh: Sistem Manajemen Mutu" />
                </label>
                <label className="text-sm font-semibold text-gray-700">
                    Slug
                    <input required value={form.slug} onChange={event => setForm(current => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') }))} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal text-gray-900 outline-none focus:border-blue-500" placeholder="sistem-manajemen-mutu" />
                </label>
                <label className="text-sm font-semibold text-gray-700">
                    Ikon (opsional)
                    <input value={form.icon} onChange={event => setForm(current => ({ ...current, icon: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal text-gray-900 outline-none focus:border-blue-500" placeholder="shield-check" />
                </label>
                <div className="flex gap-2">
                    {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-gray-200 p-2.5 text-gray-600" aria-label="Batal mengedit"><X className="h-5 w-5" /></button>}
                    <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white disabled:opacity-60">
                        {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {editingId ? 'Simpan' : 'Tambah'}
                    </button>
                </div>
            </form>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Memuat kategori...</div>
                ) : categories.length === 0 ? (
                    <div className="p-10 text-center text-gray-500"><FolderTree className="mx-auto mb-3 h-9 w-9 text-gray-300" />Belum ada kategori.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {categories.map(category => (
                            <div key={category.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-bold text-gray-900">{category.name}</p>
                                    <p className="text-sm text-gray-500">/{category.slug}{category.icon ? ` • ${category.icon}` : ''}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingId(category.id); setForm({ name: category.name, slug: category.slug, icon: category.icon || '' }); }} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" aria-label={`Edit kategori ${category.name}`}><Edit3 className="h-4 w-4" /></button>
                                    <button onClick={() => void handleDelete(category)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Hapus kategori ${category.name}`}><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
