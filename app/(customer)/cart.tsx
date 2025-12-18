import { AdaptiveList } from '@/components/base/AdaptiveList';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { GradientBackground } from '@/components/GradientBackground';
import { ProfileRequiredModal } from '@/components/ProfileRequiredModal';
import { StickyFooter } from '@/components/StickyFooter';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { api, Batch, Cart, CartItem, MultiCart } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GroupedCart {
    storeId: string;
    storeName: string;
    storeAddress?: string;
    storeLogo?: string;
    items: CartItem[];
    total: number;
}

export default function CartScreen() {
    const insets = useSafeAreaInsets();
    const screenPaddingTop = insets.top + DesignTokens.spacing.md;
    const { isProfileComplete } = useAuth();
    const { updateCartCache, getCachedCart, cacheTimestamp } = useCart();
    const [groupedCart, setGroupedCart] = useState<GroupedCart[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    const isLoadingCartRef = React.useRef(false);

    // Helper para normalizar os dados (Padrão Adapter)
    const getBatchFromItem = (item: CartItem): Batch | null => {
        return item.batch || item.product_batches || null;
    };

    // Helper para verificar se é MultiCart
    const isMultiCart = (cart: Cart | MultiCart): cart is MultiCart => {
        return 'carts' in cart && Array.isArray(cart.carts);
    };

    // Função auxiliar para processar dados do carrinho (suporta Cart e MultiCart)
    const processCartData = useCallback((cartData: Cart | MultiCart) => {
        if (!cartData) {
            console.log('Cart is empty or invalid, setting empty cart');
            setGroupedCart([]);
            return;
        }

        const grouped: GroupedCart[] = [];

        // Se é MultiCart (múltiplos carrinhos de lojas diferentes)
        if (isMultiCart(cartData)) {
            console.log('[Cart] Processing MultiCart with', cartData.carts.length, 'carts');
            
            cartData.carts.forEach((cart) => {
                if (!cart.items || cart.items.length === 0) return;
                
                const storeData = cart.store || cart.stores;
                grouped.push({
                    storeId: cart.store_id || cart.id || '',
                    storeName: storeData?.name || storeData?.nome || 'Loja',
                    storeAddress: storeData?.address || storeData?.endereco,
                    storeLogo: storeData?.logo_url,
                    items: cart.items,
                    total: cart.total || cart.items.reduce((sum, item) => {
                        const batch = getBatchFromItem(item);
                        const promoPrice = batch?.promo_price || batch?.preco_promocional || 0;
                        return sum + (promoPrice * item.quantity);
                    }, 0),
                });
            });
        } else {
            // Cart único - agrupar por loja (compatibilidade com formato antigo)
            if (!Array.isArray(cartData.items) || cartData.items.length === 0) {
                setGroupedCart([]);
                return;
            }

            const groupedByStore: Record<string, GroupedCart> = {};

            cartData.items.forEach((item) => {
                const batch = getBatchFromItem(item);
                if (!item || !batch) return;

                const storeId = batch.store_id || '';
                const store = batch.store || batch.stores;
                const storeName = store?.name || store?.nome || 'Loja';
                const promoPrice = batch.promo_price || batch.preco_promocional || 0;

                if (!groupedByStore[storeId]) {
                    groupedByStore[storeId] = {
                        storeId,
                        storeName,
                        storeAddress: store?.address || store?.endereco,
                        storeLogo: store?.logo_url,
                        items: [],
                        total: 0,
                    };
                }

                groupedByStore[storeId].items.push(item);
                groupedByStore[storeId].total += promoPrice * item.quantity;
            });

            grouped.push(...Object.values(groupedByStore));
        }

        setGroupedCart(grouped);
        setImageErrors(new Set());
        console.log('[Cart] Cart loaded:', grouped.length, 'stores,', 
            grouped.reduce((sum, store) => sum + store.items.length, 0), 'items');
    }, []);

    // Função para atualizar do backend em background
    const refreshCartFromBackend = useCallback(async () => {
        try {
            const cart = await api.getCart();
            updateCartCache(cart);
            processCartData(cart);
        } catch (error) {
            console.log('[Cart] Erro ao atualizar carrinho em background:', error);
        }
    }, [updateCartCache, processCartData]);

    useFocusEffect(
        useCallback(() => {
            // Verificar se há cache recente antes de recarregar
            const cachedCart = getCachedCart();
            const cacheAge = cacheTimestamp > 0 ? Date.now() - cacheTimestamp : Infinity;
            const CACHE_VALIDITY_MS = 5000; // 5 segundos - mesmo do CartContext
            
            if (cachedCart && cacheAge < CACHE_VALIDITY_MS) {
                console.log('[Cart] Cache recente encontrado (idade:', cacheAge, 'ms), usando cache sem recarregar');
                // Apenas processar cache existente, não recarregar
                processCartData(cachedCart);
                setLoading(false);
                // Não fazer refresh em background se cache é muito recente (< 3s)
                if (cacheAge > 3000) {
                    // Só atualizar em background se cache tem mais de 3s
                    setTimeout(() => {
                        refreshCartFromBackend();
                    }, 0);
                }
                return;
            }
            
            // Só recarregar se cache estiver velho ou não existir
            loadCart();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [cacheTimestamp])
    );

    const loadCart = async () => {
        // Evitar múltiplas chamadas simultâneas
        if (isLoadingCartRef.current) {
            console.log('[Cart] loadCart já em execução, ignorando chamada duplicada');
            return;
        }
        
        console.log('[Cart] Loading cart...');
        isLoadingCartRef.current = true;
        
        try {
            // Verificar se há cache recente (< 5 segundos)
            const cachedCart = getCachedCart();
            const cacheAge = cacheTimestamp > 0 ? Date.now() - cacheTimestamp : Infinity;
            const CACHE_VALIDITY_MS = 5000;
            
            if (cachedCart && cacheAge < CACHE_VALIDITY_MS) {
                console.log('[Cart] Cache recente encontrado (idade:', cacheAge, 'ms), usando cache sem recarregar');
                // Usar cache e atualizar em background apenas se cache tem mais de 3s
                const cart = cachedCart;
                // Processar cache (agrupar por loja)
                processCartData(cart);
                setLoading(false);
                // Não fazer refresh em background se cache é muito recente (< 3s)
                if (cacheAge > 3000) {
                    // Só atualizar em background se cache tem mais de 3s
                    setTimeout(() => {
                        refreshCartFromBackend();
                    }, 0);
                }
                return;
            }

            // Timeout reduzido de 15s para 5s
            const fetchCart = api.getCart();
            const timeoutPromise = new Promise<Cart | MultiCart>((resolve) =>
                setTimeout(() => {
                    console.warn('[Cart] Fetch timeout após 5s - retornando carrinho vazio');
                    resolve({ items: [], total: 0 });
                }, 5000)
            );

            const cart = await Promise.race([fetchCart, timeoutPromise]);
            processCartData(cart);
            
            // Atualizar cache com resposta
            updateCartCache(cart);
        } catch (error: any) {
            console.error('[Cart] Error loading cart:', error?.message || error);
            // Set empty cart on error instead of crashing
            setGroupedCart([]);
            
            // Não atualizar badge em caso de erro para evitar confusão
        } finally {
            setLoading(false);
            setRefreshing(false);
            isLoadingCartRef.current = false;
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadCart();
    };

    const handleRemove = async (batchId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
            'Remover Produto',
            'Deseja remover este produto do carrinho?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        try {
                            console.log('[Cart] Removendo item com batchId:', batchId);
                            // Atualização otimista - remover da UI imediatamente
                            setGroupedCart(prev => {
                                const updated = prev.map(store => ({
                                    ...store,
                                    items: store.items.filter(item => {
                                        const itemBatchId = item.batch_id || item.product_batch_id;
                                        return itemBatchId !== batchId;
                                    }),
                                })).filter(store => store.items.length > 0);
                                
                                // Recalcular totais
                                return updated.map(store => ({
                                    ...store,
                                    total: store.items.reduce((sum, item) => {
                                        const batch = getBatchFromItem(item);
                                        const promoPrice = batch?.promo_price || batch?.preco_promocional || 0;
                                        return sum + (promoPrice * item.quantity);
                                    }, 0),
                                }));
                            });
                            
                            // Remover do backend
                            try {
                                const result = await api.removeFromCart(batchId);
                                
                                // Atualizar cache e UI com resposta
                                updateCartCache(result);
                                processCartData(result);
                            } catch (removeError) {
                                // Se houver erro, recarregar carrinho
                                await loadCart();
                                throw removeError;
                            }
                        } catch (error: any) {
                            console.error('[Cart] Erro ao remover item:', error);
                            Alert.alert('Erro', 'Não foi possível remover o produto. Tente novamente.');
                            // Recarregar carrinho em caso de erro para restaurar estado
                            await loadCart();
                            // Não precisa chamar refreshCartCount() - loadCart() já atualiza o cache
                        }
                    }
                }
            ]
        );
    };

    const handleCheckout = async (storeId: string) => {
        // Check if profile is complete
        if (!isProfileComplete) {
            setShowProfileModal(true);
            return;
        }

        // Verificar se loja tem asaas_wallet_id configurado antes de permitir checkout
        try {
            const storeData = await api.getPublicStore(storeId);
            if (!storeData.asaas_wallet_id) {
                Alert.alert(
                    'Pagamento Indisponível',
                    'Esta loja ainda não configurou o pagamento. Entre em contato com a loja para mais informações.',
                    [{ text: 'OK' }]
                );
                return;
            }
        } catch (error) {
            console.error('Error checking store payment config:', error);
            // Continuar mesmo com erro (pode ser problema de rede, validação será feita no checkout)
        }

        router.push(`/checkout/${storeId}`);
    };

    const handleUpdateQuantity = async (batchId: string, newQuantity: number, maxStock?: number, currentQuantity?: number) => {
        if (newQuantity < 1) {
            // Se quantidade for 0, remove o item
            await handleRemove(batchId);
            return;
        }

        // Verificar se não excede o estoque disponível (em tempo real)
        if (maxStock !== undefined && newQuantity > maxStock) {
            Alert.alert(
                'Estoque Insuficiente',
                `Apenas ${maxStock} unidade(s) disponível(is) em estoque.`,
                [{ text: 'OK' }]
            );
            // Recarregar carrinho para atualizar estoque
            await loadCart();
            return;
        }

        // Atualização otimista - atualizar UI imediatamente
        setGroupedCart(prev => {
            return prev.map(store => ({
                ...store,
                items: store.items.map(item => {
                    const itemBatchId = item.batch_id || item.product_batch_id;
                    if (itemBatchId === batchId) {
                        return { ...item, quantity: newQuantity };
                    }
                    return item;
                }),
                total: store.items.reduce((sum, item) => {
                    const itemBatchId = item.batch_id || item.product_batch_id;
                    const batch = getBatchFromItem(item);
                    const promoPrice = batch?.promo_price || batch?.preco_promocional || 0;
                    const itemQty = itemBatchId === batchId ? newQuantity : item.quantity;
                    return sum + (promoPrice * itemQty);
                }, 0)
            }));
        });

        try {
            // Atualizar quantidade diretamente no backend (sem remover/adicionar)
            console.log('[Cart] Atualizando quantidade:', { batchId, newQuantity });
            const result = await api.updateCartItemQuantity(batchId, newQuantity);
            console.log('[Cart] Quantidade atualizada com sucesso');
            
            // Usar resposta diretamente para atualizar cache (evita requisição extra)
            updateCartCache(result);
            
            // Processar resultado para atualizar UI
            processCartData(result);
        } catch (error: any) {
            // Em caso de erro, reverter atualização otimista e recarregar
            console.error('[Cart] Error updating quantity:', error?.message || error);
            await loadCart(); // Recarregar para restaurar estado correto
            
            const errorMessage = error?.message || '';
            
            if (errorMessage.includes('outra loja') || errorMessage.includes('carrinho aberto')) {
                console.log('Erro ao atualizar quantidade - loja diferente detectada. Recarregando carrinho...');
            } else if (errorMessage.includes('estoque') || errorMessage.includes('stock')) {
                Alert.alert('Estoque Insuficiente', 'Não há estoque suficiente para esta quantidade.');
            } else {
                Alert.alert('Erro', 'Não foi possível atualizar a quantidade.');
            }
        }
    };

    const renderCartItem = (item: CartItem) => {
        const batch = getBatchFromItem(item);
        if (!batch) return null; // Fail-safe: não renderiza se não tiver dados do lote

        // Normaliza produto
        const product = batch.products || batch.product;
        const productName = product?.nome || product?.name || 'Produto Indisponível';

        // Normaliza imagem
        const productPhoto = product?.foto1 || product?.photo1 || product?.image || null;

        // Normaliza preço
        const promoPrice = batch.preco_promocional ?? batch.promo_price ?? 0;

        // Normaliza ID
        const batchId = batch.id || item.product_batch_id || item.batch_id;
        if (!batchId) return null;

        // Usar disponivel (estoque disponível) que é calculado no banco
        // disponivel = estoque_total - estoque_reservado - estoque_vendido
        const availableStock = batch.disponivel ?? batch.stock ?? batch.estoque_total ?? 0;
        const itemTotal = promoPrice * item.quantity;
        
        // Verificar se imagem teve erro
        const imageError = imageErrors.has(batchId);
        const imageUri = productPhoto && !imageError ? productPhoto : null;

        const handleImageError = () => {
            setImageErrors(prev => new Set(prev).add(batchId));
        };

        return (
            <View style={styles.cartItem}>
                {/* Product Image - Esquerda */}
                <View style={styles.imageContainer}>
                    {imageUri ? (
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.itemImage}
                            contentFit="cover"
                            transition={200}
                            onError={handleImageError}
                        />
                    ) : (
                        <View style={[styles.itemImage, styles.imagePlaceholder]}>
                            <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
                        </View>
                    )}
                </View>
                
                {/* Product Info - Centro */}
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                        {productName}
                    </Text>
                    <Text style={styles.itemPriceUnit}>
                        R$ {promoPrice.toFixed(2).replace('.', ',')} /un
                    </Text>
                    <Text style={styles.itemPriceTotal}>
                        R$ {itemTotal.toFixed(2).replace('.', ',')}
                    </Text>
                    {availableStock < 10 && (
                        <Text style={styles.stockWarning}>
                            {availableStock} un. disponível(is)
                        </Text>
                    )}
                </View>
                
                {/* Quantity Controls - Direita */}
                <View style={styles.quantitySection}>
                    <View style={styles.quantityContainer}>
                        <TouchableOpacity
                            style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
                            onPress={() => handleUpdateQuantity(batchId, item.quantity - 1, availableStock, item.quantity)}
                            disabled={item.quantity <= 1}
                            accessibilityRole="button"
                            accessibilityLabel="Diminuir quantidade"
                            accessibilityHint={`Quantidade atual: ${item.quantity}`}
                        >
                            <Ionicons 
                                name="remove" 
                                size={18} 
                                color={item.quantity <= 1 ? Colors.textMuted : Colors.text} 
                            />
                        </TouchableOpacity>
                        <Text 
                            style={styles.quantityText}
                            accessibilityLabel={`Quantidade: ${item.quantity}`}
                        >
                            {item.quantity}
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.quantityButton, 
                                item.quantity >= availableStock && styles.quantityButtonDisabled
                            ]}
                            onPress={() => handleUpdateQuantity(batchId, item.quantity + 1, availableStock, item.quantity)}
                            disabled={item.quantity >= availableStock}
                            accessibilityRole="button"
                            accessibilityLabel="Aumentar quantidade"
                            accessibilityHint={`Quantidade atual: ${item.quantity}, disponível: ${availableStock}`}
                        >
                            <Ionicons 
                                name="add" 
                                size={18} 
                                color={item.quantity >= availableStock ? Colors.textMuted : Colors.text} 
                            />
                        </TouchableOpacity>
                    </View>
                    
                    {/* Remove Button */}
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemove(batchId)}
                        accessibilityRole="button"
                        accessibilityLabel="Remover produto do carrinho"
                        accessibilityHint={`Remove ${productName} do carrinho`}
                    >
                        <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderStoreGroup = ({ item }: { item: GroupedCart }) => (
        <View style={styles.storeGroup}>
            {/* Store Header - Com logo se disponível */}
            <View style={styles.storeHeader}>
                <View style={styles.storeHeaderLeft}>
                    {item.storeLogo ? (
                        <Image
                            source={{ uri: item.storeLogo }}
                            style={styles.storeLogo}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={styles.storeIconContainer}>
                            <Ionicons name="storefront" size={20} color={Colors.primary} />
                        </View>
                    )}
                    <View style={styles.storeInfo}>
                        <Text style={styles.storeName}>{item.storeName}</Text>
                        {item.storeAddress && (
                            <Text style={styles.storeAddress} numberOfLines={1}>
                                {item.storeAddress}
                            </Text>
                        )}
                        <Text style={styles.storeItemsCount}>
                            {item.items.length} {item.items.length === 1 ? 'produto' : 'produtos'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Items */}
            <View style={styles.itemsContainer}>
                {item.items.map((cartItem) => {
                    // Usar id único do cart_item se disponível, senão usar batch_id
                    const uniqueKey = cartItem.id || cartItem.batch_id || cartItem.product_batch_id || `item-${Math.random()}`;
                    return (
                        <React.Fragment key={uniqueKey}>
                            {renderCartItem(cartItem)}
                        </React.Fragment>
                    );
                })}
            </View>

            {/* Subtotal and Checkout - Melhorado */}
            <View style={styles.storeFooter}>
                <View style={styles.subtotalContainer}>
                    <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>Subtotal ({item.items.length} {item.items.length === 1 ? 'item' : 'itens'})</Text>
                        <Text style={styles.subtotalValue}>R$ {item.total.toFixed(2).replace('.', ',')}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>R$ {item.total.toFixed(2).replace('.', ',')}</Text>
                    </View>
                </View>

                <Button
                    title="Pagar com PIX"
                    onPress={() => handleCheckout(item.storeId)}
                    variant="primary"
                    size="lg"
                    leftIcon={<Ionicons name="qr-code" size={20} color={Colors.text} />}
                    fullWidth
                    hapticFeedback
                    accessibilityLabel={`Pagar R$ ${item.total.toFixed(2)} com PIX`}
                    accessibilityHint="Gerar código PIX para pagamento"
                />
            </View>
        </View>
    );

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </GradientBackground>
        );
    }

    // Calcular total geral se múltiplas lojas
    const totalGeral = groupedCart.reduce((sum, store) => sum + store.total, 0);
    const totalItems = groupedCart.reduce((sum, store) => sum + store.items.length, 0);

    return (
        <GradientBackground>
            <View style={[styles.container, { paddingTop: screenPaddingTop }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Carrinho</Text>
                    <Text style={styles.subtitle}>
                        {groupedCart.length > 0
                            ? `${groupedCart.length} loja(s)`
                            : 'Vazio'
                        }
                    </Text>
                </View>

                {groupedCart.length === 0 ? (
                    <EmptyState
                        icon="cart-outline"
                        title="Seu carrinho está vazio"
                        message="Adicione produtos da vitrine para começar suas compras"
                        actionLabel="Explorar Vitrine"
                        onAction={() => router.push('/(customer)')}
                    />
                ) : (
                    <>
                        <AdaptiveList
                            data={groupedCart}
                            renderItem={renderStoreGroup}
                            keyExtractor={(item) => item.storeId}
                            contentContainerStyle={[
                                styles.listContent,
                                groupedCart.length > 1 && styles.listContentWithFooter,
                            ]}
                            showsVerticalScrollIndicator={false}
                            estimatedItemSize={420}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={Colors.primary}
                                />
                            }
                            removeClippedSubviews
                        />

                        {/* Sticky Footer - Apenas se múltiplas lojas */}
                        {groupedCart.length > 1 && (
                            <StickyFooter
                                total={totalGeral}
                                itemsCount={totalItems}
                                buttonLabel="Ver Todos os Pedidos"
                                onButtonPress={() => {
                                    // Navegar para pedidos ou mostrar resumo
                                    router.push('/(customer)/orders');
                                }}
                                buttonIcon="receipt"
                                showSubtotal={false}
                            />
                        )}

                        {/* Info Note */}
                        {groupedCart.length > 1 && (
                            <View style={styles.infoNote}>
                                <Ionicons name="information-circle" size={16} color={Colors.textSecondary} />
                                <Text style={styles.infoNoteText}>
                                    Compras de lojas diferentes são pagas separadamente
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Profile Required Modal */}
            <ProfileRequiredModal
                visible={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    title: {
        ...DesignTokens.typography.h1,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.xs,
    },
    subtitle: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: DesignTokens.padding.medium, // Responsivo
        paddingBottom: DesignTokens.spacing.xxl,
    },
    listContentWithFooter: {
        paddingBottom: 200, // Espaço para sticky footer
    },
    storeGroup: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        marginBottom: DesignTokens.spacing.md,
        overflow: 'hidden',
        ...DesignTokens.shadows.sm,
    },
    storeHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
        backgroundColor: '#F9FAFB', // Gray-50
    },
    storeHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    storeIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(5, 150, 105, 0.1)', // Emerald-50
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeLogo: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.glass,
    },
    storeInfo: {
        flex: 1,
    },
    storeName: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 2,
    },
    storeAddress: {
        fontSize: 12,
        color: Colors.textMuted,
        marginBottom: 2,
    },
    storeItemsCount: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    itemsContainer: {
        padding: 12,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: DesignTokens.spacing.md, // 16px conforme plano
        paddingHorizontal: DesignTokens.spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: DesignTokens.spacing.sm, // 12px gap conforme plano
    },
    imageContainer: {
        marginRight: 0, // Gap já aplicado
    },
    itemImage: {
        width: 80, // 80x80 conforme plano
        height: 80,
        borderRadius: DesignTokens.borderRadius.md,
        backgroundColor: Colors.glass,
    },
    imagePlaceholder: {
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        borderRadius: DesignTokens.borderRadius.md,
    },
    itemInfo: {
        flex: 1,
        marginRight: 0, // Gap já aplicado
    },
    itemName: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.xs,
        lineHeight: 20,
    },
    itemPriceUnit: {
        ...DesignTokens.typography.caption,
        color: Colors.textSecondary,
        marginBottom: DesignTokens.spacing.xs / 2,
    },
    itemPriceTotal: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary, // Verde = economia
        letterSpacing: -0.3,
    },
    stockWarning: {
        ...DesignTokens.typography.tiny,
        color: Colors.warning,
        marginTop: DesignTokens.spacing.xs / 2,
    },
    quantitySection: {
        alignItems: 'flex-end',
        gap: DesignTokens.spacing.sm,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.glass,
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
        gap: 12,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    quantityButton: {
        width: DesignTokens.touchTargets.min,
        height: DesignTokens.touchTargets.min,
        borderRadius: DesignTokens.borderRadius.full,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonDisabled: {
        backgroundColor: Colors.glass,
        opacity: 0.5,
    },
    quantityText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        minWidth: 30,
        textAlign: 'center',
    },
    removeButton: {
        padding: DesignTokens.spacing.sm,
        borderRadius: DesignTokens.borderRadius.sm,
        backgroundColor: Colors.error15,
        minWidth: DesignTokens.touchTargets.min,
        minHeight: DesignTokens.touchTargets.min,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeFooter: {
        padding: 20,
        backgroundColor: '#F9FAFB', // Gray-50
        borderTopWidth: 1,
        borderTopColor: Colors.glassBorder,
    },
    subtotalContainer: {
        marginBottom: 16,
    },
    subtotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    subtotalLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    subtotalValue: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.glassBorder,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    totalValue: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.primary, // Verde = economia
    },
    infoNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        gap: 6,
    },
    infoNoteText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
});
