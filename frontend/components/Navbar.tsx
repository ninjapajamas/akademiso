'use client';

import Link from 'next/link';
import { Search, Menu, X, ShieldCheck, User, LayoutDashboard, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check for token on mount
        const token = localStorage.getItem('access_token');
        setIsLoggedIn(!!token);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsLoggedIn(false);
        setUserMenuOpen(false);
        router.push('/');
    };

    return (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center gap-8">

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                            <ShieldCheck className="w-5 h-5 fill-current" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-gray-900">Akademiso</span>
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
                        <Link href="/consulting" className="hover:text-blue-600 transition-colors">Konsultan</Link>
                        <Link href="/corporate" className="hover:text-blue-600 transition-colors">In-House Training</Link>

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
                                                <p className="text-sm font-bold text-gray-900 truncate">user@akademiso.com</p>
                                            </div>
                                            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                <LayoutDashboard className="w-4 h-4" />
                                                Dashboard
                                            </Link>
                                            <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                <User className="w-4 h-4" />
                                                Profile Settings
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
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
                    >
                        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-lg">
                    <div className="px-4 py-6 space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari pelatihan..."
                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-blue-500"
                            />
                            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                        </div>

                        <Link href="/courses" className="block text-gray-600 font-medium py-2 hover:text-blue-600">Program ISO</Link>
                        <Link href="/consulting" className="block text-gray-600 font-medium py-2 hover:text-blue-600">Konsultan</Link>
                        <Link href="/corporate" className="block text-gray-600 font-medium py-2 hover:text-blue-600">In-House Training</Link>
                        <hr className="border-gray-100" />

                        {isLoggedIn ? (
                            <>
                                <Link href="/dashboard" className="flex items-center gap-2 text-gray-900 font-bold py-2 hover:text-blue-600">
                                    <LayoutDashboard className="w-5 h-5" />
                                    Dashboard Saya
                                </Link>
                                <button onClick={handleLogout} className="flex w-full items-center gap-2 text-red-600 font-bold py-2 hover:bg-red-50 rounded-lg">
                                    <LogOut className="w-5 h-5" />
                                    Keluar
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="block text-gray-600 font-medium py-2 hover:text-blue-600">Masuk</Link>
                                <Link href="/register" className="block text-center bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
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
