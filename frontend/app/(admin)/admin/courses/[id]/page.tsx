'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function CourseFormPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const isNew = id === 'new';
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    // Dropdown data
    const [instructors, setInstructors] = useState([]);
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        description: '',
        price: '',
        level: 'Beginner',
        duration: '',
        instructor_id: '',
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
            const [instRes, catRes] = await Promise.all([
                fetch(`${apiUrl}/api/instructors/`),
                fetch(`${apiUrl}/api/categories/`)
            ]);
            setInstructors(await instRes.json());
            setCategories(await catRes.json());
        };

        fetchDropdowns();

        if (!isNew) {
            // Fetch existing data
            const fetchData = async () => {
                try {
                    const res = await fetch(`${apiUrl}/api/courses/${id}/`);
                    if (res.ok) {
                        const data = await res.json();
                        setFormData({
                            title: data.title,
                            slug: data.slug,
                            description: data.description,
                            price: data.price,
                            level: data.level,
                            duration: data.duration,
                            instructor_id: data.instructor?.id || '',
                            category_id: data.category?.id || '',
                            is_featured: data.is_featured,
                            discount_price: data.discount_price || '',
                            type: data.type || 'course',
                            scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString().slice(0, 16) : '',
                            location: data.location || ''
                        });
                    }
                } catch (error) {
                    console.error('Error fetching course:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [id, isNew]);

    const handleChange = (e: any) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });

        // Auto-generate slug from title if new
        if (e.target.name === 'title' && isNew) {
            setFormData(prev => ({
                ...prev,
                title: value,
                slug: value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const url = isNew
                ? `${apiUrl}/api/courses/`
                : `${apiUrl}/api/courses/${id}/`;

            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                router.push('/admin/courses');
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

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/admin/courses" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isNew ? 'Kursus Baru' : 'Edit Kursus'}
                </h1>
                {!isNew && (
                    <Link
                        href={`/admin/courses/${id}/lessons`}
                        className="ml-auto bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                    >
                        Kelola Materi
                    </Link>
                )}
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-indigo-900">Program Aktif: {formData.type.toUpperCase()}</h2>
                    <p className="text-sm text-indigo-700">Tentukan tipe program untuk menyesuaikan opsi tampilan di katalog.</p>
                </div>
                <div className="flex gap-2">
                    {['course', 'webinar', 'workshop'].map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, type: t as any }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.type === t
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white text-indigo-600 hover:bg-indigo-100'
                                }`}
                        >
                            {t === 'course' ? 'PELATIHAN' : t.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Judul Kursus</label>
                        <input
                            name="title"
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.title}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                        <input
                            name="slug"
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-900"
                            value={formData.slug}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                        <textarea
                            name="description"
                            rows={4}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Instruktur</label>
                        <select
                            name="instructor_id"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.instructor_id}
                            onChange={handleChange}
                        >
                            <option value="">Pilih Instruktur</option>
                            {instructors.map((opt: any) => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                        <select
                            name="category_id"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Harga</label>
                        <input
                            name="price"
                            type="number"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.price}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-red-600 font-bold">Harga Diskon (Opsional)</label>
                        <input
                            name="discount_price"
                            type="number"
                            placeholder="Biarkan kosong jika tidak ada diskon"
                            className="w-full px-4 py-2 border border-red-200 bg-red-50/30 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-gray-900"
                            value={formData.discount_price}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                        <select
                            name="level"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.level}
                            onChange={handleChange}
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>

                    {formData.type !== 'course' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-blue-700 mb-1 font-bold">Waktu Pelaksanaan</label>
                                <input
                                    name="scheduled_at"
                                    type="datetime-local"
                                    className="w-full px-4 py-2 border border-blue-300 bg-blue-50/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                    value={formData.scheduled_at}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi (Khusus Workshop)</label>
                                <input
                                    name="location"
                                    type="text"
                                    placeholder="Nama tempat atau alamat"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                    value={formData.location}
                                    onChange={handleChange}
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Durasi</label>
                        <input
                            name="duration"
                            type="text"
                            placeholder="Contoh: 2 Jam"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.duration}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                name="is_featured"
                                type="checkbox"
                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                checked={formData.is_featured}
                                onChange={handleChange}
                            />
                            <span className="text-gray-900 font-medium">Kursus Unggulan</span>
                        </label>
                    </div>

                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Menyimpan...' : 'Simpan Kursus'}
                    </button>
                </div>
            </form>
        </div>
    );
}
