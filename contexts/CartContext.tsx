import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, Cart } from '../services/api';
import { useAuth } from './AuthContext';

interface CartContextType {
    cartItemCount: number;
    cachedCart: Cart | null;
    cacheTimestamp: number;
    refreshCartCount: () => Promise<void>;
    updateCartCache: (cart: Cart) => void;
    invalidateCache: () => void;
    getCachedCart: () => Cart | null;
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
    const [cachedCart, setCachedCart] = useState<Cart | null>(null);
    const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Update cart cache and badge count
    const updateCartCache = useCallback((cart: Cart) => {
        setCachedCart(cart);
        setCacheTimestamp(Date.now());
        const totalItems = (cart.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
        setCartItemCount(totalItems);
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
                const totalItems = (cached.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
                setCartItemCount(totalItems);
                return;
            }

            // Marcar como refreshing
            isRefreshingRef.current = true;
            setIsRefreshing(true);
            
            try {
                // Use timeout rápido (1s em vez de 2s)
                const timeoutPromise = new Promise<number>((resolve) => 
                    setTimeout(() => resolve(0), 1000)
                );
                
                const cartPromise = api.getCart().then(cart => {
                    // Update cache with fresh data
                    updateCartCache(cart);
                    return (cart.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
                }).catch(error => {
                    // Tratar erro 403 (Insufficient role) como esperado - usuário não é customer
                    const isForbidden = error?.status === 403 || error?.statusCode === 403;
                    if (isForbidden) {
                        // Usuário não é customer, não logar como erro
                        return 0;
                    }
                    // Em caso de erro de rede, não atualizar contador
                    console.log('[CartContext] Erro ao buscar carrinho (silencioso):', error?.message);
                    return 0;
                });
                
                const totalItems = await Promise.race([cartPromise, timeoutPromise]);
                setCartItemCount(totalItems);
            } catch (error) {
                // Silently fail - don't update count on error
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
                const totalItems = (cachedCart.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
                setCartItemCount(totalItems);
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
