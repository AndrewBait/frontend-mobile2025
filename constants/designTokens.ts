/**
 * Design Tokens - Sistema de design centralizado
 * 
 * Este arquivo contém todos os tokens de design usados no aplicativo:
 * - Espaçamentos (baseado em 8px)
 * - Tipografia
 * - Bordas e raios
 * - Sombras e elevação
 * - Durações de animação
 */

export const DesignTokens = {
  // Espaçamentos (baseado em 8px)
  spacing: {
    xs: 4,   // 0.5 * 8
    sm: 8,   // 1 * 8
    md: 16,  // 2 * 8
    lg: 24,  // 3 * 8
    xl: 32,  // 4 * 8
    xxl: 48, // 6 * 8
  },

  // Tipografia
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 32,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: 0,
    },
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
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      letterSpacing: 0.2,
    },
    captionBold: {
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
      letterSpacing: 0.2,
    },
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
  },

  // Bordas e raios
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },

  // Sombras (elevação)
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
    },
  },

  // Durações de animação (em milissegundos)
  animations: {
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 700,
  },

  // Tamanhos mínimos de toque (acessibilidade)
  touchTargets: {
    min: 44, // Mínimo recomendado para acessibilidade
    comfortable: 48,
    large: 56,
  },
};
