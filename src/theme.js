export const theme = {
  colors: {
    // Core colors - premium dark theme
    background: '#0D0D0F', 
    surface: '#1A1A1E', 
    surfaceHighlight: '#252529', 
    textPrimary: '#FFFFFF', 
    textSecondary: '#8E8E93',
    // Macro colors
    protein: '#00E5CC', 
    carbs: '#FFB84D', 
    fats: '#FF7EB3', 
    water: '#00B4FF',
    // Brand colors
    accent: '#00D4FF',
    accentWarm: '#FF9F43',
    primary: '#00D4FF',
    border: '#2C2C30',
    success: '#00E676',
    error: '#FF5252',
    // Glow effects
    glowCyan: 'rgba(0, 212, 255, 0.15)',
    glowOrange: 'rgba(255, 159, 67, 0.15)',
  },
  spacing: { xs: 4, s: 8, m: 16, l: 24, xl: 32 },
  borderRadius: { small: 8, card: 16, button: 12, large: 24 },
  typography: {
    header: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
    subheader: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.3 },
    body: { fontSize: 16, color: '#8E8E93', letterSpacing: 0.1 },
    caption: { fontSize: 13, color: '#6C6C70', letterSpacing: 0.2 },
  }
};
