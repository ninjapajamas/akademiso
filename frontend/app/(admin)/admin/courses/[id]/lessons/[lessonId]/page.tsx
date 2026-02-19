'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Upload, Video, FileText, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function LessonFormPage({ params }: { params: Promise<{ id: string, lessonId: string }> }) {
    const router = useRouter();
    const { id: courseId, lessonId } = use(params);
    const isNew = lessonId === 'new';

    // Loading states
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    // Form Data
    const [title, setTitle] = useState('');
    const [type, setType] = useState('video');
    const [content, setContent] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [duration, setDuration] = useState('');
    const [order, setOrder] = useState(1);
    const [image, setImage] = useState<File | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState('');

    useEffect(() => {
        if (!isNew) {
            const fetchLesson = async () => {
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                    const res = await fetch(`${apiUrl}/api/lessons/${lessonId}/`);
                    if (res.ok) {
                        const data = await res.json();
                        setTitle(data.title);
                        setType(data.type);
                        setContent(data.content || '');
                        setVideoUrl(data.video_url || '');
                        setDuration(data.duration || '');
                        setOrder(data.order || 1);
                        setCurrentImageUrl(data.image);
                    }
                } catch (error) {
                    console.error('Error fetching lesson:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchLesson();
        }
    }, [lessonId, isNew]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData();
        formData.append('course', courseId);
        formData.append('title', title);
        formData.append('type', type);
        formData.append('order', order.toString());
        if (duration) formData.append('duration', duration);
        if (content) formData.append('content', content);
        if (videoUrl) formData.append('video_url', videoUrl);
        if (image) formData.append('image', image);

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const url = isNew
                ? `${apiUrl}/api/lessons/`
                : `${apiUrl}/api/lessons/${lessonId}/`;

            const method = isNew ? 'POST' : 'PATCH'; // PATCH allows partial updates

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Do NOT set Content-Type header when sending FormData, 
                    // browser sets it automatically with boundary
                },
                body: formData
            });

            if (res.ok) {
                router.push(`/admin/courses/${courseId}/lessons`);
            } else {
                const err = await res.json();
                alert('Error saving: ' + JSON.stringify(err));
            }
        } catch (error) {
            console.error('Error saving lesson:', error);
            alert('Error saving lesson');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href={`/admin/courses/${courseId}/lessons`} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isNew ? 'Tambah Materi Baru' : 'Edit Materi'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">

                {/* Type Selection */}
                <div className="grid grid-cols-3 gap-4">
                    {['video', 'article', 'quiz'].map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition ${type === t
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-100 hover:border-gray-200 text-gray-600'
                                }`}
                        >
                            {t === 'video' && <Video className={`w-6 h-6 mb-2 ${type === t ? 'text-blue-600' : 'text-gray-400'}`} />}
                            {t === 'article' && <FileText className={`w-6 h-6 mb-2 ${type === t ? 'text-blue-600' : 'text-gray-400'}`} />}
                            {t === 'quiz' && <HelpCircle className={`w-6 h-6 mb-2 ${type === t ? 'text-blue-600' : 'text-gray-400'}`} />}
                            <span className="capitalize font-medium">{t}</span>
                        </button>
                    ))}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                        <input
                            type="number"
                            required
                            min="1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={order}
                            onChange={e => setOrder(parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Durasi (Opsional)</label>
                        <input
                            type="text"
                            placeholder="Contoh: 10 menit"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                        />
                    </div>
                </div>

                {/* Conditional Fields based on Type */}
                {type === 'video' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL Video</label>
                        <input
                            type="url"
                            required={type === 'video'}
                            placeholder="https://youtube.com/..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={videoUrl}
                            onChange={e => setVideoUrl(e.target.value)}
                        />
                    </div>
                )}

                {type === 'article' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Konten Artikel</label>
                        <textarea
                            rows={8}
                            required={type === 'article'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                        />
                    </div>
                )}

                {/* Image Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gambar Sampul (Opsional)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) setImage(file);
                            }}
                        />
                        <div className="flex flex-col items-center">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-gray-500 text-sm">
                                {image ? image.name : 'Klik untuk unggah gambar'}
                            </span>
                        </div>
                    </div>
                    {currentImageUrl && !image && (
                        <div className="mt-2 text-sm text-gray-500">
                            Gambar saat ini: <a href={currentImageUrl} target="_blank" className="text-blue-600 hover:underline">Lihat</a>
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Menyimpan...' : 'Simpan Materi'}
                    </button>
                </div>
            </form>
        </div>
    );
}
