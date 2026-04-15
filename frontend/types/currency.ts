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

export function parseCurrencyValue(value: string | number | null | undefined) {
    const digits = toDigitString(value);
    return digits ? Number(digits) : 0;
}

export function formatNumberInput(value: string | number | null | undefined) {
    const digits = toDigitString(value);

    if (!digits) {
        return '';
    }

    return Number(digits).toLocaleString('id-ID');
}

export function calculatePlatformFee(value: string | number | null | undefined, rate = 0.1) {
    return Math.round(parseCurrencyValue(value) * rate);
}

export function calculateInstructorPayout(value: string | number | null | undefined, rate = 0.1) {
    const grossAmount = parseCurrencyValue(value);
    return grossAmount - calculatePlatformFee(grossAmount, rate);
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
