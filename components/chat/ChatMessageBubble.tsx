import React from 'react';
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontSize, scaledFontSize } from '@/hooks/use-font-size';

export interface ChatAttachment {
  kind: 'image';
  mimeType: string;
  dataBase64: string;
  dataUrl: string;
  name?: string;
}

export interface ChatMessageBubbleProps {
  role: 'ai' | 'user';
  text: string;
  /** AIアバター。URL文字列 or require() の画像を許容 */
  aiAvatarSrc?: string | ImageSourcePropType | null;
  attachments?: ChatAttachment[];
}

export function ChatMessageBubble({
  role,
  text,
  aiAvatarSrc,
  attachments,
}: ChatMessageBubbleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { fontScale } = useFontSize();
  const isAi = role === 'ai';

  return (
    <View style={[styles.container, isAi ? styles.aiContainer : styles.userContainer]}>
      {/* AIアバター（AI発話時のみ左端に表示） */}
      {isAi && (
        <View style={styles.avatarWrapper}>
          {aiAvatarSrc ? (
            <Image
              source={typeof aiAvatarSrc === 'string' ? { uri: aiAvatarSrc } : aiAvatarSrc}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
              <Text style={[styles.avatarText, { color: colors.mutedForeground }]}>AI</Text>
            </View>
          )}
        </View>
      )}

      {/* 吹き出し */}
      <View
        style={[
          styles.bubble,
          isAi
            ? [styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.border }]
            : [styles.userBubble, { backgroundColor: colors.primary }],
        ]}
      >
        {/* 添付画像（あれば） */}
        {attachments && attachments.length > 0 && (
          <View style={styles.attachments}>
            {attachments.map((att, idx) => (
              <Image
                key={idx}
                source={{ uri: att.dataUrl }}
                style={styles.attachmentImage}
                resizeMode="cover"
              />
            ))}
          </View>
        )}

        {/* テキスト */}
        <Text
          style={[
            styles.text,
            { fontSize: scaledFontSize(15, fontScale), lineHeight: scaledFontSize(22, fontScale) },
            isAi
              ? { color: colors.text }
              : { color: colors.primaryForeground },
          ]}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  avatarWrapper: {
    width: 32,
    height: 32,
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bubble: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    flexShrink: 1,
  },
  aiBubble: {
    borderWidth: 1,
    borderTopLeftRadius: BorderRadius.sm,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  userBubble: {
    borderTopRightRadius: BorderRadius.sm,
    maxWidth: '75%',
    alignSelf: 'flex-end',
  },
  attachments: {
    marginBottom: Spacing.sm,
  },
  attachmentImage: {
    width: '100%',
    height: 150,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});

