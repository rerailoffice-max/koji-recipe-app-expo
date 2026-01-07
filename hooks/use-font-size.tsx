import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// フォントサイズの型定義
export type FontSizeKey = 'small' | 'medium' | 'large';

// フォントサイズのスケール倍率
const FONT_SCALE_MAP: Record<FontSizeKey, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.15,
};

// AsyncStorage キー
const FONT_SIZE_STORAGE_KEY = '@font_size_preference';

// コンテキストの型
interface FontSizeContextType {
  fontSize: FontSizeKey;
  fontScale: number;
  setFontSize: (size: FontSizeKey) => Promise<void>;
  isLoading: boolean;
}

// デフォルト値
const defaultContext: FontSizeContextType = {
  fontSize: 'medium',
  fontScale: 1.0,
  setFontSize: async () => {},
  isLoading: true,
};

// コンテキスト作成
const FontSizeContext = createContext<FontSizeContextType>(defaultContext);

// Provider コンポーネント
interface FontSizeProviderProps {
  children: ReactNode;
}

export function FontSizeProvider({ children }: FontSizeProviderProps) {
  const [fontSize, setFontSizeState] = useState<FontSizeKey>('medium');
  const [isLoading, setIsLoading] = useState(true);

  // 初期化時に保存された設定を読み込む
  useEffect(() => {
    const loadFontSize = async () => {
      try {
        // Web の場合は localStorage を使用
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && window.localStorage) {
            const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
            if (saved && (saved === 'small' || saved === 'medium' || saved === 'large')) {
              setFontSizeState(saved);
            }
          }
        } else {
          // Native の場合は AsyncStorage を使用
          const saved = await AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY);
          if (saved && (saved === 'small' || saved === 'medium' || saved === 'large')) {
            setFontSizeState(saved);
          }
        }
      } catch (error) {
        console.error('Failed to load font size preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFontSize();
  }, []);

  // フォントサイズを変更して保存
  const setFontSize = useCallback(async (size: FontSizeKey) => {
    try {
      // 状態を更新
      setFontSizeState(size);

      // Web の場合は localStorage を使用
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
        }
      } else {
        // Native の場合は AsyncStorage を使用
        await AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
      }

      console.log('[FontSize] Saved font size:', size);
    } catch (error) {
      console.error('Failed to save font size preference:', error);
      throw error;
    }
  }, []);

  // スケール値を計算
  const fontScale = FONT_SCALE_MAP[fontSize];

  return (
    <FontSizeContext.Provider value={{ fontSize, fontScale, setFontSize, isLoading }}>
      {children}
    </FontSizeContext.Provider>
  );
}

// フックをエクスポート
export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}

// ユーティリティ関数: スケールされたフォントサイズを計算
export function scaledFontSize(baseSize: number, scale: number): number {
  return Math.round(baseSize * scale);
}



