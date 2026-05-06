export type AppRole = 'admin' | 'akuntan' | 'project_manager' | 'instructor' | 'student' | 'guest';

export type AuthTokenPayload = {
    email?: string;
    exp?: number;
    is_instructor?: boolean;
    is_staff?: boolean;
    is_superuser?: boolean;
    role?: AppRole;
    staff_role?: string;
    username?: string;
};

export function decodeJwtPayload(token: string | null | undefined): AuthTokenPayload | null {
    if (!token) return null;

    try {
        return JSON.parse(atob(token.split('.')[1])) as AuthTokenPayload;
    } catch {
        return null;
    }
}

export function getRoleFromPayload(payload: AuthTokenPayload | null | undefined): AppRole {
    if (!payload) return 'guest';
    if (payload.role) return payload.role;
    if (payload.is_instructor) return 'instructor';
    if (payload.is_staff || payload.is_superuser) return 'admin';
    return 'student';
}

export function getPortalPathForRole(role: AppRole) {
    switch (role) {
        case 'admin':
            return '/admin';
        case 'akuntan':
            return '/akuntan';
        case 'project_manager':
            return '/project-manager';
        case 'instructor':
            return '/instructor';
        case 'student':
            return '/dashboard';
        default:
            return '/login';
    }
}

export function isTokenExpired(payload: AuthTokenPayload | null | undefined, now = Date.now()) {
    if (!payload?.exp) return true;
    return payload.exp * 1000 <= now;
}

export function getTokenExpiryMs(token: string | null | undefined) {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return null;
    return payload.exp * 1000;
}

export function clearStoredAuth() {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin_original_access');
    localStorage.removeItem('admin_original_refresh');
    localStorage.removeItem('admin_hijack_user');

    const events = [
        'auth-change',
        'dashboard-auth-changed',
        'instructor-auth-changed',
        'accountant-auth-changed',
        'project-manager-auth-changed',
    ];

    events.forEach((eventName) => {
        window.dispatchEvent(new Event(eventName));
    });
}
