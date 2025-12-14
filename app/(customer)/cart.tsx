import React, { useEffect, useState, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { ProfileRequiredModal } from '../../components/ProfileRequiredModal';
import { Colors } from '../../constants/Colors';
import { api, Cart, CartItem } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface GroupedCart {
    storeId: string;
    storeName: string;
    items: CartItem[];
    total: number;
}

export default function CartScreen() {
    const { isProfileComplete } = useAuth();
    const [groupedCart, setGroupedCart] = useState<GroupedCart[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadCart();
        }, [])
    );

    const loadCart = async () => {
        console.log('Loading cart...');
        try {
            // Add timeout
            const fetchCart = api.getCart();
            const timeoutPromise = new Promise<Cart>((resolve) =>
                setTimeout(() => {
                    console.log('Cart fetch timeout');
                    resolve({ items: [], total: 0 } as Cart);
                }, 5000)
            );

            const cart = await Promise.race([fetchCart, timeoutPromise]);

            // Group by store
            const grouped: Record<string, GroupedCart> = {};

            (cart.items || []).forEach((item) => {
                const storeId = item.batch?.store_id || '';
                const storeName = item.batch?.store?.name || 'Loja';

                if (!grouped[storeId]) {
                    grouped[storeId] = {
                        storeId,
                        storeName,
                        items: [],
                        total: 0,
                    };
                }

                grouped[storeId].items.push(item);
                grouped[storeId].total += (item.batch?.promo_price || 0) * item.quantity;
            });

            setGroupedCart(Object.values(grouped));
            console.log('Cart loaded:', Object.keys(grouped).length, 'stores');
        } catch (error) {
            console.error('Error loading cart:', error);
            setGroupedCart([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadCart();
    };

    const handleRemove = async (batchId: string) => {
        try {
            await api.removeFromCart(batchId);
            await loadCart();
        } catch (error) {
            console.error('Error removing item:', error);
        }
    };

    const handleCheckout = (storeId: string) => {
        // Check if profile is complete
        if (!isProfileComplete) {
            setShowProfileModal(true);
            return;
        }

        router.push(`/checkout/${storeId}`);
    };

    const renderCartItem = (item: CartItem) => (
        <View key={item.batch_id} style={styles.cartItem}>
            <Image
                source={{ uri: item.batch?.product?.photo1 || 'https://via.placeholder.com/100' }}
                style={styles.itemImage}
            />
            <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                    {item.batch?.product?.name || 'Produto'}
                </Text>
                <Text style={styles.itemPrice}>
                    R$ {(item.batch?.promo_price || 0).toFixed(2)}
                </Text>
            </View>
            <View style={styles.quantityContainer}>
                <Text style={styles.quantityText}>{item.quantity}x</Text>
            </View>
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(item.batch_id)}
            >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
        </View>
    );

    const renderStoreGroup = ({ item }: { item: GroupedCart }) => (
        <View style={styles.storeGroup}>
            {/* Store Header */}
            <View style={styles.storeHeader}>
                <Ionicons name="storefront" size={18} color={Colors.primary} />
                <Text style={styles.storeName}>{item.storeName}</Text>
            </View>

            {/* Items */}
            <View style={styles.itemsContainer}>
                {item.items.map(renderCartItem)}
            </View>

            {/* Subtotal and Checkout */}
            <View style={styles.storeFooter}>
                <View style={styles.subtotalRow}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalValue}>R$ {item.total.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                    onPress={() => handleCheckout(item.storeId)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.checkoutButton}
                    >
                        <Ionicons name="card-outline" size={18} color={Colors.text} />
                        <Text style={styles.checkoutText}>Pagar com PIX</Text>
                    </LinearGradient>
                </TouchableOpacity>
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
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="cart-outline" size={64} color={Colors.textMuted} />
                        </View>
                        <Text style={styles.emptyText}>Seu carrinho está vazio</Text>
                        <Text style={styles.emptySubtext}>
                            Adicione produtos da vitrine para começar
                        </Text>
                        <TouchableOpacity
                            style={styles.exploreButton}
                            onPress={() => router.push('/(customer)')}
                        >
                            <Text style={styles.exploreButtonText}>Explorar Vitrine</Text>
                        </TouchableOpacity>
                    </View>
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
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    storeGroup: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        marginBottom: 16,
        overflow: 'hidden',
    },
    storeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
        gap: 8,
    },
    storeName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    itemsContainer: {
        padding: 12,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
    },
    itemImage: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: Colors.glass,
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.success,
    },
    quantityContainer: {
        marginHorizontal: 12,
    },
    quantityText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    removeButton: {
        padding: 8,
    },
    storeFooter: {
        padding: 16,
        backgroundColor: Colors.glass,
    },
    subtotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    subtotalLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    subtotalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    checkoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    checkoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
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
    exploreButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        backgroundColor: Colors.primary,
    },
    exploreButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
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
