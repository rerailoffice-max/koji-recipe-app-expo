// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * SF Symbol → Material Icons マッピング
 * - Material Icons: https://icons.expo.fyi
 * - SF Symbols: https://developer.apple.com/sf-symbols/
 */
const MAPPING: Record<string, MaterialIconName> = {
  // ナビゲーション
  'house.fill': 'home',
  'house': 'home',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.left.forwardslash.chevron.right': 'code',
  'arrow.left': 'arrow-back',
  'arrow.right': 'arrow-forward',
  'arrow.up': 'arrow-upward',
  'arrow.down': 'arrow-downward',
  'arrow.counterclockwise': 'refresh',
  
  // アクション
  'paperplane.fill': 'send',
  'paperplane': 'send',
  'plus': 'add',
  'xmark': 'close',
  'trash': 'delete',
  'pencil': 'edit',
  'square.and.pencil': 'edit-note',
  'square.and.arrow.up': 'share',
  
  // ショッピング
  'cart': 'shopping-cart',
  'cart.fill': 'shopping-cart',
  
  // メディア・画像
  'photo': 'photo',
  'photo.fill': 'photo',
  'camera': 'camera-alt',
  'camera.fill': 'camera-alt',
  
  // ユーザー・プロフィール
  'person': 'person',
  'person.fill': 'person',
  'person.circle': 'account-circle',
  'person.circle.fill': 'account-circle',
  
  // 設定・システム
  'gearshape': 'settings',
  'gearshape.fill': 'settings',
  'bell': 'notifications',
  'bell.fill': 'notifications',
  'magnifyingglass': 'search',
  
  // ステータス・シンボル
  'bookmark': 'bookmark-border',
  'bookmark.fill': 'bookmark',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'star': 'star-border',
  'star.fill': 'star',
  'checkmark': 'check',
  'checkmark.circle': 'check-circle',
  'checkmark.circle.fill': 'check-circle',
  
  // セキュリティ・認証
  'lock': 'lock',
  'lock.fill': 'lock',
  'eye': 'visibility',
  'eye.fill': 'visibility',
  'eye.slash': 'visibility-off',
  'eye.slash.fill': 'visibility-off',
  'shield': 'shield',
  'shield.fill': 'shield',
  
  // コミュニケーション
  'envelope': 'email',
  'envelope.fill': 'email',
  'message': 'message',
  'message.fill': 'message',
  
  // その他
  'leaf': 'eco',
  'leaf.fill': 'eco',
  'sparkles': 'auto-awesome',
  'thermometer': 'thermostat',
  'thermometer.medium': 'thermostat',
  'lightbulb': 'lightbulb',
  'lightbulb.fill': 'lightbulb',
  'info.circle': 'info',
  'info.circle.fill': 'info',
  'exclamationmark.triangle': 'warning',
  'exclamationmark.triangle.fill': 'warning',
  
  // ログイン・ログアウト
  'rectangle.portrait.and.arrow.right': 'logout',
  'rectangle.portrait.and.arrow.forward': 'logout',
};

export type IconSymbolName = keyof typeof MAPPING | string;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name] ?? 'help-outline'; // フォールバック
  // #region agent log
  if (!MAPPING[name]) {
    fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'icon-symbol.tsx:IconSymbol',message:'Missing icon mapping',data:{requestedName:name,fallbackUsed:iconName},timestamp:Date.now(),sessionId:'debug-session',runId:'icon-debug',hypothesisId:'A,B'})}).catch(()=>{});
  }
  // #endregion
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
