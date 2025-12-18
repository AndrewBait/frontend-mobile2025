import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { api, Batch, Store } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function MerchantProductsScreen() {
    const { session, isLoggingOut } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedStore, setSelectedStore] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (isLoggingOut || !session) {
                setLoading(false);
                return;
            }
            loadStores();
        }, [session, isLoggingOut])
    );

    useEffect(() => {
        if (selectedStore && !isLoggingOut && session) {
            loadBatches();
        }
    }, [selectedStore, isLoggingOut, session]);

    const loadStores = async () => {
        if (isLoggingOut || !session) {
            setLoading(false);
            return;
        }

        try {
            const data = await api.getMyStores();
            setStores(data);
            if (data.length > 0 && !selectedStore) {
                setSelectedStore(data[0].id);
            }
        } catch (error: any) {
            if (!error.message?.includes('Not authenticated') && !isLoggingOut) {
                console.error('Error loading stores:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadBatches = async () => {
        if (!selectedStore || isLoggingOut || !session) return;
        try {
            const data = await api.getStoreBatches(selectedStore);
            setBatches(data);
        } catch (error: any) {
            if (!error.message?.includes('Not authenticated') && !isLoggingOut) {
                console.error('Error loading batches:', error);
            }
        } finally {
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        if (isLoggingOut || !session) return;
        setRefreshing(true);
        loadBatches();
    };

    const renderStoreFilter = ({ item }: { item: Store }) => (
        <TouchableOpacity
            style={[
                styles.storeChip,
                selectedStore === item.id && styles.storeChipActive,
            ]}
            onPress={() => setSelectedStore(item.id)}
        >
            <Text style={[
                styles.storeChipText,
                selectedStore === item.id && styles.storeChipTextActive,
            ]}>
                {item.name}
            </Text>
        </TouchableOpacity>
    );

    const renderBatch = ({ item }: { item: Batch }) => {
        // Handle both PT-BR and EN field names
        const expirationDate = item.expiration_date || item.data_vencimento || '';
        const daysToExpire = Math.ceil(
            (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const stockCount = item.stock ?? item.estoque_total ?? 0;
        const availableCount = item.disponivel ?? stockCount;
        const isLowStock = availableCount <= 3;
        const isExpiringSoon = daysToExpire <= 2;
        const isActive = item.is_active ?? item.active ?? true;

        // Get product info - Supabase returns 'products' (plural) from the join
        const productData = (item as any).products || item.product;
        const productName = productData?.nome || productData?.name || 'Produto sem nome';
        const productPhoto = productData?.foto1 || productData?.photo1 || null;
        const productCategory = productData?.categoria || productData?.category || '';

        // Prices
        const originalPrice = item.original_price ?? item.preco_normal_override ?? productData?.preco_normal ?? 0;
        const promoPrice = item.promo_price ?? item.preco_promocional ?? 0;
        const discountPercent = item.discount_percent ?? item.desconto_percentual ?? 0;

        const handleDelete = async () => {
            Alert.alert(
                'Excluir Produto',
                `Tem certeza que deseja excluir "${productName}"? Esta ação não pode ser desfeita.`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Excluir',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await api.deleteProduct(item.product_id);
                                Alert.alert('Sucesso', 'Produto excluído com sucesso!');
                                loadBatches(); // Refresh the list
                            } catch (error: any) {
                                console.error('Error deleting product:', error);
                                Alert.alert('Erro', error.message || 'Não foi possível excluir o produto.');
                            }
                        }
                    }
                ]
            );
        };

        const handleEdit = () => {
            Alert.alert('Ações do Produto', `O que deseja fazer com "${productName}"?`, [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: handleDelete
                },
                {
                    text: 'Editar',
                    onPress: () => {
                        // Navigate to create-product with edit mode
                        router.push({
                            pathname: '/(merchant)/create-product',
                            params: {
                                editBatchId: item.id,
                                editProductId: item.product_id,
                                storeId: item.store_id
                            }
                        });
                    }
                }
            ])
        };

        return (
            <TouchableOpacity
                style={[styles.productCard, !isActive && styles.productCardInactive]}
                onPress={handleEdit}
                activeOpacity={0.7}
            >
                {/* Product Image */}
                <View style={styles.imageContainer}>
                    {productPhoto ? (
                        <Image
                            source={{ uri: productPhoto }}
                            style={styles.productImage}
                        />
                    ) : (
                        <View style={styles.noImagePlaceholder}>
                            <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
                        </View>
                    )}

                    {/* Discount Badge */}
                    {discountPercent > 0 && (
                        <View style={styles.discountBadgeAbsolute}>
                            <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
                        </View>
                    )}

                    {/* Inactive Badge */}
                    {!isActive && (
                        <View style={styles.inactiveBadge}>
                            <Text style={styles.inactiveBadgeText}>INATIVO</Text>
                        </View>
                    )}
                </View>

                {/* Product Info */}
                <View style={styles.productInfo}>
                    {/* Category & Name */}
                    {productCategory && (
                        <Text style={styles.productCategory}>{productCategory}</Text>
                    )}
                    <Text style={styles.productName} numberOfLines={2}>
                        {productName}
                    </Text>

                    {/* Prices */}
                    <View style={styles.priceRow}>
                        <Text style={styles.originalPrice}>
                            R$ {originalPrice.toFixed(2).replace('.', ',')}
                        </Text>
                        <Text style={styles.promoPrice}>
                            R$ {promoPrice.toFixed(2).replace('.', ',')}
                        </Text>
                    </View>

                    {/* Tags Row */}
                    <View style={styles.tagsRow}>
                        {/* Expiration */}
                        <View style={[
                            styles.tag,
                            { backgroundColor: isExpiringSoon ? Colors.error20 : Colors.warning20 }
                        ]}>
                            <Ionicons
                                name="calendar"
                                size={12}
                                color={isExpiringSoon ? Colors.error : Colors.warning}
                            />
                            <Text style={[
                                styles.tagText,
                                { color: isExpiringSoon ? Colors.error : Colors.warning }
                            ]}>
                                {daysToExpire > 0 ? `${daysToExpire}d` : 'Hoje'}
                            </Text>
                        </View>

                        {/* Stock */}
                        <View style={[
                            styles.tag,
                            { backgroundColor: isLowStock ? Colors.error20 : Colors.success20 }
                        ]}>
                            <Ionicons
                                name="cube"
                                size={12}
                                color={isLowStock ? Colors.error : Colors.success}
                            />
                            <Text style={[
                                styles.tagText,
                                { color: isLowStock ? Colors.error : Colors.success }
                            ]}>
                                {availableCount} un
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Edit Icon */}
                <View style={styles.editButton}>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </GradientBackground>
        );
    }

    if (stores.length === 0) {
        return (
            <GradientBackground>
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="storefront-outline" size={64} color={Colors.textMuted} />
                    </View>
                    <Text style={styles.emptyText}>Cadastre uma loja primeiro</Text>
                    <Text style={styles.emptySubtext}>
                        Você precisa ter uma loja para adicionar produtos
                    </Text>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => router.push('/(merchant)/create-store')}
                    >
                        <Text style={styles.createButtonText}>Criar Loja</Text>
                    </TouchableOpacity>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Produtos</Text>
                        <Text style={styles.subtitle}>{batches.length} lote(s)</Text>
                    </View>
                </View>

                {/* Store Filter */}
                {stores.length > 1 && (
                    <FlatList
                        data={stores}
                        renderItem={renderStoreFilter}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.storesFilter}
                    />
                )}

                {/* Products List */}
                {batches.length === 0 ? (
                    <View style={styles.emptyListContainer}>
                        <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyListText}>Nenhum produto cadastrado</Text>
                        <TouchableOpacity
                            style={styles.addProductButton}
                            onPress={() => router.push('/(merchant)/create-product')}
                        >
                            <Ionicons name="add" size={18} color={Colors.text} />
                            <Text style={styles.addProductButtonText}>Adicionar Produto</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={batches}
                        renderItem={renderBatch}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.primary}
                            />
                        }
                    />
                )}

                {/* FAB - Floating Action Button */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => router.push('/(merchant)/create-product')}
                    activeOpacity={0.8}
                >
                    <View style={styles.fabGradient}>
                        <Ionicons name="add" size={32} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>
            </View>
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
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    emptyIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    createButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        backgroundColor: Colors.secondary,
    },
    createButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: DesignTokens.padding.medium, // Responsivo
        marginBottom: DesignTokens.spacing.lg,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    fabGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storesFilter: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        gap: 8,
    },
    storeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        marginRight: 8,
    },
    storeChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    storeChipText: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    storeChipTextActive: {
        color: Colors.text,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: DesignTokens.padding.medium, // Responsivo
        paddingBottom: 120, // Espaço para FAB
        gap: DesignTokens.grid.gap.medium, // Gap entre cards
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: 12,
        marginBottom: 12,
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: Colors.glass,
    },
    productInfo: {
        flex: 1,
        marginHorizontal: 12,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    originalPrice: {
        fontSize: 12,
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    promoPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.success,
    },
    discountBadge: {
        backgroundColor: Colors.error,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    discountText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.text,
    },
    tagsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '600',
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary20,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    emptyListContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    emptyListText: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 16,
        marginBottom: 24,
    },
    addProductButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        gap: 8,
    },
    addProductButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    productCardInactive: {
        opacity: 0.6,
    },
    imageContainer: {
        position: 'relative',
        width: 90,
        height: 90,
        borderRadius: 12,
        overflow: 'hidden',
    },
    noImagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    discountBadgeAbsolute: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: Colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    discountBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.text,
    },
    inactiveBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.error,
        paddingVertical: 2,
        alignItems: 'center',
    },
    inactiveBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: Colors.text,
    },
    productCategory: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.primary,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
});
