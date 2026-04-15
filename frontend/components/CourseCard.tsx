'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, BarChart, BookOpen, ShoppingCart, MapPin } from 'lucide-react';
import { Course } from '@/types';
import { useCart } from '../context/CartContext';
import AddToCartModal from './AddToCartModal';
import { formatRupiah } from '@/types/currency';

interface CourseCardProps {
    course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
    const { refreshCart } = useCart();
    const [isAdding, setIsAdding] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const isFreeWebinar = course.type === 'webinar' && course.is_free;

    const addToCart = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigation if wrapped in Link
        setIsAdding(true);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
                refreshCart(); // Update navbar badge
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

    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden group flex flex-col h-full">
            <div className="relative h-44 w-full overflow-hidden sm:h-48">
                {/* Tag & Type Badge */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                    <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-gray-800 shadow-sm">
                        {course.category.name}
                    </div>
                    <div className={`
                        px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-white shadow-sm border
                        ${course.type === 'webinar' ? 'bg-rose-500 border-rose-400' :
                            course.type === 'workshop' ? 'bg-amber-500 border-amber-400' :
                                'bg-indigo-500 border-indigo-400'}
                    `}>
                        {course.type === 'webinar' ? 'WEBINAR' :
                            course.type === 'workshop' ? 'WORKSHOP' :
                                'PELATIHAN'}
                    </div>
                    {course.delivery_mode && (
                        <div className="bg-black/65 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
                            {course.delivery_mode}
                        </div>
                    )}
                    {isFreeWebinar && (
                        <div className="bg-emerald-500/95 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
                            GRATIS
                        </div>
                    )}
                </div>

                {/* Thumbnail or Placeholder */}
                {course.thumbnail ? (
                    <Image
                        src={course.thumbnail}
                        alt={course.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center gap-2">
                        <BookOpen className="w-10 h-10 text-white/80" />
                        <span className="text-white/60 text-xs font-medium">{course.category?.name || 'ISO Training'}</span>
                    </div>
                )}
            </div>

            <div className="p-4 sm:p-5 flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-2 text-yellow-500 text-xs font-bold">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{course.rating}</span>
                    <span className="text-gray-400 font-normal">({course.enrolled_count})</span>
                </div>

                <Link href={`/courses/${course.slug}`}>
                    <h3 className="font-bold text-base text-gray-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 sm:text-lg">
                        {course.title}
                    </h3>
                </Link>

                {/* Metadata */}
                <div className="flex flex-col gap-2 text-xs text-gray-500 mb-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex items-center gap-1">
                            <BarChart className="w-3 h-3" />
                            <span>{course.level}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{course.duration}</span>
                        </div>
                    </div>

                    {course.scheduled_at && (
                        <div className="flex items-start gap-1 text-blue-600 font-medium">
                            <Clock className="mt-0.5 w-3 h-3 shrink-0" />
                            <span className="leading-relaxed">
                                {new Date(course.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                {course.scheduled_end_at && ` - ${new Date(course.scheduled_end_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                        </div>
                    )}

                    {course.location && (
                        <div className="flex items-start gap-1 text-gray-500 italic">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="leading-relaxed">{course.location}</span>
                        </div>
                    )}
                </div>

                {/* Instructor */}
                <div className="flex items-center gap-2 mb-4 mt-auto">
                    <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden relative">
                        {course.instructor.photo ? (
                            <Image src={course.instructor.photo} alt={course.instructor.name} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                {course.instructor.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <span className="text-xs text-gray-600 truncate">{course.instructor.name}</span>
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between items-end gap-3">
                    <div className="min-w-0">
                        <p className="text-blue-600 font-bold text-base sm:text-lg">
                            {isFreeWebinar ? 'Gratis' : formatRupiah(course.price)}
                        </p>
                    </div>
                    <button
                        onClick={addToCart}
                        disabled={isAdding}
                        className="h-10 w-10 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Tambah ke keranjang"
                    >
                        {isAdding ? (
                            <div className="w-4 h-4 border-2 border-current rounded-full border-t-transparent animate-spin"></div>
                        ) : (
                            <ShoppingCart className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>
            <AddToCartModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </div>
    );
}
