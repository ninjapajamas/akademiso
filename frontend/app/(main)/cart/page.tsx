'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';

interface CartItem {
    id: number;
    course: {
        id: number;
        slug: string;
        title: string;
        price: string;
        thumbnail: string | null;
        instructor: {
            name: string;
        };
    };
    offer_type: 'elearning' | 'public';
    offer_mode: 'online' | 'offline' | '';
    public_session_id: string;
    public_session?: {
        id: string;
        title?: string;
        delivery_mode?: 'online' | 'offline';
        schedule?: string;
        location?: string;
        duration?: string;
        price?: string;
    } | null;
    total_amount: string;
    added_at: string;
}

export default function CartPage() {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { refreshCart } = useCart();
    const { confirmAction, showError, showSuccess } = useFeedbackModal();

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

    const removeItem = async (itemId: number) => {
        const shouldDelete = await confirmAction({
            title: 'Hapus Item dari Keranjang?',
            message: 'Item transaksi ini akan dihapus dari keranjang belanja Anda.',
            confirmLabel: 'Ya, Hapus',
            cancelLabel: 'Batal',
            tone: 'warning',
        });
        if (!shouldDelete) return;

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const res = await fetch(`${apiUrl}/api/cart/remove_item/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ item_id: itemId })
            });

            if (res.ok) {
                await fetchCart();
                refreshCart();
                await showSuccess('Kursus berhasil dihapus dari keranjang.', 'Keranjang Diperbarui');
            } else {
                await showError('Kursus belum bisa dihapus dari keranjang.', 'Penghapusan Gagal');
            }
        } catch (error) {
            console.error('Error removing item:', error);
            await showError('Terjadi kesalahan saat menghapus item dari keranjang.', 'Koneksi Bermasalah');
        }
    };

    const totalPrice = items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

    const getOfferLabel = (item: CartItem) => {
        if (item.offer_type === 'public') {
            return `Public Training${item.offer_mode ? ` ${item.offer_mode === 'online' ? 'Online' : 'Offline'}` : ''}`;
        }
        return 'E-Learning';
    };

    const getCheckoutHref = (item: CartItem) => {
        const query = new URLSearchParams({
            slug: item.course.slug,
            offer: item.offer_type,
        });

        if (item.offer_mode) {
            query.set('mode', item.offer_mode);
        }
        if (item.public_session_id) {
            query.set('session', item.public_session_id);
        }

        return `/checkout?${query.toString()}`;
    };

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
                        <p className="text-gray-500 mb-8">Belum ada transaksi yang ditambahkan.</p>
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
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                                {getOfferLabel(item)}
                                            </span>
                                            {item.public_session?.title && (
                                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                                                    {item.public_session.title}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mb-1">Instructor: {item.course.instructor.name}</p>
                                        {item.offer_type === 'public' && item.public_session && (
                                            <div className="mb-3 space-y-1 text-xs text-gray-500">
                                                <p>{item.public_session.schedule || 'Jadwal akan diinformasikan'}</p>
                                                <p>{item.public_session.location || 'Lokasi / platform akan diinformasikan'}</p>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <span className="font-bold text-blue-600">{formatPrice(Number(item.total_amount || 0))}</span>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={getCheckoutHref(item)}
                                                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                                                >
                                                    Checkout
                                                </Link>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
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
                                        <span>{items.length} item</span>
                                    </div>
                                    <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                                        <span className="font-bold text-gray-900">Total Harga</span>
                                        <span className="font-bold text-2xl text-blue-600">{formatPrice(totalPrice)}</span>
                                    </div>
                                </div>
                                <p className="mb-4 text-sm text-gray-500">
                                    Checkout dilakukan per item agar paket e-learning dan public training tetap mengikuti sesi yang dipilih.
                                </p>
                                {items.length === 1 ? (
                                    <Link href={getCheckoutHref(items[0])} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold text-white transition-colors hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                                        Checkout Sekarang
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                ) : (
                                    <button disabled className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-200 py-3.5 font-bold text-gray-500 cursor-not-allowed">
                                        Pilih Item untuk Checkout
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
