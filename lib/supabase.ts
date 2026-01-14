import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// 環境変数から取得（app.json の extra に設定するか、EAS Build時に設定）
// GOCHISOKOJI's Supabaseプロジェクト
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xvzwvwyjyiykdqvpxppf.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2end2d3lqeWl5a2RxdnB4cHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MzQzNDgsImV4cCI6MjA4MjMxMDM0OH0.cZAVDs_NES0SAxHb7J8uL7RqHRykqwoTPDTdcR90Bc4';

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
    // Web OAuth ではURLからのセッション復元が必要になるケースがあるため有効化
    detectSessionInUrl: !isSSR && Platform.OS === 'web',
  },
});

// APIベースURL - 本番用
export const API_BASE_URL = 'https://api.gochisokoji.com';

// ========================================
// 保留レシピ用ストレージ関数
// ログイン前に生成したレシピを一時保存し、ログイン後に復元
// ========================================

const PENDING_RECIPE_KEY = 'gochisokoji_pending_recipe';
const PENDING_RECIPE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24時間

// 保留レシピの型定義
export interface PendingRecipe {
  title: string;
  description: string;
  koji_type: string;
  difficulty: string;
  ingredients: string;  // JSON string
  steps: string;        // JSON string
  tips: string;
  calories?: string;
  salt_g?: string;
  cooking_time_min?: string;
  tags?: string;        // JSON string
  image_base64?: string;
  created_at: string;   // ISO string
}

// 保留レシピを保存
export const savePendingRecipe = async (recipe: Omit<PendingRecipe, 'created_at'>): Promise<void> => {
  const data: PendingRecipe = {
    ...recipe,
    created_at: new Date().toISOString(),
  };
  
  try {
    if (isSSR) {
      noopStorage.setItem(PENDING_RECIPE_KEY, JSON.stringify(data));
    } else if (Platform.OS === 'web') {
      webStorage.setItem(PENDING_RECIPE_KEY, JSON.stringify(data));
    } else {
      await AsyncStorage.setItem(PENDING_RECIPE_KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.error('Failed to save pending recipe:', e);
  }
};

// 保留レシピを取得（24時間以上経過したものは自動削除）
export const getPendingRecipe = async (): Promise<PendingRecipe | null> => {
  try {
    let data: string | null = null;
    
    if (isSSR) {
      data = noopStorage.getItem(PENDING_RECIPE_KEY);
    } else if (Platform.OS === 'web') {
      data = webStorage.getItem(PENDING_RECIPE_KEY);
    } else {
      data = await AsyncStorage.getItem(PENDING_RECIPE_KEY);
    }
    
    if (!data) return null;
    
    const recipe: PendingRecipe = JSON.parse(data);
    
    // 24時間以上経過していたら削除
    const createdAt = new Date(recipe.created_at).getTime();
    const elapsed = Date.now() - createdAt;
    if (elapsed > PENDING_RECIPE_EXPIRY_MS) {
      await clearPendingRecipe();
      return null;
    }
    
    return recipe;
  } catch (e) {
    console.error('Failed to get pending recipe:', e);
    return null;
  }
};

// 保留レシピをクリア
export const clearPendingRecipe = async (): Promise<void> => {
  try {
    if (isSSR) {
      noopStorage.removeItem(PENDING_RECIPE_KEY);
    } else if (Platform.OS === 'web') {
      webStorage.removeItem(PENDING_RECIPE_KEY);
    } else {
      await AsyncStorage.removeItem(PENDING_RECIPE_KEY);
    }
  } catch (e) {
    console.error('Failed to clear pending recipe:', e);
  }
};

