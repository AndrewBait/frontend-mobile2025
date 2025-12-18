/**
 * VenceJá Design Tokens
 * 
 * Sistema de design centralizado com tokens modernos
 * para consistência visual em todo o aplicativo
 */

export const DesignTokens = {
    // ===========================================
    // SPACING SYSTEM (Base 4px)
    // ===========================================
    spacing: {
        xs: 4,      // 4px - micro espaços
        sm: 8,      // 8px - pequenos gaps
        md: 16,     // 16px - padrão
        lg: 24,     // 24px - seções
        xl: 32,     // 32px - grandes seções
        xxl: 48,    // 48px - entre telas
        xxxl: 64,   // 64px - hero sections
    },

    // ===========================================
    // RESPONSIVE BREAKPOINTS
    // ===========================================
    breakpoints: {
        small: 375,   // iPhone SE
        medium: 414,  // iPhone padrão
        large: 480,   // iPhone Plus, Android grande
    },

    // ===========================================
    // RESPONSIVE PADDING
    // ===========================================
    padding: {
        small: 12,
        medium: 16,
        large: 20,
        xlarge: 24,
    },

    // ===========================================
    // TYPOGRAPHY - Hierarquia clara
    // ===========================================
    typography: {
        // Display - para números grandes e destaques
        display: {
            fontSize: 40,
            fontWeight: '800' as const,
            lineHeight: 48,
            letterSpacing: -1,
        },
        // H1 - títulos principais
        h1: {
            fontSize: 28,
            fontWeight: '700' as const,
            lineHeight: 36,
            letterSpacing: -0.5,
        },
        // H2 - subtítulos
        h2: {
            fontSize: 22,
            fontWeight: '700' as const,
            lineHeight: 28,
            letterSpacing: -0.3,
        },
        // H3 - seções
        h3: {
            fontSize: 18,
            fontWeight: '600' as const,
            lineHeight: 24,
            letterSpacing: 0,
        },
        // Body - texto principal
        body: {
            fontSize: 16,
            fontWeight: '400' as const,
            lineHeight: 24,
            letterSpacing: 0,
        },
        bodyBold: {
            fontSize: 16,
            fontWeight: '600' as const,
            lineHeight: 24,
            letterSpacing: 0,
        },
        // Small - texto secundário
        small: {
            fontSize: 14,
            fontWeight: '400' as const,
            lineHeight: 20,
            letterSpacing: 0,
        },
        smallBold: {
            fontSize: 14,
            fontWeight: '600' as const,
            lineHeight: 20,
            letterSpacing: 0,
        },
        // Caption - labels e legendas
        caption: {
            fontSize: 12,
            fontWeight: '500' as const,
            lineHeight: 16,
            letterSpacing: 0.2,
        },
        captionBold: {
            fontSize: 12,
            fontWeight: '700' as const,
            lineHeight: 16,
            letterSpacing: 0.2,
        },
        // Label - para inputs
        label: {
            fontSize: 14,
            fontWeight: '600' as const,
            lineHeight: 20,
            letterSpacing: 0,
        },
        // Tiny - para badges pequenos
        tiny: {
            fontSize: 10,
            fontWeight: '600' as const,
            lineHeight: 12,
            letterSpacing: 0.5,
        },
        // Price - para preços
        price: {
            fontSize: 24,
            fontWeight: '800' as const,
            lineHeight: 28,
            letterSpacing: -0.5,
        },
        priceSmall: {
            fontSize: 18,
            fontWeight: '700' as const,
            lineHeight: 22,
            letterSpacing: -0.3,
        },
    },

    // ===========================================
    // BORDER RADIUS
    // ===========================================
    borderRadius: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 24,
        full: 9999,
    },

    // ===========================================
    // SHADOWS - Modernos e sutis
    // ===========================================
    shadows: {
        none: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        xs: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 2,
            elevation: 1,
        },
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 8,
        },
        xl: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 12,
        },
        // Sombra colorida para botões primários
        primary: {
            shadowColor: '#10B981',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        },
        // Sombra colorida para botões secundários
        secondary: {
            shadowColor: '#FF6B35',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        },
    },

    // ===========================================
    // ANIMATIONS
    // ===========================================
    animations: {
        fast: 150,
        normal: 250,
        slow: 400,
        slower: 600,
    },

    // ===========================================
    // TOUCH TARGETS (Acessibilidade)
    // ===========================================
    touchTargets: {
        min: 44,
        comfortable: 48,
        large: 56,
    },

    // ===========================================
    // GRID SYSTEM
    // ===========================================
    grid: {
        productCard: {
            small: 1,
            medium: 2,
            large: 2,
        },
        gap: {
            small: 8,
            medium: 12,
            large: 16,
        },
    },

    // ===========================================
    // COMPONENT SIZES
    // ===========================================
    components: {
        // Buttons
        button: {
            sm: { height: 36, paddingHorizontal: 12, fontSize: 14 },
            md: { height: 44, paddingHorizontal: 16, fontSize: 15 },
            lg: { height: 52, paddingHorizontal: 24, fontSize: 16 },
            xl: { height: 56, paddingHorizontal: 28, fontSize: 17 },
        },
        // Inputs
        input: {
            height: 52,
            paddingHorizontal: 16,
            fontSize: 16,
        },
        // Cards
        card: {
            padding: 16,
            borderRadius: 16,
        },
        // Avatar
        avatar: {
            xs: 24,
            sm: 32,
            md: 40,
            lg: 56,
            xl: 80,
        },
        // Badge
        badge: {
            sm: { height: 20, paddingHorizontal: 6, fontSize: 10 },
            md: { height: 24, paddingHorizontal: 8, fontSize: 12 },
            lg: { height: 28, paddingHorizontal: 10, fontSize: 14 },
        },
        // Icon sizes
        icon: {
            xs: 16,
            sm: 20,
            md: 24,
            lg: 28,
            xl: 32,
        },
    },
};
