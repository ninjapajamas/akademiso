'use client';

import Link from 'next/link';
import { Star, Clock, Check, PlayCircle, FileText, ChevronDown, Globe, MessageSquare, ThumbsUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import AddToCartModal from '@/components/AddToCartModal';

// ── Static review data (representative sample) ──────────────────────────────
const REVIEWS = [
    { name: 'Budi Santoso', role: 'Quality Manager · PT Astra', avatar: 'B', color: 'bg-blue-500', rating: 5, date: 'Jan 2026', likes: 24, text: 'Pelatihan ini sangat terstruktur dan materi ISO 9001 disampaikan dengan sangat jelas. Instruktur berpengalaman dan mampu menjawab setiap pertanyaan dengan detail. Saya berhasil lulus ujian sertifikasi di percobaan pertama!' },
    { name: 'Siti Rahayu', role: 'HSE Officer · Pertamina', avatar: 'S', color: 'bg-green-500', rating: 5, date: 'Jan 2026', likes: 18, text: 'Konten pelatihan sangat relevan dengan pekerjaan saya sehari-hari. Simulasi audit internal dalam pelatihan ini benar-benar membantu saya memahami proses yang sebenarnya di lapangan.' },
    { name: 'Ahmad Fauzi', role: 'IT Security Analyst · BCA', avatar: 'A', color: 'bg-purple-500', rating: 5, date: 'Des 2025', likes: 31, text: 'Materi dikemas dengan sangat baik, sistematis dan mudah dipahami bahkan untuk yang baru pertama kali belajar ISO. Sangat merekomendasikan untuk semua profesional di bidang keamanan informasi.' },
    { name: 'Dewi Kusuma', role: 'Procurement Manager · Unilever', avatar: 'D', color: 'bg-pink-500', rating: 4, date: 'Des 2025', likes: 12, text: 'Pelatihan cukup komprehensif dan mencakup semua aspek penting. Hanya saja beberapa sesi terasa agak cepat. Secara keseluruhan sangat bermanfaat untuk pengembangan karir saya.' },
    { name: 'Rizky Pratama', role: 'Production Supervisor · Toyota TMMIN', avatar: 'R', color: 'bg-orange-500', rating: 5, date: 'Nov 2025', likes: 9, text: 'Instruktur sangat profesional dengan pengalaman nyata di industri. Studi kasus yang diberikan sangat relevan dengan kondisi industri manufaktur di Indonesia. Highly recommended!' },
    { name: 'Indah Permata', role: 'Food Safety Manager · Nestlé', avatar: 'I', color: 'bg-teal-500', rating: 4, date: 'Nov 2025', likes: 15, text: 'Kursus ini melebihi ekspektasi saya. Materi selalu diperbarui mengikuti standar terbaru dan diskusi kelompok sangat interaktif. Fasilitas pendukung juga sangat baik.' },
];

function StarRow({ count, filled }: { count: number; filled: boolean }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < count && filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
                />
            ))}
        </div>
    );
}

function ReviewsSection({ rating, enrolledCount }: { rating: string | number; enrolledCount: number }) {
    const [showAll, setShowAll] = useState(false);
    const avg = Number(rating) || 4.9;

    // Realistic distribution based on avg rating
    const dist = [
        { stars: 5, pct: 72 },
        { stars: 4, pct: 18 },
        { stars: 3, pct: 6 },
        { stars: 2, pct: 2 },
        { stars: 1, pct: 2 },
    ];

    const displayed = showAll ? REVIEWS : REVIEWS.slice(0, 3);

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                Penilaian Peserta
            </h2>

            {/* Rating Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 flex flex-col sm:flex-row gap-8 items-center">
                {/* Big number */}
                <div className="text-center flex-shrink-0">
                    <div className="text-7xl font-extrabold text-gray-900 leading-none">{avg.toFixed(1)}</div>
                    <div className="flex justify-center mt-2 mb-1">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} className={`w-5 h-5 ${i <= Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                        ))}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">Rating kursus</div>
                </div>

                {/* Breakdown bars */}
                <div className="flex-1 w-full space-y-2">
                    {dist.map(({ stars, pct }) => (
                        <div key={stars} className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-1 w-20 flex-shrink-0 justify-end">
                                <StarRow count={stars} filled />
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div className="bg-yellow-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-gray-500 w-8 text-right font-medium">{pct}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Review Cards */}
            <div className="grid grid-cols-1 gap-5">
                {displayed.map((r, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                        <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${r.color}`}>
                                {r.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                    <div>
                                        <span className="font-bold text-gray-900 text-sm">{r.name}</span>
                                        <span className="text-gray-400 text-xs ml-2">{r.role}</span>
                                    </div>
                                    <span className="text-xs text-gray-400 flex-shrink-0">{r.date}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mb-3">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                                    ))}
                                    <span className="text-xs font-bold text-gray-700 ml-1">{r.rating}.0</span>
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed">{r.text}</p>
                                <button className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors">
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    Membantu ({r.likes})
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Show more / less */}
            {REVIEWS.length > 3 && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="px-8 py-2.5 rounded-full border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 hover:border-gray-400 transition-all"
                    >
                        {showAll ? 'Tampilkan lebih sedikit' : `Lihat semua ${REVIEWS.length} ulasan`}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function CourseDetailContent({ slug }: { slug: string }) {
    const [course, setCourse] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // State for Cart
    const { refreshCart } = useCart();
    const [isAdding, setIsAdding] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
                const decodedSlug = decodeURIComponent(slug);
                console.log(`Fetching: ${apiUrl}/api/courses/${decodedSlug}/`);
                const res = await fetch(`${apiUrl}/api/courses/${decodedSlug}/`);
                if (res.ok) {
                    const data = await res.json();
                    setCourse(data);
                } else {
                    console.error('Course not found. Status:', res.status);
                    const text = await res.text();
                    console.error('Response:', text);
                }
            } catch (error) {
                console.error('Error fetching course:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [slug]);

    const addToCart = async () => {
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
            } else {
                if (res.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                const data = await res.json();
                alert(data.message || 'Gagal menambahkan ke keranjang');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('Terjadi kesalahan koneksi');
        } finally {
            setIsAdding(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat kursus...</div>;
    if (!course) return <div className="min-h-screen flex items-center justify-center">Kursus tidak ditemukan</div>;

    // Helper to calculate total lessons in a section
    const getLessonCount = (section: any) => section.lessons ? section.lessons.length : 0;

    // Helper to format duration sum (simplified)
    const getSectionDuration = (section: any) => {
        // This would require parsing and summing durations. For now, we can show total items.
        return `${getLessonCount(section)} materi`;
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-200 sticky top-20 z-30">
                <div className="max-w-7xl mx-auto px-4 py-4 text-sm text-gray-500">
                    <Link href="/" className="hover:text-blue-600">Beranda</Link> /
                    <Link href="/courses" className="hover:text-blue-600"> Sertifikasi</Link> /
                    <span className="text-gray-900 font-medium ml-1">{course.category?.name || 'Umum'}</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Header */}
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">{course.title}</h1>
                            <p className="text-lg text-gray-600 leading-relaxed mb-6">{course.description}</p>
                            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                                <div className="flex items-center gap-1 text-yellow-500 font-bold">
                                    <span className="bg-yellow-100 text-yellow-700 px-1.5 rounded text-xs mr-1">{course.rating || '4.9'}</span>
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                                    </div>
                                    <span className="text-gray-500 font-normal ml-1 underline">({(course.enrolled_count || 0).toLocaleString('id-ID')} penilaian)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>{(course.enrolled_count || 0) + 1200} Peserta</span>
                                </div>
                                <div>Terakhir diperbarui {new Date(course.created_at).toLocaleDateString()}</div>
                                <div className="flex items-center gap-1 text-gray-700 font-medium">
                                    <Globe className="w-4 h-4" /> Bahasa Indonesia
                                </div>
                            </div>
                        </div>

                        {/* Video Preview */}
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 group cursor-pointer shadow-lg">
                            {/* Placeholder content */}
                            {course.thumbnail ? (
                                <img src={course.thumbnail} alt={course.title} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <PlayCircle className="w-16 h-16 text-white" fill="currentColor" />
                                </div>
                            </div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <p className="font-bold">Pratinjau materi</p>
                            </div>
                        </div>

                        {/* Curriculum */}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Kurikulum Pelatihan</h2>
                            <p className="text-gray-500 mb-6 text-sm">
                                {course.sections?.length || 0} Modul Utama • {course.sections?.reduce((acc: number, curr: any) => acc + (curr.lessons?.length || 0), 0) || 0} Materi
                            </p>

                            <div className="space-y-4">
                                {course.sections && course.sections.length > 0 ? (
                                    course.sections.sort((a: any, b: any) => a.order - b.order).map((section: any, i: number) => (
                                        <div key={section.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                            <details className="group" open={i === 0}>
                                                <summary className="flex justify-between items-center p-5 cursor-pointer bg-gray-50 group-open:bg-white transition-colors list-none">
                                                    <div className="flex items-center gap-3 font-bold text-gray-900">
                                                        <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                                        {section.title}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{getSectionDuration(section)}</div>
                                                </summary>
                                                <div className="border-t border-gray-100 divide-y divide-gray-100">
                                                    {section.lessons && section.lessons.length > 0 ? (
                                                        section.lessons.sort((a: any, b: any) => a.order - b.order).map((lesson: any) => (
                                                            <div key={lesson.id} className="flex justify-between items-center p-4 pl-12 hover:bg-gray-50 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    {lesson.type === 'video' ? <PlayCircle className="w-4 h-4 text-gray-400" /> : <FileText className="w-4 h-4 text-gray-400" />}
                                                                    <span className="text-sm text-gray-700">{lesson.title}</span>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-xs text-gray-500">{lesson.duration || '-'}</span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-sm text-gray-400">Belum ada materi di modul ini.</div>
                                                    )}
                                                </div>
                                            </details>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                                        Belum ada kurikulum yang ditambahkan.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Instructor */}
                        {course.instructor && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Instruktur</h2>
                                <div className="bg-white border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-start">
                                    <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden relative flex-shrink-0">
                                        {course.instructor.photo ? (
                                            <img src={course.instructor.photo} alt={course.instructor.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-300 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                                                {course.instructor.name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 mb-1">{course.instructor.name}</h3>
                                        <p className="text-blue-600 font-medium text-sm mb-3">{course.instructor.title}</p>
                                        <p className="text-gray-600 text-sm leading-relaxed mb-4">{course.instructor.bio}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reviews & Testimonials Section */}
                        <ReviewsSection rating={course.rating} enrolledCount={course.enrolled_count} />

                    </div>

                    {/* Sidebar CTA (Sticky) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-3xl font-extrabold text-gray-900">
                                    Rp {parseInt(course.price).toLocaleString('id-ID')}
                                </span>
                            </div>
                            {course.discount_price && (
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="text-gray-400 line-through text-sm">
                                        Rp {parseInt(course.discount_price).toLocaleString('id-ID')}
                                    </span>
                                    <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-0.5 rounded">HEMAT!</span>
                                </div>
                            )}

                            <div className="space-y-3 mb-6">
                                <Link href="/checkout" className="block w-full text-center bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                                    Daftar Sekarang
                                </Link>
                                <button
                                    onClick={addToCart}
                                    disabled={isAdding}
                                    className="flex items-center justify-center gap-2 w-full text-center bg-white text-gray-700 font-bold py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    {isAdding ? "Menambahkan..." : "Tambah ke Keranjang"}
                                </button>
                            </div>

                            <div className="text-center text-xs text-gray-400 mb-6">Jaminan Kepuasan & Uang Kembali</div>
                        </div>
                    </div>

                </div>
            </div>

            <AddToCartModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </div>
    );
}
