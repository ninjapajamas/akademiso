'use client';

import Link from 'next/link';
import { Search, Menu, X, ShieldCheck, User, LayoutDashboard, LogOut, ShoppingCart } from 'lucide-react';
import { useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { getPortalPathForRole } from '@/utils/auth';
import type { UserProfilePayload } from '@/utils/profile';

function subscribeToAuthToken(onStoreChange: () => void) {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const handleChange = () => onStoreChange();

    window.addEventListener('storage', handleChange);
    window.addEventListener('focus', handleChange);
    window.addEventListener('auth-change', handleChange);

    return () => {
        window.removeEventListener('storage', handleChange);
        window.removeEventListener('focus', handleChange);
        window.removeEventListener('auth-change', handleChange);
    };
}

function getAccessTokenSnapshot() {
    if (typeof window === 'undefined') {
        return null;
    }

    return localStorage.getItem('access_token');
}

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [userData, setUserData] = useState<UserProfilePayload | null>(null);
    const router = useRouter();
    const { cartCount } = useCart();
    const accessToken = useSyncExternalStore(
        subscribeToAuthToken,
        getAccessTokenSnapshot,
        () => null
    );
    const isLoggedIn = Boolean(accessToken);

    useEffect(() => {
        if (!accessToken) {
            return;
        }

        const loadProfile = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/profile/`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUserData(data);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };

        void loadProfile();
    }, [accessToken]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.dispatchEvent(new Event('auth-change'));
        setUserData(null);
        setUserMenuOpen(false);
        router.push('/');
    };

    const portalHref = getPortalPathForRole(userData?.role || 'student');
    const portalLabel = userData?.role === 'admin'
        ? 'Dashboard Admin'
        : userData?.role === 'akuntan'
            ? 'Portal Akuntan'
            : userData?.role === 'instructor'
                ? 'Portal Instruktur'
                : 'Dashboard Saya';

    return (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 md:h-20 items-center gap-3 md:gap-8">

                    {/* Logo */}
                    <Link href="/" className="flex min-w-0 items-center gap-2 flex-shrink-0">
                        <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                            <ShieldCheck className="w-5 h-5 fill-current" />
                        </div>
                        <span className="truncate font-bold text-lg tracking-tight text-gray-900 sm:text-xl">Akademiso</span>
                    </Link>

                    {/* Search Bar */}
                    <div className="hidden md:flex flex-1 max-w-xl relative">
                        <input
                            type="text"
                            placeholder="Cari pelatihan ISO..."
                            className="w-full pl-11 pr-4 py-3 rounded-full bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm font-medium placeholder:text-gray-400 text-gray-700"
                        />
                        <Search className="absolute left-4 top-3 h-5 w-5 text-blue-500/50" />
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
                        <Link href="/courses" className="hover:text-blue-600 transition-colors">Program ISO</Link>

                        {/* Cart Icon */}

                        <div className="flex items-center gap-4 ml-2">
                            {isLoggedIn ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        className="flex items-center gap-2 text-gray-900 hover:text-blue-600 transition-colors focus:outline-none"
                                    >
                                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <span>Akun Saya</span>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {userMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden animation-fade-in z-50">
                                            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Logged in as</p>
                                                <p className="text-sm font-bold text-gray-900 truncate">
                                                    {userData ? (
                                                        (userData.first_name || userData.last_name)
                                                            ? `${userData.first_name} ${userData.last_name}`.trim()
                                                            : userData.username
                                                    ) : 'Loading...'}
                                                </p>
                                            </div>
                                            <Link href="/cart" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors justify-between">
                                                <div className="flex items-center gap-3">
                                                    <ShoppingCart className="w-4 h-4" />
                                                    Keranjang Belanja
                                                </div>
                                                {cartCount > 0 && (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        {cartCount}
                                                    </span>
                                                )}
                                            </Link>
                                            <Link href={portalHref} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                <LayoutDashboard className="w-4 h-4" />
                                                {portalLabel}
                                            </Link>
                                            <div className="border-t border-gray-50 my-1"></div>
                                            <button
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Keluar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Link href="/login" className="text-gray-900 hover:text-blue-600 transition-colors">Masuk</Link>
                                    <Link href="/register" className="bg-blue-600 text-white px-6 py-2.5 rounded-full hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-600/20 active:scale-95">
                                        Daftar
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center gap-1 md:hidden">
                        {isLoggedIn && (
                            <Link
                                href="/cart"
                                aria-label="Keranjang belanja"
                                className="relative flex h-11 w-11 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                            >
                                <ShoppingCart className="h-5 w-5" />
                                {cartCount > 0 && (
                                    <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none"
                            aria-label={isOpen ? 'Tutup menu' : 'Buka menu'}
                            aria-expanded={isOpen}
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="absolute left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-gray-100 bg-white shadow-xl md:hidden">
                    <div className="space-y-4 px-4 py-5">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari pelatihan..."
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-10 pr-4 text-base text-gray-800 outline-none focus:border-blue-500"
                            />
                            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                        </div>

                        <Link href="/courses" onClick={() => setIsOpen(false)} className="block rounded-xl px-2 py-3 font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600">Program ISO</Link>
                        <hr className="border-gray-100" />

                        {isLoggedIn ? (
                            <>
                                <Link href="/cart" onClick={() => setIsOpen(false)} className="flex items-center justify-between rounded-xl px-2 py-3 font-bold text-gray-900 hover:bg-blue-50 hover:text-blue-600">
                                    <span className="flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5" />
                                        Keranjang Belanja
                                    </span>
                                    {cartCount > 0 && (
                                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                            {cartCount}
                                        </span>
                                    )}
                                </Link>
                                <Link href={portalHref} onClick={() => setIsOpen(false)} className="flex items-center gap-2 rounded-xl px-2 py-3 font-bold text-gray-900 hover:bg-blue-50 hover:text-blue-600">
                                    <LayoutDashboard className="w-5 h-5" />
                                    {portalLabel}
                                </Link>
                                <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-2 py-3 font-bold text-red-600 hover:bg-red-50">
                                    <LogOut className="w-5 h-5" />
                                    Keluar
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" onClick={() => setIsOpen(false)} className="block rounded-xl px-2 py-3 font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600">Masuk</Link>
                                <Link href="/register" onClick={() => setIsOpen(false)} className="block rounded-xl bg-blue-600 py-3.5 text-center font-bold text-white hover:bg-blue-700">
                                    Daftar Sekarang
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
