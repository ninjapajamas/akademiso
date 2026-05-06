'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearStoredAuth, decodeJwtPayload, getTokenExpiryMs, isTokenExpired } from '@/utils/auth';

const PROTECTED_PATH_PREFIXES = [
    '/dashboard',
    '/admin',
    '/instructor',
    '/akuntan',
    '/project-manager',
    '/learning',
    '/checkout',
    '/payment',
    '/cart',
    '/certification',
];

function isProtectedPath(pathname: string) {
    return PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AuthSessionWatcher() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        let expiryTimer: ReturnType<typeof setTimeout> | null = null;

        const logoutIfExpired = () => {
            const token = localStorage.getItem('access_token');
            const payload = decodeJwtPayload(token);

            if (!token || !payload || !isTokenExpired(payload)) {
                return false;
            }

            clearStoredAuth();

            if (isProtectedPath(pathname)) {
                router.replace(`/login?expired=1`);
            }

            return true;
        };

        const syncSessionTimer = () => {
            if (expiryTimer) {
                clearTimeout(expiryTimer);
                expiryTimer = null;
            }

            if (logoutIfExpired()) {
                return;
            }

            const expiryMs = getTokenExpiryMs(localStorage.getItem('access_token'));
            if (!expiryMs) {
                return;
            }

            const delay = Math.max(expiryMs - Date.now(), 0);
            expiryTimer = setTimeout(() => {
                logoutIfExpired();
            }, delay);
        };

        const handleVisibilityOrFocus = () => {
            syncSessionTimer();
        };

        const handleStorage = () => {
            syncSessionTimer();
        };

        syncSessionTimer();
        window.addEventListener('focus', handleVisibilityOrFocus);
        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('storage', handleStorage);
        window.addEventListener('auth-change', handleStorage);

        return () => {
            if (expiryTimer) {
                clearTimeout(expiryTimer);
            }
            window.removeEventListener('focus', handleVisibilityOrFocus);
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('auth-change', handleStorage);
        };
    }, [pathname, router]);

    return null;
}
