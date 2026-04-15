'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Award, CheckCircle2, Users, Plus, Trash2, LayoutList, BriefcaseBusiness, LaptopMinimal } from 'lucide-react';
import Link from 'next/link';
import ExamManager from '@/components/exam/ExamManager';
import { Category, Instructor, PublicTrainingSession, TrainingDetailSection } from '@/types';
import { formatNumberInput, normalizePriceForApi } from '@/types/currency';
import { createTodayDateTimeInputAtStartOfDay, formatApiDateTimeForInput, formatInputDateTimeForApi, normalizeDateTimeInputToStartOfDay } from '@/types/datetime';

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

interface CourseFormState {
    title: string;
    slug: string;
    description: string;
    price: string;
    level: string;
    duration: string;
    instructor_id: string | number;
    category_id: string | number;
    is_featured: boolean;
    discount_price: string;
    type: CourseType;
    delivery_mode: DeliveryMode;
    scheduled_at: string;
    scheduled_end_at: string;
    location: string;
    zoom_link: string;
    is_free: boolean;
    has_certification_exam: boolean;
    thumbnail: File | null;
    thumbnail_preview: string;
    detail_sections: TrainingDetailSection[];
    public_training_enabled: boolean;
    public_training_intro: string;
    public_sessions: PublicTrainingSession[];
    inhouse_training_enabled: boolean;
    inhouse_training_intro: string;
    inhouse_training_benefits: string[];
    elearning_enabled: boolean;
    elearning_intro: string;
}

interface RecommendedDetailSectionTemplate {
    key: string;
    title: string;
    helperText: string;
    bodyPlaceholder: string;
    itemsPlaceholder: string;
    prefillFromDescription?: boolean;
}

function makeClientId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const RECOMMENDED_DETAIL_SECTION_TEMPLATES: RecommendedDetailSectionTemplate[] = [
    {
        key: 'gambaran-pelatihan',
        title: 'Gambaran Pelatihan',
        helperText: 'Isi dengan ringkasan konteks training, masalah yang disasar, dan nilai utama program.',
        bodyPlaceholder: 'Jelaskan gambaran umum training ini, konteks penggunaannya, dan alasan topik ini penting untuk peserta.',
        itemsPlaceholder: 'Satu highlight per baris\nContoh: Fokus pada implementasi standar di lingkungan kerja nyata',
        prefillFromDescription: true,
    },
    {
        key: 'tujuan-pembelajaran',
        title: 'Tujuan Pembelajaran',
        helperText: 'Jelaskan kemampuan atau pemahaman yang diharapkan setelah peserta menyelesaikan training.',
        bodyPlaceholder: 'Tulis tujuan pembelajaran utama yang ingin dicapai peserta setelah mengikuti training.',
        itemsPlaceholder: 'Satu tujuan per baris\nContoh: Memahami prinsip audit berbasis risiko',
    },
    {
        key: 'materi-yang-dipelajari',
        title: 'Materi yang Dipelajari',
        helperText: 'Rangkum cakupan materi inti yang akan dibahas selama training.',
        bodyPlaceholder: 'Jelaskan ruang lingkup materi yang akan dipelajari peserta dari awal sampai akhir.',
        itemsPlaceholder: 'Satu materi per baris\nContoh: Interpretasi klausul ISO 9001:2015',
    },
    {
        key: 'peserta-yang-disarankan',
        title: 'Peserta yang Disarankan',
        helperText: 'Tentukan profil peserta yang paling relevan agar calon pendaftar cepat mengenali kecocokannya.',
        bodyPlaceholder: 'Sebutkan siapa yang paling tepat mengikuti training ini dan dalam kondisi seperti apa training ini dibutuhkan.',
        itemsPlaceholder: 'Satu profil peserta per baris\nContoh: Quality assurance staff yang terlibat dalam audit internal',
    },
    {
        key: 'hasil-yang-akan-didapat',
        title: 'Hasil yang Akan Didapat',
        helperText: 'Jelaskan output praktis atau manfaat akhir yang dibawa pulang oleh peserta.',
        bodyPlaceholder: 'Tulis hasil nyata, perubahan kerja, atau deliverable yang bisa didapat peserta setelah training.',
        itemsPlaceholder: 'Satu hasil per baris\nContoh: Mampu menyusun rencana tindak lanjut pasca audit',
    },
];

function normalizeTemplateKey(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function createDetailSection(overrides: Partial<TrainingDetailSection> = {}): TrainingDetailSection {
    return {
        id: String(overrides.id || makeClientId('detail')),
        title: overrides.title || '',
        body: overrides.body || '',
        items: Array.isArray(overrides.items) ? [...overrides.items] : [],
    };
}

function createEmptyDetailSection(): TrainingDetailSection {
    return createDetailSection();
}

function createEmptyPublicSession(deliveryMode: DeliveryMode = 'online'): PublicTrainingSession {
    return {
        id: makeClientId('public'),
        title: '',
        delivery_mode: deliveryMode,
        schedule: '',
        location: '',
        duration: '',
        price: '',
        badge: '',
        cta_label: 'Daftar Sekarang',
        cta_url: '',
    };
}

function normalizeDetailSections(value: unknown): TrainingDetailSection[] {
    if (!Array.isArray(value)) return [];

    return value.map((section, index) => {
        const source = section && typeof section === 'object' ? section as Partial<TrainingDetailSection> : {};
        return {
            id: String(source.id || makeClientId(`detail-${index + 1}`)),
            title: source.title || '',
            body: source.body || '',
            items: Array.isArray(source.items) ? source.items.filter(Boolean) : [],
        };
    });
}

function normalizePublicSessions(value: unknown): PublicTrainingSession[] {
    if (!Array.isArray(value)) return [];

    return value.map((session, index) => {
        const source = session && typeof session === 'object' ? session as Partial<PublicTrainingSession> : {};
        return {
            id: String(source.id || makeClientId(`public-${index + 1}`)),
            title: source.title || '',
            delivery_mode: source.delivery_mode === 'offline' ? 'offline' : 'online',
            schedule: source.schedule || '',
            location: source.location || '',
            duration: source.duration || '',
            price: formatNumberInput(source.price),
            badge: source.badge || '',
            cta_label: source.cta_label || 'Daftar Sekarang',
            cta_url: source.cta_url || '',
        };
    });
}

function buildRecommendedDetailSections(description = ''): TrainingDetailSection[] {
    return RECOMMENDED_DETAIL_SECTION_TEMPLATES.map(template => createDetailSection({
        id: makeClientId(`detail-${template.key}`),
        title: template.title,
        body: template.prefillFromDescription ? description.trim() : '',
        items: [],
    }));
}

function alignDetailSectionsWithTemplate(
    detailSections: TrainingDetailSection[],
    description = ''
): TrainingDetailSection[] {
    const remainingSections = [...detailSections];

    const alignedSections = RECOMMENDED_DETAIL_SECTION_TEMPLATES.map(template => {
        const sectionIndex = remainingSections.findIndex(section =>
            normalizeTemplateKey(section.title || '') === normalizeTemplateKey(template.title)
        );

        if (sectionIndex >= 0) {
            const [matchedSection] = remainingSections.splice(sectionIndex, 1);
            return createDetailSection({
                ...matchedSection,
                title: matchedSection.title || template.title,
                body: matchedSection.body || (template.prefillFromDescription ? description.trim() : ''),
            });
        }

        return createDetailSection({
            id: makeClientId(`detail-${template.key}`),
            title: template.title,
            body: template.prefillFromDescription ? description.trim() : '',
        });
    });

    return [...alignedSections, ...remainingSections];
}

function findRecommendedDetailSectionTemplate(title: string) {
    return RECOMMENDED_DETAIL_SECTION_TEMPLATES.find(template =>
        normalizeTemplateKey(template.title) === normalizeTemplateKey(title || '')
    );
}

function createInitialFormData(): CourseFormState {
    return {
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
        delivery_mode: 'online',
        scheduled_at: '',
        scheduled_end_at: '',
        location: '',
        zoom_link: '',
        is_free: false,
        has_certification_exam: false,
        thumbnail: null,
        thumbnail_preview: '',
        detail_sections: buildRecommendedDetailSections(),
        public_training_enabled: false,
        public_training_intro: '',
        public_sessions: [
            createEmptyPublicSession('online'),
            createEmptyPublicSession('offline'),
        ],
        inhouse_training_enabled: false,
        inhouse_training_intro: '',
        inhouse_training_benefits: [],
        elearning_enabled: true,
        elearning_intro: '',
    };
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
    const [seededDateTimeFields, setSeededDateTimeFields] = useState<Partial<Record<'scheduled_at' | 'scheduled_end_at', string>>>({});

    // Dropdown data
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [formData, setFormData] = useState<CourseFormState>(() => createInitialFormData());

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
                            has_certification_exam: data.has_certification_exam || false,
                            thumbnail: null,
                            thumbnail_preview: data.thumbnail || '',
                            detail_sections: normalizeDetailSections(data.detail_sections),
                            public_training_enabled: Boolean(data.public_training_enabled),
                            public_training_intro: data.public_training_intro || '',
                            public_sessions: normalizePublicSessions(data.public_sessions),
                            inhouse_training_enabled: Boolean(data.inhouse_training_enabled),
                            inhouse_training_intro: data.inhouse_training_intro || '',
                            inhouse_training_benefits: Array.isArray(data.inhouse_training_benefits) ? data.inhouse_training_benefits.filter(Boolean) : [],
                            elearning_enabled: data.elearning_enabled ?? true,
                            elearning_intro: data.elearning_intro || ''
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

        if (!isCheckbox && (name === 'scheduled_at' || name === 'scheduled_end_at')) {
            value = normalizeDateTimeInputToStartOfDay(String(value));
            setSeededDateTimeFields(prev => {
                const next = { ...prev };
                delete next[name as 'scheduled_at' | 'scheduled_end_at'];
                return next;
            });
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

    const handleDetailSectionChange = (sectionId: string, field: 'title' | 'body', value: string) => {
        setFormData(prev => ({
            ...prev,
            detail_sections: prev.detail_sections.map(section =>
                section.id === sectionId ? { ...section, [field]: value } : section
            )
        }));
    };

    const handleDetailSectionItemsChange = (sectionId: string, value: string) => {
        const items = value
            .split('\n')
            .map(item => item.trim())
            .filter(Boolean);

        setFormData(prev => ({
            ...prev,
            detail_sections: prev.detail_sections.map(section =>
                section.id === sectionId ? { ...section, items } : section
            )
        }));
    };

    const addDetailSection = () => {
        setFormData(prev => ({
            ...prev,
            detail_sections: [...prev.detail_sections, createEmptyDetailSection()]
        }));
    };

    const removeDetailSection = (sectionId: string) => {
        setFormData(prev => ({
            ...prev,
            detail_sections: prev.detail_sections.filter(section => section.id !== sectionId)
        }));
    };

    const handlePublicSessionChange = (
        sessionId: string,
        field: keyof PublicTrainingSession,
        value: string
    ) => {
        setFormData(prev => ({
            ...prev,
            public_sessions: prev.public_sessions.map(session => {
                if (session.id !== sessionId) return session;

                return {
                    ...session,
                    [field]: field === 'price' ? formatNumberInput(value) : value
                };
            })
        }));
    };

    const addPublicSession = (deliveryMode: DeliveryMode) => {
        setFormData(prev => ({
            ...prev,
            public_sessions: [...prev.public_sessions, createEmptyPublicSession(deliveryMode)]
        }));
    };

    const removePublicSession = (sessionId: string) => {
        setFormData(prev => ({
            ...prev,
            public_sessions: prev.public_sessions.filter(session => session.id !== sessionId)
        }));
    };

    const handleInhouseBenefitsChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            inhouse_training_benefits: value
                .split('\n')
                .map(item => item.trim())
                .filter(Boolean)
        }));
    };

    const applyRecommendedDetailSections = () => {
        setFormData(prev => ({
            ...prev,
            detail_sections: alignDetailSectionsWithTemplate(prev.detail_sections, prev.description)
        }));
    };

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;

        if (!file) {
            return;
        }

        setFormData(prev => {
            if (prev.thumbnail_preview.startsWith('blob:')) {
                URL.revokeObjectURL(prev.thumbnail_preview);
            }

            return {
                ...prev,
                thumbnail: file,
                thumbnail_preview: URL.createObjectURL(file)
            };
        });
    };

    const seedDateTimeField = (field: 'scheduled_at' | 'scheduled_end_at') => {
        if (formData[field]) {
            return;
        }

        const seededValue = createTodayDateTimeInputAtStartOfDay();
        if (!seededValue) {
            return;
        }

        setFormData(prev => ({
            ...prev,
            [field]: seededValue
        }));
        setSeededDateTimeFields(prev => ({
            ...prev,
            [field]: seededValue
        }));
    };

    const handleDateTimeFieldBlur = (field: 'scheduled_at' | 'scheduled_end_at') => {
        const seededValue = seededDateTimeFields[field];
        if (seededValue && formData[field] === seededValue) {
            setFormData(prev => ({
                ...prev,
                [field]: ''
            }));
        }

        setSeededDateTimeFields(prev => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
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
            const normalizedDetailSections = formData.detail_sections
                .map(section => ({
                    id: section.id,
                    title: section.title.trim(),
                    body: section.body.trim(),
                    items: (section.items || []).map(item => item.trim()).filter(Boolean)
                }))
                .filter(section => section.title || section.body || section.items.length > 0);
            const normalizedPublicSessions = formData.public_sessions
                .map(session => ({
                    ...session,
                    title: session.title.trim(),
                    schedule: session.schedule.trim(),
                    location: session.location.trim(),
                    duration: session.duration.trim(),
                    badge: session.badge?.trim() || '',
                    cta_label: session.cta_label?.trim() || 'Daftar Sekarang',
                    cta_url: session.cta_url?.trim() || '',
                    price: normalizePriceForApi(session.price) || ''
                }))
                .filter(session => session.title || session.schedule || session.location || session.price || session.cta_url);
            const payload = new FormData();

            payload.append('title', formData.title);
            payload.append('slug', formData.slug);
            payload.append('description', formData.description);
            payload.append('price', normalizePriceForApi(formData.price));
            payload.append('level', formData.level);
            payload.append('duration', formData.duration);
            payload.append('instructor_id', String(formData.instructor_id));
            payload.append('category_id', String(formData.category_id));
            payload.append('is_featured', String(formData.is_featured));
            payload.append('discount_price', normalizePriceForApi(formData.discount_price));
            payload.append('type', formData.type);
            payload.append('delivery_mode', formData.type === 'webinar' ? 'online' : formData.delivery_mode);
            payload.append('scheduled_at', formatInputDateTimeForApi(formData.scheduled_at) || '');
            payload.append('scheduled_end_at', formatInputDateTimeForApi(formData.scheduled_end_at) || '');
            payload.append('location', formData.location);
            payload.append('zoom_link', formData.zoom_link);
            payload.append('is_free', String(formData.is_free));
            payload.append('has_certification_exam', String(formData.has_certification_exam));
            payload.append('detail_sections', JSON.stringify(normalizedDetailSections));
            payload.append('public_training_enabled', String(formData.public_training_enabled));
            payload.append('public_training_intro', formData.public_training_intro);
            payload.append('public_sessions', JSON.stringify(normalizedPublicSessions));
            payload.append('inhouse_training_enabled', String(formData.inhouse_training_enabled));
            payload.append('inhouse_training_intro', formData.inhouse_training_intro);
            payload.append(
                'inhouse_training_benefits',
                JSON.stringify(formData.inhouse_training_benefits.map(item => item.trim()).filter(Boolean))
            );
            payload.append('elearning_enabled', String(formData.elearning_enabled));
            payload.append('elearning_intro', formData.elearning_intro);

            if (formData.thumbnail) {
                payload.append('thumbnail', formData.thumbnail);
            }

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: payload
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

    const fetchWebinarAttendance = useCallback(async () => {
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
    }, [formData.type, id, isNew]);

    useEffect(() => {
        if (!isNew && formData.type === 'webinar') {
            fetchWebinarAttendance();
        }
    }, [fetchWebinarAttendance, isNew, formData.type]);

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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ringkasan Kursus</label>
                        <p className="mb-2 text-xs leading-5 text-gray-500">
                            Ringkasan ini tampil di bagian atas halaman course. Untuk isi yang mengikuti daftar isi
                            di `/courses/[slug]`, gunakan blok detail di bawah agar format antar course tetap seragam.
                        </p>
                        <textarea
                            name="description"
                            rows={5}
                            required
                            placeholder="Tulis ringkasan 2-4 kalimat tentang fokus training, manfaat utamanya, dan konteks penerapannya."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gambar Course</label>
                        <p className="mb-2 text-xs leading-5 text-gray-500">
                            Gambar ini dipakai untuk kartu course dan tampilan depan detail course.
                        </p>
                        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 aspect-[4/3]">
                                {formData.thumbnail_preview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={formData.thumbnail_preview}
                                        alt={formData.title || 'Preview course'}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-400">
                                        Belum ada gambar course
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleThumbnailChange}
                                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-700"
                                />
                                <p className="text-xs text-gray-500">
                                    Rekomendasi rasio 4:3 atau landscape agar kartu course di halaman depan terlihat rapi.
                                </p>
                            </div>
                        </div>
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
                                    step={60}
                                    required={formData.type === 'course'}
                                    className="w-full px-4 py-2 border border-blue-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                    value={formData.scheduled_at}
                                    onChange={handleChange}
                                    onFocus={() => seedDateTimeField('scheduled_at')}
                                    onBlur={() => handleDateTimeFieldBlur('scheduled_at')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-blue-700 mb-1">Tanggal Selesai</label>
                                <input
                                    name="scheduled_end_at"
                                    type="datetime-local"
                                    step={60}
                                    required={formData.type === 'course'}
                                    className="w-full px-4 py-2 border border-blue-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                    value={formData.scheduled_end_at}
                                    onChange={handleChange}
                                    onFocus={() => seedDateTimeField('scheduled_end_at')}
                                    onBlur={() => handleDateTimeFieldBlur('scheduled_end_at')}
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
                                <span className="text-indigo-900 font-bold">Sediakan Ujian Akhir</span>
                            </label>
                        </div>
                    )}

                    {formData.type === 'course' && (
                        <>
                            <div className="md:col-span-2 border-t border-gray-100 pt-6">
                                <div className="flex items-center justify-between gap-4 mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            <LayoutList className="w-5 h-5 text-blue-600" />
                                            Konten Detail & Daftar Isi
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Bagian ini akan ditampilkan sebagai anchor section pada halaman detail training.
                                            Gunakan urutan standar agar pengisian lebih rapi dan konsisten.
                                        </p>
                                        <p className="mt-2 text-xs leading-5 text-gray-500">
                                            Urutan rekomendasi: {RECOMMENDED_DETAIL_SECTION_TEMPLATES.map(template => template.title).join(' | ')}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={applyRecommendedDetailSections}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition"
                                        >
                                            Rapikan Template
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addDetailSection}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Tambah Bagian
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {formData.detail_sections.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500 text-center">
                                            Belum ada section detail. Klik tombol Rapikan Template untuk mengisi struktur standar
                                            seperti Gambaran Pelatihan, Tujuan, Materi, Peserta, dan Hasil.
                                        </div>
                                    ) : formData.detail_sections.map((section, index) => {
                                        const template = findRecommendedDetailSectionTemplate(section.title);

                                        return (
                                            <div key={section.id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 space-y-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-xs font-bold uppercase tracking-wide text-blue-600">Bagian #{index + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDetailSection(section.id)}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Hapus
                                                    </button>
                                                </div>
                                                {template && (
                                                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
                                                        {template.helperText}
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Judul Bagian</label>
                                                    <input
                                                        type="text"
                                                        value={section.title}
                                                        onChange={(e) => handleDetailSectionChange(section.id, 'title', e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                        placeholder="Contoh: Tujuan Pembelajaran"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Isi Utama</label>
                                                    <textarea
                                                        rows={4}
                                                        value={section.body}
                                                        onChange={(e) => handleDetailSectionChange(section.id, 'body', e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                        placeholder={template?.bodyPlaceholder || 'Tulis narasi utama untuk bagian ini.'}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Daftar Poin</label>
                                                    <textarea
                                                        rows={4}
                                                        value={section.items.join('\n')}
                                                        onChange={(e) => handleDetailSectionItemsChange(section.id, e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                        placeholder={template?.itemsPlaceholder || 'Satu poin per baris\nContoh: Memahami konsep dasar kalibrasi'}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="md:col-span-2 border-t border-gray-100 pt-6 space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Pengaturan Penawaran Training</h2>
                                    <p className="text-sm text-gray-500 mt-1">Aktifkan kategori yang akan muncul pada halaman detail: public, inhouse, dan e-learning.</p>
                                </div>

                                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            name="public_training_enabled"
                                            type="checkbox"
                                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                            checked={formData.public_training_enabled}
                                            onChange={handleChange}
                                        />
                                        <span className="font-bold text-blue-900">Aktifkan Public Training</span>
                                    </label>
                                    <textarea
                                        name="public_training_intro"
                                        rows={3}
                                        value={formData.public_training_intro}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                        placeholder="Ringkasan public training untuk tab public."
                                    />

                                    {formData.public_training_enabled && (
                                        <div className="space-y-5">
                                            {(['online', 'offline'] as DeliveryMode[]).map(mode => (
                                                <div key={mode} className="rounded-2xl border border-white/70 bg-white p-4 space-y-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <h3 className="font-bold text-gray-900">Public {mode === 'online' ? 'Online' : 'Offline'}</h3>
                                                            <p className="text-xs text-gray-500">Tambahkan satu atau lebih opsi agar user bisa melihat pilihan per mode.</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => addPublicSession(mode)}
                                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            Tambah {mode === 'online' ? 'Online' : 'Offline'}
                                                        </button>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {formData.public_sessions.filter(session => session.delivery_mode === mode).length === 0 ? (
                                                            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-700">
                                                                Belum ada opsi public {mode === 'online' ? 'online' : 'offline'}.
                                                            </div>
                                                        ) : formData.public_sessions
                                                            .filter(session => session.delivery_mode === mode)
                                                            .map(session => (
                                                                <div key={session.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Opsi Public</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removePublicSession(session.id)}
                                                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                            Hapus
                                                                        </button>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                                                                            <input
                                                                                type="text"
                                                                                value={session.title}
                                                                                onChange={(e) => handlePublicSessionChange(session.id, 'title', e.target.value)}
                                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                                                placeholder="Contoh: Kelas Batch April"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                                                                            <input
                                                                                type="text"
                                                                                value={session.badge || ''}
                                                                                onChange={(e) => handlePublicSessionChange(session.id, 'badge', e.target.value)}
                                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                                                placeholder="Contoh: Running Class"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Jadwal</label>
                                                                            <input
                                                                                type="text"
                                                                                value={session.schedule}
                                                                                onChange={(e) => handlePublicSessionChange(session.id, 'schedule', e.target.value)}
                                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                                                placeholder="Contoh: 24-25 Mei 2026"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Durasi</label>
                                                                            <input
                                                                                type="text"
                                                                                value={session.duration}
                                                                                onChange={(e) => handlePublicSessionChange(session.id, 'duration', e.target.value)}
                                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                                                placeholder="Contoh: 2 Hari"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi / Platform</label>
                                                                            <input
                                                                                type="text"
                                                                                value={session.location}
                                                                                onChange={(e) => handlePublicSessionChange(session.id, 'location', e.target.value)}
                                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                                                placeholder={mode === 'online' ? 'Zoom / Google Meet' : 'Nama hotel / alamat'}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Harga</label>
                                                                            <input
                                                                                type="text"
                                                                                inputMode="numeric"
                                                                                value={session.price}
                                                                                onChange={(e) => handlePublicSessionChange(session.id, 'price', e.target.value)}
                                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                                                placeholder="Contoh: 2.500.000"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Label Tombol</label>
                                                                            <input
                                                                                type="text"
                                                                                value={session.cta_label || ''}
                                                                                onChange={(e) => handlePublicSessionChange(session.id, 'cta_label', e.target.value)}
                                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                                                placeholder="Contoh: Daftar via WhatsApp"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">URL Tombol</label>
                                                                            <input
                                                                                type="url"
                                                                                value={session.cta_url || ''}
                                                                                onChange={(e) => handlePublicSessionChange(session.id, 'cta_url', e.target.value)}
                                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                                                placeholder="https://..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            name="inhouse_training_enabled"
                                            type="checkbox"
                                            className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 border-gray-300"
                                            checked={formData.inhouse_training_enabled}
                                            onChange={handleChange}
                                        />
                                        <span className="font-bold text-amber-900 flex items-center gap-2">
                                            <BriefcaseBusiness className="w-4 h-4" />
                                            Aktifkan Inhouse Training
                                        </span>
                                    </label>
                                    <textarea
                                        name="inhouse_training_intro"
                                        rows={3}
                                        value={formData.inhouse_training_intro}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-gray-900 bg-white"
                                        placeholder="Ringkasan untuk tab inhouse training."
                                    />
                                    <div>
                                        <label className="block text-sm font-medium text-amber-900 mb-1">Benefit Inhouse</label>
                                        <textarea
                                            rows={4}
                                            value={formData.inhouse_training_benefits.join('\n')}
                                            onChange={(e) => handleInhouseBenefitsChange(e.target.value)}
                                            className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-gray-900 bg-white"
                                            placeholder={'Satu benefit per baris\nContoh: Materi dapat disesuaikan dengan kebutuhan perusahaan'}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            name="elearning_enabled"
                                            type="checkbox"
                                            className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                            checked={formData.elearning_enabled}
                                            onChange={handleChange}
                                        />
                                        <span className="font-bold text-emerald-900 flex items-center gap-2">
                                            <LaptopMinimal className="w-4 h-4" />
                                            Aktifkan E-Learning
                                        </span>
                                    </label>
                                    <textarea
                                        name="elearning_intro"
                                        rows={3}
                                        value={formData.elearning_intro}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 bg-white"
                                        placeholder="Ringkasan untuk tab e-learning. Jika aktif, CTA checkout akan memakai harga course yang ada saat ini."
                                    />
                                </div>
                            </div>
                        </>
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
                            <h2 className="text-xl font-bold text-gray-900">Ujian Akhir</h2>
                            <p className="text-sm text-gray-500">Kelola ujian akhir dan koordinasi jadwal dengan instruktur.</p>
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
