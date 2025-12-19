import { useAuth } from '@/contexts/AuthContext';
import { api, Cart, CartItem, MultiCart } from '@/services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

interface CartContextType {
    cartItemCount: number;
    cachedCart: Cart | MultiCart | null;
    cacheTimestamp: number;
    refreshCartCount: () => Promise<void>;
    updateCartCache: (cart: Cart | MultiCart) => void;
    invalidateCache: () => void;
    getCachedCart: () => Cart | MultiCart | null;
    getCartsArray: () => Cart[];
    incrementCartCount: (amount: number) => void;
    decrementCartCount: (amount: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const isMultiCart = (cart: Cart | MultiCart): cart is MultiCart => {
    if (!('carts' in cart)) return false;
    return Array.isArray(cart.carts);
};

const calculateTotalItems = (cart: Cart | MultiCart | null): number => {
    if (!cart) return 0;

    if (isMultiCart(cart)) {
        return cart.carts.reduce((total: number, c) => {
            return total + (c.items || []).reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
        }, 0);
    }

    return (cart.items || []).reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session, user } = useAuth();
    const queryClient = useQueryClient();
    const [optimisticCountDelta, setOptimisticCountDelta] = useState(0);

    const enabled = Boolean(session && user && user.role === 'customer');

    const cartQuery = useQuery<Cart | MultiCart>({
        queryKey: ['cart'],
        queryFn: () => api.getCart(),
        enabled,
        staleTime: 10_000,
    });

    const cachedCart = enabled ? cartQuery.data ?? null : null;
    const cacheTimestamp = enabled ? cartQuery.dataUpdatedAt : 0;

    useEffect(() => {
        if (!enabled) {
            queryClient.removeQueries({ queryKey: ['cart'], exact: true });
        }
    }, [enabled, queryClient]);

    useEffect(() => {
        if (!enabled) {
            setOptimisticCountDelta(0);
            return;
        }
        setOptimisticCountDelta(0);
    }, [enabled, cartQuery.dataUpdatedAt]);

    const baseCount = useMemo(() => calculateTotalItems(cachedCart), [cachedCart]);
    const cartItemCount = Math.max(0, baseCount + optimisticCountDelta);

    const refreshCartCount = useCallback(async () => {
        if (!enabled) return;
        await cartQuery.refetch();
    }, [enabled, cartQuery]);

    const updateCartCache = useCallback(
        (cart: Cart | MultiCart) => {
            queryClient.setQueryData(['cart'], cart);
            setOptimisticCountDelta(0);
        },
        [queryClient]
    );

    const invalidateCache = useCallback(() => {
        queryClient.removeQueries({ queryKey: ['cart'], exact: true });
        setOptimisticCountDelta(0);
    }, [queryClient]);

    const getCachedCart = useCallback(() => {
        const data = queryClient.getQueryData<Cart | MultiCart>(['cart']);
        return data ?? null;
    }, [queryClient]);

    const getCartsArray = useCallback((): Cart[] => {
        if (!cachedCart) return [];
        return api.getCartsArray(cachedCart);
    }, [cachedCart]);

    const incrementCartCount = useCallback((amount: number) => {
        setOptimisticCountDelta((prev) => prev + amount);
    }, []);

    const decrementCartCount = useCallback((amount: number) => {
        setOptimisticCountDelta((prev) => prev - amount);
    }, []);

    return (
        <CartContext.Provider value={{ 
            cartItemCount, 
            cachedCart,
            cacheTimestamp,
            refreshCartCount, 
            updateCartCache,
            invalidateCache,
            getCachedCart,
            getCartsArray,
            incrementCartCount,
            decrementCartCount
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};
