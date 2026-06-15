import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    green50: "#f0faf4",
    green100: "#d4f1e0",
    green200: "#a8e3c1",
    green400: "#4caf82",
    green500: "#2e9466",
    green600: "#1e7a50",
    green800: "#0f4a30",
    green900: "#072a1a",

    white: "#ffffff",
    surface: "#f7faf8",
    text: "#0f2d1e",
    textSecondary: "#5a7d6b",
    border: "#cce8d8",

    background: "#f7faf8",
    backgroundElement: "#f0faf4",
    backgroundSelected: "#d4f1e0",
  },
  dark: {
    green50: "#072a1a",
    green100: "#0f4a30",
    green200: "#1e7a50",
    green400: "#2e9466",
    green500: "#4caf82",
    green600: "#a8e3c1",
    green800: "#d4f1e0",
    green900: "#f0faf4",

    white: "#0f2d1e",
    surface: "#0f4a30",
    text: "#f0faf4",
    textSecondary: "#a8e3c1",
    border: "#1e7a50",

    background: "#0f4a30",
    backgroundElement: "#1e7a50",
    backgroundSelected: "#2e9466",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
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

export const KeyboardScrollPadding = 40;
