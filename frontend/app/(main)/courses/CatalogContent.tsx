'use client';

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import CourseCard from '@/components/CourseCard';
import { Course } from '@/types';

type SortOption = 'recommended' | 'newest' | 'price_asc' | 'price_desc';
type PriceFilter = 'all' | 'under2m' | '2m_to_5m' | 'above5m';
type LevelFilter = 'all' | 'Beginner' | 'Intermediate' | 'Advanced';

export default function CatalogContent({ initialCourses }: { initialCourses: Course[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
    const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('recommended');
    const [showMobileFilter, setShowMobileFilter] = useState(false);

    // Derive unique categories from courses
    const categories = useMemo(() => {
        const names = initialCourses
            .map(c => c.category?.name)
            .filter((n): n is string => !!n);
        return Array.from(new Set(names)).sort();
    }, [initialCourses]);

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const clearAll = () => {
        setSearchQuery('');
        setSelectedCategories([]);
        setPriceFilter('all');
        setLevelFilter('all');
        setSortBy('recommended');
    };

    const filteredAndSorted = useMemo(() => {
        let result = [...initialCourses];

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.title.toLowerCase().includes(q) ||
                c.instructor?.name?.toLowerCase().includes(q) ||
                c.category?.name?.toLowerCase().includes(q)
            );
        }

        // Categories
        if (selectedCategories.length > 0) {
            result = result.filter(c => selectedCategories.includes(c.category?.name));
        }

        // Price
        if (priceFilter !== 'all') {
            result = result.filter(c => {
                const p = Number(c.price);
                if (priceFilter === 'under2m') return p < 2_000_000;
                if (priceFilter === '2m_to_5m') return p >= 2_000_000 && p <= 5_000_000;
                if (priceFilter === 'above5m') return p > 5_000_000;
                return true;
            });
        }

        // Level
        if (levelFilter !== 'all') {
            result = result.filter(c => c.level === levelFilter);
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
            if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
            if (sortBy === 'newest') return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
            // recommended: featured first, then by rating
            if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
            return Number(b.rating ?? 0) - Number(a.rating ?? 0);
        });

        return result;
    }, [initialCourses, searchQuery, selectedCategories, priceFilter, levelFilter, sortBy]);

    const activeFilterCount =
        (selectedCategories.length > 0 ? 1 : 0) +
        (priceFilter !== 'all' ? 1 : 0) +
        (levelFilter !== 'all' ? 1 : 0);

    const FilterSidebar = () => (
        <div className="space-y-7">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900">Filter</h3>
                {activeFilterCount > 0 && (
                    <button
                        onClick={clearAll}
                        className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                    >
                        <X className="w-3 h-3" /> Hapus semua
                    </button>
                )}
            </div>

            {/* Search */}
            <div>
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">Pencarian</h4>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari judul, instruktur..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
                <div>
                    <h4 className="font-semibold text-gray-800 mb-3 text-sm">Kategori Standar</h4>
                    <div className="space-y-2.5">
                        {categories.map(cat => (
                            <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={selectedCategories.includes(cat)}
                                    onChange={() => toggleCategory(cat)}
                                />
                                <span className={`text-sm transition-colors ${selectedCategories.includes(cat) ? 'text-blue-600 font-semibold' : 'text-gray-600 group-hover:text-blue-600'}`}>
                                    {cat}
                                </span>
                                <span className="ml-auto text-xs text-gray-400">
                                    {initialCourses.filter(c => c.category?.name === cat).length}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Price */}
            <div>
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">Harga</h4>
                <div className="space-y-2.5">
                    {([
                        { value: 'all', label: 'Semua Harga' },
                        { value: 'under2m', label: 'Di bawah Rp 2jt' },
                        { value: '2m_to_5m', label: 'Rp 2jt – Rp 5jt' },
                        { value: 'above5m', label: 'Di atas Rp 5jt' },
                    ] as { value: PriceFilter; label: string }[]).map(opt => (
                        <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="radio"
                                name="price"
                                className="w-4 h-4 border-gray-300 text-blue-600 cursor-pointer"
                                checked={priceFilter === opt.value}
                                onChange={() => setPriceFilter(opt.value)}
                            />
                            <span className={`text-sm transition-colors ${priceFilter === opt.value ? 'text-blue-600 font-semibold' : 'text-gray-600 group-hover:text-blue-600'}`}>
                                {opt.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Level */}
            <div>
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">Tingkat Kesulitan</h4>
                <div className="space-y-2.5">
                    {([
                        { value: 'all', label: 'Semua Level' },
                        { value: 'Beginner', label: 'Pemula' },
                        { value: 'Intermediate', label: 'Menengah' },
                        { value: 'Advanced', label: 'Mahir' },
                    ] as { value: LevelFilter; label: string }[]).map(opt => (
                        <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="radio"
                                name="level"
                                className="w-4 h-4 border-gray-300 text-blue-600 cursor-pointer"
                                checked={levelFilter === opt.value}
                                onChange={() => setLevelFilter(opt.value)}
                            />
                            <span className={`text-sm transition-colors ${levelFilter === opt.value ? 'text-blue-600 font-semibold' : 'text-gray-600 group-hover:text-blue-600'}`}>
                                {opt.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50 min-h-screen pb-20">

            {/* Page Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <nav className="text-sm text-gray-500 mb-2">Beranda / Katalog Pelatihan ISO</nav>
                    <h1 className="text-3xl font-bold text-gray-900">Jelajahi Pelatihan ISO</h1>
                    <p className="text-gray-600 mt-2">
                        Tingkatkan standar kualitas dan kepatuhan organisasi Anda dengan sertifikasi BNSP dan Internasional.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Mobile filter toggle */}
                <div className="lg:hidden mb-4">
                    <button
                        onClick={() => setShowMobileFilter(!showMobileFilter)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-400 transition-colors"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filter
                        {activeFilterCount > 0 && (
                            <span className="ml-1 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    {showMobileFilter && (
                        <div className="mt-3 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <FilterSidebar />
                        </div>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:block w-64 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-6 self-start sticky top-24">
                        <FilterSidebar />
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">

                        {/* Toolbar */}
                        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                            <p className="text-gray-500 text-sm">
                                Menampilkan <span className="font-bold text-gray-900">{filteredAndSorted.length}</span> dari{' '}
                                <span className="font-bold text-gray-900">{initialCourses.length}</span> program pelatihan
                                {activeFilterCount > 0 && (
                                    <button onClick={clearAll} className="ml-2 text-blue-600 hover:underline font-medium">
                                        (hapus filter)
                                    </button>
                                )}
                            </p>
                            <div className="flex items-center gap-2 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                                <span className="text-gray-500">Urutkan:</span>
                                <select
                                    className="border-none bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value as SortOption)}
                                >
                                    <option value="recommended">Rekomendasi</option>
                                    <option value="newest">Terbaru</option>
                                    <option value="price_asc">Harga Terendah</option>
                                    <option value="price_desc">Harga Tertinggi</option>
                                </select>
                            </div>
                        </div>

                        {/* Active filter chips */}
                        {(selectedCategories.length > 0 || priceFilter !== 'all' || levelFilter !== 'all' || searchQuery) && (
                            <div className="flex flex-wrap gap-2 mb-5">
                                {searchQuery && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                                        🔍 &ldquo;{searchQuery}&rdquo;
                                        <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-blue-900"><X className="w-3 h-3" /></button>
                                    </span>
                                )}
                                {selectedCategories.map(cat => (
                                    <span key={cat} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                                        {cat}
                                        <button onClick={() => toggleCategory(cat)} className="ml-1 hover:text-blue-900"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                                {priceFilter !== 'all' && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                                        {priceFilter === 'under2m' ? '< Rp 2jt' : priceFilter === '2m_to_5m' ? 'Rp 2jt–5jt' : '> Rp 5jt'}
                                        <button onClick={() => setPriceFilter('all')} className="ml-1 hover:text-green-900"><X className="w-3 h-3" /></button>
                                    </span>
                                )}
                                {levelFilter !== 'all' && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
                                        {levelFilter}
                                        <button onClick={() => setLevelFilter('all')} className="ml-1 hover:text-purple-900"><X className="w-3 h-3" /></button>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Course Grid */}
                        {filteredAndSorted.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredAndSorted.map(course => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-7 h-7 text-gray-400" />
                                </div>
                                <p className="text-gray-700 font-semibold mb-1">Tidak ada kursus ditemukan</p>
                                <p className="text-gray-400 text-sm mb-4">
                                    Coba ubah kata kunci atau hapus beberapa filter yang aktif.
                                </p>
                                <button
                                    onClick={clearAll}
                                    className="px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                                >
                                    Hapus Semua Filter
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
