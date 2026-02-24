'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, BookOpen, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function InstructorCourseFormPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const isNew = id === 'new';
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Dropdown data
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        description: '',
        price: '',
        level: 'Beginner',
        duration: '',
        category_id: '',
        is_featured: false,
        discount_price: '',
        type: 'course',
        scheduled_at: '',
        location: ''
    });

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const fetchDropdowns = async () => {
            const catRes = await fetch(`${apiUrl}/api/categories/`);
            if (catRes.ok) setCategories(await catRes.json());
        };

        fetchDropdowns();

        if (!isNew) {
            const fetchData = async () => {
                try {
                    const token = localStorage.getItem('access_token');
                    const res = await fetch(`${apiUrl}/api/courses/${id}/`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setFormData({
                            title: data.title,
                            slug: data.slug,
                            description: data.description,
                            price: data.price,
                            level: data.level,
                            duration: data.duration,
                            category_id: data.category?.id || '',
                            is_featured: data.is_featured,
                            discount_price: data.discount_price || '',
                            type: data.type || 'course',
                            scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString().slice(0, 16) : '',
                            location: data.location || ''
                        });
                    } else if (res.status === 403) {
                        setError('Anda tidak memiliki izin untuk mengedit kursus ini.');
                    }
                } catch (error) {
                    console.error('Error fetching course:', error);
                    setError('Terjadi kesalahan saat mengambil data kursus.');
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [id, isNew]);

    const handleChange = (e: any) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        const name = e.target.name;

        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-generate slug from title if new
        if (name === 'title' && isNew) {
            setFormData(prev => ({
                ...prev,
                slug: value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const url = isNew
                ? `${apiUrl}/api/courses/`
                : `${apiUrl}/api/courses/${id}/`;

            const method = isNew ? 'POST' : 'PATCH';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                router.push('/instructor/courses');
            } else {
                const err = await res.json();
                setError(JSON.stringify(err));
            }
        } catch (error) {
            console.error('Error saving:', error);
            setError('Gagal menyimpan data. Pastikan koneksi server tersedia.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (error && !saving) return (
        <div className="max-w-4xl mx-auto mt-10 p-8 bg-red-50 rounded-3xl border border-red-100 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">Error</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <Link href="/instructor/courses" className="text-indigo-600 font-bold hover:underline">
                Kembali ke Daftar Kursus
            </Link>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/instructor/courses" className="p-3 hover:bg-white rounded-2xl text-gray-400 hover:text-indigo-600 transition-all border border-transparent hover:border-gray-100 hover:shadow-sm">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {isNew ? 'Tambah Kursus Baru' : 'Edit Kursus'}
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Lengkapi detail kursus untuk dipublikasikan.</p>
                </div>
                {!isNew && (
                    <Link
                        href={`/instructor/courses/${id}/lessons`}
                        className="ml-auto flex items-center gap-2 bg-white border border-indigo-100 text-indigo-600 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
                    >
                        <BookOpen className="w-4 h-4" />
                        Kelola Materi
                    </Link>
                )}
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                    <div className="md:col-span-2">
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Judul Kursus</label>
                        <input
                            name="title"
                            type="text"
                            required
                            placeholder="Contoh: Lead Auditor ISO 9001:2015"
                            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder:text-gray-300"
                            value={formData.title}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Slug (URL Auto-generate)</label>
                        <input
                            name="slug"
                            type="text"
                            required
                            className="w-full px-5 py-3 bg-indigo-50/30 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-600 font-mono text-xs"
                            value={formData.slug}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Deskripsi Kursus</label>
                        <textarea
                            name="description"
                            rows={5}
                            required
                            placeholder="Jelaskan apa saja yang akan dipelajari di kursus ini..."
                            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder:text-gray-300 leading-relaxed"
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Bidang / Kategori</label>
                        <select
                            name="category_id"
                            required
                            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium appearance-none cursor-pointer"
                            value={formData.category_id}
                            onChange={handleChange}
                        >
                            <option value="">Pilih Kategori</option>
                            {categories.map((opt: any) => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Tingkat Kesulitan</label>
                        <select
                            name="level"
                            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium appearance-none cursor-pointer"
                            value={formData.level}
                            onChange={handleChange}
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Tipe Program</label>
                        <select
                            name="type"
                            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium appearance-none cursor-pointer"
                            value={formData.type}
                            onChange={handleChange}
                        >
                            <option value="course">Pelatihan (Reguler)</option>
                            <option value="webinar">Webinar (Live Online)</option>
                            <option value="workshop">Workshop (Offline/Intensive)</option>
                        </select>
                    </div>

                    {formData.type !== 'course' && (
                        <>
                            <div>
                                <label className="block font-bold text-indigo-600 mb-2 uppercase tracking-widest text-[10px]">Waktu Pelaksanaan</label>
                                <input
                                    name="scheduled_at"
                                    type="datetime-local"
                                    className="w-full px-5 py-3 bg-indigo-50/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-700 font-bold"
                                    value={formData.scheduled_at}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Lokasi (Jika Offline)</label>
                                <input
                                    name="location"
                                    type="text"
                                    placeholder="Alamat atau Nama Gedung"
                                    className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                                    value={formData.location}
                                    onChange={handleChange}
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Harga (Rp)</label>
                        <input
                            name="price"
                            type="number"
                            required
                            placeholder="750000"
                            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-bold placeholder:text-gray-300"
                            value={formData.price}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-indigo-600 mb-2 uppercase tracking-widest text-[10px]">Biaya Diskon (Opsional)</label>
                        <input
                            name="discount_price"
                            type="number"
                            placeholder="Biarkan kosong jika normal"
                            className="w-full px-5 py-3 bg-indigo-50/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-700 font-bold placeholder:text-indigo-300/50"
                            value={formData.discount_price}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Estimasi Durasi</label>
                        <input
                            name="duration"
                            type="text"
                            placeholder="Contoh: 10 Jam atau 2 Hari"
                            required
                            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder:text-gray-300"
                            value={formData.duration}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex items-center pt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`relative w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${formData.is_featured ? 'bg-indigo-600 border-indigo-600' : 'border-gray-200 group-hover:border-indigo-400'}`}>
                                <input
                                    name="is_featured"
                                    type="checkbox"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    checked={formData.is_featured}
                                    onChange={handleChange}
                                />
                                {formData.is_featured && <div className="w-1.5 h-3 border-r-2 border-b-2 border-white rotate-45 mb-0.5" />}
                            </div>
                            <span className="text-gray-700 font-bold text-xs uppercase tracking-widest">Kursus Unggulan</span>
                        </label>
                    </div>

                </div>

                <div className="pt-8 border-t border-gray-50 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </form>
        </div>
    );
}
