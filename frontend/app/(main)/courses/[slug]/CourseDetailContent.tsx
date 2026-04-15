'use client';

import Link from 'next/link';
import {
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    Clock3,
    FileText,
    GraduationCap,
    LayoutList,
    MapPin,
    MessageSquare,
    Star,
    ThumbsUp
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/context/CartContext';
import AddToCartModal from '@/components/AddToCartModal';
import StudentExamSection from '@/components/exam/StudentExamSection';
import { Course, InhouseTrainingRequest, PublicTrainingSession, TrainingDetailSection } from '@/types';

const REVIEWS = [
    {
        name: 'Budi Santoso',
        role: 'Quality Manager, PT Astra',
        avatar: 'B',
        color: 'bg-blue-500',
        rating: 5,
        date: 'Jan 2026',
        likes: 24,
        text: 'Materinya runut, mudah diikuti, dan langsung bisa dipakai untuk menyusun perbaikan proses di perusahaan.'
    },
    {
        name: 'Siti Rahayu',
        role: 'HSE Officer, Pertamina',
        avatar: 'S',
        color: 'bg-emerald-500',
        rating: 5,
        date: 'Des 2025',
        likes: 17,
        text: 'Bagian studi kasus dan diskusinya membantu sekali karena dekat dengan tantangan operasional sehari-hari.'
    },
    {
        name: 'Ahmad Fauzi',
        role: 'Lead Auditor, BCA',
        avatar: 'A',
        color: 'bg-indigo-500',
        rating: 5,
        date: 'Nov 2025',
        likes: 13,
        text: 'Format pelatihannya fleksibel. Tim kami akhirnya mengambil jalur inhouse karena kebutuhannya bisa sangat spesifik.'
    },
];

type TrainingOfferKey = 'public' | 'inhouse' | 'elearning';

interface InhouseFormState {
    company_name: string;
    contact_name: string;
    email: string;
    phone: string;
    position: string;
    participants_count: number;
    preferred_mode: 'online' | 'offline' | 'hybrid';
    target_date: string;
    training_goals: string;
    notes: string;
}

const initialInhouseForm: InhouseFormState = {
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    position: '',
    participants_count: 5,
    preferred_mode: 'offline',
    target_date: '',
    training_goals: '',
    notes: '',
};

function formatRupiah(value?: string | number | null) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return 'Hubungi Tim';
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatDateRange(start?: string, end?: string) {
    if (!start) return 'Jadwal fleksibel';

    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    const startLabel = startDate.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    if (!endDate) return `${startLabel} WIB`;

    const endLabel = endDate.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `${startLabel} - ${endLabel} WIB`;
}

function slugifyAnchor(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'bagian';
}

function normalizeDetailSections(course: Course): TrainingDetailSection[] {
    if (Array.isArray(course.detail_sections) && course.detail_sections.length > 0) {
        return course.detail_sections.map((section, index) => ({
            id: section.id || `detail-${index + 1}`,
            title: section.title || `Bagian ${index + 1}`,
            body: section.body || '',
            items: Array.isArray(section.items) ? section.items : [],
        }));
    }

    return [
        {
            id: 'tentang-pelatihan',
            title: 'Tentang Pelatihan',
            body: course.description || '',
            items: [],
        }
    ];
}

function buildFallbackPublicSessions(course: Course): PublicTrainingSession[] {
    if (Array.isArray(course.public_sessions) && course.public_sessions.length > 0) {
        return course.public_sessions;
    }

    return [
        {
            id: 'public-online',
            title: `${course.title} - Public Online`,
            delivery_mode: 'online',
            schedule: formatDateRange(course.scheduled_at, course.scheduled_end_at),
            location: course.zoom_link ? 'Live virtual class' : 'Platform online akan diinformasikan',
            duration: course.duration || 'Sesuai agenda',
            price: course.price,
            badge: 'Online Class',
            cta_label: 'Konsultasikan Jadwal',
            cta_url: '',
        },
        {
            id: 'public-offline',
            title: `${course.title} - Public Offline`,
            delivery_mode: 'offline',
            schedule: formatDateRange(course.scheduled_at, course.scheduled_end_at),
            location: course.location || 'Lokasi akan diinformasikan',
            duration: course.duration || 'Sesuai agenda',
            price: course.price,
            badge: 'Tatap Muka',
            cta_label: 'Konsultasikan Jadwal',
            cta_url: '',
        },
    ];
}

function renderParagraphs(text: string) {
    return text
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
            <p key={`${paragraph.slice(0, 16)}-${index}`} className="text-gray-600 leading-7">
                {paragraph}
            </p>
        ));
}

function StarRow({ count, filled }: { count: number; filled: boolean }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, index) => (
                <Star
                    key={index}
                    className={`w-3.5 h-3.5 ${index < count && filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
                />
            ))}
        </div>
    );
}

function ReviewsSection({ rating }: { rating: string | number }) {
    const [showAll, setShowAll] = useState(false);
    const avg = Number(rating) || 4.9;
    const displayed = showAll ? REVIEWS : REVIEWS.slice(0, 3);
    const dist = [
        { stars: 5, pct: 74 },
        { stars: 4, pct: 18 },
        { stars: 3, pct: 5 },
        { stars: 2, pct: 2 },
        { stars: 1, pct: 1 },
    ];

    return (
        <div className="space-y-6 scroll-mt-44" id="ulasan">
            <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Ulasan Peserta</h2>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
                <div className="text-center">
                    <div className="text-6xl font-extrabold text-gray-900">{avg.toFixed(1)}</div>
                    <div className="flex justify-center mt-3 mb-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                            <Star
                                key={value}
                                className={`w-5 h-5 ${value <= Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-gray-500">Rata-rata penilaian peserta</p>
                </div>
                <div className="space-y-3">
                    {dist.map(({ stars, pct }) => (
                        <div key={stars} className="flex items-center gap-3 text-sm">
                            <div className="w-20 flex justify-end">
                                <StarRow count={stars} filled />
                            </div>
                            <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-10 text-right text-gray-500 font-medium">{pct}%</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-4">
                {displayed.map((review, index) => (
                    <div key={index} className="bg-white rounded-2xl border border-gray-100 p-6">
                        <div className="flex items-start gap-4">
                            <div className={`w-11 h-11 rounded-full text-white font-bold flex items-center justify-center ${review.color}`}>
                                {review.avatar}
                            </div>
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <div>
                                        <div className="font-bold text-gray-900">{review.name}</div>
                                        <div className="text-sm text-gray-500">{review.role}</div>
                                    </div>
                                    <span className="text-xs text-gray-400">{review.date}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mb-3">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star
                                            key={star}
                                            className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
                                        />
                                    ))}
                                    <span className="text-xs font-bold text-gray-700 ml-1">{review.rating}.0</span>
                                </div>
                                <p className="text-gray-600 leading-7">{review.text}</p>
                                <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-400">
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    Membantu ({review.likes})
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {REVIEWS.length > 3 && (
                <div className="text-center">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="px-6 py-2.5 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                        {showAll ? 'Tampilkan Lebih Sedikit' : `Lihat Semua ${REVIEWS.length} Ulasan`}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function CourseDetailContent({ slug }: { slug: string }) {
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeOffer, setActiveOffer] = useState<TrainingOfferKey>('public');
    const [activePublicMode, setActivePublicMode] = useState<'online' | 'offline'>('online');
    const [inhouseForm, setInhouseForm] = useState<InhouseFormState>(initialInhouseForm);
    const [inhouseSubmitting, setInhouseSubmitting] = useState(false);
    const [inhouseSuccess, setInhouseSuccess] = useState('');
    const [inhouseError, setInhouseError] = useState('');

    const { refreshCart } = useCart();
    const [isAdding, setIsAdding] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
                const decodedSlug = decodeURIComponent(slug);
                const res = await fetch(`${apiUrl}/api/courses/${decodedSlug}/`);

                if (!res.ok) {
                    setCourse(null);
                    return;
                }

                const data = await res.json();
                setCourse(data);
            } catch (error) {
                console.error('Error fetching course:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [slug]);

    const availableOffers = useMemo(() => {
        if (!course) return [] as Array<{ key: TrainingOfferKey; label: string }>;

        return [
            { key: 'public', label: 'Public' },
            { key: 'inhouse', label: 'Inhouse' },
            { key: 'elearning', label: 'E-Learning' },
        ] as Array<{ key: TrainingOfferKey; label: string }>;
    }, [course]);

    useEffect(() => {
        if (!availableOffers.length) return;
        if (!availableOffers.some(offer => offer.key === activeOffer)) {
            setActiveOffer(availableOffers[0].key);
        }
    }, [activeOffer, availableOffers]);

    const addToCart = async () => {
        if (!course) return;

        setIsAdding(true);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const res = await fetch(`${apiUrl}/api/cart/add_item/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ course_id: course.id })
            });

            if (res.ok) {
                setShowModal(true);
                refreshCart();
                return;
            }

            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }

            const data = await res.json();
            alert(data.message || 'Gagal menambahkan ke keranjang');
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('Terjadi kesalahan koneksi');
        } finally {
            setIsAdding(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Memuat pelatihan...</div>;
    }

    if (!course) {
        return <div className="min-h-screen flex items-center justify-center">Pelatihan tidak ditemukan.</div>;
    }

    const detailSections = normalizeDetailSections(course);
    const publicSessions = buildFallbackPublicSessions(course);
    const onlinePublicSessions = publicSessions.filter(session => session.delivery_mode === 'online');
    const offlinePublicSessions = publicSessions.filter(session => session.delivery_mode === 'offline');
    const inhouseBenefits = course.inhouse_training_benefits && course.inhouse_training_benefits.length > 0
        ? course.inhouse_training_benefits
        : [
            'Materi dan studi kasus dapat disesuaikan dengan proses bisnis perusahaan.',
            'Jadwal pelaksanaan lebih fleksibel mengikuti agenda tim internal.',
            'Keluaran pelatihan lebih fokus pada implementasi dan action plan nyata.'
        ];
    const isFreeOffering = Number(course.discount_price || course.price || 0) <= 0;
    const effectivePrice = course.discount_price || course.price;
    const startingPublicPrice = publicSessions
        .map(session => Number(session.price || 0))
        .filter(price => price > 0)
        .sort((left, right) => left - right)[0];
    const resolvedPublicMode = activePublicMode === 'offline' && offlinePublicSessions.length > 0
        ? 'offline'
        : onlinePublicSessions.length > 0
            ? 'online'
            : 'offline';
    const activePublicSessions = resolvedPublicMode === 'online' ? onlinePublicSessions : offlinePublicSessions;
    const activePublicPrice = activePublicSessions
        .map(session => Number(session.price || 0))
        .filter(price => price > 0)
        .sort((left, right) => left - right)[0];
    const heroMetrics = [
        { label: 'Format Tersedia', value: `${availableOffers.length} Jalur` },
        { label: 'Jumlah Peserta', value: `${(course.enrolled_count || 0) + 1200}+` },
        { label: 'Durasi', value: course.duration || 'Fleksibel' },
        { label: 'Bahasa', value: 'Indonesia' },
    ];

    const anchorItems = [
        ...detailSections.map(section => ({
            id: slugifyAnchor(section.id || section.title),
            title: section.title,
        })),
        { id: 'kurikulum', title: 'Kurikulum' },
        ...(course.instructor ? [{ id: 'instruktur', title: 'Instruktur' }] : []),
        { id: 'ulasan', title: 'Ulasan Peserta' },
    ];

    const handleInhouseChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = event.target;
        setInhouseForm(prev => ({
            ...prev,
            [name]: name === 'participants_count' ? Number(value) || 1 : value
        }));
    };

    const submitInhouseRequest = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setInhouseSubmitting(true);
        setInhouseSuccess('');
        setInhouseError('');

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const payload: Partial<InhouseTrainingRequest> = {
                course: course.id,
                company_name: inhouseForm.company_name,
                contact_name: inhouseForm.contact_name,
                email: inhouseForm.email,
                phone: inhouseForm.phone,
                position: inhouseForm.position,
                participants_count: inhouseForm.participants_count,
                preferred_mode: inhouseForm.preferred_mode,
                target_date: inhouseForm.target_date || undefined,
                training_goals: inhouseForm.training_goals,
                notes: inhouseForm.notes,
            };

            const res = await fetch(`${apiUrl}/api/inhouse-requests/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                setInhouseError(
                    errorData && typeof errorData === 'object'
                        ? 'Mohon cek kembali data form inhouse Anda.'
                        : 'Gagal mengirim request inhouse.'
                );
                return;
            }

            setInhouseSuccess('Request inhouse berhasil dikirim. Tim sales akan menghubungi Anda.');
            setInhouseForm(initialInhouseForm);
        } catch (error) {
            console.error('Failed to submit inhouse request:', error);
            setInhouseError('Terjadi kendala koneksi saat mengirim request inhouse.');
        } finally {
            setInhouseSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <div className="bg-white border-b border-gray-200 sticky top-16 md:top-20 z-30">
                <div className="max-w-7xl mx-auto px-4 py-3 text-xs text-gray-500 sm:py-4 sm:text-sm">
                    <Link href="/" className="hover:text-blue-600">Beranda</Link> /
                    <Link href="/courses" className="hover:text-blue-600"> Pelatihan</Link> /
                    <span className="text-gray-900 font-medium ml-1">{course.category?.name || 'Umum'}</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-5 sm:py-8">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
                    <div className="space-y-6 sm:space-y-8">
                        <section className="relative min-h-[240px] overflow-hidden rounded-3xl border border-gray-100 bg-slate-900 shadow-sm md:min-h-[440px]">
                            {course.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={course.thumbnail} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.55),_transparent_45%),linear-gradient(160deg,_#0f172a_0%,_#1d4ed8_120%)]" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                        </section>

                        <section className="space-y-5 rounded-3xl border border-gray-100 bg-white p-5 sm:space-y-6 md:p-8">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold uppercase">
                                    Detail Training
                                </span>
                                {course.category?.name && (
                                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold uppercase">
                                        {course.category.name}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl md:text-5xl">{course.title}</h1>
                                <div className="text-base leading-7 text-gray-600 sm:text-lg sm:leading-8">
                                    {renderParagraphs(course.description || '')}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {heroMetrics.map(metric => (
                                    <div key={metric.label} className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                                        <div className="text-xs uppercase tracking-wide text-gray-400 font-bold">{metric.label}</div>
                                        <div className="mt-2 text-base font-bold text-gray-900 sm:text-lg">{metric.value}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
                                <div className="inline-flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-blue-600" />
                                    <span>{formatDateRange(course.scheduled_at, course.scheduled_end_at)}</span>
                                </div>
                                {course.location && (
                                    <div className="inline-flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-blue-600" />
                                        <span>{course.location}</span>
                                    </div>
                                )}
                                <div className="inline-flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span>{Number(course.rating || 4.9).toFixed(1)} rating</span>
                                </div>
                            </div>
                        </section>

                        <section className="sticky top-[6.5rem] z-20 md:top-36">
                            <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-gray-100 bg-white/95 px-3 py-3 shadow-sm backdrop-blur-md sm:w-fit sm:flex-wrap sm:gap-3 sm:rounded-full">
                                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-bold shrink-0">
                                    <LayoutList className="w-4 h-4" />
                                    <span>Daftar Isi</span>
                                </div>
                                {anchorItems.map(item => (
                                    <a
                                        key={item.id}
                                        href={`#${item.id}`}
                                        className="shrink-0 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-blue-200 hover:text-blue-700 hover:bg-blue-50 transition"
                                    >
                                        {item.title}
                                    </a>
                                ))}
                            </div>
                        </section>

                        {detailSections.map((section, index) => {
                            const anchorId = slugifyAnchor(section.id || section.title);
                            return (
                                <section key={`${anchorId}-${index}`} id={anchorId} className="scroll-mt-44 bg-white rounded-3xl border border-gray-100 p-5 md:p-8 space-y-5">
                                    <div className="flex items-center gap-3 text-blue-700">
                                        <span className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-100 inline-flex items-center justify-center font-bold text-sm">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <div className="text-sm font-bold uppercase tracking-wide">Bagian Training</div>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                                    <div className="space-y-4">
                                        {renderParagraphs(section.body)}
                                    </div>
                                    {section.items.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {section.items.map((item, itemIndex) => (
                                                    <div key={`${item}-${itemIndex}`} className="flex items-start gap-3 rounded-2xl bg-gray-50 border border-gray-100 p-4">
                                                    <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                                    <span className="text-gray-700 leading-7">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            );
                        })}

                        <section id="kurikulum" className="scroll-mt-44 space-y-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Kurikulum Pelatihan</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {(course.sections?.length || 0)} modul utama | {course.sections?.reduce((acc, curr) => acc + (curr.lessons?.length || 0), 0) || 0} materi
                                </p>
                            </div>

                            {course.sections && course.sections.length > 0 ? (
                                <div className="space-y-4">
                                    {course.sections
                                        .slice()
                                        .sort((left, right) => left.order - right.order)
                                        .map((section, index: number) => (
                                            <div key={section.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                                                <details className="group" open={index === 0}>
                                                    <summary className="flex cursor-pointer flex-col gap-3 bg-gray-50 p-4 transition list-none group-open:bg-white sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
                                                        <div className="flex items-center gap-3 font-bold text-gray-900">
                                                            <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                                            {section.title}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{section.lessons?.length || 0} materi</div>
                                                    </summary>
                                                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                                                        {section.lessons && section.lessons.length > 0 ? (
                                                            section.lessons
                                                                .slice()
                                                                .sort((left, right) => left.order - right.order)
                                                                .map((lesson) => (
                                                                    <div key={lesson.id} className="flex flex-col gap-2 p-4 hover:bg-gray-50 transition sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pl-12">
                                                                        <div className="flex items-center gap-3">
                                                                            <FileText className="w-4 h-4 text-gray-400" />
                                                                            <span className="text-sm text-gray-700">{lesson.title}</span>
                                                                        </div>
                                                                        <span className="text-xs text-gray-500 whitespace-nowrap">{lesson.duration || '-'}</span>
                                                                    </div>
                                                                ))
                                                        ) : (
                                                            <div className="p-4 text-center text-sm text-gray-400">Belum ada materi di modul ini.</div>
                                                        )}
                                                    </div>
                                                </details>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
                                    Belum ada kurikulum yang ditambahkan.
                                </div>
                            )}
                        </section>

                        <StudentExamSection course={course} />

                        {course.instructor && (
                            <section id="instruktur" className="scroll-mt-44 space-y-4">
                                <h2 className="text-2xl font-bold text-gray-900">Instruktur</h2>
                                <div className="bg-white border border-blue-100 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-start">
                                    <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden relative flex-shrink-0">
                                        {course.instructor.photo ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={course.instructor.photo} alt={course.instructor.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-300 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                                                {course.instructor.name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase">
                                            <GraduationCap className="w-3.5 h-3.5" />
                                            Trainer / Konsultan
                                        </div>
                                        <h3 className="mt-3 text-xl font-bold text-gray-900">{course.instructor.name}</h3>
                                        <p className="text-blue-600 font-medium text-sm mt-1">{course.instructor.title}</p>
                                        <p className="text-gray-600 leading-7 mt-4">{course.instructor.bio}</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        <ReviewsSection rating={course.rating} />
                    </div>

                    <aside className="lg:sticky lg:top-28 lg:self-start">
                        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
                            <div className="border-b border-gray-100 p-5 sm:p-6">
                                <div className="text-xs uppercase tracking-wide text-gray-400 font-bold">Pilih Jalur Pelatihan</div>
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    {availableOffers.map(offer => (
                                        <button key={offer.key} type="button" onClick={() => setActiveOffer(offer.key)} className={`rounded-2xl px-3 py-2.5 text-sm font-bold transition ${activeOffer === offer.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                            {offer.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-5 p-5 sm:p-6">
                                {activeOffer === 'public' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setActivePublicMode('online')}
                                                disabled={onlinePublicSessions.length === 0}
                                                className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${resolvedPublicMode === 'online' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'} disabled:opacity-40`}
                                            >
                                                Online
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActivePublicMode('offline')}
                                                disabled={offlinePublicSessions.length === 0}
                                                className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${resolvedPublicMode === 'offline' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'} disabled:opacity-40`}
                                            >
                                                Offline
                                            </button>
                                        </div>

                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-gray-400 font-bold">
                                                Harga Public {resolvedPublicMode === 'online' ? 'Online' : 'Offline'}
                                            </div>
                                            <div className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
                                                {activePublicPrice ? formatRupiah(activePublicPrice) : (startingPublicPrice ? formatRupiah(startingPublicPrice) : 'Hubungi Tim')}
                                            </div>
                                            <p className="mt-2 text-sm text-gray-500">
                                                Harga pada mode `online` dan `offline` dibaca terpisah sesuai sesi yang dipilih.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            {activePublicSessions.length === 0 ? (
                                                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                                                    Belum ada opsi public {resolvedPublicMode} untuk pelatihan ini.
                                                </div>
                                            ) : activePublicSessions.map(session => (
                                                <div key={session.id} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 space-y-3">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900">{session.title}</div>
                                                            {session.badge && (
                                                                <div className="mt-1 text-[11px] font-bold uppercase text-blue-600">{session.badge}</div>
                                                            )}
                                                        </div>
                                                        <div className="text-right text-sm font-bold text-gray-900">
                                                            {formatRupiah(session.price)}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 text-sm text-gray-600">
                                                        <div>{session.schedule || 'Jadwal akan diinformasikan'}</div>
                                                        <div>{session.location || 'Lokasi / platform akan diinformasikan'}</div>
                                                        <div>{session.duration || course.duration || 'Durasi menyesuaikan'}</div>
                                                    </div>
                                                    {session.cta_url ? (
                                                        <div className="space-y-2">
                                                            <Link
                                                                href={`/checkout?slug=${course.slug}&offer=public&mode=${resolvedPublicMode}`}
                                                                className="block w-full text-center rounded-full bg-blue-600 text-white px-4 py-3 font-bold hover:bg-blue-700 transition"
                                                            >
                                                                Checkout Public
                                                            </Link>
                                                            <a
                                                                href={session.cta_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="block w-full text-center rounded-full border border-gray-300 bg-white px-4 py-3 font-bold text-gray-700 hover:bg-gray-50 transition"
                                                            >
                                                                {session.cta_label || 'Lihat Detail Sesi'}
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <Link
                                                                href={`/checkout?slug=${course.slug}&offer=public&mode=${resolvedPublicMode}`}
                                                                className="block w-full text-center rounded-full bg-blue-600 text-white px-4 py-3 font-bold hover:bg-blue-700 transition"
                                                            >
                                                                Checkout Public
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveOffer('inhouse')}
                                                                className="w-full rounded-full border border-gray-300 bg-white px-4 py-3 font-bold text-gray-700 hover:bg-gray-50 transition"
                                                            >
                                                                Butuh Jadwal Khusus?
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {activeOffer === 'inhouse' && (
                                    <>
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-gray-400 font-bold">Inhouse Untuk Tim</div>
                                            <div className="mt-2 text-3xl font-extrabold text-gray-900">Custom Quote</div>
                                            <p className="mt-2 text-sm text-gray-500">
                                                Kirim kebutuhan pelatihan perusahaan Anda. Tim sales akan menindaklanjuti melalui form yang tersedia.
                                            </p>
                                        </div>

                                        {course.inhouse_training_intro && (
                                            <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-4 text-sm text-amber-900">
                                                {course.inhouse_training_intro}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {inhouseBenefits.slice(0, 3).map((benefit, index) => (
                                                <div key={`${benefit}-${index}`} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                                    <span>{benefit}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <form onSubmit={submitInhouseRequest} className="space-y-3">
                                            <input name="company_name" required value={inhouseForm.company_name} onChange={handleInhouseChange} placeholder="Nama perusahaan" className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-amber-500 text-gray-900" />
                                            <input name="contact_name" required value={inhouseForm.contact_name} onChange={handleInhouseChange} placeholder="Nama PIC" className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-amber-500 text-gray-900" />
                                            <input type="email" name="email" required value={inhouseForm.email} onChange={handleInhouseChange} placeholder="Email" className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-amber-500 text-gray-900" />
                                            <input name="phone" required value={inhouseForm.phone} onChange={handleInhouseChange} placeholder="No. WhatsApp" className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-amber-500 text-gray-900" />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input type="number" min={1} name="participants_count" required value={inhouseForm.participants_count} onChange={handleInhouseChange} placeholder="Peserta" className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-amber-500 text-gray-900" />
                                                <select name="preferred_mode" value={inhouseForm.preferred_mode} onChange={handleInhouseChange} className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-amber-500 text-gray-900">
                                                    <option value="offline">Offline</option>
                                                    <option value="online">Online</option>
                                                    <option value="hybrid">Hybrid</option>
                                                </select>
                                            </div>
                                            <textarea name="training_goals" rows={4} required value={inhouseForm.training_goals} onChange={handleInhouseChange} placeholder="Kebutuhan training perusahaan Anda" className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-amber-500 text-gray-900" />

                                            {inhouseSuccess && (
                                                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
                                                    {inhouseSuccess}
                                                </div>
                                            )}
                                            {inhouseError && (
                                                <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                                                    {inhouseError}
                                                </div>
                                            )}

                                            <button type="submit" disabled={inhouseSubmitting} className="w-full rounded-full bg-amber-600 text-white px-5 py-3.5 font-bold hover:bg-amber-700 transition disabled:opacity-60">
                                                {inhouseSubmitting ? 'Mengirim Request...' : 'Kirim ke Tim Sales'}
                                            </button>
                                        </form>
                                    </>
                                )}

                                {activeOffer === 'elearning' && (
                                    <>
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-gray-400 font-bold">Akses Mandiri</div>
                                            <div className="mt-2 text-3xl font-extrabold text-gray-900">
                                                {isFreeOffering ? 'Gratis' : formatRupiah(effectivePrice)}
                                            </div>
                                            {course.discount_price && Number(course.price) > Number(course.discount_price) && (
                                                <div className="mt-2 text-sm text-gray-400 line-through">
                                                    {formatRupiah(course.price)}
                                                </div>
                                            )}
                                        </div>
                                        {course.elearning_intro && (
                                            <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-4 text-sm text-blue-900">
                                                {course.elearning_intro}
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                            {course.is_enrolled ? (
                                                <Link href={`/learn/${course.slug}`} className="block w-full text-center rounded-full bg-emerald-600 text-white px-5 py-3.5 font-bold hover:bg-emerald-700 transition">
                                                    Buka Pelatihan
                                                </Link>
                                            ) : (
                                                <>
                                                    <Link href={`/checkout?slug=${course.slug}`} className="block w-full text-center rounded-full bg-blue-600 text-white px-5 py-3.5 font-bold hover:bg-blue-700 transition">
                                                        {isFreeOffering ? 'Daftar Gratis' : 'Checkout Sekarang'}
                                                    </Link>
                                                    <button onClick={addToCart} disabled={isAdding} className="w-full rounded-full border border-gray-300 bg-white px-5 py-3.5 font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
                                                        {isAdding ? 'Menambahkan...' : 'Tambah ke Keranjang'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <div className="space-y-2 text-sm text-gray-600">
                                            <div className="flex items-start gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                                <span>Akses materi langsung aktif setelah pembayaran berhasil.</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                                <span>Belajar mandiri sesuai kurikulum yang sudah tersedia.</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                        <Clock3 className="w-4 h-4 text-blue-600" />
                                        Informasi Ringkas
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-2">
                                        <div className="flex justify-between gap-4">
                                            <span>Durasi</span>
                                            <span className="font-medium text-gray-900">{course.duration || 'Fleksibel'}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span>Peserta</span>
                                            <span className="font-medium text-gray-900">{(course.enrolled_count || 0) + 1200}+</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span>Bahasa</span>
                                            <span className="font-medium text-gray-900">Indonesia</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <AddToCartModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </div>
    );
}
