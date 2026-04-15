export interface UserProfilePayload {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: 'admin' | 'akuntan' | 'instructor' | 'student' | 'guest';
    staff_role?: 'admin' | 'akuntan' | null;
    is_staff?: boolean;
    is_instructor?: boolean;
    profile?: {
        avatar?: string | null;
        phone?: string;
        company?: string;
        position?: string;
        bio?: string;
    } | null;
}

const REQUIRED_PROFILE_FIELDS = [
    { key: 'full_name', label: 'nama lengkap' },
    { key: 'phone', label: 'nomor telepon' },
    { key: 'company', label: 'perusahaan / instansi' },
] as const;

export function splitFullName(fullName: string) {
    const normalizedName = fullName.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
        return { firstName: '', lastName: '' };
    }

    const [firstName, ...remainingParts] = normalizedName.split(' ');
    return {
        firstName,
        lastName: remainingParts.join(' '),
    };
}

export function getProfileDisplayName(profile: UserProfilePayload | null | undefined) {
    return `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
}

export function getRequiredProfileMissingFields(profile: UserProfilePayload | null | undefined) {
    const displayName = getProfileDisplayName(profile);
    const phone = profile?.profile?.phone?.trim() || '';
    const company = profile?.profile?.company?.trim() || '';

    return REQUIRED_PROFILE_FIELDS
        .filter((field) => {
            if (field.key === 'full_name') return !displayName;
            if (field.key === 'phone') return !phone;
            if (field.key === 'company') return !company;
            return false;
        })
        .map((field) => field.label);
}

export function isRequiredProfileComplete(profile: UserProfilePayload | null | undefined) {
    return getRequiredProfileMissingFields(profile).length === 0;
}
