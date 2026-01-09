/**
 * 麹レシピアプリのテーマカラー
 * Next.js版の globals.css と同期
 */

import { Platform } from 'react-native';

// 麹アプリのプライマリカラー
const primary = '#BFAB90';
const primaryForeground = '#ffffff';

// ライトモードのベース
const lightBackground = '#F7F1E7';
const lightSurface = '#ffffff';
const lightForeground = '#1a1a1a';
const lightMuted = '#f5f5f4';
const lightMutedForeground = '#737373';
const lightBorder = '#e5e5e5';

// ダークモードのベース
const darkBackground = '#1a1a1a';
const darkSurface = '#262626';
const darkForeground = '#fafafa';
const darkMuted = '#404040';
const darkMutedForeground = '#a3a3a3';
const darkBorder = '#404040';

export const Colors = {
  light: {
    // 基本
    text: lightForeground,
    background: lightBackground,
    surface: lightSurface,
    tint: primary,
    // プライマリ
    primary,
    primaryForeground,
    // ミュート
    muted: lightMuted,
    mutedForeground: lightMutedForeground,
    // ボーダー
    border: lightBorder,
    // アイコン
    icon: lightMutedForeground,
    tabIconDefault: lightMutedForeground,
    tabIconSelected: primary,
  },
  dark: {
    // 基本
    text: darkForeground,
    background: darkBackground,
    surface: darkSurface,
    tint: primary,
    // プライマリ
    primary,
    primaryForeground,
    // ミュート
    muted: darkMuted,
    mutedForeground: darkMutedForeground,
    // ボーダー
    border: darkBorder,
    // アイコン
    icon: darkMutedForeground,
    tabIconDefault: darkMutedForeground,
    tabIconSelected: primary,
  },
};

// スペーシング（8px単位）
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

// 角丸
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// フォントサイズ
export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

// シャドウ
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
