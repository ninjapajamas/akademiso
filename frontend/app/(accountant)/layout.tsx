'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BanknoteArrowDown, LayoutDashboard, LogOut, ReceiptText, ShieldAlert } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import { clearStoredAuth, decodeJwtPayload, getPortalPathForRole, getRoleFromPayload, isTokenExpired } from '@/utils/auth';

type AccountantAuthSnapshot = {
    hijackUser: string | null;
    redirectTo: string | null;
    username: string;
};

const ACCOUNTANT_AUTH_EMPTY: AccountantAuthSnapshot = {
    hijackUser: null,
    redirectTo: null,
    username: '',
};

let cachedAccountantAuthSnapshot = ACCOUNTANT_AUTH_EMPTY;

function cacheAccountantAuthSnapshot(nextSnapshot: AccountantAuthSnapshot) {
    const previousSnapshot = cachedAccountantAuthSnapshot;

    if (
        previousSnapshot.hijackUser === nextSnapshot.hijackUser &&
        previousSnapshot.redirectTo === nextSnapshot.redirectTo &&
        previousSnapshot.username === nextSnapshot.username
    ) {
        return previousSnapshot;
    }

    cachedAccountantAuthSnapshot = nextSnapshot;
    return nextSnapshot;
}

function getAccountantAuthSnapshot() {
    if (typeof window === 'undefined') {
        return ACCOUNTANT_AUTH_EMPTY;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
        return cacheAccountantAuthSnapshot({
            hijackUser: null,
            redirectTo: '/login',
            username: '',
        });
    }

    const payload = decodeJwtPayload(token);
    if (!payload || isTokenExpired(payload)) {
        return cacheAccountantAuthSnapshot({
            hijackUser: null,
            redirectTo: '/login',
            username: '',
        });
    }

    const role = getRoleFromPayload(payload);
    if (role !== 'akuntan') {
        return cacheAccountantAuthSnapshot({
            hijackUser: null,
            redirectTo: getPortalPathForRole(role),
            username: '',
        });
    }

    return cacheAccountantAuthSnapshot({
        hijackUser: localStorage.getItem('admin_hijack_user'),
        redirectTo: null,
        username: payload.username || '',
    });
}

function subscribeAccountantAuth(onStoreChange: () => void) {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    const handleChange = () => onStoreChange();
    window.addEventListener('storage', handleChange);
    window.addEventListener('auth-change', handleChange);
    window.addEventListener('accountant-auth-changed', handleChange);

    return () => {
        window.removeEventListener('storage', handleChange);
        window.removeEventListener('auth-change', handleChange);
        window.removeEventListener('accountant-auth-changed', handleChange);
    };
}

function notifyAccountantAuthChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('accountant-auth-changed'));
    }
}

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const authState = useSyncExternalStore(
        subscribeAccountantAuth,
        getAccountantAuthSnapshot,
        () => ACCOUNTANT_AUTH_EMPTY
    );

    useEffect(() => {
        if (authState.redirectTo) {
            router.replace(authState.redirectTo);
        }
    }, [authState.redirectTo, router]);

    const menuItems = [
        { label: 'Dashboard', href: '/akuntan', icon: LayoutDashboard },
        { label: 'Transaksi', href: '/akuntan/transaksi', icon: ReceiptText },
        { label: 'Pencairan', href: '/akuntan/pencairan', icon: BanknoteArrowDown },
    ];

    const handleLogout = () => {
        clearStoredAuth();
        router.push('/login');
    };

    const restoreAdmin = () => {
        const originalAccess = localStorage.getItem('admin_original_access');
        const originalRefresh = localStorage.getItem('admin_original_refresh');

        if (originalAccess) localStorage.setItem('access_token', originalAccess);
        if (originalRefresh) localStorage.setItem('refresh_token', originalRefresh);

        localStorage.removeItem('admin_original_access');
        localStorage.removeItem('admin_original_refresh');
        localStorage.removeItem('admin_hijack_user');
        notifyAccountantAuthChanged();
        router.push('/admin/users');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
                <div className="h-20 flex items-center px-6 border-b border-slate-100">
                    <Link href="/akuntan" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                            <BanknoteArrowDown className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">Akademiso</div>
                            <div className="text-[11px] text-slate-500">Portal Akuntan</div>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/akuntan' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors relative ${
                                    isActive
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                                <span className={`font-medium ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-600 rounded-l-full" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="px-3 py-2 text-sm text-slate-600">
                        Login sebagai <span className="font-bold text-slate-900">{authState.username || 'Akuntan'}</span>
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

            <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
                <div className="flex gap-1 overflow-x-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/akuntan' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex min-w-[86px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold ${
                                    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'
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
                            {' '}Anda sedang melihat portal akuntan sebagai <span className="font-bold">@{authState.username || authState.hijackUser}</span>.
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
