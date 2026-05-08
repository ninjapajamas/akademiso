'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartContextType {
    cartCount: number;
    refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cartCount, setCartCount] = useState(0);

    const refreshCart = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setCartCount(0);
                return;
            }

            const apiUrl = getClientApiBaseUrl();
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
    };

    useEffect(() => {
        refreshCart();
    }, []);

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

