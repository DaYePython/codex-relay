/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, Uniwind, Tamagui, Unistyles, etc.
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#F2F2F2",
    background: "#191919",
    backgroundElement: "#2A2A2A",
    backgroundSelected: "#383838",
    textSecondary: "#9A9A9A",
  },
  dark: {
    text: "#F2F2F2",
    background: "#191919",
    backgroundElement: "#2A2A2A",
    backgroundSelected: "#383838",
    textSecondary: "#9A9A9A",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  default: {
    sans: "Geist",
    sansBold: "Geist-Bold",
    sansMedium: "Geist-Medium",
    sansSemiBold: "Geist-SemiBold",
    serif: "Geist",
    rounded: "Geist",
    mono: "GeistMono",
    monoMedium: "GeistMono-Medium",
  },
  ios: {
    sans: "Geist",
    sansBold: "Geist-Bold",
    sansMedium: "Geist-Medium",
    sansSemiBold: "Geist-SemiBold",
    serif: "serif",
    rounded: "Geist",
    mono: "GeistMono",
    monoMedium: "GeistMono-Medium",
  },
  web: {
    sans: "var(--font-display)",
    sansBold: "var(--font-display-bold)",
    sansMedium: "var(--font-display-medium)",
    sansSemiBold: "var(--font-display-semibold)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
    monoMedium: "var(--font-mono-medium)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
