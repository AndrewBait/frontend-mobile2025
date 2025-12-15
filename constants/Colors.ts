// Helper function to convert hex to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Helper function to add opacity to hex color (for React Native)
const addOpacity = (hex: string, opacity: number): string => {
    // Convert opacity (0-1) to hex (00-FF)
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `${hex}${alpha}`;
};

export const Colors = {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    primaryLight: '#818CF8',
    secondary: '#EC4899',
    secondaryDark: '#DB2777',
    accent: '#14B8A6',

    // Gradients
    gradientStart: '#6366F1',
    gradientMiddle: '#8B5CF6',
    gradientEnd: '#EC4899',

    // Background
    background: '#0F0F23',
    backgroundLight: '#1A1A2E',
    backgroundCard: '#16213E',

    // Text - Melhorado contraste para WCAG AA
    text: '#FFFFFF',
    textSecondary: '#B8C5D6', // Aumentado de #94A3B8 para melhor contraste
    textMuted: '#94A3B8', // Aumentado de #64748B para melhor contraste

    // Status
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',

    // Borders - Melhorado contraste
    border: '#475569', // Mais claro para melhor visibilidade
    borderLight: '#64748B', // Mais visível

    // Glass effect - Melhorado contraste
    glass: 'rgba(255, 255, 255, 0.08)', // Aumentado de 0.05 para melhor visibilidade
    glassBorder: 'rgba(255, 255, 255, 0.15)', // Aumentado de 0.1 para melhor contraste

    // Opacidades - Primary
    primary10: addOpacity('#6366F1', 0.1), // 10%
    primary15: addOpacity('#6366F1', 0.15), // 15%
    primary20: addOpacity('#6366F1', 0.2), // 20%
    primary30: addOpacity('#6366F1', 0.3), // 30%

    // Opacidades - Secondary
    secondary10: addOpacity('#EC4899', 0.1),
    secondary15: addOpacity('#EC4899', 0.15),
    secondary20: addOpacity('#EC4899', 0.2),
    secondary30: addOpacity('#EC4899', 0.3),

    // Opacidades - Success
    success10: addOpacity('#10B981', 0.1),
    success15: addOpacity('#10B981', 0.15),
    success20: addOpacity('#10B981', 0.2),
    success30: addOpacity('#10B981', 0.3),

    // Opacidades - Error
    error10: addOpacity('#EF4444', 0.1),
    error15: addOpacity('#EF4444', 0.15),
    error20: addOpacity('#EF4444', 0.2),
    error30: addOpacity('#EF4444', 0.3),

    // Opacidades - Warning
    warning10: addOpacity('#F59E0B', 0.1),
    warning15: addOpacity('#F59E0B', 0.15),
    warning20: addOpacity('#F59E0B', 0.2),
    warning30: addOpacity('#F59E0B', 0.3),

    // Estados interativos
    pressed: 'rgba(255, 255, 255, 0.1)',
    hover: 'rgba(255, 255, 255, 0.05)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.05)',

    // Gradientes pré-definidos
    gradients: {
        primary: ['#6366F1', '#8B5CF6', '#EC4899'],
        primarySimple: ['#6366F1', '#EC4899'],
        success: ['#10B981', '#059669'],
        error: ['#EF4444', '#DC2626'],
        warning: ['#F59E0B', '#D97706'],
        secondary: ['#EC4899', '#DB2777'],
    },

    // Overlay para modais
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
};
