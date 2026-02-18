'use client';

import { X, CheckCircle, ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface AddToCartModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddToCartModal({ isOpen, onClose }: AddToCartModalProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
        } else {
            const timer = setTimeout(() => setVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <CheckCircle className="w-8 h-8" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">Berhasil Ditambahkan!</h3>
                    <p className="text-gray-500 mb-8">Kursus telah berhasil dimasukkan ke keranjang belanja Anda.</p>

                    <div className="space-y-3">
                        <Link
                            href="/cart"
                            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            Lihat Keranjang
                        </Link>

                        <button
                            onClick={onClose}
                            className="flex items-center justify-center gap-2 w-full bg-gray-50 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            Lanjut Belanja
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
