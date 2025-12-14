import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    RefreshControl,
    TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';
import { api, Batch } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PRODUCT_CATEGORIES } from '../../utils/validation';

export default function VitrineScreen() {
    const { user, isProfileComplete } = useAuth();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadBatches();
        }, [selectedCategory, location])
    );

    useEffect(() => {
        getLocation();
    }, []);

    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setLocation({
                    lat: loc.coords.latitude,
                    lng: loc.coords.longitude,
                });
            }
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const loadBatches = async () => {
        console.log('Loading batches...');
        try {
            const params: any = {};

            if (selectedCategory) {
                params.categoria = selectedCategory;
            }

            if (location) {
                params.lat = location.lat;
                params.lng = location.lng;
                params.raio_km = user?.radius_km || 5;
            }

            // Add timeout to prevent infinite loading
            const fetchPromise = api.getPublicBatches(params);
            const timeoutPromise = new Promise<Batch[]>((resolve) =>
                setTimeout(() => {
                    console.log('Batches fetch timeout');
                    resolve([]);
                }, 5000)
            );

            const data = await Promise.race([fetchPromise, timeoutPromise]);
            console.log('Batches loaded:', data.length);
            setBatches(data);
        } catch (error) {
            console.error('Error loading batches:', error);
            setBatches([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Filter batches based on search query
    const filteredBatches = useMemo(() => {
        if (!searchQuery.trim()) return batches;

        const query = searchQuery.toLowerCase().trim();
        return batches.filter(batch => {
            const productName = (batch.product?.name || batch.product?.nome || '').toLowerCase();
            const storeName = (batch.store?.name || (batch.store as any)?.nome || '').toLowerCase();
            return productName.includes(query) || storeName.includes(query);
        });
    }, [batches, searchQuery]);

    const onRefresh = () => {
        setRefreshing(true);
        loadBatches();
    };

    const handleAddToCart = async (batch: Batch) => {
        try {
            await api.addToCart(batch.id, 1);
            // Show feedback
        } catch (error) {
            console.error('Error adding to cart:', error);
        }
    };

    const renderCategory = ({ item }: { item: { value: string; label: string } }) => (
        <TouchableOpacity
            style={[
                styles.categoryChip,
                selectedCategory === item.value && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(
                selectedCategory === item.value ? null : item.value
            )}
        >
            <Text style={[
                styles.categoryText,
                selectedCategory === item.value && styles.categoryTextActive,
            ]}>
                {item.label}
            </Text>
        </TouchableOpacity>
    );

    const renderBatch = ({ item }: { item: Batch }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => router.push(`/product/${item.id}`)}
            activeOpacity={0.9}
        >
            <View style={styles.productImageContainer}>
                <Image
                    source={{ uri: item.product?.photo1 || 'https://via.placeholder.com/150' }}
                    style={styles.productImage}
                />
                <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{item.discount_percent}%</Text>
                </View>
            </View>

            <View style={styles.productInfo}>
                <Text style={styles.storeName} numberOfLines={1}>
                    {item.store?.name || 'Loja'}
                </Text>
                <Text style={styles.productName} numberOfLines={2}>
                    {item.product?.name || 'Produto'}
                </Text>

                <View style={styles.priceRow}>
                    <Text style={styles.originalPrice}>R$ {(item.original_price ?? 0).toFixed(2)}</Text>
                    <Text style={styles.promoPrice}>R$ {(item.promo_price ?? 0).toFixed(2)}</Text>
                </View>

                <View style={styles.expirationRow}>
                    <Ionicons name="time-outline" size={12} color={Colors.warning} />
                    <Text style={styles.expirationText}>
                        Vence: {item.expiration_date ? new Date(item.expiration_date).toLocaleDateString('pt-BR') : 'N/A'}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddToCart(item)}
                >
                    <Ionicons name="cart" size={16} color={Colors.text} />
                    <Text style={styles.addButtonText}>Adicionar</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Carregando ofertas...</Text>
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
                        <Text style={styles.greeting}>
                            Olá{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
                        </Text>
                        <Text style={styles.title}>Ofertas do dia</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.cartButton}
                        onPress={() => router.push('/(customer)/cart')}
                    >
                        <Ionicons name="cart-outline" size={24} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
                        <Ionicons name="search" size={20} color={Colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar produto ou loja..."
                            placeholderTextColor={Colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Location Info */}
                {location && (
                    <View style={styles.locationInfo}>
                        <Ionicons name="location" size={14} color={Colors.primary} />
                        <Text style={styles.locationText}>
                            Buscando em um raio de {user?.radius_km || 5}km
                        </Text>
                    </View>
                )}

                {/* Categories */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                    style={styles.categoriesScroll}
                >
                    {[{ value: '', label: 'Todos' }, ...PRODUCT_CATEGORIES].map((cat) => (
                        <TouchableOpacity
                            key={cat.value || 'all'}
                            style={[
                                styles.categoryChip,
                                selectedCategory === cat.value && styles.categoryChipActive,
                            ]}
                            onPress={() => setSelectedCategory(
                                selectedCategory === cat.value ? null : cat.value
                            )}
                        >
                            <Text style={[
                                styles.categoryText,
                                selectedCategory === cat.value && styles.categoryTextActive,
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Products Grid */}
                {filteredBatches.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="search-outline" size={64} color={Colors.textMuted} />
                        </View>
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'Nenhum resultado' : 'Nenhuma oferta encontrada'}
                        </Text>
                        <Text style={styles.emptySubtext}>
                            {searchQuery
                                ? `Não encontramos produtos para "${searchQuery}"`
                                : selectedCategory
                                    ? 'Tente outra categoria ou aumente o raio de busca'
                                    : 'Não há ofertas disponíveis na sua região ainda'
                            }
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredBatches}
                        renderItem={renderBatch}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={styles.productsContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.primary}
                            />
                        }
                        ListHeaderComponent={
                            searchQuery ? (
                                <Text style={styles.searchResultsText}>
                                    {filteredBatches.length} resultado(s) para "{searchQuery}"
                                </Text>
                            ) : null
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
        gap: 16,
    },
    loadingText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    greeting: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
    },
    cartButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
        gap: 6,
    },
    locationText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    categoriesScroll: {
        maxHeight: 50,
        flexGrow: 0,
    },
    categoriesContainer: {
        paddingHorizontal: 24,
        paddingVertical: 4,
        gap: 8,
        flexDirection: 'row',
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    categoryText: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    categoryTextActive: {
        color: Colors.text,
        fontWeight: '600',
    },
    productsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    row: {
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    productCard: {
        width: '48%',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        overflow: 'hidden',
        marginBottom: 16,
    },
    productImageContainer: {
        aspectRatio: 1,
        backgroundColor: Colors.glass,
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: Colors.error,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    discountText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.text,
    },
    productInfo: {
        padding: 12,
    },
    storeName: {
        fontSize: 11,
        color: Colors.textMuted,
        marginBottom: 4,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
        minHeight: 36,
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
        fontSize: 16,
        fontWeight: '700',
        color: Colors.success,
    },
    expirationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 12,
    },
    expirationText: {
        fontSize: 11,
        color: Colors.warning,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: 10,
        paddingVertical: 10,
        gap: 6,
    },
    addButtonText: {
        fontSize: 13,
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
    },
    searchContainer: {
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
    },
    searchBarFocused: {
        borderColor: Colors.primary,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: Colors.text,
    },
    searchResultsText: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
});
