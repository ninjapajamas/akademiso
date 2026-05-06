'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, Save } from 'lucide-react';
import Link from 'next/link';

type InstructorFormState = {
    name: string;
    title: string;
    bio: string;
    photo: File | null;
    signature_image: File | null;
    cv: File | null;
    photoUrl: string;
    signatureImageUrl: string;
    cvUrl: string;
};

function createEmptyForm(): InstructorFormState {
    return {
        name: '',
        title: '',
        bio: '',
        photo: null,
        signature_image: null,
        cv: null,
        photoUrl: '',
        signatureImageUrl: '',
        cvUrl: '',
    };
}

export default function InstructorFormPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const isNew = id === 'new';
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<InstructorFormState>(createEmptyForm);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const getFileUrl = (url?: string | null) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `${apiUrl}${url}`;
    };

    useEffect(() => {
        if (!isNew) {
            const fetchData = async () => {
                try {
                    const res = await fetch(`${apiUrl}/api/instructors/${id}/`);
                    if (res.ok) {
                        const data = await res.json();
                        setFormData({
                            name: data.name,
                            title: data.title,
                            bio: data.bio,
                            photo: null,
                            signature_image: null,
                            cv: null,
                            photoUrl: data.photo || '',
                            signatureImageUrl: data.signature_image || '',
                            cvUrl: data.cv || '',
                        });
                    }
                } catch (error) {
                    console.error('Error fetching instructor:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [id, isNew]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('access_token');
            const url = isNew
                ? `${apiUrl}/api/instructors/`
                : `${apiUrl}/api/instructors/${id}/`;

            const method = isNew ? 'POST' : 'PATCH';
            const payload = new FormData();

            payload.append('name', formData.name);
            payload.append('title', formData.title);
            payload.append('bio', formData.bio);
            if (formData.photo) payload.append('photo', formData.photo);
            if (formData.signature_image) payload.append('signature_image', formData.signature_image);
            if (formData.cv) payload.append('cv', formData.cv);

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: payload
            });

            if (res.ok) {
                router.push('/admin/instructors');
            } else {
                const err = await res.json();
                alert('Error saving: ' + JSON.stringify(err));
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error saving data');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none';
    const fileInputCls = 'block w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-700';

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/instructors" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isNew ? 'Tambah Trainer' : 'Edit Trainer'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                    <input
                        type="text"
                        required
                        className={inputCls}
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gelar / Posisi</label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. Senior Software Engineer"
                        className={inputCls}
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Biografi</label>
                    <textarea
                        rows={4}
                        required
                        className={inputCls}
                        value={formData.bio}
                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                    />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Foto Trainer</label>
                        <input
                            type="file"
                            accept="image/*"
                            className={fileInputCls}
                            onChange={e => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
                        />
                        {formData.photoUrl && (
                            <a
                                href={getFileUrl(formData.photoUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                                Lihat foto saat ini
                            </a>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Tanda Tangan Trainer</label>
                        <input
                            type="file"
                            accept="image/*"
                            className={fileInputCls}
                            onChange={e => setFormData({ ...formData, signature_image: e.target.files?.[0] || null })}
                        />
                        {formData.signatureImageUrl && (
                            <a
                                href={getFileUrl(formData.signatureImageUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                                Lihat tanda tangan saat ini
                            </a>
                        )}
                    </div>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">CV Trainer</label>
                    <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className={fileInputCls}
                        onChange={e => setFormData({ ...formData, cv: e.target.files?.[0] || null })}
                    />
                    {formData.cvUrl && (
                        <a
                            href={getFileUrl(formData.cvUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Lihat CV saat ini
                        </a>
                    )}
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Menyimpan...' : 'Simpan Trainer'}
                    </button>
                </div>
            </form>
        </div>
    );
}
