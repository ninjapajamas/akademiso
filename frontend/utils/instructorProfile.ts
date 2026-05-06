function normalizeText(value?: string | null) {
    return (value || '').replace(/\s+/g, ' ').trim();
}

function clampText(value: string, maxLength: number) {
    if (value.length <= maxLength) {
        return value;
    }
    return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function uniqueItems(items: string[]) {
    const seen = new Set<string>();

    return items.filter((item) => {
        const key = item.toLowerCase();
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

function normalizeItems(items?: string[] | null) {
    return (items || [])
        .map((item) => normalizeText(item))
        .filter(Boolean);
}

export function getInstructorExpertiseBadges(title?: string | null, expertiseAreas?: string[] | null) {
    const normalizedExpertiseAreas = normalizeItems(expertiseAreas);
    if (normalizedExpertiseAreas.length > 0) {
        return uniqueItems(normalizedExpertiseAreas.map((item) => clampText(item, 48))).slice(0, 6);
    }

    const normalizedTitle = normalizeText(title);
    if (!normalizedTitle) {
        return [];
    }

    const parts = normalizedTitle
        .split(/[\n,;|/]+/g)
        .map((item) => normalizeText(item))
        .filter(Boolean);

    const source = parts.length > 1 ? parts : [normalizedTitle];
    return uniqueItems(source.map((item) => clampText(item, 48))).slice(0, 4);
}

export function getInstructorProfileSummary(bio?: string | null, title?: string | null, expertiseAreas?: string[] | null) {
    const normalizedBio = normalizeText(bio);
    if (normalizedBio) {
        return clampText(normalizedBio, 220);
    }

    const normalizedExpertiseAreas = normalizeItems(expertiseAreas);
    if (normalizedExpertiseAreas.length > 0) {
        return `Bidang utama trainer: ${normalizedExpertiseAreas.slice(0, 4).join(', ')}.`;
    }

    const normalizedTitle = normalizeText(title);
    if (normalizedTitle) {
        return `Fokus utama trainer: ${normalizedTitle}.`;
    }

    return 'Profil publik trainer akan muncul di sini setelah diperbarui.';
}
