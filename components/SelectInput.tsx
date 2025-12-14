import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

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
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    required: {
        color: Colors.error,
    },
    select: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    selectError: {
        borderColor: Colors.error,
    },
    selectText: {
        fontSize: 15,
        color: Colors.text,
    },
    placeholder: {
        color: Colors.textMuted,
    },
    errorText: {
        fontSize: 12,
        color: Colors.error,
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 20,
        maxHeight: '70%',
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
    },
    optionSelected: {
        backgroundColor: Colors.primary + '15',
    },
    optionText: {
        fontSize: 15,
        color: Colors.text,
    },
    optionTextSelected: {
        color: Colors.primary,
        fontWeight: '600',
    },
});
