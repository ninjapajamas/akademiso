'use client';

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import CourseCard from '@/components/CourseCard';
import { Course } from '@/types';

type SortOption = 'recommended' | 'newest' | 'price_asc' | 'price_desc';
type PriceFilter = 'all' | 'under2m' | '2m_to_5m' | 'above5m';
type LevelFilter = 'all' | 'Beginner' | 'Intermediate' | 'Advanced';
type TypeFilter = 'all' | 'course' | 'webinar' | 'workshop';
type OfferFilter = 'all' | 'elearning' | 'public_training' | 'inhouse_training';

export default function CatalogContent({ initialCourses }: { initialCourses: Course[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
    const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [offerFilter, setOfferFilter] = useState<OfferFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('recommended');
    const [showMobileFilter, setShowMobileFilter] = useState(false);

    const categories = useMemo(() => {
        const names = initialCourses
            .map(course => course.category?.name)
            .filter((name): name is string => !!name);
        return Array.from(new Set(names)).sort();
    }, [initialCourses]);

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category) ? prev.filter(item => item !== category) : [...prev, category]
        );
    };

    const clearAll = () => {
        setSearchQuery('');
        setSelectedCategories([]);
        setPriceFilter('all');
        setLevelFilter('all');
        setTypeFilter('all');
        setOfferFilter('all');
        setSortBy('recommended');
    };

    const filteredAndSorted = useMemo(() => {
        let result = [...initialCourses];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(course =>
                course.title.toLowerCase().includes(query) ||
                course.instructor?.name?.toLowerCase().includes(query) ||
                course.category?.name?.toLowerCase().includes(query)
            );
        }

        if (selectedCategories.length > 0) {
            result = result.filter(course => {
                const categoryName = course.category?.name;
                return categoryName ? selectedCategories.includes(categoryName) : false;
            });
        }

        if (priceFilter !== 'all') {
            result = result.filter(course => {
                const price = Number(course.price);
                if (priceFilter === 'under2m') return price < 2_000_000;
                if (priceFilter === '2m_to_5m') return price >= 2_000_000 && price <= 5_000_000;
                if (priceFilter === 'above5m') return price > 5_000_000;
                return true;
            });
        }

        if (levelFilter !== 'all') {
            result = result.filter(course => course.level === levelFilter);
        }

        if (typeFilter !== 'all') {
            result = result.filter(course => course.type === typeFilter);
        }

        if (offerFilter !== 'all') {
            result = result.filter(course => {
                if (offerFilter === 'elearning') return !!course.elearning_enabled;
                if (offerFilter === 'public_training') return !!course.public_training_enabled;
                if (offerFilter === 'inhouse_training') return !!course.inhouse_training_enabled;
                return true;
            });
        }

        result.sort((a, b) => {
            if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
            if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
            if (sortBy === 'newest') {
                return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
            }
            if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
            return Number(b.rating ?? 0) - Number(a.rating ?? 0);
        });

        return result;
    }, [
        initialCourses,
        searchQuery,
        selectedCategories,
        priceFilter,
        levelFilter,
        typeFilter,
        offerFilter,
        sortBy,
    ]);

    const activeFilterCount =
        (selectedCategories.length > 0 ? 1 : 0) +
        (priceFilter !== 'all' ? 1 : 0) +
        (levelFilter !== 'all' ? 1 : 0) +
        (typeFilter !== 'all' ? 1 : 0) +
        (offerFilter !== 'all' ? 1 : 0);

    const renderFilterSidebar = () => (
        <div className="space-y-7">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Filter</h3>
                {activeFilterCount > 0 && (
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                    >
                        <X className="h-3 w-3" /> Hapus semua
                    </button>
                )}
            </div>

            <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-800">Pencarian</h4>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-500" />
                    <input
                        type="text"
                        placeholder="Cari judul, trainer..."
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        value={searchQuery}
                        onChange={event => setSearchQuery(event.target.value)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {categories.length > 0 && (
                <div>
                    <h4 className="mb-3 text-sm font-semibold text-gray-800">Kategori</h4>
                    <div className="space-y-2.5">
                        {categories.map(category => (
                            <label key={category} className="group flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={selectedCategories.includes(category)}
                                    onChange={() => toggleCategory(category)}
                                />
                                <span className={`text-sm transition-colors ${selectedCategories.includes(category) ? 'font-semibold text-blue-600' : 'text-gray-600 group-hover:text-blue-600'}`}>
                                    {category}
                                </span>
                                <span className="ml-auto text-xs text-gray-400">
                                    {initialCourses.filter(course => course.category?.name === category).length}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-800">Harga</h4>
                <div className="space-y-2.5">
                    {([
                        { value: 'all', label: 'Semua Harga' },
                        { value: 'under2m', label: 'Di bawah Rp 2jt' },
                        { value: '2m_to_5m', label: 'Rp 2jt - Rp 5jt' },
                        { value: 'above5m', label: 'Di atas Rp 5jt' },
                    ] as { value: PriceFilter; label: string }[]).map(option => (
                        <label key={option.value} className="group flex cursor-pointer items-center gap-3">
                            <input
                                type="radio"
                                name="price"
                                className="h-4 w-4 cursor-pointer border-gray-300 text-blue-600"
                                checked={priceFilter === option.value}
                                onChange={() => setPriceFilter(option.value)}
                            />
                            <span className={`text-sm transition-colors ${priceFilter === option.value ? 'font-semibold text-blue-600' : 'text-gray-600 group-hover:text-blue-600'}`}>
                                {option.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-800">Jenis Program</h4>
                <div className="space-y-2.5">
                    {([
                        { value: 'all', label: 'Semua Jenis' },
                        { value: 'course', label: 'Pelatihan' },
                        { value: 'webinar', label: 'Webinar' },
                        { value: 'workshop', label: 'Workshop' },
                    ] as { value: TypeFilter; label: string }[]).map(option => (
                        <label key={option.value} className="group flex cursor-pointer items-center gap-3">
                            <input
                                type="radio"
                                name="type"
                                className="h-4 w-4 cursor-pointer border-gray-300 text-blue-600"
                                checked={typeFilter === option.value}
                                onChange={() => setTypeFilter(option.value)}
                            />
                            <span className={`text-sm transition-colors ${typeFilter === option.value ? 'font-semibold text-blue-600' : 'text-gray-600 group-hover:text-blue-600'}`}>
                                {option.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-800">Skema Pelatihan</h4>
                <div className="space-y-2.5">
                    {([
                        { value: 'all', label: 'Semua Skema' },
                        { value: 'elearning', label: 'E-Learning' },
                        { value: 'public_training', label: 'Public Training' },
                        { value: 'inhouse_training', label: 'Inhouse Training' },
                    ] as { value: OfferFilter; label: string }[]).map(option => (
                        <label key={option.value} className="group flex cursor-pointer items-center gap-3">
                            <input
                                type="radio"
                                name="offer"
                                className="h-4 w-4 cursor-pointer border-gray-300 text-blue-600"
                                checked={offerFilter === option.value}
                                onChange={() => setOfferFilter(option.value)}
                            />
                            <span className={`text-sm transition-colors ${offerFilter === option.value ? 'font-semibold text-blue-600' : 'text-gray-600 group-hover:text-blue-600'}`}>
                                {option.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-800">Tingkat Kesulitan</h4>
                <div className="space-y-2.5">
                    {([
                        { value: 'all', label: 'Semua Level' },
                        { value: 'Beginner', label: 'Pemula' },
                        { value: 'Intermediate', label: 'Menengah' },
                        { value: 'Advanced', label: 'Mahir' },
                    ] as { value: LevelFilter; label: string }[]).map(option => (
                        <label key={option.value} className="group flex cursor-pointer items-center gap-3">
                            <input
                                type="radio"
                                name="level"
                                className="h-4 w-4 cursor-pointer border-gray-300 text-blue-600"
                                checked={levelFilter === option.value}
                                onChange={() => setLevelFilter(option.value)}
                            />
                            <span className={`text-sm transition-colors ${levelFilter === option.value ? 'font-semibold text-blue-600' : 'text-gray-600 group-hover:text-blue-600'}`}>
                                {option.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );

    const hasActiveFilters =
        selectedCategories.length > 0 ||
        priceFilter !== 'all' ||
        levelFilter !== 'all' ||
        typeFilter !== 'all' ||
        offerFilter !== 'all' ||
        !!searchQuery;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="border-b border-gray-200 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
                    <nav className="mb-2 text-sm text-gray-500">Beranda / Katalog Pelatihan ISO</nav>
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Jelajahi Pelatihan ISO</h1>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                        Tingkatkan standar kualitas dan kepatuhan organisasi Anda dengan sertifikasi BNSP dan Internasional.
                    </p>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
                <div className="mb-4 lg:hidden">
                    <button
                        onClick={() => setShowMobileFilter(!showMobileFilter)}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-blue-400"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        Filter
                        {activeFilterCount > 0 && (
                            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    {showMobileFilter && (
                        <div className="mt-3 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            {renderFilterSidebar()}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-8 lg:flex-row">
                    <aside className="sticky top-24 hidden w-64 flex-shrink-0 self-start rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:block">
                        {renderFilterSidebar()}
                    </aside>

                    <div className="min-w-0 flex-1">
                        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-gray-500">
                                Menampilkan <span className="font-bold text-gray-900">{filteredAndSorted.length}</span> dari{' '}
                                <span className="font-bold text-gray-900">{initialCourses.length}</span> program pelatihan
                                {activeFilterCount > 0 && (
                                    <button onClick={clearAll} className="ml-2 font-medium text-blue-600 hover:underline">
                                        (hapus filter)
                                    </button>
                                )}
                            </p>
                            <div className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm sm:w-auto">
                                <span className="text-gray-500">Urutkan:</span>
                                <select
                                    className="min-w-0 flex-1 cursor-pointer border-none bg-transparent font-bold text-gray-900 outline-none sm:flex-none"
                                    value={sortBy}
                                    onChange={event => setSortBy(event.target.value as SortOption)}
                                >
                                    <option value="recommended">Rekomendasi</option>
                                    <option value="newest">Terbaru</option>
                                    <option value="price_asc">Harga Terendah</option>
                                    <option value="price_desc">Harga Tertinggi</option>
                                </select>
                            </div>
                        </div>

                        {hasActiveFilters && (
                            <div className="mb-5 flex flex-wrap gap-2">
                                {searchQuery && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                        Cari: &quot;{searchQuery}&quot;
                                        <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-blue-900">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {selectedCategories.map(category => (
                                    <span key={category} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                        {category}
                                        <button onClick={() => toggleCategory(category)} className="ml-1 hover:text-blue-900">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                                {priceFilter !== 'all' && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                        {priceFilter === 'under2m' ? '< Rp 2jt' : priceFilter === '2m_to_5m' ? 'Rp 2jt - 5jt' : '> Rp 5jt'}
                                        <button onClick={() => setPriceFilter('all')} className="ml-1 hover:text-green-900">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {levelFilter !== 'all' && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                                        {levelFilter}
                                        <button onClick={() => setLevelFilter('all')} className="ml-1 hover:text-purple-900">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {typeFilter !== 'all' && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                                        {typeFilter === 'course' ? 'Pelatihan' : typeFilter === 'webinar' ? 'Webinar' : 'Workshop'}
                                        <button onClick={() => setTypeFilter('all')} className="ml-1 hover:text-orange-900">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {offerFilter !== 'all' && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                                        {offerFilter === 'elearning' ? 'E-Learning' : offerFilter === 'public_training' ? 'Public Training' : 'Inhouse Training'}
                                        <button onClick={() => setOfferFilter('all')} className="ml-1 hover:text-cyan-900">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}

                        {filteredAndSorted.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {filteredAndSorted.map(course => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                                    <Search className="h-7 w-7 text-gray-400" />
                                </div>
                                <p className="mb-1 font-semibold text-gray-700">Tidak ada kursus ditemukan</p>
                                <p className="mb-4 text-sm text-gray-400">
                                    Coba ubah kata kunci atau hapus beberapa filter yang aktif.
                                </p>
                                <button
                                    onClick={clearAll}
                                    className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
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
