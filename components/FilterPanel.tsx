import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface FilterChip {
    label: string;
    value: string | number;
}

interface FilterPanelProps {
    isOpen: boolean;
    onToggle: () => void;
    activeFiltersCount?: number;
    
    // Price filters
    minPrice?: string;
    maxPrice?: string;
    onMinPriceChange?: (value: string) => void;
    onMaxPriceChange?: (value: string) => void;
    
    // Days to expire filters
    daysOptions?: number[];
    selectedDays?: number | null;
    onDaysSelect?: (days: number | null) => void;
    
    // Distance filters
    distanceOptions?: number[];
    selectedDistance?: number | null;
    onDistanceSelect?: (km: number | null) => void;
    
    // Clear all
    onClear?: () => void;
    hasActiveFilters?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
    isOpen,
    onToggle,
    activeFiltersCount = 0,
    minPrice,
    maxPrice,
    onMinPriceChange,
    onMaxPriceChange,
    daysOptions = [1, 3, 7, 15, 30],
    selectedDays,
    onDaysSelect,
    distanceOptions = [2, 5, 10, 15, 20],
    selectedDistance,
    onDistanceSelect,
    onClear,
    hasActiveFilters = false,
}) => {
    const height = useSharedValue(0);
    const opacity = useSharedValue(0);

    React.useEffect(() => {
        if (isOpen) {
            height.value = withSpring(1, {
                damping: 15,
                stiffness: 150,
            });
            opacity.value = withTiming(1, { duration: DesignTokens.animations.normal });
        } else {
            height.value = withTiming(0, { duration: DesignTokens.animations.normal });
            opacity.value = withTiming(0, { duration: DesignTokens.animations.fast });
        }
    }, [isOpen]);

    const animatedStyle = useAnimatedStyle(() => ({
        maxHeight: height.value === 1 ? 1000 : 0,
        opacity: opacity.value,
    }));

    const contentAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: (1 - height.value) * -20 }],
    }));

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <Animated.View style={contentAnimatedStyle}>
                <View style={styles.panel}>
                    {/* Price Filter */}
                    {(onMinPriceChange || onMaxPriceChange) && (
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Preço (R$)</Text>
                            <View style={styles.priceFilterRow}>
                                <View style={styles.priceInputWrapper}>
                                    <Text style={styles.priceInputLabel}>Mín</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder="0,00"
                                        placeholderTextColor="#9CA3AF"
                                        value={minPrice}
                                        onChangeText={onMinPriceChange}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <Text style={styles.priceSeparator}>até</Text>
                                <View style={styles.priceInputWrapper}>
                                    <Text style={styles.priceInputLabel}>Máx</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder="999,99"
                                        placeholderTextColor="#9CA3AF"
                                        value={maxPrice}
                                        onChangeText={onMaxPriceChange}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Days to Expire Filter */}
                    {onDaysSelect && (
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Vence em (dias)</Text>
                            <View style={styles.chipsRow}>
                                {daysOptions.map((days) => (
                                    <TouchableOpacity
                                        key={days}
                                        style={[
                                            styles.filterChip,
                                            selectedDays === days && styles.filterChipActive,
                                        ]}
                                        onPress={() => onDaysSelect(selectedDays === days ? null : days)}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                selectedDays === days && styles.filterChipTextActive,
                                            ]}
                                        >
                                            {days === 1 ? 'Hoje' : days === 3 ? '3 dias' : days === 7 ? '7 dias' : days === 15 ? '15 dias' : '30 dias'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Distance Filter */}
                    {onDistanceSelect && (
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Distância (km)</Text>
                            <View style={styles.chipsRow}>
                                {distanceOptions.map((km) => (
                                    <TouchableOpacity
                                        key={km}
                                        style={[
                                            styles.filterChip,
                                            selectedDistance === km && styles.filterChipActive,
                                        ]}
                                        onPress={() => onDistanceSelect(selectedDistance === km ? null : km)}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                selectedDistance === km && styles.filterChipTextActive,
                                            ]}
                                        >
                                            {km} km
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Clear Filters Button */}
                    {hasActiveFilters && onClear && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={onClear}
                        >
                            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                            <Text style={styles.clearButtonText}>Limpar Filtros</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        marginHorizontal: DesignTokens.padding.medium,
    },
    panel: {
        backgroundColor: Colors.backgroundLight,
        borderRadius: DesignTokens.borderRadius.xl,
        borderWidth: 1.5,
        borderColor: Colors.border,
        padding: 20,
        marginTop: 8,
        ...DesignTokens.shadows.md,
    },
    filterSection: {
        marginBottom: 20,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
    },
    priceFilterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    priceInputWrapper: {
        flex: 1,
    },
    priceInputLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: Colors.textMuted,
        marginBottom: 6,
    },
    priceInput: {
        backgroundColor: Colors.surfaceMuted,
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: DesignTokens.borderRadius.lg,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
        minHeight: 48,
    },
    priceSeparator: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textMuted,
        marginBottom: 14,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: DesignTokens.borderRadius.full,
        backgroundColor: Colors.surfaceMuted,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        ...DesignTokens.shadows.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    filterChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        marginTop: 4,
        backgroundColor: Colors.surfaceMuted,
        borderRadius: DesignTokens.borderRadius.lg,
    },
    clearButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textMuted,
    },
});
