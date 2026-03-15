'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Award,
    BookOpen,
    Calendar,
    LayoutDashboard,
    LogOut,
    Settings,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';

type DashboardUser = {
    name: string;
    email: string;
    is_staff: boolean;
};

type DashboardAuthSnapshot = {
    hijackUser: string | null;
    redirectTo: '/login' | '/instructor' | null;
    user: DashboardUser | null;
};

const DASHBOARD_AUTH_EMPTY: DashboardAuthSnapshot = {
    hijackUser: null,
    redirectTo: null,
    user: null,
};

let cachedDashboardAuthSnapshot = DASHBOARD_AUTH_EMPTY;

function cacheDashboardAuthSnapshot(nextSnapshot: DashboardAuthSnapshot) {
    const previousSnapshot = cachedDashboardAuthSnapshot;

    if (
        previousSnapshot.hijackUser === nextSnapshot.hijackUser &&
        previousSnapshot.redirectTo === nextSnapshot.redirectTo &&
        previousSnapshot.user?.name === nextSnapshot.user?.name &&
        previousSnapshot.user?.email === nextSnapshot.user?.email &&
        previousSnapshot.user?.is_staff === nextSnapshot.user?.is_staff
    ) {
        return previousSnapshot;
    }

    cachedDashboardAuthSnapshot = nextSnapshot;
    return nextSnapshot;
}

function getDashboardAuthSnapshot() {
    if (typeof window === 'undefined') {
        return DASHBOARD_AUTH_EMPTY;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
        return cacheDashboardAuthSnapshot({
            hijackUser: null,
            redirectTo: '/login',
            user: null,
        });
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        if (payload.is_instructor) {
            return cacheDashboardAuthSnapshot({
                hijackUser: null,
                redirectTo: '/instructor',
                user: null,
            });
        }

        return cacheDashboardAuthSnapshot({
            hijackUser: localStorage.getItem('admin_hijack_user'),
            redirectTo: null,
            user: {
                email: payload.email || '',
                is_staff: Boolean(payload.is_staff),
                name: payload.username || '',
            },
        });
    } catch {
        return cacheDashboardAuthSnapshot({
            hijackUser: null,
            redirectTo: '/login',
            user: null,
        });
    }
}

function subscribeDashboardAuth(onStoreChange: () => void) {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    const handleChange = () => {
        onStoreChange();
    };

    window.addEventListener('storage', handleChange);
    window.addEventListener('dashboard-auth-changed', handleChange);

    return () => {
        window.removeEventListener('storage', handleChange);
        window.removeEventListener('dashboard-auth-changed', handleChange);
    };
}

function notifyDashboardAuthChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('dashboard-auth-changed'));
    }
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isSidebarOpen = true;
    const pathname = usePathname();
    const router = useRouter();
    const authState = useSyncExternalStore(
        subscribeDashboardAuth,
        getDashboardAuthSnapshot,
        () => DASHBOARD_AUTH_EMPTY
    );

    useEffect(() => {
        if (!authState.redirectTo) {
            return;
        }

        if (authState.redirectTo === '/instructor') {
            router.replace('/instructor');
            return;
        }

        router.push('/login');
    }, [authState.redirectTo, router]);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Beranda', href: '/dashboard' },
        { icon: BookOpen, label: 'Kursus Saya', href: '/dashboard/courses' },
        { icon: Calendar, label: 'Jadwal Ujian', href: '/dashboard/schedule' },
        { icon: Award, label: 'Sertifikat', href: '/dashboard/certificates' },
        { icon: Settings, label: 'Pengaturan', href: '/dashboard/settings' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('admin_original_access');
        localStorage.removeItem('admin_original_refresh');
        localStorage.removeItem('admin_hijack_user');
        notifyDashboardAuthChanged();
        router.push('/login');
    };

    const restoreAdmin = () => {
        const originalAccess = localStorage.getItem('admin_original_access');
        const originalRefresh = localStorage.getItem('admin_original_refresh');

        if (originalAccess) {
            localStorage.setItem('access_token', originalAccess);
        }
        if (originalRefresh) {
            localStorage.setItem('refresh_token', originalRefresh);
        }

        localStorage.removeItem('admin_original_access');
        localStorage.removeItem('admin_original_refresh');
        localStorage.removeItem('admin_hijack_user');
        notifyDashboardAuthChanged();
        router.push('/admin/users');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 transition-all duration-300 transform
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 translate-x-0'}
        hidden md:flex flex-col`}
            >
                <div className="h-20 flex items-center px-6 border-b border-gray-50">
                    <Link href="/" className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        {isSidebarOpen && (
                            <div className="font-bold text-lg text-gray-900 duration-200">
                                Akademiso
                                <span className="block text-[10px] text-gray-500 font-normal">Platform ISO Indonesia</span>
                            </div>
                        )}
                    </Link>
                </div>

                <div className="flex-1 py-6 px-3 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group relative
                  ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                {isSidebarOpen && (
                                    <span className={`font-medium ${isActive ? 'font-bold' : ''}`}>
                                        {item.label}
                                    </span>
                                )}
                                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-l-full" />}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-50">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors w-full
              ${!isSidebarOpen && 'justify-center'}`}
                    >
                        <LogOut className="w-5 h-5" />
                        {isSidebarOpen && <span className="font-medium">Keluar</span>}
                    </button>
                </div>
            </aside>

            <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
                <main className="p-8">
                    {authState.hijackUser && (
                        <div className="mb-6 bg-orange-500 text-white rounded-2xl px-5 py-3 flex items-center gap-3 shadow-lg shadow-orange-500/30">
                            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                            <div className="flex-1 text-sm">
                                <span className="font-bold">Mode Impersonasi Aktif</span>
                                {' '}Anda sedang melihat dashboard sebagai <span className="font-bold">@{authState.user?.name || authState.hijackUser}</span> dan sesi admin tetap tersimpan.
                            </div>
                            <button
                                onClick={restoreAdmin}
                                className="bg-white text-orange-600 font-bold text-xs px-4 py-1.5 rounded-lg hover:bg-orange-50 transition-colors flex-shrink-0"
                            >
                                Kembali ke Admin
                            </button>
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
