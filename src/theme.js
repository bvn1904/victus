export const theme = {
  colors: {
    // Core colors - premium dark theme
    background: '#0D0D0F', 
    surface: '#1A1A1E', 
    surfaceHighlight: '#252529', 
    textPrimary: '#F5F5F7', 
    textSecondary: '#8E8E93',
    // Macro colors
    protein: '#A7F3D0', 
    carbs: '#FDE68A', 
    fats: '#FBCFE8', 
    water: '#60A5FA',
    // Brand colors - soft premium white
    accent: '#E8E8ED',
    accentWarm: '#FF9F43',
    primary: '#E8E8ED',
    border: '#333333',
    success: '#34D399',
    error: '#F87171',
    // Glow effects
    glowCyan: 'rgba(232, 232, 237, 0.1)',
    glowOrange: 'rgba(255, 159, 67, 0.15)',
  },
  spacing: { xs: 4, s: 8, m: 16, l: 24, xl: 32 },
  borderRadius: { small: 8, card: 16, button: 12, large: 24 },
  typography: {
    header: { fontSize: 28, fontWeight: '700', color: '#F5F5F7', letterSpacing: -0.5 },
    subheader: { fontSize: 20, fontWeight: '600', color: '#F5F5F7', letterSpacing: -0.3 },
    body: { fontSize: 16, color: '#8E8E93', letterSpacing: 0.1 },
    caption: { fontSize: 13, color: '#6C6C70', letterSpacing: 0.2 },
  }
};
