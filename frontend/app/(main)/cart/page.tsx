'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { Trash2, ArrowRight, ShieldCheck } from 'lucide-react';

interface CartItem {
    id: number;
    course: {
        id: number;
        title: string;
        price: string;
        thumbnail: string | null;
        instructor: {
            name: string;
        };
    };
    added_at: string;
}

export default function CartPage() {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { refreshCart } = useCart();

    const fetchCart = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/cart/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            }
        } catch (error) {
            console.error('Error fetching cart:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    const removeItem = async (courseId: number) => {
        if (!confirm('Hapus kursus ini dari keranjang?')) return;

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const res = await fetch(`${apiUrl}/api/cart/remove_item/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ course_id: courseId })
            });

            if (res.ok) {
                fetchCart();
                refreshCart();
            }
        } catch (error) {
            console.error('Error removing item:', error);
            alert('Gagal menghapus item');
        }
    };

    const totalPrice = items.reduce((sum, item) => sum + Number(item.course.price), 0);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    };

    if (loading) {
        return <div className="min-h-screen py-20 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:mb-8 sm:text-3xl">Keranjang Belanja</h1>

                {items.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-6 text-center sm:p-12">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                            <ShieldCheck className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Keranjang Anda Kosong</h2>
                        <p className="text-gray-500 mb-8">Belum ada kursus yang ditambahkan.</p>
                        <Link href="/courses" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-600/20">
                            Jelajahi Kursus
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                        {/* Cart Items */}
                        <div className="flex-1 space-y-4">
                            {items.map((item) => (
                                <div key={item.id} className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                                    <div className="relative h-40 w-full flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 sm:h-24 sm:w-24">
                                        {item.course.thumbnail ? (
                                            <Image src={item.course.thumbnail} alt={item.course.title} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="mb-1 text-base font-bold text-gray-900 sm:text-lg">{item.course.title}</h3>
                                        <p className="text-sm text-gray-500 mb-2">Instructor: {item.course.instructor.name}</p>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-blue-600 font-bold">{formatPrice(Number(item.course.price))}</span>
                                            <button
                                                onClick={() => removeItem(item.course.id)}
                                                className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="lg:w-96">
                            <div className="sticky top-20 rounded-xl bg-white p-5 shadow-sm sm:p-6 lg:top-24">
                                <h3 className="font-bold text-lg text-gray-900 mb-6">Ringkasan Pesanan</h3>
                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Total Item</span>
                                        <span>{items.length} kursus</span>
                                    </div>
                                    <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                                        <span className="font-bold text-gray-900">Total Harga</span>
                                        <span className="font-bold text-2xl text-blue-600">{formatPrice(totalPrice)}</span>
                                    </div>
                                </div>
                                <button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2">
                                    Checkout Sekarang
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
