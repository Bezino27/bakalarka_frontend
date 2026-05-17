export const LIGHT_COLORS = {
    background: "#F4F4F8",

    white: "#FFFFFF",
    card: "#FFFFFF",

    cardSoft: "rgba(255,255,255,0.72)",
    cardOverlay: "rgba(255,255,255,0.72)",

    text: "#111111",
    textSoft: "#333333",
    textSecondary: "#333333",

    muted: "#555555",
    textMuted: "#555555",

    mutedLight: "#777777",
    textLight: "#777777",

    border: "#E0E0E0",
    shadow: "#000000",

    primary: "#D32F2F",
    primaryDark: "#8C1919",
    primarySoft: "#FFF1F1",

    success: "#169C35",
    successSoft: "#EAF7EE",

    danger: "#E12525",
    dangerSoft: "#FFF1F1",

    warning: "#F59E0B",
    warningSoft: "#FFF7E6",

    neutral: "#333333",
    neutralSoft: "#F1F1F1",

    gray: "#555555",

    pin: "#D32F2F",
} as const;

export const DARK_COLORS = {
    background: "#101114",

    white: "#FFFFFF",
    card: "#181A1F",

    cardSoft: "rgba(24,26,31,0.82)",
    cardOverlay: "rgba(24,26,31,0.78)",

    text: "#F5F5F5",
    textSoft: "#E6E6E6",
    textSecondary: "#D0D0D0",

    muted: "#A8A8A8",
    textMuted: "#A8A8A8",

    mutedLight: "#8F8F8F",
    textLight: "#8F8F8F",

    border: "#2A2D34",
    shadow: "#000000",

    primary: "#EF5350",
    primaryDark: "#FFCDD2",
    primarySoft: "#3A1E1E",

    success: "#66BB6A",
    successSoft: "#1E3324",

    danger: "#EF5350",
    dangerSoft: "#3A1E1E",

    warning: "#FBBF24",
    warningSoft: "#3A2E12",

    neutral: "#B8B8B8",
    neutralSoft: "#24262B",

    gray: "#B8B8B8",

    pin: "#EF5350",
} as const;

export type AppThemeMode = "light" | "dark";
export type AppColors = typeof LIGHT_COLORS;

/**
 * Hlavná paleta, ktorú používajú tvoje obrazovky cez:
 * import { COLORS } from "@/constants/Colors";
 *
 * Na rýchly test dark modu prepni tento riadok:
 */
export const COLORS = LIGHT_COLORS;

// Test dark modu:
// export const COLORS = DARK_COLORS;

export const APP_THEMES = {
    light: LIGHT_COLORS,
    dark: DARK_COLORS,
} as const;

export const Colors = {
    light: {
        text: LIGHT_COLORS.text,
        background: LIGHT_COLORS.background,
        tint: LIGHT_COLORS.primary,
        icon: LIGHT_COLORS.textMuted,
        tabIconDefault: LIGHT_COLORS.textMuted,
        tabIconSelected: LIGHT_COLORS.primary,
    },
    dark: {
        text: DARK_COLORS.text,
        background: DARK_COLORS.background,
        tint: DARK_COLORS.primary,
        icon: DARK_COLORS.textMuted,
        tabIconDefault: DARK_COLORS.textMuted,
        tabIconSelected: DARK_COLORS.primary,
    },
} as const;