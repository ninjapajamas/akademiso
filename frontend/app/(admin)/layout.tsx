'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Award, BookOpen, BriefcaseBusiness, GraduationCap, KeyRound, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Tags, Users, X } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { clearStoredAuth, decodeJwtPayload, getPortalPathForRole, getRoleFromPayload, isTokenExpired } from '@/utils/auth';

type AuthState = {
    authorized: boolean;
    redirectTo: string | null;
    resetToken: boolean;
    checking: boolean;
};

const AUTH_CHECKING_STATE: AuthState = {
    authorized: false,
    redirectTo: null,
    resetToken: false,
    checking: true,
};

let cachedAuthState: AuthState = AUTH_CHECKING_STATE;

function isSameAuthState(a: AuthState, b: AuthState) {
    return (
        a.authorized === b.authorized &&
        a.redirectTo === b.redirectTo &&
        a.resetToken === b.resetToken &&
        a.checking === b.checking
    );
}

function getClientAuthState(): AuthState {
    let nextState: AuthState;
    const token = localStorage.getItem('access_token');
    if (!token) {
        nextState = { authorized: false, redirectTo: '/login', resetToken: false, checking: false };
    } else {
        const payload = decodeJwtPayload(token);
        if (!payload || isTokenExpired(payload) || payload.is_staff === undefined) {
            nextState = { authorized: false, redirectTo: '/login', resetToken: true, checking: false };
        } else if (getRoleFromPayload(payload) !== 'admin') {
            nextState = { authorized: false, redirectTo: getPortalPathForRole(getRoleFromPayload(payload)), resetToken: false, checking: false };
        } else {
            nextState = { authorized: true, redirectTo: null, resetToken: false, checking: false };
        }
    }

    if (isSameAuthState(cachedAuthState, nextState)) {
        return cachedAuthState;
    }

    cachedAuthState = nextState;
    return cachedAuthState;
}

function subscribeAuth(callback: () => void) {
    if (typeof window === 'undefined') return () => {};

    const handler = () => callback();
    window.addEventListener('storage', handler);
    window.addEventListener('focus', handler);
    window.addEventListener('auth-change', handler);

    return () => {
        window.removeEventListener('storage', handler);
        window.removeEventListener('focus', handler);
        window.removeEventListener('auth-change', handler);
    };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const authState = useSyncExternalStore(
        subscribeAuth,
        getClientAuthState,
        () => AUTH_CHECKING_STATE
    );

    useEffect(() => {
        if (authState.resetToken) {
            clearStoredAuth();
        }

        if (authState.redirectTo) {
            router.replace(authState.redirectTo);
        }
    }, [authState, router]);

    const handleLogout = () => {
        clearStoredAuth();
        router.push('/login');
    };

    const menuItems = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Courses', href: '/admin/courses', icon: BookOpen },
        { name: 'Inhouse Leads', href: '/admin/inhouse-requests', icon: BriefcaseBusiness },
        { name: 'Instructors', href: '/admin/instructors', icon: GraduationCap },
        { name: 'Students', href: '/admin/users', icon: Users },
        { name: 'Referral', href: '/admin/referrals', icon: Tags },
        { name: 'Access Links', href: '/admin/access-links', icon: KeyRound },
        { name: 'Sertifikat', href: '/admin/certificates', icon: Award },
        { name: 'Pengaturan', href: '/admin/settings', icon: Settings },
    ];

    if (authState.checking || !authState.authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-500">Memeriksa akses...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-gray-100 bg-white transition-all duration-300 md:flex">
                <div className="h-20 flex items-center px-6 border-b border-gray-50">
                    <Link href="/admin" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="font-bold text-lg text-gray-900">
                            Akademiso
                            <span className="block text-[10px] text-gray-500 font-normal">Admin Portal</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group relative ${isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                <span className={`font-medium ${isActive ? 'font-bold' : ''}`}>{item.name}</span>
                                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-l-full"></div>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-50">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors w-full"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout Admin</span>
                    </button>
                </div>
            </aside>

            <div className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur md:hidden">
                <div className="flex h-16 items-center justify-between px-4">
                    <Link href="/admin" className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-900">Akademiso</div>
                            <div className="text-[10px] text-gray-500">Admin Portal</div>
                        </div>
                    </Link>

                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-700"
                        aria-label="Buka menu admin"
                        aria-expanded={mobileMenuOpen}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
                        aria-label="Tutup menu admin"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className="absolute inset-y-0 left-0 flex w-[min(88vw,320px)] flex-col bg-white shadow-2xl">
                        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
                            <div>
                                <div className="text-sm font-bold text-gray-900">Admin Navigation</div>
                                <div className="text-xs text-gray-500">Kelola operasional Akademiso</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-700"
                                aria-label="Tutup menu"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-3 py-4">
                            <div className="space-y-1">
                                {menuItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                                                isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span>{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="border-t border-gray-100 p-3">
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                                <LogOut className="h-5 w-5" />
                                Logout Admin
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 p-4 pt-20 pb-6 transition-all duration-300 sm:p-6 sm:pt-24 md:ml-64 md:p-8 md:pt-8">
                {children}
            </main>
        </div>
    );
}
