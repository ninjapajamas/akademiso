import type { Course, PublicTrainingSession } from '@/types';

export type OfferPriceSummary = {
    originalPrice: number | null;
    discountPrice: number | null;
    finalPrice: number | null;
    hasDiscount: boolean;
    isFree: boolean;
};

function parsePriceValue(value?: string | number | null) {
    if (value == null) return null;

    const normalized = String(value).trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function buildPriceSummary(baseValue?: string | number | null, discountValue?: string | number | null): OfferPriceSummary {
    const originalPrice = parsePriceValue(baseValue);
    const rawDiscountPrice = parsePriceValue(discountValue);
    const hasDiscount = originalPrice != null && rawDiscountPrice != null && rawDiscountPrice < originalPrice;
    const finalPrice = hasDiscount ? rawDiscountPrice : originalPrice;

    return {
        originalPrice,
        discountPrice: hasDiscount ? rawDiscountPrice : null,
        finalPrice,
        hasDiscount,
        isFree: finalPrice != null && finalPrice <= 0,
    };
}

export function getElearningPriceSummary(course: Partial<Course> | null | undefined) {
    return buildPriceSummary(course?.price, course?.discount_price);
}

export function getPublicModePriceSummary(
    course: Partial<Course> | null | undefined,
    mode: 'online' | 'offline',
    session?: PublicTrainingSession | null
) {
    const courseLevelPrice = mode === 'online' ? course?.public_online_price : course?.public_offline_price;
    const courseLevelDiscount = mode === 'online'
        ? course?.public_online_discount_price
        : course?.public_offline_discount_price;

    if (parsePriceValue(courseLevelPrice) != null) {
        return buildPriceSummary(courseLevelPrice, courseLevelDiscount);
    }

    if (session && parsePriceValue(session.price) != null) {
        return buildPriceSummary(session.price, session.discount_price);
    }

    return buildPriceSummary(course?.price);
}
