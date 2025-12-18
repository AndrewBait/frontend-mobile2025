import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';

interface Option {
    value: string;
    label: string;
}

interface SelectInputProps {
    label: string;
    value: string;
    options: Option[];
    onSelect: (value: string) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
}

export const SelectInput: React.FC<SelectInputProps> = ({
    label,
    value,
    options,
    onSelect,
    placeholder = 'Selecione...',
    error,
    required,
}) => {
    const [modalVisible, setModalVisible] = React.useState(false);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>

            <TouchableOpacity
                style={[styles.select, error && styles.selectError]}
                onPress={() => setModalVisible(true)}
            >
                <Text style={[styles.selectText, !selectedOption && styles.placeholder]}>
                    {selectedOption?.label || placeholder}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        value === item.value && styles.optionSelected,
                                    ]}
                                    onPress={() => {
                                        onSelect(item.value);
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        value === item.value && styles.optionTextSelected,
                                    ]}>
                                        {item.label}
                                    </Text>
                                    {value === item.value && (
                                        <Ionicons name="checkmark" size={20} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: DesignTokens.spacing.md,
    },
    label: {
        ...DesignTokens.typography.smallBold,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.sm,
    },
    required: {
        color: Colors.error,
    },
    select: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.inputBackground,
        borderRadius: DesignTokens.borderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        paddingHorizontal: DesignTokens.spacing.md,
        minHeight: DesignTokens.touchTargets.large,
    },
    selectError: {
        borderColor: Colors.error,
    },
    selectText: {
        ...DesignTokens.typography.body,
        color: Colors.text,
    },
    placeholder: {
        color: Colors.textMuted,
    },
    errorText: {
        ...DesignTokens.typography.caption,
        color: Colors.error,
        marginTop: DesignTokens.spacing.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        padding: DesignTokens.spacing.xl,
    },
    modalContent: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.xl,
        maxHeight: '70%',
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        ...DesignTokens.shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: DesignTokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
    },
    modalTitle: {
        ...DesignTokens.typography.h3,
        color: Colors.text,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: DesignTokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
    },
    optionSelected: {
        backgroundColor: Colors.primary15,
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
