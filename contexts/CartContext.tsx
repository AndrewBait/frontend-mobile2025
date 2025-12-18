import { useAuth } from '@/contexts/AuthContext';
import { api, Cart, MultiCart } from '@/services/api';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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

// Cache validity: 10 seconds - aumentado para reduzir requisições
const CACHE_VALIDITY_MS = 10000;
// Debounce delay: 500ms - aumentado para reduzir requisições
const DEBOUNCE_DELAY_MS = 500;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session, user } = useAuth();
    const [cartItemCount, setCartItemCount] = useState(0);
    const [cachedCart, setCachedCart] = useState<Cart | MultiCart | null>(null);
    const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Helper para calcular total de items de Cart ou MultiCart
    const calculateTotalItems = (cart: Cart | MultiCart | null): number => {
        if (!cart) return 0;
        
        // Se é MultiCart
        if ('carts' in cart && Array.isArray(cart.carts)) {
            return cart.carts.reduce((total, c) => {
                return total + (c.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
            }, 0);
        }
        
        // Se é Cart único
        return (cart.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
    };

    // Helper para converter para array de carrinhos
    const getCartsArray = useCallback((): Cart[] => {
        if (!cachedCart) return [];
        
        // Se é MultiCart
        if ('carts' in cachedCart && Array.isArray(cachedCart.carts)) {
            return cachedCart.carts;
        }
        
        // Se é Cart único com items
        if ((cachedCart as Cart).items && (cachedCart as Cart).items.length > 0) {
            return [cachedCart as Cart];
        }
        
        return [];
    }, [cachedCart]);

    // Update cart cache and badge count
    const updateCartCache = useCallback((cart: Cart | MultiCart) => {
        setCachedCart(cart);
        setCacheTimestamp(Date.now());
        setCartItemCount(calculateTotalItems(cart));
    }, []);

    // Invalidate cache
    const invalidateCache = useCallback(() => {
        setCachedCart(null);
        setCacheTimestamp(0);
    }, []);

    // Get cached cart
    const getCachedCart = useCallback(() => {
        return cachedCart;
    }, [cachedCart]);

    // Optimistic increment (for immediate UI feedback)
    const incrementCartCount = useCallback((amount: number) => {
        setCartItemCount(prev => prev + amount);
    }, []);

    // Optimistic decrement (for immediate UI feedback)
    const decrementCartCount = useCallback((amount: number) => {
        setCartItemCount(prev => Math.max(0, prev - amount));
    }, []);

    // Ref para evitar dependências circulares
    const cachedCartRef = useRef<Cart | null>(null);
    const cacheTimestampRef = useRef<number>(0);
    const isRefreshingRef = useRef<boolean>(false);
    
    // Atualizar refs quando state muda
    useEffect(() => {
        cachedCartRef.current = cachedCart;
        cacheTimestampRef.current = cacheTimestamp;
    }, [cachedCart, cacheTimestamp]);

    // Refresh cart count with debounce
    const refreshCartCount = useCallback(async () => {
        if (!session) {
            setCartItemCount(0);
            setCachedCart(null);
            setCacheTimestamp(0);
            return;
        }

        // Se user ainda não foi carregado, aguardar antes de buscar carrinho
        // Isso evita buscar carrinho para store_owners antes de saber o role
        if (!user) {
            // User ainda não carregado, não buscar carrinho ainda
            return;
        }

        // Verificar se o usuário é customer antes de buscar carrinho
        // Carrinho só está disponível para customers, não para store_owners
        if (user.role !== 'customer') {
            // Usuário não é customer, não buscar carrinho
            setCartItemCount(0);
            setCachedCart(null);
            setCacheTimestamp(0);
            return;
        }

        // Clear previous timeout
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }

        // If already refreshing, cancel previous request
        if (isRefreshingRef.current) {
            return;
        }

        // Debounce: wait 300ms before making request
        refreshTimeoutRef.current = setTimeout(async () => {
            // Verificar cache antes de fazer requisição
            const now = Date.now();
            const cached = cachedCartRef.current;
            const cacheAge = cacheTimestampRef.current > 0 ? now - cacheTimestampRef.current : Infinity;
            
            if (cached && cacheAge < CACHE_VALIDITY_MS) {
                // Use cached count
                setCartItemCount(calculateTotalItems(cached));
                return;
            }

            // Marcar como refreshing
            isRefreshingRef.current = true;
            setIsRefreshing(true);
            
            try {
                const timeoutPromise = new Promise<number>((resolve) => 
                    setTimeout(() => resolve(0), 1000)
                );
                
                const cartPromise = api.getCart().then(cart => {
                    // Update cache with fresh data
                    updateCartCache(cart);
                    return calculateTotalItems(cart);
                }).catch(error => {
                    const isForbidden = error?.status === 403 || error?.statusCode === 403;
                    if (isForbidden) {
                        return 0;
                    }
                    console.log('[CartContext] Erro ao buscar carrinho (silencioso):', error?.message);
                    return 0;
                });
                
                const totalItems = await Promise.race([cartPromise, timeoutPromise]);
                setCartItemCount(totalItems);
            } catch (error) {
                console.log('[CartContext] Erro ao atualizar contador do carrinho:', error);
            } finally {
                isRefreshingRef.current = false;
                setIsRefreshing(false);
            }
        }, DEBOUNCE_DELAY_MS);
    }, [session, user, updateCartCache]);

    // Executar apenas quando session ou user mudar
    useEffect(() => {
        if (session) {
            // Se user ainda não foi carregado, aguardar antes de buscar carrinho
            if (!user) {
                // User ainda não carregado, não buscar carrinho ainda
                return;
            }

            // Verificar se o usuário é customer antes de buscar carrinho
            if (user.role !== 'customer') {
                // Usuário não é customer, limpar carrinho
                setCartItemCount(0);
                setCachedCart(null);
                setCacheTimestamp(0);
                return;
            }

            // Só fazer refresh se não houver cache válido
            const now = Date.now();
            const cacheAge = cacheTimestamp > 0 ? now - cacheTimestamp : Infinity;
            
            if (cacheAge < CACHE_VALIDITY_MS && cachedCart) {
                // Cache válido, não fazer requisição
                setCartItemCount(calculateTotalItems(cachedCart));
            } else {
                // Cache inválido ou não existe, fazer refresh
                refreshCartCount();
            }
        } else {
            setCartItemCount(0);
            setCachedCart(null);
            setCacheTimestamp(0);
        }
    }, [session, user, refreshCartCount, cachedCart, cacheTimestamp]); // Adicionado user nas dependências para reagir a mudanças de role

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
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
