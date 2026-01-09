import React from 'react';
import {
  View,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ChatAttachment } from './ChatMessageBubble';

interface ComposerBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPressAttach: () => void;
  pendingAttachment?: ChatAttachment | null;
  onRemoveAttachment?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ComposerBar({
  value,
  onChangeText,
  onSend,
  onPressAttach,
  pendingAttachment,
  onRemoveAttachment,
  disabled,
  placeholder = '料理名やメモ（例：肉まん）',
}: ComposerBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const canSend = value.trim().length > 0 || !!pendingAttachment;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      {/* 添付プレビュー */}
      {pendingAttachment && (
        <View style={styles.attachmentPreview}>
          <View style={styles.attachmentInner}>
            <Image
              source={{ uri: pendingAttachment.dataUrl }}
              style={[styles.attachmentThumb, { borderColor: colors.border }]}
            />
            <Pressable
              onPress={onRemoveAttachment}
              style={[styles.removeButton, { backgroundColor: colors.text }]}
            >
              <IconSymbol name="xmark" size={12} color={colors.background} />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.row}>
        {/* +ボタン（添付） */}
        <Pressable
          onPress={onPressAttach}
          disabled={disabled}
          style={({ pressed }) => [
            styles.attachButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed || disabled ? 0.6 : 1,
            },
          ]}
        >
          <IconSymbol name="plus" size={20} color={colors.mutedForeground} />
        </Pressable>

        {/* テキスト入力 */}
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.text }]}
            multiline
            maxLength={500}
            editable={!disabled}
          />
        </View>

        {/* 送信ボタン */}
        <Pressable
          onPress={onSend}
          disabled={!canSend || disabled}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: colors.primary,
              opacity: (!canSend || disabled) ? 0.4 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <IconSymbol name="arrow.up" size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    ...(Platform.OS === 'ios' ? Shadows.sm : Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  attachmentPreview: {
    paddingBottom: Spacing.sm,
  },
  attachmentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  attachmentThumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    left: 42,
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});



