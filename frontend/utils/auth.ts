export type AppRole = 'admin' | 'akuntan' | 'instructor' | 'student' | 'guest';

export type AuthTokenPayload = {
    email?: string;
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
        case 'instructor':
            return '/instructor';
        case 'student':
            return '/dashboard';
        default:
            return '/login';
    }
}
