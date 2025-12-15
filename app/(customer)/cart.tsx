import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ImageErrorEventData,
    NativeSyntheticEvent,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Button } from '../../components/base/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { GradientBackground } from '../../components/GradientBackground';
import { ProfileRequiredModal } from '../../components/ProfileRequiredModal';
import { Colors } from '../../constants/Colors';
import { DesignTokens } from '../../constants/designTokens';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { api, Cart, CartItem } from '../../services/api';

interface GroupedCart {
    storeId: string;
    storeName: string;
    items: CartItem[];
    total: number;
}

export default function CartScreen() {
    const { isProfileComplete } = useAuth();
    const { updateCartCache, getCachedCart, cacheTimestamp } = useCart();
    const [groupedCart, setGroupedCart] = useState<GroupedCart[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    const isLoadingCartRef = React.useRef(false);

    // Função auxiliar para processar dados do carrinho
    const processCartData = useCallback((cart: Cart) => {
        // Ensure cart has items array
        if (!cart || !Array.isArray(cart.items)) {
            console.log('Cart is empty or invalid, setting empty cart');
            setGroupedCart([]);
            return;
        }

        // Group by store
        const grouped: Record<string, GroupedCart> = {};

        (cart.items || []).forEach((item) => {
            // Skip invalid items - check both batch and product_batches (backend format)
            const batch = item.batch || item.product_batches;
            if (!item || !batch) {
                console.warn('Skipping invalid cart item:', item);
                return;
            }

            // Handle both frontend format (batch) and backend format (product_batches)
            const storeId = batch.store_id || '';
            const store = batch.store || {};
            const storeName = store.name || store.nome || 'Loja';
            const promoPrice = batch.promo_price || batch.preco_promocional || 0;

            if (!grouped[storeId]) {
                grouped[storeId] = {
                    storeId,
                    storeName,
                    items: [],
                    total: 0,
                };
            }

            grouped[storeId].items.push(item);
            grouped[storeId].total += promoPrice * item.quantity;
        });

        setGroupedCart(Object.values(grouped));
        setImageErrors(new Set()); // Reset image errors on new load
        console.log('[Cart] Cart loaded:', Object.keys(grouped).length, 'stores,', 
            Object.values(grouped).reduce((sum, store) => sum + store.items.length, 0), 'items');
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
            const timeoutPromise = new Promise<Cart>((resolve) =>
                setTimeout(() => {
                    console.warn('[Cart] Fetch timeout após 5s - retornando carrinho vazio');
                    resolve({ items: [], total: 0 } as Cart);
                }, 5000) // 5 segundos (reduzido de 15s)
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
                                        const itemBatchId = item.batch_id || (item as any).product_batch_id;
                                        return itemBatchId !== batchId;
                                    }),
                                })).filter(store => store.items.length > 0);
                                
                                // Recalcular totais
                                return updated.map(store => ({
                                    ...store,
                                    total: store.items.reduce((sum, item) => {
                                        const batch = item.batch || (item as any).product_batches;
                                        const promoPrice = batch?.promo_price || batch?.preco_promocional || 0;
                                        return sum + (promoPrice * item.quantity);
                                    }, 0),
                                }));
                            });
                            
                            // Remover do backend
                            // Nota: removeFromCart pode retornar { cart: null } se carrinho ficar vazio
                            // ou retornar o carrinho atualizado
                            try {
                                const result = await api.removeFromCart(batchId);
                                
                                // Backend pode retornar { cart: null } ou Cart completo
                                // Verificar se é um objeto com propriedade 'cart'
                                if (result && typeof result === 'object' && 'cart' in result) {
                                    // Backend retornou { cart: null } ou { cart: Cart }
                                    const cart = (result as any).cart;
                                    if (cart && 'items' in cart && Array.isArray(cart.items)) {
                                        // Carrinho não vazio
                                        updateCartCache(cart);
                                        processCartData(cart);
                                    } else {
                                        // Carrinho vazio
                                        const emptyCart: Cart = { items: [], total: 0 };
                                        updateCartCache(emptyCart);
                                        processCartData(emptyCart);
                                    }
                                } else if (result && 'items' in result && Array.isArray(result.items)) {
                                    // Backend retornou Cart diretamente
                                    updateCartCache(result);
                                    processCartData(result);
                                } else {
                                    // Formato inesperado - recarregar
                                    await loadCart();
                                }
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

    const handleCheckout = (storeId: string) => {
        // Check if profile is complete
        if (!isProfileComplete) {
            setShowProfileModal(true);
            return;
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
                    const itemBatchId = item.batch_id || (item as any).product_batch_id;
                    if (itemBatchId === batchId) {
                        return { ...item, quantity: newQuantity };
                    }
                    return item;
                }),
                total: store.items.reduce((sum, item) => {
                    const itemBatchId = item.batch_id || (item as any).product_batch_id;
                    const batch = item.batch || (item as any).product_batches;
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
            if (result && Array.isArray(result.items)) {
                const grouped: Record<string, GroupedCart> = {};
                (result.items || []).forEach((item) => {
                    const batch = item.batch || item.product_batches;
                    if (!item || !batch) return;
                    const storeId = batch.store_id || '';
                    const store = batch.store || {};
                    const storeName = store.name || store.nome || 'Loja';
                    const promoPrice = batch.promo_price || batch.preco_promocional || 0;
                    if (!grouped[storeId]) {
                        grouped[storeId] = { storeId, storeName, items: [], total: 0 };
                    }
                    grouped[storeId].items.push(item);
                    grouped[storeId].total += promoPrice * item.quantity;
                });
                setGroupedCart(Object.values(grouped));
            }
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
        // Handle both frontend format (batch) and backend format (product_batches)
        const batch = item.batch || (item as any).product_batches;
        const product = batch?.product || batch?.products;
        const productName = product?.name || product?.nome || 'Produto';
        // Try multiple possible image field names
        const productPhoto = product?.photo1 || product?.foto1 || product?.foto || product?.image || null;
        const promoPrice = batch?.promo_price || batch?.preco_promocional || 0;
        const batchId = item.batch_id || (item as any).product_batch_id || '';
        // Usar disponivel (estoque disponível) que é calculado no banco
        // disponivel = estoque_total - estoque_reservado - estoque_vendido
        const availableStock = batch?.disponivel ?? batch?.stock ?? batch?.estoque_total ?? 0;
        const itemTotal = promoPrice * item.quantity;
        
        // Verificar se imagem teve erro
        const imageKey = batchId;
        const imageError = imageErrors.has(imageKey);
        const imageUri = productPhoto && !imageError ? productPhoto : null;
        
        const handleImageError = (e: NativeSyntheticEvent<ImageErrorEventData>) => {
            console.log('[Cart] Erro ao carregar imagem:', imageUri);
            setImageErrors(prev => new Set(prev).add(imageKey));
        };

        return (
            <View style={styles.cartItem}>
                {/* Product Image */}
                <View style={styles.imageContainer}>
                    {imageUri ? (
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.itemImage}
                            resizeMode="cover"
                            onError={handleImageError}
                        />
                    ) : (
                        <View style={[styles.itemImage, styles.imagePlaceholder]}>
                            <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
                        </View>
                    )}
                </View>
                
                {/* Product Info */}
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                        {productName}
                    </Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.itemPriceUnit}>
                            R$ {promoPrice.toFixed(2).replace('.', ',')} /un
                        </Text>
                        <Text style={styles.itemPriceTotal}>
                            R$ {itemTotal.toFixed(2).replace('.', ',')}
                        </Text>
                    </View>
                    {availableStock < 10 && (
                        <Text style={styles.stockWarning}>
                            {availableStock} un. disponível(is)
                        </Text>
                    )}
                </View>
                
                {/* Quantity Controls */}
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
                                size={16} 
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
                                size={16} 
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
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderStoreGroup = ({ item }: { item: GroupedCart }) => (
        <View style={styles.storeGroup}>
            {/* Store Header - Melhorado */}
            <View style={styles.storeHeader}>
                <View style={styles.storeHeaderLeft}>
                    <View style={styles.storeIconContainer}>
                        <Ionicons name="storefront" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.storeInfo}>
                        <Text style={styles.storeName}>{item.storeName}</Text>
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
                    const uniqueKey = (cartItem as any).id || cartItem.batch_id || (cartItem as any).product_batch_id || `item-${Math.random()}`;
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

    return (
        <GradientBackground>
            <View style={styles.container}>
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
                    <FlatList
                        data={groupedCart}
                        renderItem={renderStoreGroup}
                        keyExtractor={(item) => item.storeId}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.primary}
                            />
                        }
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        initialNumToRender={5}
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
        paddingTop: 60,
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
        paddingHorizontal: 24,
        paddingBottom: 120,
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
        backgroundColor: Colors.glass + '40',
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
        backgroundColor: Colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
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
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
    },
    imageContainer: {
        marginRight: 12,
    },
    itemImage: {
        width: 70,
        height: 70,
        borderRadius: 12,
        backgroundColor: Colors.glass,
    },
    imagePlaceholder: {
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
        width: 70,
        height: 70,
        borderRadius: 12,
    },
    itemInfo: {
        flex: 1,
        marginRight: 8,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 6,
        lineHeight: 20,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    itemPriceUnit: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    itemPriceTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.success,
    },
    stockWarning: {
        fontSize: 11,
        color: Colors.warning,
        marginTop: 4,
    },
    quantitySection: {
        alignItems: 'flex-end',
        gap: 8,
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
        backgroundColor: Colors.glass,
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
        color: Colors.success,
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
