'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LessonFormContent({ courseId, lessonId }: { courseId: string; lessonId: string }) {
    const isNew = lessonId === 'new';
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialSectionId = searchParams.get('section_id') || '';

    const [formData, setFormData] = useState({
        title: '',
        type: 'video',
        section_id: initialSectionId,
        video_url: '',
        content: '',
        duration: '',
        order: 0,
        image: null as File | null
    });
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

                // Fetch sections
                const sectionsRes = await fetch(`${apiUrl}/api/sections/?course_id=${courseId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (sectionsRes.ok) {
                    const sectionsData = await sectionsRes.json();
                    setSections(sectionsData);

                    // Set default order based on section
                    if (isNew && initialSectionId) {
                        const sectionLessonsRes = await fetch(`${apiUrl}/api/lessons/?course_id=${courseId}`, { // Filter by section better if API supports it, but currently filtered by course
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        // Simple logic: if new, just put at end of section or default to 1
                        // For now, let's just default to 1
                        setFormData(prev => ({ ...prev, order: 1 }));
                    }
                }

                if (!isNew) {
                    const res = await fetch(`${apiUrl}/api/lessons/${lessonId}/`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setFormData({
                            title: data.title,
                            type: data.type,
                            section_id: data.section || '',
                            video_url: data.video_url || '',
                            content: data.content || '',
                            duration: data.duration || '',
                            order: data.order,
                            image: null
                        });
                        setCurrentImageUrl(data.image);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [courseId, lessonId, isNew, initialSectionId]);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileChange = (e: any) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, image: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const data = new FormData();
            data.append('course', courseId);
            if (formData.section_id) data.append('section', formData.section_id);
            data.append('title', formData.title);
            data.append('type', formData.type);
            data.append('order', formData.order.toString());

            if (formData.type === 'video') {
                data.append('video_url', formData.video_url);
                data.append('duration', formData.duration);
            } else if (formData.type === 'article') {
                data.append('content', formData.content);
                data.append('duration', formData.duration); // Articles can have read time
            }

            if (formData.image) {
                data.append('image', formData.image);
            }

            const url = isNew ? `${apiUrl}/api/lessons/` : `${apiUrl}/api/lessons/${lessonId}/`;
            const method = isNew ? 'POST' : 'PATCH';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: data
            });

            if (res.ok) {
                router.push(`/admin/courses/${courseId}/lessons`);
            } else {
                const errData = await res.json();
                console.error('Failed to save:', errData);
                alert('Gagal menyimpan materi. Periksa input Anda.');
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Terjadi kesalahan saat menyimpan.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Memuat...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href={`/admin/courses/${courseId}/lessons`}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isNew ? 'Tambah Materi Baru' : 'Edit Materi'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                    <input
                        type="text"
                        name="title"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        value={formData.title}
                        onChange={handleChange}
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Modul / Section</label>
                        <select
                            name="section_id"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.section_id}
                            onChange={handleChange}
                        >
                            <option value="">Pilih Modul</option>
                            {sections.map(section => (
                                <option key={section.id} value={section.id}>{section.title}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                        <input
                            type="number"
                            name="order"
                            required
                            min="1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.order}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Materi</label>
                    <select
                        name="type"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        value={formData.type}
                        onChange={handleChange}
                    >
                        <option value="video">Video</option>
                        <option value="article">Artikel</option>
                    </select>
                </div>

                {formData.type === 'video' ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL Video</label>
                        <input
                            type="url"
                            name="video_url"
                            required
                            placeholder="https://youtube.com/..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.video_url}
                            onChange={handleChange}
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Konten Artikel</label>
                        <textarea
                            name="content"
                            required
                            rows={6}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.content}
                            onChange={handleChange}
                        ></textarea>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durasi (Opsional)</label>
                    <input
                        type="text"
                        name="duration"
                        placeholder="Contoh: 10 menit"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        value={formData.duration}
                        onChange={handleChange}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gambar Sampul (Opsional)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                        />
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-sm font-medium">
                                {formData.image ? formData.image.name : 'Klik untuk unggah gambar'}
                            </span>
                        </div>
                    </div>
                    {currentImageUrl && !formData.image && (
                        <div className="mt-2 text-sm text-gray-500">
                            Gambar saat ini: <a href={currentImageUrl} target="_blank" className="text-blue-600 hover:underline">Lihat</a>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan Materi'}
                    </button>
                </div>
            </form>
        </div>
    );
}
