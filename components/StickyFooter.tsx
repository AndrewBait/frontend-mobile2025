import { Button } from '@/components/base/Button';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StickyFooterProps {
    total: number;
    itemsCount: number;
    buttonLabel: string;
    onButtonPress: () => void;
    buttonIcon?: keyof typeof Ionicons.glyphMap;
    buttonLoading?: boolean;
    buttonDisabled?: boolean;
    showSubtotal?: boolean;
    subtotal?: number;
    additionalInfo?: React.ReactNode;
}

export const StickyFooter: React.FC<StickyFooterProps> = ({
    total,
    itemsCount,
    buttonLabel,
    onButtonPress,
    buttonIcon,
    buttonLoading = false,
    buttonDisabled = false,
    showSubtotal = false,
    subtotal,
    additionalInfo,
}) => {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.footer,
                {
                    paddingBottom: Math.max(insets.bottom, DesignTokens.spacing.md),
                },
            ]}
        >
            <View style={styles.content}>
                {showSubtotal && subtotal !== undefined && (
                    <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>
                            Subtotal ({itemsCount} {itemsCount === 1 ? 'item' : 'itens'})
                        </Text>
                        <Text style={styles.subtotalValue}>
                            R$ {subtotal.toFixed(2).replace('.', ',')}
                        </Text>
                    </View>
                )}

                <View style={styles.totalRow}>
                    <View>
                        <Text style={styles.totalLabel}>Total</Text>
                        {itemsCount > 0 && (
                            <Text style={styles.itemsCount}>
                                {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
                            </Text>
                        )}
                    </View>
                    <Text style={styles.totalValue}>
                        R$ {total.toFixed(2).replace('.', ',')}
                    </Text>
                </View>

                {additionalInfo && (
                    <View style={styles.additionalInfo}>
                        {additionalInfo}
                    </View>
                )}

                <Button
                    title={buttonLabel}
                    onPress={onButtonPress}
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={buttonLoading}
                    disabled={buttonDisabled}
                    leftIcon={
                        buttonIcon ? (
                            <Ionicons name={buttonIcon} size={20} color="#FFFFFF" />
                        ) : undefined
                    }
                    hapticFeedback
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.backgroundLight, // #FFFFFF
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        ...DesignTokens.shadows.lg,
    },
    content: {
        paddingHorizontal: DesignTokens.spacing.lg,
        paddingTop: DesignTokens.spacing.md,
    },
    subtotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: DesignTokens.spacing.xs,
    },
    subtotalLabel: {
        ...DesignTokens.typography.caption,
        color: Colors.textSecondary,
    },
    subtotalValue: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: DesignTokens.spacing.md,
        paddingTop: DesignTokens.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    totalLabel: {
        ...DesignTokens.typography.h3,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.xs / 2,
    },
    itemsCount: {
        ...DesignTokens.typography.caption,
        color: Colors.textMuted,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.primary, // Verde = economia
        letterSpacing: -0.5,
    },
    additionalInfo: {
        marginBottom: DesignTokens.spacing.sm,
    },
});
