import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
    id: number;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    color: string;
}

const slides: OnboardingSlide[] = [
    {
        id: 1,
        icon: 'storefront',
        title: 'Ofertas Próximas de Você',
        description:
            'Encontre produtos com desconto em lojas próximas antes que vençam. Economize e evite desperdício!',
        color: Colors.primary,
    },
    {
        id: 2,
        icon: 'time',
        title: 'Validade Próxima, Preço Melhor',
        description:
            'Produtos perto do vencimento com preços especiais. Qualidade garantida, economia real.',
        color: Colors.accent,
    },
    {
        id: 3,
        icon: 'location',
        title: 'Retirada Rápida',
        description:
            'Compre online e retire na loja. Receba código de retirada após o pagamento via PIX.',
        color: Colors.success,
    },
];

const ONBOARDING_STORAGE_KEY = '@venceja:hasSeenOnboarding';

export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<any>(null);

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
            router.replace('/');
        } catch (error) {
            console.error('Erro ao salvar onboarding:', error);
            // Mesmo com erro, prosseguir para não bloquear o usuário
            router.replace('/');
        }
    };

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            const nextIndex = currentIndex + 1;
            flatListRef.current?.scrollToIndex({ index: nextIndex });
            setCurrentIndex(nextIndex);
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const renderSlide = ({ item }: { item: OnboardingSlide }) => (
        <View style={styles.slide}>
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={80} color={item.color} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
        </View>
    );

    const renderDots = () => (
        <View style={styles.dotsContainer}>
            {slides.map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.dot,
                        {
                            backgroundColor:
                                index === currentIndex ? Colors.primary : Colors.textMuted,
                            width: index === currentIndex ? 24 : 8,
                        },
                    ]}
                />
            ))}
        </View>
    );

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Skip Button */}
                {currentIndex < slides.length - 1 && (
                    <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                        <Text style={styles.skipText}>Pular</Text>
                    </TouchableOpacity>
                )}

                {/* Slides */}
                <Animated.FlatList
                    ref={flatListRef}
                    data={slides}
                    renderItem={renderSlide}
                    keyExtractor={(item) => item.id.toString()}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        {
                            useNativeDriver: false,
                            listener: (event: any) => {
                                const offsetX = event.nativeEvent.contentOffset.x;
                                const index = Math.round(offsetX / width);
                                setCurrentIndex(index);
                            },
                        }
                    )}
                    scrollEventThrottle={16}
                />

                {/* Dots Indicator */}
                {renderDots()}

                {/* Next/Finish Button */}
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>
                        {currentIndex === slides.length - 1 ? 'Começar' : 'Próximo'}
                    </Text>
                    <Ionicons
                        name={
                            currentIndex === slides.length - 1
                                ? 'checkmark-circle'
                                : 'arrow-forward'
                        }
                        size={24}
                        color="#FFFFFF"
                    />
                </TouchableOpacity>
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingBottom: 40,
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    skipText: {
        color: Colors.textMuted,
        fontSize: 16,
        fontWeight: '600',
    },
    slide: {
        width,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        transition: 'all 0.3s ease',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        marginHorizontal: 20,
        paddingVertical: 16,
        borderRadius: DesignTokens.borderRadius.xl,
        ...DesignTokens.shadows.primary,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
