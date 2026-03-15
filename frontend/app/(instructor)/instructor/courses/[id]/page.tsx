'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, BookOpen, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Category } from '@/types';
import { formatNumberInput, normalizePriceForApi } from '@/types/currency';
import { formatApiDateTimeForInput, formatInputDateTimeForApi } from '@/types/datetime';

type CourseType = 'course' | 'webinar' | 'workshop';
type DeliveryMode = 'online' | 'offline';

export default function InstructorCourseFormPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const isNew = id === 'new';
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Dropdown data
    const [categories, setCategories] = useState<Category[]>([]);

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
        delivery_mode: 'online' as DeliveryMode,
        scheduled_at: '',
        scheduled_end_at: '',
        location: '',
        zoom_link: '',
        is_free: false,
        has_certification_exam: false
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
                            price: formatNumberInput(data.price),
                            level: data.level,
                            duration: data.duration,
                            category_id: data.category?.id || '',
                            is_featured: data.is_featured,
                            discount_price: formatNumberInput(data.discount_price),
                            type: data.type || 'course',
                            delivery_mode: data.delivery_mode || 'online',
                            scheduled_at: formatApiDateTimeForInput(data.scheduled_at),
                            scheduled_end_at: formatApiDateTimeForInput(data.scheduled_end_at),
                            location: data.location || '',
                            zoom_link: data.zoom_link || '',
                            is_free: data.is_free || false,
                            has_certification_exam: data.has_certification_exam || false
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const isCheckbox = target instanceof HTMLInputElement && target.type === 'checkbox';
        const value: string | boolean = isCheckbox ? target.checked : target.value;
        const name = target.name;
        const normalizedValue = !isCheckbox && (name === 'price' || name === 'discount_price')
            ? formatNumberInput(String(value))
            : value;

        if (name === 'type') {
            const nextType = normalizedValue as CourseType;
            setFormData(prev => ({
                ...prev,
                type: nextType,
                delivery_mode: nextType === 'webinar' ? 'online' : prev.delivery_mode,
                is_free: nextType === 'webinar' ? prev.is_free : false,
                price: nextType === 'webinar' && prev.is_free ? '0' : prev.price,
                discount_price: nextType === 'webinar' && prev.is_free ? '' : prev.discount_price,
                has_certification_exam: nextType === 'course' ? prev.has_certification_exam : false
            }));
            return;
        }

        if (name === 'delivery_mode') {
            const nextMode = normalizedValue as DeliveryMode;
            setFormData(prev => ({
                ...prev,
                delivery_mode: nextMode,
                location: nextMode === 'online' ? '' : prev.location,
                zoom_link: nextMode === 'offline' ? '' : prev.zoom_link,
            }));
            return;
        }

        if (name === 'is_free') {
            const checked = Boolean(normalizedValue);
            setFormData(prev => ({
                ...prev,
                is_free: checked,
                price: checked ? '0' : prev.price === '0' ? '' : prev.price,
                discount_price: ''
            }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: normalizedValue }));

        // Auto-generate slug from title if new
        if (name === 'title' && isNew) {
            setFormData(prev => ({
                ...prev,
                slug: String(value).toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
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
            const payload = {
                ...formData,
                price: normalizePriceForApi(formData.price),
                discount_price: normalizePriceForApi(formData.discount_price) || null,
                scheduled_at: formatInputDateTimeForApi(formData.scheduled_at),
                scheduled_end_at: formatInputDateTimeForApi(formData.scheduled_end_at),
                delivery_mode: formData.type === 'webinar' ? 'online' : formData.delivery_mode
            };

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
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
                            {categories.map((opt) => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">
                            {formData.type === 'webinar' ? 'Mode Pelaksanaan' : formData.type === 'workshop' ? 'Mode Workshop' : 'Mode Pelatihan'}
                        </label>
                        <select
                            name="delivery_mode"
                            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium appearance-none cursor-pointer"
                            value={formData.type === 'webinar' ? 'online' : formData.delivery_mode}
                            onChange={handleChange}
                            disabled={formData.type === 'webinar'}
                        >
                            <option value="online">Online</option>
                            <option value="offline">Offline</option>
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

                    {(formData.type === 'webinar' || formData.delivery_mode === 'online') && (
                        <div className="md:col-span-2">
                            <label className="block font-bold text-rose-600 mb-2 uppercase tracking-widest text-[10px] italic underline">
                                {formData.type === 'webinar' ? 'Link Zoom Webinar' : 'Link Meeting Online'}
                            </label>
                            <input
                                name="zoom_link"
                                type="url"
                                placeholder="https://zoom.us/j/..."
                                className="w-full px-5 py-3 bg-rose-50/30 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none text-rose-700 font-bold placeholder:text-rose-300/50"
                                value={formData.zoom_link}
                                onChange={handleChange}
                            />
                        </div>
                    )}

                    <div className="md:col-span-2 rounded-[1.5rem] border border-indigo-100 bg-indigo-50/50 p-5 space-y-4">
                        <div>
                            <label className="block font-bold text-indigo-600 uppercase tracking-widest text-[10px]">
                                {formData.type === 'course' ? 'Rentang Tanggal Pelatihan' : 'Rentang Waktu Pelaksanaan'}
                            </label>
                            <p className="mt-2 text-[11px] text-indigo-500 font-medium">
                                {formData.type === 'course'
                                    ? 'Isi tanggal mulai dan selesai dalam satu baris agar jadwal pelatihan lebih mudah dicek.'
                                    : 'Isi waktu mulai dan selesai agar jadwal sesi tampil lebih ringkas.'}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-bold text-indigo-600 mb-2 uppercase tracking-widest text-[10px]">Tanggal Mulai</label>
                                <input
                                    name="scheduled_at"
                                    type="datetime-local"
                                    required={formData.type === 'course'}
                                    className="w-full px-5 py-3 bg-white border border-indigo-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-700 font-bold"
                                    value={formData.scheduled_at}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-indigo-600 mb-2 uppercase tracking-widest text-[10px]">Tanggal Selesai</label>
                                <input
                                    name="scheduled_end_at"
                                    type="datetime-local"
                                    required={formData.type === 'course'}
                                    className="w-full px-5 py-3 bg-white border border-indigo-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-700 font-bold"
                                    value={formData.scheduled_end_at}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        {formData.type === 'course' && (
                            <p className="text-[11px] text-indigo-500 font-medium">Status course akan otomatis nonaktif setelah tanggal selesai lewat.</p>
                        )}
                    </div>
                    {(formData.type === 'workshop' || formData.type === 'course') && formData.delivery_mode === 'offline' && (
                        <div>
                            <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">
                                {formData.type === 'workshop' ? 'Lokasi Workshop Offline' : 'Lokasi Pelatihan Offline'}
                            </label>
                            <input
                                name="location"
                                type="text"
                                placeholder="Alamat atau Nama Gedung"
                                className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                                value={formData.location}
                                onChange={handleChange}
                            />
                        </div>
                    )}

                    {formData.type === 'webinar' && (
                        <div className="md:col-span-2">
                            <label className="flex items-center gap-3 cursor-pointer group rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                                <input
                                    name="is_free"
                                    type="checkbox"
                                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                    checked={formData.is_free}
                                    onChange={handleChange}
                                />
                                <span className="text-emerald-700 font-bold text-xs uppercase tracking-widest">Webinar Gratis</span>
                            </label>
                        </div>
                    )}

                    <div>
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Harga (Rp)</label>
                        <input
                            name="price"
                            type="text"
                            inputMode="numeric"
                            required={!formData.is_free}
                            disabled={formData.is_free}
                            placeholder="750.000"
                            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-bold placeholder:text-gray-300"
                            value={formData.price}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-indigo-600 mb-2 uppercase tracking-widest text-[10px]">Biaya Diskon (Opsional)</label>
                        <input
                            name="discount_price"
                            type="text"
                            inputMode="numeric"
                            placeholder="Biarkan kosong jika normal"
                            disabled={formData.is_free}
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

                    {formData.type === 'course' && (
                        <div className="flex items-center pt-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`relative w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${formData.has_certification_exam ? 'bg-indigo-600 border-indigo-600' : 'border-gray-200 group-hover:border-indigo-400'}`}>
                                    <input
                                        name="has_certification_exam"
                                        type="checkbox"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        checked={formData.has_certification_exam}
                                        onChange={handleChange}
                                    />
                                    {formData.has_certification_exam && <div className="w-1.5 h-3 border-r-2 border-b-2 border-white rotate-45 mb-0.5" />}
                                </div>
                                <span className="text-indigo-600 font-bold text-xs uppercase tracking-widest">Sediakan Ujian Sertifikasi</span>
                            </label>
                        </div>
                    )}

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

            {!isNew && formData.type === 'course' && formData.has_certification_exam && (
                <InstructorExamManager courseId={parseInt(id)} />
            )}
        </div>
    );
}

import InstructorExamManager from '@/components/exam/InstructorExamManager';
