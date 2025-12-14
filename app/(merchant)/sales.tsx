import React, { useState, useCallback, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';
import { api, Store, Order } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function MerchantSalesScreen() {
    const { session, isLoggingOut } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedStore, setSelectedStore] = useState<string | null>(null);
    const [pickupCode, setPickupCode] = useState('');
    const [verifying, setVerifying] = useState(false);
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
            loadOrders();
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

    const loadOrders = async () => {
        if (!selectedStore || isLoggingOut || !session) return;
        try {
            const data = await api.getStoreOrders(selectedStore);
            setOrders(data);
        } catch (error: any) {
            if (!error.message?.includes('Not authenticated') && !isLoggingOut) {
                console.error('Error loading orders:', error);
            }
        } finally {
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        if (isLoggingOut || !session) return;
        setRefreshing(true);
        loadOrders();
    };

    const handleVerifyPickup = async () => {
        if (!selectedStore || !pickupCode.trim()) {
            Alert.alert('Erro', 'Digite o código de retirada.');
            return;
        }

        setVerifying(true);
        try {
            // Find order with this pickup code
            const order = orders.find(o => o.pickup_code === pickupCode.toUpperCase());

            if (!order) {
                Alert.alert('❌ Código Inválido', 'Nenhum pedido encontrado com este código.');
                setVerifying(false);
                return;
            }

            if (order.status === 'picked_up') {
                Alert.alert('⚠️ Já Retirado', 'Este pedido já foi retirado anteriormente.');
                setVerifying(false);
                return;
            }

            if (order.status !== 'paid') {
                Alert.alert('⚠️ Pagamento Pendente', 'Este pedido ainda não foi pago.');
                setVerifying(false);
                return;
            }

            // Confirm pickup
            await api.confirmPickup(selectedStore, order.id);

            Alert.alert(
                '✅ Retirada Confirmada!',
                `Pedido #${order.id.slice(-6).toUpperCase()} entregue com sucesso.`,
                [{ text: 'OK' }]
            );

            setPickupCode('');
            loadOrders();
        } catch (error: any) {
            console.error('Error confirming pickup:', error);
            Alert.alert('Erro', error.message || 'Não foi possível confirmar a retirada.');
        } finally {
            setVerifying(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'Aguardando', color: Colors.warning };
            case 'paid':
                return { label: 'A Retirar', color: Colors.success };
            case 'picked_up':
                return { label: 'Retirado', color: Colors.primary };
            case 'cancelled':
                return { label: 'Cancelado', color: Colors.error };
            case 'expired':
                return { label: 'Expirado', color: Colors.textMuted };
            default:
                return { label: 'Desconhecido', color: Colors.textMuted };
        }
    };

    const renderOrder = ({ item }: { item: Order }) => {
        const statusInfo = getStatusInfo(item.status);

        return (
            <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                    <View>
                        <Text style={styles.orderNumber}>#{item.id.slice(-6).toUpperCase()}</Text>
                        <Text style={styles.orderDate}>
                            {new Date(item.created_at || '').toLocaleString('pt-BR')}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.orderBody}>
                    <View style={styles.orderRow}>
                        <Text style={styles.orderLabel}>Itens</Text>
                        <Text style={styles.orderValue}>{item.items?.length || 0}</Text>
                    </View>
                    <View style={styles.orderRow}>
                        <Text style={styles.orderLabel}>Total</Text>
                        <Text style={styles.orderTotal}>R$ {item.total_amount.toFixed(2)}</Text>
                    </View>
                </View>

                {item.status === 'paid' && item.pickup_code && (
                    <View style={styles.codeBox}>
                        <Text style={styles.codeLabel}>Código</Text>
                        <Text style={styles.codeValue}>{item.pickup_code}</Text>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.secondary} />
                </View>
            </GradientBackground>
        );
    }

    if (stores.length === 0) {
        return (
            <GradientBackground>
                <View style={styles.emptyContainer}>
                    <Ionicons name="storefront-outline" size={64} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>Cadastre uma loja primeiro</Text>
                </View>
            </GradientBackground>
        );
    }

    const pendingOrders = orders.filter(o => o.status === 'paid');

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Vendas</Text>
                    <Text style={styles.subtitle}>
                        {pendingOrders.length} retirada(s) pendente(s)
                    </Text>
                </View>

                {/* Pickup Code Verifier */}
                <View style={styles.verifyCard}>
                    <View style={styles.verifyHeader}>
                        <Ionicons name="qr-code" size={24} color={Colors.secondary} />
                        <Text style={styles.verifyTitle}>Verificar Retirada</Text>
                    </View>
                    <View style={styles.verifyInputRow}>
                        <TextInput
                            style={styles.verifyInput}
                            value={pickupCode}
                            onChangeText={(text) => setPickupCode(text.toUpperCase())}
                            placeholder="Código de retirada"
                            placeholderTextColor={Colors.textMuted}
                            autoCapitalize="characters"
                            maxLength={6}
                        />
                        <TouchableOpacity
                            onPress={handleVerifyPickup}
                            disabled={verifying || !pickupCode.trim()}
                        >
                            <LinearGradient
                                colors={[Colors.secondary, Colors.secondaryDark]}
                                style={styles.verifyButton}
                            >
                                {verifying ? (
                                    <ActivityIndicator color={Colors.text} size="small" />
                                ) : (
                                    <Ionicons name="checkmark" size={24} color={Colors.text} />
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Store Filter */}
                {stores.length > 1 && (
                    <FlatList
                        data={stores}
                        renderItem={({ item }) => (
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
                        )}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.storesFilter}
                    />
                )}

                {/* Orders List */}
                {orders.length === 0 ? (
                    <View style={styles.emptyListContainer}>
                        <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyListText}>Nenhuma venda ainda</Text>
                    </View>
                ) : (
                    <FlatList
                        data={orders}
                        renderItem={renderOrder}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.secondary}
                            />
                        }
                    />
                )}
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
    emptyText: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 16,
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 20,
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
    verifyCard: {
        marginHorizontal: 24,
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: 16,
        marginBottom: 20,
    },
    verifyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    verifyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    verifyInputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    verifyInput: {
        flex: 1,
        backgroundColor: Colors.glass,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        letterSpacing: 2,
        textAlign: 'center',
    },
    verifyButton: {
        width: 52,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storesFilter: {
        paddingHorizontal: 24,
        paddingBottom: 16,
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
        backgroundColor: Colors.secondary,
        borderColor: Colors.secondary,
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
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    orderCard: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: 16,
        marginBottom: 12,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    orderDate: {
        fontSize: 12,
        color: Colors.textMuted,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    orderBody: {
        gap: 8,
    },
    orderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    orderValue: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
    },
    orderTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.success,
    },
    codeBox: {
        marginTop: 16,
        backgroundColor: Colors.success + '15',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    codeLabel: {
        fontSize: 12,
        color: Colors.success,
    },
    codeValue: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.success,
        letterSpacing: 2,
    },
    emptyListContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyListText: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 16,
    },
});
