/**
 * VenceJá - Design System Colors
 * 
 * Paleta moderna e vibrante inspirada em apps de delivery
 * com foco em sustentabilidade e urgência de compra
 */

// Helper functions
const hexToRgba = (hex: string, opacity: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const addOpacity = (hex: string, opacity: number): string => {
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `${hex}${alpha}`;
};

// ===========================================
// NOVA PALETA - Design Moderno e Vibrante
// ===========================================

// Primary: Verde Esmeralda Vibrante (Sustentabilidade)
const PRIMARY = '#10B981';       // Emerald-500 - mais vibrante
const PRIMARY_DARK = '#059669';  // Emerald-600
const PRIMARY_LIGHT = '#6EE7B7'; // Emerald-300

// Secondary: Coral/Laranja Quente (Urgência, CTA)
const SECONDARY = '#FF6B35';     // Coral vibrante
const SECONDARY_DARK = '#E85A2A';
const SECONDARY_LIGHT = '#FF8F66';

// Accent: Roxo Moderno (Destaques especiais)
const ACCENT = '#8B5CF6';        // Violet-500
const ACCENT_DARK = '#7C3AED';
const ACCENT_LIGHT = '#A78BFA';

// Status Colors
const SUCCESS = '#22C55E';       // Green-500
const ERROR = '#EF4444';         // Red-500
const WARNING = '#F59E0B';       // Amber-500
const INFO = '#3B82F6';          // Blue-500

export const Colors = {
    // ========== BRAND COLORS ==========
    primary: PRIMARY,
    primaryDark: PRIMARY_DARK,
    primaryLight: PRIMARY_LIGHT,
    
    secondary: SECONDARY,
    secondaryDark: SECONDARY_DARK,
    secondaryLight: SECONDARY_LIGHT,
    
    accent: ACCENT,
    accentDark: ACCENT_DARK,
    accentLight: ACCENT_LIGHT,

    // ========== BACKGROUNDS ==========
    // Fundo principal - cinza muito claro para contraste
    background: '#F8FAFC',       // Slate-50
    backgroundLight: '#FFFFFF',
    backgroundDark: '#F1F5F9',   // Slate-100
    
    // Cards e surfaces
    backgroundCard: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFC',
    surfaceMuted: '#F1F5F9',
    surfaceElevated: '#FFFFFF',
    
    // Input backgrounds
    inputBackground: '#F8FAFC',
    inputBackgroundFocused: '#FFFFFF',

    // ========== TEXT COLORS ==========
    text: '#0F172A',             // Slate-900 - mais escuro
    textSecondary: '#475569',    // Slate-600
    textMuted: '#94A3B8',        // Slate-400
    textLight: '#CBD5E1',        // Slate-300
    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#FFFFFF',

    // ========== STATUS ==========
    success: SUCCESS,
    error: ERROR,
    warning: WARNING,
    info: INFO,

    // ========== BORDERS ==========
    border: '#E2E8F0',           // Slate-200
    borderLight: '#F1F5F9',      // Slate-100
    borderStrong: '#CBD5E1',     // Slate-300
    borderFocus: PRIMARY,

    // ========== GLASS EFFECTS ==========
    glass: 'rgba(255, 255, 255, 0.9)',
    glassSubtle: 'rgba(255, 255, 255, 0.7)',
    glassStrong: 'rgba(255, 255, 255, 0.95)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
    glassBorderStrong: 'rgba(255, 255, 255, 0.3)',

    // ========== OPACITY VARIANTS - Primary ==========
    primary05: addOpacity(PRIMARY, 0.05),
    primary10: addOpacity(PRIMARY, 0.1),
    primary15: addOpacity(PRIMARY, 0.15),
    primary20: addOpacity(PRIMARY, 0.2),
    primary25: addOpacity(PRIMARY, 0.25),
    primary30: addOpacity(PRIMARY, 0.3),
    primary40: addOpacity(PRIMARY, 0.4),
    primarySoft: hexToRgba(PRIMARY, 0.1),

    // ========== OPACITY VARIANTS - Secondary ==========
    secondary05: addOpacity(SECONDARY, 0.05),
    secondary10: addOpacity(SECONDARY, 0.1),
    secondary15: addOpacity(SECONDARY, 0.15),
    secondary20: addOpacity(SECONDARY, 0.2),
    secondary25: addOpacity(SECONDARY, 0.25),
    secondary30: addOpacity(SECONDARY, 0.3),
    secondary40: addOpacity(SECONDARY, 0.4),

    // ========== OPACITY VARIANTS - Success ==========
    success05: addOpacity(SUCCESS, 0.05),
    success10: addOpacity(SUCCESS, 0.1),
    success15: addOpacity(SUCCESS, 0.15),
    success20: addOpacity(SUCCESS, 0.2),
    success25: addOpacity(SUCCESS, 0.25),
    success30: addOpacity(SUCCESS, 0.3),
    success40: addOpacity(SUCCESS, 0.4),

    // ========== OPACITY VARIANTS - Error ==========
    error05: addOpacity(ERROR, 0.05),
    error10: addOpacity(ERROR, 0.1),
    error15: addOpacity(ERROR, 0.15),
    error20: addOpacity(ERROR, 0.2),
    error25: addOpacity(ERROR, 0.25),
    error30: addOpacity(ERROR, 0.3),
    error40: addOpacity(ERROR, 0.4),

    // ========== OPACITY VARIANTS - Warning ==========
    warning05: addOpacity(WARNING, 0.05),
    warning10: addOpacity(WARNING, 0.1),
    warning15: addOpacity(WARNING, 0.15),
    warning20: addOpacity(WARNING, 0.2),
    warning25: addOpacity(WARNING, 0.25),
    warning30: addOpacity(WARNING, 0.3),
    warning40: addOpacity(WARNING, 0.4),

    // ========== OPACITY VARIANTS - Accent ==========
    accent05: addOpacity(ACCENT, 0.05),
    accent10: addOpacity(ACCENT, 0.1),
    accent15: addOpacity(ACCENT, 0.15),
    accent20: addOpacity(ACCENT, 0.2),
    accent25: addOpacity(ACCENT, 0.25),
    accent30: addOpacity(ACCENT, 0.3),
    accent40: addOpacity(ACCENT, 0.4),

    // ========== INTERACTIVE STATES ==========
    pressed: 'rgba(0, 0, 0, 0.08)',
    hover: 'rgba(0, 0, 0, 0.04)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: '#F1F5F9',
    ripple: 'rgba(16, 185, 129, 0.2)',

    // ========== GRADIENTS ==========
    gradients: {
        // Gradiente principal - Verde vibrante
        primary: [PRIMARY, PRIMARY_DARK, '#047857'] as const,
        primarySimple: [PRIMARY, PRIMARY_DARK] as const,
        primarySoft: ['#ECFDF5', '#D1FAE5'] as const,
        
        // Gradiente secundário - Coral quente
        secondary: [SECONDARY, SECONDARY_DARK] as const,
        secondarySimple: ['#FF6B35', '#FF8F66'] as const,
        
        // Gradiente de destaque - Roxo
        accent: [ACCENT, ACCENT_DARK] as const,
        
        // Gradientes de status
        success: [SUCCESS, '#16A34A'] as const,
        error: [ERROR, '#DC2626'] as const,
        warning: [WARNING, '#D97706'] as const,
        
        // Gradiente hero - Para headers e banners
        hero: ['#10B981', '#059669', '#047857'] as const,
        
        // Gradiente sunset - Para promoções
        sunset: ['#FF6B35', '#F59E0B', '#FBBF24'] as const,
        
        // Background gradients
        backgroundSoft: ['#FFFFFF', '#F8FAFC'] as const,
        backgroundCard: ['#FFFFFF', '#FEFEFE'] as const,
    },

    // ========== OVERLAYS ==========
    overlay: 'rgba(15, 23, 42, 0.6)',      // Slate-900 com opacity
    overlayLight: 'rgba(15, 23, 42, 0.4)',
    overlayDark: 'rgba(15, 23, 42, 0.8)',

    // ========== SPECIAL COLORS ==========
    // Badge de desconto
    discount: '#EF4444',
    discountBackground: '#FEF2F2',
    
    // Urgência (vencendo)
    urgent: '#F59E0B',
    urgentBackground: '#FFFBEB',
    
    // Sucesso (economia)
    savings: '#10B981',
    savingsBackground: '#ECFDF5',
    
    // Favorito
    favorite: '#EF4444',
    favoriteActive: '#DC2626',

    // ========== SKELETON ==========
    skeleton: '#E2E8F0',
    skeletonHighlight: '#F1F5F9',

    // ========== TAB BAR ==========
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarActive: PRIMARY,
    tabBarInactive: '#94A3B8',

    // Gradientes de fundo
    gradientStart: PRIMARY,
    gradientMiddle: '#10B981',
    gradientEnd: PRIMARY_LIGHT,
};
