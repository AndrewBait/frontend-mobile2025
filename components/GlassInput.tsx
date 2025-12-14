import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface GlassInputProps {
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    icon: keyof typeof Ionicons.glyphMap;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    error?: string;
}

export const GlassInput: React.FC<GlassInputProps> = ({
    placeholder,
    value,
    onChangeText,
    icon,
    secureTextEntry = false,
    keyboardType = 'default',
    autoCapitalize = 'none',
    error,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <View style={styles.wrapper}>
            <View style={[
                styles.container,
                isFocused && styles.containerFocused,
                error && styles.containerError,
            ]}>
                <Ionicons
                    name={icon}
                    size={20}
                    color={isFocused ? Colors.primary : Colors.textSecondary}
                    style={styles.icon}
                />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.textMuted}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secureTextEntry && !showPassword}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                {secureTextEntry && (
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons
                            name={showPassword ? 'eye-off' : 'eye'}
                            size={20}
                            color={Colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 16,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.glass,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    containerFocused: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    containerError: {
        borderColor: Colors.error,
    },
    icon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: Colors.text,
        fontSize: 16,
        fontWeight: '400',
    },
    errorText: {
        color: Colors.error,
        fontSize: 12,
        marginTop: 6,
        marginLeft: 16,
    },
});
