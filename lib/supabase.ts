import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 環境変数から取得（app.json の extra に設定するか、EAS Build時に設定）
// Next.js版と同じSupabaseプロジェクトを使用
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cykogheprysvhimwlndm.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5a29naGVwcnlzdmhpbXdsbmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MzAzMDksImV4cCI6MjA4MTIwNjMwOX0.XVEK-jFe003kGwV_kQ3CJz0Ocr0cV46vZexYONbTatU';

// SSR環境（window/localStorageがない）ではメモリストレージを使用
const isSSR = typeof window === 'undefined';

// メモリストレージ（SSR用のダミー）
const memoryStorage: Record<string, string> = {};
const noopStorage = {
  getItem: (key: string) => memoryStorage[key] || null,
  setItem: (key: string, value: string) => { memoryStorage[key] = value; },
  removeItem: (key: string) => { delete memoryStorage[key]; },
};

// クライアント用のlocalStorageラッパー（Web用）
const webStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// プラットフォームに応じたストレージを選択
const getStorage = () => {
  if (isSSR) {
    return noopStorage;
  }
  if (Platform.OS === 'web') {
    return webStorage;
  }
  // iOS/Android: AsyncStorage を使用
  return AsyncStorage;
};

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: !isSSR,
    persistSession: !isSSR,
    detectSessionInUrl: false,
  },
});

// APIベースURL
export const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'https://koji-recipe-app-c72x.vercel.app';

