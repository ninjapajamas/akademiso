'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Award, BookOpen, GraduationCap, LayoutDashboard, LogOut, Settings, ShieldAlert, Users } from 'lucide-react';
import { decodeJwtPayload, getPortalPathForRole, getRoleFromPayload } from '@/utils/auth';

type InstructorAuthSnapshot = {
    hijackUser: string | null;
    redirectTo: string | null;
    username: string;
};

const INSTRUCTOR_AUTH_EMPTY: InstructorAuthSnapshot = {
    hijackUser: null,
    redirectTo: null,
    username: '',
};

let cachedInstructorAuthSnapshot = INSTRUCTOR_AUTH_EMPTY;

function cacheInstructorAuthSnapshot(nextSnapshot: InstructorAuthSnapshot) {
    const previousSnapshot = cachedInstructorAuthSnapshot;

    if (
        previousSnapshot.hijackUser === nextSnapshot.hijackUser &&
        previousSnapshot.redirectTo === nextSnapshot.redirectTo &&
        previousSnapshot.username === nextSnapshot.username
    ) {
        return previousSnapshot;
    }

    cachedInstructorAuthSnapshot = nextSnapshot;
    return nextSnapshot;
}

function getInstructorAuthSnapshot() {
    if (typeof window === 'undefined') {
        return INSTRUCTOR_AUTH_EMPTY;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
        return cacheInstructorAuthSnapshot({
            hijackUser: null,
            redirectTo: '/login',
            username: '',
        });
    }

    const payload = decodeJwtPayload(token);
    if (!payload) {
        return cacheInstructorAuthSnapshot({
            hijackUser: null,
            redirectTo: '/login',
            username: '',
        });
    }

    const role = getRoleFromPayload(payload);
    if (role !== 'instructor' && role !== 'admin') {
        return cacheInstructorAuthSnapshot({
            hijackUser: null,
            redirectTo: getPortalPathForRole(role),
            username: '',
        });
    }

    return cacheInstructorAuthSnapshot({
        hijackUser: localStorage.getItem('admin_hijack_user'),
        redirectTo: null,
        username: payload.username || '',
    });
}

function subscribeInstructorAuth(onStoreChange: () => void) {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    const handleChange = () => {
        onStoreChange();
    };

    window.addEventListener('storage', handleChange);
    window.addEventListener('instructor-auth-changed', handleChange);

    return () => {
        window.removeEventListener('storage', handleChange);
        window.removeEventListener('instructor-auth-changed', handleChange);
    };
}

function notifyInstructorAuthChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('instructor-auth-changed'));
    }
}

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const authState = useSyncExternalStore(
        subscribeInstructorAuth,
        getInstructorAuthSnapshot,
        () => INSTRUCTOR_AUTH_EMPTY
    );

    useEffect(() => {
        if (!authState.redirectTo) {
            return;
        }

        router.replace(authState.redirectTo);
    }, [authState.redirectTo, router]);

    const menuItems = [
        { label: 'Dashboard', href: '/instructor', icon: LayoutDashboard },
        { label: 'Kursus Saya', href: '/instructor/courses', icon: BookOpen },
        { label: 'Siswa', href: '/instructor/students', icon: Users },
        { label: 'Ujian Akhir', href: '/instructor/certification', icon: Award },
        { label: 'Pengaturan', href: '/instructor/settings', icon: Settings },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('admin_original_access');
        localStorage.removeItem('admin_original_refresh');
        localStorage.removeItem('admin_hijack_user');
        notifyInstructorAuthChanged();
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
        notifyInstructorAuthChanged();
        router.push('/admin/users');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-gray-100 bg-white md:flex">
                <div className="h-20 flex items-center px-6 border-b border-gray-50">
                    <Link href="/instructor" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="font-bold text-gray-900">
                            Akademiso
                            <span className="block text-[10px] text-gray-500 font-normal">Portal Instruktur</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/instructor' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors relative ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                                <span className={`font-medium ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-l-full" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-50">
                    <div className="flex items-center gap-2 px-3 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                            {authState.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{authState.username}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors w-full"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium text-sm">Keluar</span>
                    </button>
                </div>
            </aside>

            <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
                <div className="flex gap-1 overflow-x-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/instructor' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex min-w-[76px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold ${
                                    isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'
                                }`}
                            >
                                <item.icon className="h-5 w-5" />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <main className="flex-1 p-4 pb-24 sm:p-6 md:ml-64 md:p-8">
                {authState.hijackUser && (
                    <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-orange-500 px-5 py-3 text-white shadow-lg shadow-orange-500/30 sm:flex-row sm:items-center">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 text-sm">
                            <span className="font-bold">Mode Impersonasi Aktif</span>
                            {' '}Anda sedang melihat portal instruktur sebagai <span className="font-bold">@{authState.username || authState.hijackUser}</span> dan sesi admin tetap tersimpan.
                        </div>
                        <button
                            onClick={restoreAdmin}
                            className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-50 sm:py-1.5"
                        >
                            Kembali ke Admin
                        </button>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
