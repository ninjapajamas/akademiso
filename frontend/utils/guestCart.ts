import { Course, PublicTrainingSession } from '@/types';
import { getElearningPriceSummary, getPublicModePriceSummary } from '@/utils/coursePricing';

export const GUEST_CART_STORAGE_KEY = 'akademiso_guest_cart_v1';
export const CART_UPDATED_EVENT = 'akademiso:cart-updated';

export interface GuestCartItem {
    id: string;
    course: {
        id: number;
        slug: string;
        title: string;
        price: string;
        thumbnail: string | null;
        instructor: { name: string };
    };
    offer_type: 'elearning' | 'public';
    offer_mode: 'online' | 'offline' | '';
    public_session_id: string;
    public_session?: PublicTrainingSession | null;
    total_amount: string;
    added_at: string;
}

function notifyCartUpdated() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    }
}

export function getGuestCart(): GuestCartItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const parsed = JSON.parse(window.localStorage.getItem(GUEST_CART_STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveGuestCart(items: GuestCartItem[]) {
    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
    notifyCartUpdated();
}

export function addCourseToGuestCart(
    course: Course,
    payload: { offer_type: 'elearning' | 'public'; offer_mode?: string; public_session_id?: string },
) {
    const offerMode = payload.offer_mode === 'offline' ? 'offline' : payload.offer_mode === 'online' ? 'online' : '';
    const publicSession = payload.offer_type === 'public'
        ? course.public_sessions?.find(session => session.id === payload.public_session_id) || null
        : null;
    const priceSummary = payload.offer_type === 'public'
        ? getPublicModePriceSummary(course, offerMode === 'offline' ? 'offline' : 'online', publicSession)
        : getElearningPriceSummary(course);
    const id = [course.id, payload.offer_type, offerMode, payload.public_session_id || ''].join(':');
    const existing = getGuestCart();

    if (existing.some(item => item.id === id)) {
        return { created: false, item: existing.find(item => item.id === id)! };
    }

    const item: GuestCartItem = {
        id,
        course: {
            id: course.id,
            slug: course.slug,
            title: course.title,
            price: course.price,
            thumbnail: course.thumbnail,
            instructor: { name: course.instructor?.name || 'Trainer Akademiso' },
        },
        offer_type: payload.offer_type,
        offer_mode: offerMode,
        public_session_id: payload.public_session_id || '',
        public_session: publicSession,
        total_amount: String(priceSummary.finalPrice ?? 0),
        added_at: new Date().toISOString(),
    };
    saveGuestCart([...existing, item]);
    return { created: true, item };
}

export function removeGuestCartItem(itemId: string) {
    saveGuestCart(getGuestCart().filter(item => item.id !== itemId));
}

export function clearGuestCart() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    notifyCartUpdated();
}
