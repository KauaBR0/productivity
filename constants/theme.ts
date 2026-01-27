export type Theme = {
  colors: {
    bg: string;
    surface: string;
    surfaceSoft: string;
    surfaceSoftStrong: string;
    border: string;
    text: string;
    textMuted: string;
    textDim: string;
    accent: string;
    accentDark: string;
    danger: string;
    glowPrimary: string;
    glowSecondary: string;
  };
  typography: {
    title: { fontSize: number; fontWeight: '700'; letterSpacing: number };
    sectionTitle: { fontSize: number; fontWeight: '700' };
    label: { fontSize: number; fontWeight: '700'; letterSpacing: number; textTransform: 'uppercase' };
    body: { fontSize: number; fontWeight: '600' };
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadow: {
    card: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    accent: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
};

const baseTypography: Theme['typography'] = {
  title: { fontSize: 20, fontWeight: '700', letterSpacing: 0.3 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  body: { fontSize: 16, fontWeight: '600' },
};

const baseRadius: Theme['radius'] = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
};

const createShadow = (accent: string): Theme['shadow'] => ({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 3,
  },
  accent: {
    shadowColor: accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
});

export const themes = {
  noir: {
    colors: {
      bg: '#121214',
      surface: 'rgba(22,22,26,0.95)',
      surfaceSoft: 'rgba(255,255,255,0.06)',
      surfaceSoftStrong: 'rgba(255,255,255,0.12)',
      border: 'rgba(255,255,255,0.08)',
      text: '#FFFFFF',
      textMuted: '#8A8A8F',
      textDim: '#A1A1AA',
      accent: '#E7B84A',
      accentDark: '#0B0B0D',
      danger: '#FF4545',
      glowPrimary: 'rgba(231, 184, 74, 0.18)',
      glowSecondary: 'rgba(0, 212, 255, 0.12)',
    },
    typography: baseTypography,
    radius: baseRadius,
    shadow: createShadow('#E7B84A'),
  },
  ember: {
    colors: {
      bg: '#140E0B',
      surface: 'rgba(28,18,14,0.96)',
      surfaceSoft: 'rgba(255,255,255,0.05)',
      surfaceSoftStrong: 'rgba(255,255,255,0.1)',
      border: 'rgba(255,255,255,0.1)',
      text: '#FFF7ED',
      textMuted: '#9A8F88',
      textDim: '#C1B5AD',
      accent: '#FF7A45',
      accentDark: '#0D0B0A',
      danger: '#FF5B5B',
      glowPrimary: 'rgba(255, 122, 69, 0.22)',
      glowSecondary: 'rgba(255, 186, 117, 0.12)',
    },
    typography: baseTypography,
    radius: baseRadius,
    shadow: createShadow('#FF7A45'),
  },
  sage: {
    colors: {
      bg: '#0F1411',
      surface: 'rgba(18,26,22,0.95)',
      surfaceSoft: 'rgba(255,255,255,0.05)',
      surfaceSoftStrong: 'rgba(255,255,255,0.1)',
      border: 'rgba(255,255,255,0.08)',
      text: '#F2F8F5',
      textMuted: '#8FA3A0',
      textDim: '#A8BCB8',
      accent: '#7EE081',
      accentDark: '#0A0E0B',
      danger: '#FF5B5B',
      glowPrimary: 'rgba(126, 224, 129, 0.22)',
      glowSecondary: 'rgba(110, 231, 183, 0.12)',
    },
    typography: baseTypography,
    radius: baseRadius,
    shadow: createShadow('#7EE081'),
  },
} as const satisfies Record<string, Theme>;

export type ThemeName = keyof typeof themes;

export const defaultThemeName: ThemeName = 'noir';

export const theme = themes[defaultThemeName];

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    tint: themes.noir.colors.accent,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: themes.noir.colors.accent,
  },
  dark: {
    text: themes.noir.colors.text,
    background: themes.noir.colors.bg,
    tint: themes.noir.colors.accent,
    icon: themes.noir.colors.textMuted,
    tabIconDefault: themes.noir.colors.textMuted,
    tabIconSelected: themes.noir.colors.accent,
  },
} as const;
