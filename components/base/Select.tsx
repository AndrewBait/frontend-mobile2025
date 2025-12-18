import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface SelectOption {
    label: string;
    value: string;
    icon?: keyof typeof Ionicons.glyphMap;
}

interface SelectProps {
    label?: string;
    placeholder?: string;
    value?: string;
    options: SelectOption[];
    onSelect: (value: string) => void;
    error?: string;
    required?: boolean;
    disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    label,
    placeholder = 'Selecione uma opção',
    value,
    options,
    onSelect,
    error,
    required = false,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const insets = useSafeAreaInsets();
    const scale = useSharedValue(1);

    const selectedOption = options.find(opt => opt.value === value);

    const handlePress = () => {
        if (disabled) return;
        scale.value = withSpring(0.97, {
            damping: 15,
            stiffness: 300,
        });
        setTimeout(() => {
            scale.value = withSpring(1);
            setIsOpen(true);
        }, 100);
    };

    const handleSelect = (optionValue: string) => {
        onSelect(optionValue);
        setIsOpen(false);
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <>
            <View style={styles.container}>
                {label && (
                    <Text style={styles.label}>
                        {label}
                        {required && <Text style={styles.required}> *</Text>}
                    </Text>
                )}
                <Animated.View style={animatedStyle}>
                    <TouchableOpacity
                        style={[
                            styles.selectButton,
                            error && styles.selectButtonError,
                            disabled && styles.selectButtonDisabled,
                        ]}
                        onPress={handlePress}
                        disabled={disabled}
                        activeOpacity={0.7}
                    >
                        <View style={styles.selectContent}>
                            {selectedOption ? (
                                <View style={styles.selectedContent}>
                                    {selectedOption.icon && (
                                        <Ionicons
                                            name={selectedOption.icon}
                                            size={20}
                                            color={Colors.text}
                                            style={styles.selectedIcon}
                                        />
                                    )}
                                    <Text style={styles.selectedText}>
                                        {selectedOption.label}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.placeholderText}>
                                    {placeholder}
                                </Text>
                            )}
                        </View>
                        <Ionicons
                            name="chevron-down"
                            size={20}
                            color={disabled ? Colors.textMuted : Colors.textSecondary}
                        />
                    </TouchableOpacity>
                </Animated.View>
                {error && (
                    <Text style={styles.errorText}>{error}</Text>
                )}
            </View>

            {/* Bottom Sheet Modal */}
            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <View
                        style={[
                            styles.bottomSheet,
                            { paddingBottom: insets.bottom + DesignTokens.spacing.md },
                        ]}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>
                                {label || 'Selecione uma opção'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setIsOpen(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.optionsList}
                            showsVerticalScrollIndicator={false}
                        >
                            {options.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.optionItem,
                                        value === option.value && styles.optionItemSelected,
                                    ]}
                                    onPress={() => handleSelect(option.value)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.optionContent}>
                                        {option.icon && (
                                            <Ionicons
                                                name={option.icon}
                                                size={20}
                                                color={
                                                    value === option.value
                                                        ? Colors.primary
                                                        : Colors.textSecondary
                                                }
                                                style={styles.optionIcon}
                                            />
                                        )}
                                        <Text
                                            style={[
                                                styles.optionText,
                                                value === option.value && styles.optionTextSelected,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </View>
                                    {value === option.value && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={24}
                                            color={Colors.primary}
                                        />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: DesignTokens.spacing.md,
    },
    label: {
        ...DesignTokens.typography.label,
        marginBottom: DesignTokens.spacing.xs + 2,
    },
    required: {
        color: Colors.error,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.inputBackground, // #F9FAFB
        borderRadius: DesignTokens.borderRadius.md, // 12px
        borderWidth: 1,
        borderColor: Colors.border, // #E5E7EB
        minHeight: 56, // 56px conforme plano
        paddingHorizontal: DesignTokens.spacing.md, // 16px
        paddingVertical: DesignTokens.spacing.md,
    },
    selectButtonError: {
        borderColor: Colors.error,
        borderWidth: 2,
    },
    selectButtonDisabled: {
        opacity: 0.6,
        backgroundColor: Colors.glass,
    },
    selectContent: {
        flex: 1,
    },
    selectedContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedIcon: {
        marginRight: DesignTokens.spacing.xs,
    },
    selectedText: {
        ...DesignTokens.typography.body,
        color: Colors.text,
    },
    placeholderText: {
        ...DesignTokens.typography.body,
        color: '#9CA3AF', // Gray-400
    },
    errorText: {
        ...DesignTokens.typography.caption,
        color: Colors.error,
        marginTop: DesignTokens.spacing.xs,
        marginLeft: DesignTokens.spacing.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: Colors.backgroundLight, // #FFFFFF
        borderTopLeftRadius: DesignTokens.borderRadius.xl,
        borderTopRightRadius: DesignTokens.borderRadius.xl,
        maxHeight: '80%',
        ...DesignTokens.shadows.lg,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: DesignTokens.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    bottomSheetTitle: {
        ...DesignTokens.typography.h3,
        color: Colors.text,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionsList: {
        maxHeight: 400,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: DesignTokens.spacing.lg,
        paddingVertical: DesignTokens.spacing.md, // 56px altura conforme plano
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        minHeight: 56,
    },
    optionItemSelected: {
        backgroundColor: '#ECFDF5', // Emerald-50
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    optionIcon: {
        marginRight: DesignTokens.spacing.sm,
    },
    optionText: {
        ...DesignTokens.typography.body,
        color: Colors.text,
    },
    optionTextSelected: {
        color: Colors.primary,
        fontWeight: '600',
    },
});
