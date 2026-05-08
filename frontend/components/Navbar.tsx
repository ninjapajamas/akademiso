'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import Link from 'next/link';
import { Search, Menu, X, ShieldCheck, User, LayoutDashboard, LogOut, ShoppingCart } from 'lucide-react';
import { useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { clearStoredAuth, getPortalPathForRole } from '@/utils/auth';
import type { UserProfilePayload } from '@/utils/profile';

const WHATSAPP_URL = 'https://wa.me/6281390012014';

function WhatsAppIcon({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

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
                const apiUrl = getClientApiBaseUrl();
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
        clearStoredAuth();
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
                ? 'Portal Trainer'
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
                    <div className="hidden min-w-0 flex-1 md:flex">
                        <div className="relative w-full max-w-xl">
                            <input
                                type="text"
                                placeholder="Cari pelatihan ISO..."
                                className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-16 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:pr-56"
                            />
                            <Search className="absolute left-4 top-3 h-5 w-5 text-blue-500" />
                            <a
                                href={WHATSAPP_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-all hover:scale-105 hover:bg-[#1fbe5c] lg:h-auto lg:w-auto lg:gap-1.5 lg:rounded-full lg:border lg:border-emerald-200 lg:bg-emerald-50 lg:px-2.5 lg:py-1 lg:text-[11px] lg:font-bold lg:text-emerald-700"
                                aria-label="Mau tanya tanya? Hubungi kami yuk"
                            >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white lg:h-6 lg:w-6">
                                    <WhatsAppIcon className="h-3.5 w-3.5" />
                                </span>
                                <span className="hidden whitespace-nowrap lg:inline">Mau tanya tanya? Hubungi kami yuk</span>
                            </a>
                        </div>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
                        <Link href="/courses" className="hover:text-blue-600 transition-colors">Daftar Pelatihan</Link>
                        <button type="button" className="hover:text-blue-600 transition-colors">Isonesia</button>

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
                                <Link
                                    href="/login"
                                    className="login-cta group inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 font-bold text-white shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                                >
                                    <span className="login-cta__icon-wrap">
                                        <User className="login-cta__icon h-4 w-4" />
                                    </span>
                                    <span className="relative z-10">Masuk</span>
                                </Link>
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
                                className="w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-10 pr-16 text-base font-medium text-gray-900 outline-none placeholder:text-gray-500 focus:border-blue-500"
                            />
                            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            <a
                                href={WHATSAPP_URL}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Hubungi kami via WhatsApp"
                                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-all hover:bg-[#1fbe5c]"
                            >
                                <WhatsAppIcon className="h-5 w-5" />
                            </a>
                        </div>

                        <Link href="/courses" onClick={() => setIsOpen(false)} className="block rounded-xl px-2 py-3 font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600">Daftar Pelatihan</Link>
                        <button type="button" className="block w-full rounded-xl px-2 py-3 text-left font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600">Isonesia</button>
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
                                <Link
                                    href="/login"
                                    onClick={() => setIsOpen(false)}
                                    className="login-cta login-cta--mobile group flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-3.5 text-center font-bold text-white"
                                >
                                    <span className="login-cta__icon-wrap">
                                        <User className="login-cta__icon h-4 w-4" />
                                    </span>
                                    <span className="relative z-10">Masuk</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}

