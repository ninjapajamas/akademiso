function toDigitString(value: string | number | null | undefined) {
    const raw = String(value ?? '').trim();

    if (!raw) {
        return '';
    }

    // Values from the API usually arrive as plain decimal strings like "1500000.00".
    // Parse them numerically so the trailing ".00" does not become extra digits.
    if (/^\d+(\.\d+)?$/.test(raw)) {
        const numericValue = Math.trunc(Number(raw));
        return Number.isFinite(numericValue) ? String(numericValue) : '';
    }

    return raw.replace(/\D/g, '');
}

export function formatNumberInput(value: string | number | null | undefined) {
    const digits = toDigitString(value);

    if (!digits) {
        return '';
    }

    return Number(digits).toLocaleString('id-ID');
}

export function normalizePriceForApi(value: string | number | null | undefined) {
    return toDigitString(value);
}

export function formatRupiah(value: string | number | null | undefined) {
    const digits = toDigitString(value);

    if (!digits) {
        return 'Rp 0';
    }

    return `Rp ${Number(digits).toLocaleString('id-ID')}`;
}
