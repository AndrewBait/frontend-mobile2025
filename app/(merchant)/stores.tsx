import React, { useEffect, useState, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';
import { api, Store } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function MerchantStoresScreen() {
    const { session, isLoggingOut } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
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

    const loadStores = async () => {
        if (isLoggingOut || !session) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const data = await api.getMyStores();
            setStores(data);
        } catch (error: any) {
            if (!error.message?.includes('Not authenticated') && !isLoggingOut) {
                console.error('Error loading stores:', error);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        if (isLoggingOut || !session) return;
        setRefreshing(true);
        loadStores();
    };

    const handleAddStore = () => {
        if (stores.length > 0) {
            Alert.alert(
                '🏪 Loja Adicional',
                'Você já possui uma loja gratuita. Para adicionar mais lojas, é necessário assinar o plano Premium.\n\n💎 Plano Premium: R$ 49,90/mês por loja adicional',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ver Planos', onPress: () => { } },
                ]
            );
        } else {
            router.push('/(merchant)/create-store');
        }
    };

    const renderStore = ({ item }: { item: Store }) => {
        // Map PT-BR fields to EN (backend returns Portuguese field names)
        const storeName = (item as any).nome || item.name || 'Loja sem nome';
        const storeAddress = (item as any).endereco || item.address || '';
        const storeCity = (item as any).cidade || item.city || '';
        const storeState = (item as any).estado || item.state || '';
        const storePhone = (item as any).telefone || item.phone || '';
        const storeHours = (item as any).horario_funcionamento || item.hours || '';
        const storeCnpj = item.cnpj || '';
        const isActive = (item as any).active ?? item.is_active ?? true;
        const isPremium = item.is_premium ?? false;

        return (
            <TouchableOpacity
                style={styles.storeCard}
                activeOpacity={0.9}
                onPress={() => router.push({
                    pathname: '/(merchant)/create-store',
                    params: { editStoreId: item.id }
                })}
            >
                <View style={styles.storeHeader}>
                    <View style={styles.storeIconContainer}>
                        <Ionicons name="storefront" size={28} color={Colors.secondary} />
                    </View>
                    <View style={styles.storeInfo}>
                        <View style={styles.storeNameRow}>
                            <Text style={styles.storeName}>{storeName}</Text>
                            {isPremium && (
                                <View style={styles.premiumBadge}>
                                    <Ionicons name="diamond" size={10} color="#FFD700" />
                                    <Text style={styles.premiumText}>Premium</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.storeCnpj}>{storeCnpj}</Text>
                    </View>
                </View>

                <View style={styles.storeDetails}>
                    <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {storeAddress ? `${storeAddress}, ${storeCity} - ${storeState}` : 'Endereço não definido'}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.detailText}>{storeHours || 'Horário não definido'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.detailText}>{storePhone || 'Telefone não definido'}</Text>
                    </View>
                </View>

                <View style={styles.storeFooter}>
                    <View style={[
                        styles.statusBadge,
                        isActive ? styles.statusActive : styles.statusInactive
                    ]}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: isActive ? Colors.success : Colors.textMuted }
                        ]} />
                        <Text style={[
                            styles.statusText,
                            { color: isActive ? Colors.success : Colors.textMuted }
                        ]}>
                            {isActive ? 'Ativa' : 'Inativa'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
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

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Minhas Lojas</Text>
                        <Text style={styles.subtitle}>{stores.length} cadastrada(s)</Text>
                    </View>
                    <TouchableOpacity onPress={handleAddStore}>
                        <LinearGradient
                            colors={[Colors.secondary, Colors.secondaryDark]}
                            style={styles.addButton}
                        >
                            <Ionicons name="add" size={24} color={Colors.text} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Free Store Banner */}
                {stores.length === 0 && (
                    <TouchableOpacity style={styles.freeBanner} onPress={handleAddStore}>
                        <View style={styles.freeBannerIcon}>
                            <Ionicons name="gift" size={24} color={Colors.success} />
                        </View>
                        <View style={styles.freeBannerContent}>
                            <Text style={styles.freeBannerTitle}>Primeira loja é gratuita!</Text>
                            <Text style={styles.freeBannerText}>
                                Cadastre sua primeira loja sem custo
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                )}

                {/* Stores List */}
                <FlatList
                    data={stores}
                    renderItem={renderStore}
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
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="storefront-outline" size={64} color={Colors.textMuted} />
                            </View>
                            <Text style={styles.emptyText}>Nenhuma loja cadastrada</Text>
                            <Text style={styles.emptySubtext}>
                                Cadastre sua primeira loja para começar a vender
                            </Text>
                        </View>
                    }
                />

                {/* Premium Info */}
                {stores.length > 0 && (
                    <View style={styles.premiumInfo}>
                        <Ionicons name="information-circle" size={16} color={Colors.textSecondary} />
                        <Text style={styles.premiumInfoText}>
                            Lojas adicionais: R$ 49,90/mês cada
                        </Text>
                    </View>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    freeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        marginBottom: 20,
        padding: 16,
        backgroundColor: Colors.success + '15',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.success + '30',
    },
    freeBannerIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: Colors.success + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    freeBannerContent: {
        flex: 1,
    },
    freeBannerTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.success,
        marginBottom: 2,
    },
    freeBannerText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    storeCard: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: 16,
        marginBottom: 12,
    },
    storeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    storeIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: Colors.secondary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    storeInfo: {
        flex: 1,
    },
    storeNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    storeName: {
        fontSize: 17,
        fontWeight: '600',
        color: Colors.text,
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4,
    },
    premiumText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFD700',
    },
    storeCnpj: {
        fontSize: 12,
        color: Colors.textMuted,
    },
    storeDetails: {
        gap: 8,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        flex: 1,
        fontSize: 13,
        color: Colors.textSecondary,
    },
    storeFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.glassBorder,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    statusActive: {
        backgroundColor: Colors.success + '15',
    },
    statusInactive: {
        backgroundColor: Colors.glass,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
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
    },
    premiumInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    premiumInfoText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
});
