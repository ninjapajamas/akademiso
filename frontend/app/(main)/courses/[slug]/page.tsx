import Link from 'next/link';
import { Star, Clock, Check, PlayCircle, FileText, ChevronDown, Globe } from 'lucide-react';
import { Course } from '@/types';

// Extended Dummy Data for Detail
const courseDetail: Course & { objectives: string[], modules: any[] } = {
    id: 1,
    title: "Pelatihan Master ISO 9001:2015 Sistem Manajemen Mutu",
    slug: "iso-9001",
    description: "Pahami persyaratan standar ISO 9001:2015, kuasai strategi implementasi, dan praktikkan teknik audit internal untuk meningkatkan kualitas organisasi Anda.",
    price: "2499000",
    discount_price: "4500000",
    level: "Intermediate",
    duration: "12j 30m",
    rating: "4.9",
    enrolled_count: 2100,
    instructor: {
        id: 1,
        name: "Sarah Jenkins",
        title: "Lead Auditor ISO 9001 & Konsultan Senior SMM",
        bio: "Sarah adalah Lead Auditor bersertifikat IRCA dengan pengalaman lebih dari 15 tahun dalam implementasi Sistem Manajemen Mutu.",
        photo: null
    },
    category: { id: 1, name: "Manajemen Mutu", slug: "quality" },
    thumbnail: null,
    is_featured: true,
    objectives: [
        "Interpretasi lengkap Klausul 4-10 ISO 9001:2015",
        "Merancang strategi implementasi Sistem Manajemen Mutu (SMM)",
        "Teknik Audit Internal dan simulasi audit di lapangan",
        "Identifikasi risiko dan peluang (Risk-Based Thinking)",
        "Penyusunan informasi terdokumentasi (SOP & Instruksi Kerja)",
        "Persiapan menghadapi audit sertifikasi eksternal"
    ],
    modules: [
        {
            title: "Modul 1: Analisis Klausul (Clause Analysis)",
            lessons: 12,
            duration: "4j 15min",
            items: [
                { title: "Pengantar ISO & Prinsip Manajemen Mutu", duration: "15:30", type: "video", free: true },
                { title: "Konteks Organisasi & Kepemimpinan", duration: "25:15", type: "video", free: false },
                { title: "Checklist Analisis Kesenjangan (Gap Analysis)", duration: "10:00", type: "doc", free: false },
            ]
        },
        {
            title: "Modul 2: Strategi Implementasi (Implementation Strategy)",
            lessons: 15,
            duration: "4j 45min",
            items: []
        },
        {
            title: "Modul 3: Simulasi Audit Internal (Internal Audit Simulation)",
            lessons: 18,
            duration: "3j 30min",
            items: []
        }
    ]
};

export default function CourseDetail({ params }: { params: { slug: string } }) {
    // In a real app, fetch data based on params.slug
    const course = courseDetail;

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-200 sticky top-20 z-30">
                <div className="max-w-7xl mx-auto px-4 py-4 text-sm text-gray-500">
                    <Link href="/" className="hover:text-blue-600">Beranda</Link> /
                    <Link href="/courses" className="hover:text-blue-600"> Sertifikasi</Link> /
                    <span className="text-gray-900 font-medium ml-1">{course.category.name}</span>
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
                                    <span className="bg-yellow-100 text-yellow-700 px-1.5 rounded text-xs mr-1">4.9</span>
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                                    </div>
                                    <span className="text-gray-500 font-normal ml-1 underline">({course.enrolled_count.toLocaleString()} penilaian)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>8.500 Profesional</span>
                                </div>
                                <div>Terakhir diperbarui Sep 2024</div>
                                <div className="flex items-center gap-1 text-gray-700 font-medium">
                                    <Globe className="w-4 h-4" /> Bahasa Indonesia
                                </div>
                            </div>
                        </div>

                        {/* Video Preview */}
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 group cursor-pointer shadow-lg">
                            {/* Placeholder content */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <PlayCircle className="w-16 h-16 text-white" fill="currentColor" />
                                </div>
                            </div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <p className="font-bold">Pratinjau materi ISO</p>
                            </div>
                            <div className="absolute bottom-6 right-6 text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">03:45</div>
                        </div>

                        {/* What you'll learn */}
                        <div className="bg-white rounded-2xl p-8 border border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Apa yang akan Anda pelajari</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                {course.objectives.map((obj, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700 text-sm">{obj}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Curriculum */}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Kurikulum Pelatihan</h2>
                            <p className="text-gray-500 mb-6 text-sm">3 Modul Utama • 45 Materi • Total durasi 12j 30m</p>

                            <div className="space-y-4">
                                {course.modules.map((mod, i) => (
                                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                        <details className="group" open={i === 0}>
                                            <summary className="flex justify-between items-center p-5 cursor-pointer bg-gray-50 group-open:bg-white transition-colors list-none">
                                                <div className="flex items-center gap-3 font-bold text-gray-900">
                                                    <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                                    {mod.title}
                                                </div>
                                                <div className="text-sm text-gray-500">{mod.items.length || mod.lessons} materi • {mod.duration}</div>
                                            </summary>
                                            <div className="border-t border-gray-100 divide-y divide-gray-100">
                                                {mod.items.length > 0 ? mod.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center p-4 pl-12 hover:bg-gray-50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            {item.type === 'video' ? <PlayCircle className="w-4 h-4 text-gray-400" /> : <FileText className="w-4 h-4 text-gray-400" />}
                                                            <span className="text-sm text-gray-700">{item.title}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {item.free && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Pratinjau</span>}
                                                            <span className="text-xs text-gray-500">{item.duration}</span>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="p-4 text-center text-sm text-gray-400">Daftar materi terkunci.</div>
                                                )}
                                            </div>
                                        </details>
                                    </div>
                                ))}
                            </div>
                            <button className="mt-4 text-blue-600 font-bold text-sm">Tampilkan semua silabus</button>
                        </div>

                        {/* Instructor */}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Instruktur</h2>
                            <div className="bg-white border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-start">
                                <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden relative flex-shrink-0">
                                    {/* Placeholder photo */}
                                    <div className="w-full h-full bg-gradient-to-br from-blue-300 to-blue-600"></div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-1">{course.instructor.name}</h3>
                                    <p className="text-blue-600 font-medium text-sm mb-3">{course.instructor.title}</p>
                                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{course.instructor.bio}</p>

                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                            <span>Rating 4.9</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                                            <span>15rb Peserta</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <PlayCircle className="w-4 h-4 text-gray-400" />
                                            <span>8 Pelatihan</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Sidebar CTA (Sticky) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-3xl font-extrabold text-gray-900">Rp 2.499.000</span>
                            </div>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-gray-400 line-through text-sm">Rp 4.500.000</span>
                                <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-0.5 rounded">HEMAT 45%</span>
                            </div>

                            <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-6">
                                <Clock className="w-4 h-4" />
                                <span>Promo berakhir dalam 2 hari!</span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <Link href="/checkout" className="block w-full text-center bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                                    Daftar Sekarang
                                </Link>
                                <button className="block w-full text-center bg-white text-gray-700 font-bold py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                                    Tambah ke Keranjang
                                </button>
                            </div>

                            <div className="text-center text-xs text-gray-400 mb-6">Jaminan Kepuasan & Uang Kembali</div>

                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-900 text-sm">Kursus ini mencakup:</h4>
                                <ul className="space-y-3 text-sm text-gray-600">
                                    <li className="flex items-start gap-3">
                                        <div className="w-5 flex justify-center"><Check className="w-4 h-4 text-blue-600" /></div>
                                        <span>Sertifikat Digital (Digital Certificate)</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-5 flex justify-center"><div className="w-4 h-4 bg-gray-400 rounded-sm"></div></div>
                                        <span>Pelatih Profesional</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-5 flex justify-center"><div className="w-4 h-4 bg-gray-400 rounded-full"></div></div>
                                        <span>Akses Seumur Hidup</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-5 flex justify-center"><PlayCircle className="w-4 h-4 text-gray-400" /></div>
                                        <span>Video materi 12,5 jam</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-5 flex justify-center"><FileText className="w-4 h-4 text-gray-400" /></div>
                                        <span>30+ Template Dokumen ISO</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Corporate CTA */}
                        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
                            <h4 className="font-bold text-gray-900 mb-2">Pelatihan Tim Perusahaan?</h4>
                            <p className="text-gray-500 text-xs mb-4">Dapatkan penawaran khusus untuk pelatihan in-house atau grup perusahaan Anda.</p>
                            <button className="w-full text-center border border-gray-300 py-2 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">
                                Hubungi Akademiso Business
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
