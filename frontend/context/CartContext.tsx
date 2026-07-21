'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { CART_UPDATED_EVENT, clearGuestCart, getGuestCart } from '@/utils/guestCart';
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

interface CartContextType {
    cartCount: number;
    refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cartCount, setCartCount] = useState(0);
    const mergingGuestCart = useRef(false);

    const refreshCart = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setCartCount(getGuestCart().length);
                return;
            }

            const apiUrl = getClientApiBaseUrl();
            const guestItems = getGuestCart();
            if (guestItems.length > 0 && !mergingGuestCart.current) {
                mergingGuestCart.current = true;
                try {
                    await Promise.all(guestItems.map(item => fetch(`${apiUrl}/api/cart/add_item/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            course_id: item.course.id,
                            offer_type: item.offer_type,
                            offer_mode: item.offer_mode,
                            public_session_id: item.public_session_id,
                        }),
                    })));
                    clearGuestCart();
                } finally {
                    mergingGuestCart.current = false;
                }
            }

            const res = await fetch(`${apiUrl}/api/cart/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                // Assuming data has 'items' array. Adjust if needed based on CartSerializer
                setCartCount(data.items ? data.items.length : 0);
            }
        } catch (error) {
            console.error('Failed to fetch cart count:', error);
        }
    }, []);

    useEffect(() => {
        void refreshCart();
        const handleCartUpdate = () => void refreshCart();
        window.addEventListener(CART_UPDATED_EVENT, handleCartUpdate);
        window.addEventListener('storage', handleCartUpdate);
        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdate);
            window.removeEventListener('storage', handleCartUpdate);
        };
    }, [refreshCart]);

    return (
        <CartContext.Provider value={{ cartCount, refreshCart }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

