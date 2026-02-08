import { Search, SlidersHorizontal } from 'lucide-react';
import CourseCard from '@/components/CourseCard';
import { Course } from '@/types';

// Dummy Data (Same as Home for now, extended)
const courses: Course[] = [
    {
        id: 1,
        title: "ISO 9001:2015 Management Mutu",
        slug: "iso-9001",
        description: "Sistem Manajemen Mutu",
        price: "2500000",
        level: "Beginner",
        duration: "2 Hari",
        rating: "4.9",
        enrolled_count: 850,
        instructor: { id: 1, name: "Dr. Budi Santoso", title: "", bio: "", photo: null },
        category: { id: 1, name: "Mutu (Quality)", slug: "quality" },
        thumbnail: null,
        is_featured: true,
    },
    {
        id: 2,
        title: "ISO 27001 Keamanan Informasi",
        slug: "iso-27001",
        description: "Information Security Management",
        price: "3500000",
        level: "Intermediate",
        duration: "3 Hari",
        rating: "4.8",
        enrolled_count: 520,
        instructor: { id: 2, name: "Sarah Wijaya, CISA", title: "", bio: "", photo: null },
        category: { id: 2, name: "Keamanan", slug: "security" },
        thumbnail: null,
        is_featured: true,
    },
    {
        id: 3,
        title: "ISO 45001 K3",
        slug: "iso-45001",
        description: "Occupational Health and Safety",
        price: "2200000",
        level: "Beginner",
        duration: "2 Hari",
        rating: "4.8",
        enrolled_count: 338,
        instructor: { id: 3, name: "Ir. Joko Susilo", title: "", bio: "", photo: null },
        category: { id: 3, name: "K3 (Safety)", slug: "safety" },
        thumbnail: null,
        is_featured: true,
    },
    {
        id: 4,
        title: "ISO 14001 Manajemen Lingkungan",
        slug: "iso-14001",
        description: "Environmental Management",
        price: "2100000",
        level: "Beginner",
        duration: "2 Hari",
        rating: "4.7",
        enrolled_count: 300,
        instructor: { id: 4, name: "Dewi Lestari, M.Env", title: "", bio: "", photo: null },
        category: { id: 4, name: "Lingkungan", slug: "environment" },
        thumbnail: null,
        is_featured: true,
    },
    // Duplicates for grid demo
    {
        id: 5,
        title: "ISO 22000 Manajemen Keamanan Pangan",
        slug: "iso-22000",
        description: "Food Safety Management",
        price: "2800000",
        level: "Beginner",
        duration: "2 Hari",
        rating: "4.6",
        enrolled_count: 210,
        instructor: { id: 5, name: "Chef Diana Kartika", title: "", bio: "", photo: null },
        category: { id: 5, name: "Pangan", slug: "food" },
        thumbnail: null,
        is_featured: false,
    },
    {
        id: 6,
        title: "ISO 37001 Sistem Manajemen Anti Penyuapan",
        slug: "iso-37001",
        description: "Anti-Bribery Management",
        price: "6200000",
        level: "Advanced",
        duration: "4 Hari",
        rating: "5.0",
        enrolled_count: 95,
        instructor: { id: 6, name: "Bambang Suryo", title: "", bio: "", photo: null },
        category: { id: 6, name: "Anti Penyuapan", slug: "anti-bribery" },
        thumbnail: null,
        is_featured: false,
    },
];

export default function Catalog() {
    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <nav className="text-sm text-gray-500 mb-2">Beranda / Katalog Pelatihan ISO</nav>
                            <h1 className="text-3xl font-bold text-gray-900">Jelajahi Pelatihan ISO</h1>
                            <p className="text-gray-600 mt-2">Tingkatkan standar kualitas dan kepatuhan organisasi Anda dengan sertifikasi BNSP dan Internasional.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Sidebar Filters */}
                    <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg">Filter</h3>
                            <button className="text-sm text-blue-600 font-medium hover:underline">Hapus semua</button>
                        </div>

                        {/* Categories */}
                        <div>
                            <h4 className="font-bold text-gray-800 mb-4">Kategori Standar</h4>
                            <div className="space-y-3">
                                {['Manajemen Mutu', 'Keamanan Informasi', 'Lingkungan', 'K3 (Kesehatan Kerja)', 'Keamanan Pangan'].map((cat, i) => (
                                    <label key={i} className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked={i === 0} />
                                        <span className="text-gray-600 group-hover:text-blue-600 transition-colors text-sm">{cat}</span>
                                        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{[45, 32, 28, 30, 15][i]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Price */}
                        <div>
                            <h4 className="font-bold text-gray-800 mb-4">Investasi</h4>
                            <div className="space-y-3">
                                {['Semua Harga', 'Di bawah Rp 2jt', 'Rp 2jt - Rp 5jt', 'Di atas Rp 5jt'].map((price, i) => (
                                    <label key={i} className="flex items-center gap-3 cursor-pointer group">
                                        <input type="radio" name="price" className="w-5 h-5 border-gray-300 text-blue-600" defaultChecked={i === 2} />
                                        <span className="text-gray-600 group-hover:text-blue-600 transition-colors text-sm">{price}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Instructors */}
                        <div>
                            <h4 className="font-bold text-gray-800 mb-4">Instruktur Ahli</h4>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input type="text" placeholder="Cari instruktur" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
                            </div>
                            <div className="space-y-3">
                                {['Ir. Budi Santoso', 'Anita Wijaya, CISSP', 'Dr. Rahmat Hidayat'].map((inst, i) => (
                                    <label key={i} className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-gray-600 group-hover:text-blue-600 transition-colors text-sm">{inst}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Toolbar */}
                        <div className="flex justify-between items-center mb-6">
                            <p className="text-gray-500 text-sm">Menampilkan <span className="font-bold text-gray-900">{courses.length}</span> program pelatihan</p>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-500">Urutkan:</span>
                                <select className="border-none bg-transparent font-bold text-gray-900 outline-none cursor-pointer">
                                    <option>Rekomendasi</option>
                                    <option>Terbaru</option>
                                    <option>Harga Terendah</option>
                                    <option>Harga Tertinggi</option>
                                </select>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map(course => (
                                <CourseCard key={course.id} course={course} />
                            ))}
                        </div>

                        {/* Pagination (Load More) */}
                        <div className="mt-12 text-center">
                            <button className="px-8 py-3 rounded-full border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                                <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" style={{ display: 'none' }}></div>
                                Muat Lebih Banyak
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
