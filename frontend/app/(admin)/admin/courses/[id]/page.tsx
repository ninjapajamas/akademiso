'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Award, CheckCircle2, Users } from 'lucide-react';
import Link from 'next/link';
import ExamManager from '@/components/exam/ExamManager';
import { Category, Instructor } from '@/types';
import { formatNumberInput, normalizePriceForApi } from '@/types/currency';
import { formatApiDateTimeForInput, formatInputDateTimeForApi } from '@/types/datetime';

type CourseType = 'course' | 'webinar' | 'workshop';
type DeliveryMode = 'online' | 'offline';

interface WebinarAttendanceRow {
    order_id: number;
    user_id: number;
    user_name: string;
    email?: string;
    attendee_name?: string;
    attendee_email?: string;
    attendee_phone?: string;
    attendee_company?: string;
    attendee_position?: string;
    is_present: boolean;
    attended_at?: string | null;
    marked_by_name?: string | null;
    notes?: string | null;
    certificate_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
}

export default function CourseFormPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const isNew = id === 'new';
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [webinarAttendance, setWebinarAttendance] = useState<WebinarAttendanceRow[]>([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [markingAttendanceUserId, setMarkingAttendanceUserId] = useState<number | null>(null);

    // Dropdown data
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

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
                            instructor_id: data.instructor?.id || '',
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const name = target.name;
        const isCheckbox = target instanceof HTMLInputElement && target.type === 'checkbox';
        let value: string | boolean = isCheckbox ? target.checked : target.value;

        if (!isCheckbox && (name === 'price' || name === 'discount_price')) {
            value = formatNumberInput(String(value));
        }

        if (name === 'type') {
            const nextType = value as CourseType;
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
            const nextMode = value as DeliveryMode;
            setFormData(prev => ({
                ...prev,
                delivery_mode: nextMode,
                location: nextMode === 'online' ? '' : prev.location,
                zoom_link: nextMode === 'offline' ? '' : prev.zoom_link,
            }));
            return;
        }

        if (name === 'is_free') {
            const checked = Boolean(value);
            setFormData(prev => ({
                ...prev,
                is_free: checked,
                price: checked ? '0' : prev.price === '0' ? '' : prev.price,
                discount_price: ''
            }));
            return;
        }

        setFormData({ ...formData, [name]: value });

        // Auto-generate slug from title if new
        if (name === 'title' && isNew) {
            setFormData(prev => ({
                ...prev,
                title: String(value),
                slug: String(value).toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
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

    const fetchWebinarAttendance = async () => {
        if (isNew || formData.type !== 'webinar') {
            setWebinarAttendance([]);
            return;
        }

        setAttendanceLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/courses/${id}/webinar-attendance/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setWebinarAttendance(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching webinar attendance:', error);
        } finally {
            setAttendanceLoading(false);
        }
    };

    useEffect(() => {
        if (!isNew && formData.type === 'webinar') {
            fetchWebinarAttendance();
        }
    }, [id, isNew, formData.type]);

    const handleMarkAttendance = async (userId: number) => {
        setMarkingAttendanceUserId(userId);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/courses/${id}/webinar-attendance/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                alert(errorData?.error || 'Gagal menyimpan presensi webinar.');
                return;
            }

            await fetchWebinarAttendance();
        } catch (error) {
            console.error('Error marking webinar attendance:', error);
            alert('Gagal menyimpan presensi webinar.');
        } finally {
            setMarkingAttendanceUserId(null);
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
                    {(['course', 'webinar', 'workshop'] as CourseType[]).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setFormData(prev => ({
                                ...prev,
                                type: t,
                                delivery_mode: t === 'webinar' ? 'online' : prev.delivery_mode,
                                is_free: t === 'webinar' ? prev.is_free : false,
                                price: t === 'webinar' && prev.is_free ? '0' : prev.price,
                                discount_price: t === 'webinar' && prev.is_free ? '' : prev.discount_price,
                                has_certification_exam: t === 'course' ? prev.has_certification_exam : false
                            }))}
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
                            {instructors.map((opt) => (
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
                            {categories.map((opt) => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Harga</label>
                        <input
                            name="price"
                            type="text"
                            inputMode="numeric"
                            required={!formData.is_free}
                            disabled={formData.is_free}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.price}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-red-600 font-bold">Harga Diskon (Opsional)</label>
                        <input
                            name="discount_price"
                            type="text"
                            inputMode="numeric"
                            placeholder="Biarkan kosong jika tidak ada diskon"
                            disabled={formData.is_free}
                            className="w-full px-4 py-2 border border-red-200 bg-red-50/30 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-gray-900"
                            value={formData.discount_price}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {formData.type === 'webinar' ? 'Mode Pelaksanaan' : formData.type === 'workshop' ? 'Mode Workshop' : 'Mode Pelatihan'}
                        </label>
                        <select
                            name="delivery_mode"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.type === 'webinar' ? 'online' : formData.delivery_mode}
                            onChange={handleChange}
                            disabled={formData.type === 'webinar'}
                        >
                            <option value="online">Online</option>
                            <option value="offline">Offline</option>
                        </select>
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

                    {(formData.type === 'webinar' || formData.delivery_mode === 'online') && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-rose-600 mb-1 font-bold italic underline">
                                {formData.type === 'webinar' ? 'Link Zoom Webinar' : 'Link Meeting Online'}
                            </label>
                            <input
                                name="zoom_link"
                                type="url"
                                placeholder="https://zoom.us/j/..."
                                className="w-full px-4 py-2 border border-rose-300 bg-rose-50/30 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-gray-900"
                                value={formData.zoom_link}
                                onChange={handleChange}
                            />
                        </div>
                    )}

                    <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-blue-700 font-bold">
                                {formData.type === 'course' ? 'Rentang Tanggal Pelatihan' : 'Rentang Waktu Pelaksanaan'}
                            </label>
                            <p className="mt-1 text-xs text-blue-700">
                                {formData.type === 'course'
                                    ? 'Isi tanggal mulai dan selesai dalam satu bagian agar jadwal pelatihan lebih mudah dibaca.'
                                    : 'Isi waktu mulai dan selesai agar jadwal sesi tampil lebih jelas.'}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-blue-700 mb-1">Tanggal Mulai</label>
                                <input
                                    name="scheduled_at"
                                    type="datetime-local"
                                    required={formData.type === 'course'}
                                    className="w-full px-4 py-2 border border-blue-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                    value={formData.scheduled_at}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-blue-700 mb-1">Tanggal Selesai</label>
                                <input
                                    name="scheduled_end_at"
                                    type="datetime-local"
                                    required={formData.type === 'course'}
                                    className="w-full px-4 py-2 border border-blue-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                    value={formData.scheduled_end_at}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        {formData.type === 'course' && (
                            <p className="text-xs text-blue-700">Status pelatihan akan otomatis nonaktif setelah tanggal selesai terlewati.</p>
                        )}
                    </div>
                    {(formData.type === 'workshop' || formData.type === 'course') && formData.delivery_mode === 'offline' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {formData.type === 'workshop' ? 'Lokasi Workshop Offline' : 'Lokasi Pelatihan Offline'}
                            </label>
                            <input
                                name="location"
                                type="text"
                                placeholder="Nama tempat atau alamat"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                value={formData.location}
                                onChange={handleChange}
                            />
                        </div>
                    )}

                    {formData.type === 'webinar' && (
                        <div className="md:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition">
                                <input
                                    name="is_free"
                                    type="checkbox"
                                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                    checked={formData.is_free}
                                    onChange={handleChange}
                                />
                                <span className="text-emerald-900 font-bold">Webinar Gratis</span>
                            </label>
                        </div>
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

                    {formData.type === 'course' && (
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition">
                                <input
                                    name="has_certification_exam"
                                    type="checkbox"
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                    checked={formData.has_certification_exam}
                                    onChange={handleChange}
                                />
                                <span className="text-indigo-900 font-bold">Sediakan Ujian Sertifikasi</span>
                            </label>
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
                        {saving ? 'Menyimpan...' : 'Simpan Kursus'}
                    </button>
                </div>
            </form>

            {!isNew && formData.type === 'course' && formData.has_certification_exam && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-t border-gray-100 pt-8 pb-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Ujian Sertifikasi</h2>
                            <p className="text-sm text-gray-500">Kelola ujian akhir dan koordinasi instruktur untuk sertifikasi kelulusan.</p>
                        </div>
                    </div>

                    <ExamManager courseId={parseInt(id)} />
                </div>
            )}

            {!isNew && formData.type === 'webinar' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-t border-gray-100 pt-8 pb-4">
                        <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-rose-200">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Presensi Webinar</h2>
                            <p className="text-sm text-gray-500">Tandai peserta yang hadir. Sertifikat webinar baru akan masuk ke validasi admin setelah presensi tercatat.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Peserta</th>
                                        <th className="px-6 py-3 text-left">Email</th>
                                        <th className="px-6 py-3 text-left">Presensi</th>
                                        <th className="px-6 py-3 text-left">Waktu Hadir</th>
                                        <th className="px-6 py-3 text-left">Sertifikat</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {attendanceLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Memuat presensi webinar...</td>
                                        </tr>
                                    ) : webinarAttendance.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Belum ada peserta webinar yang terdaftar.</td>
                                        </tr>
                                    ) : webinarAttendance.map(item => (
                                        <tr key={item.user_id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{item.attendee_name || item.user_name}</div>
                                                <div className="mt-1 text-xs text-gray-500 space-y-1">
                                                    <div>{item.attendee_position || '-'}</div>
                                                    <div>{item.attendee_company || '-'}</div>
                                                    <div>{item.attendee_phone || '-'}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{item.attendee_email || item.email || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.is_present ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {item.is_present ? 'Hadir' : 'Belum Presensi'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {item.attended_at ? new Date(item.attended_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.certificate_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : item.certificate_status === 'PENDING' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {item.certificate_status === 'APPROVED' ? 'Disetujui' : item.certificate_status === 'PENDING' ? 'Menunggu Validasi' : 'Belum Ada'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleMarkAttendance(item.user_id)}
                                                    disabled={item.is_present || markingAttendanceUserId === item.user_id}
                                                    className="inline-flex items-center gap-2 bg-rose-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-rose-700 transition disabled:bg-rose-300 disabled:cursor-not-allowed"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    {item.is_present ? 'Sudah Hadir' : markingAttendanceUserId === item.user_id ? 'Menyimpan...' : 'Tandai Hadir'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
