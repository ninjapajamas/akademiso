'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Award, BookOpen, GraduationCap, LayoutDashboard, LogOut, Settings, ShieldCheck, ShoppingBag, Users } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';

function decodeJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

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
        const payload = decodeJwt(token);
        if (!payload || payload.is_staff === undefined) {
            nextState = { authorized: false, redirectTo: '/login', resetToken: true, checking: false };
        } else if (!payload.is_staff && !payload.is_superuser) {
            nextState = { authorized: false, redirectTo: '/', resetToken: false, checking: false };
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

    return () => {
        window.removeEventListener('storage', handler);
        window.removeEventListener('focus', handler);
    };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const authState = useSyncExternalStore(
        subscribeAuth,
        getClientAuthState,
        () => AUTH_CHECKING_STATE
    );

    useEffect(() => {
        if (authState.resetToken) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }

        if (authState.redirectTo) {
            router.replace(authState.redirectTo);
        }
    }, [authState, router]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.push('/login');
    };

    const menuItems = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Courses', href: '/admin/courses', icon: BookOpen },
        { name: 'Instructors', href: '/admin/instructors', icon: GraduationCap },
        { name: 'Students', href: '/admin/users', icon: Users },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
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
            <aside className="fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 w-64 flex flex-col transition-all duration-300">
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

            <main className="flex-1 md:ml-64 p-8 transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
