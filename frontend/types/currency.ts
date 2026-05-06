function toDigitString(value: string | number | null | undefined) {
    if (typeof value === 'number') {
        const numericValue = Math.trunc(value);
        return Number.isFinite(numericValue) ? String(numericValue) : '';
    }

    const raw = String(value ?? '').trim();

    if (!raw) {
        return '';
    }

    const compactValue = raw.replace(/\s+/g, '');

    // Values from the API usually arrive as plain decimal strings like "1500000.00".
    // User input is formatted with Indonesian grouping ("1.500.000"), so only treat
    // one or two digits after a single separator as a decimal fraction.
    if (/^\d+[.,]\d{1,2}$/.test(compactValue)) {
        const numericValue = Math.trunc(Number(compactValue.replace(',', '.')));
        return Number.isFinite(numericValue) ? String(numericValue) : '';
    }

    return compactValue.replace(/\D/g, '');
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

export function calculateEstimatedPph(value: string | number | null | undefined, rate = 0.025) {
    const grossAmount = parseCurrencyValue(value);
    return Math.round(grossAmount * rate);
}

export function calculateNetAfterPph(value: string | number | null | undefined, platformRate = 0.1, pphRate = 0.025) {
    const payoutAmount = calculateInstructorPayout(value, platformRate);
    return Math.max(0, payoutAmount - calculateEstimatedPph(payoutAmount, pphRate));
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
