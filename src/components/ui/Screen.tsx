import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors, layout, spacing } from '@/theme';

import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  /** Shows a back (or close, for modals) button above the title. */
  back?: 'back' | 'close';
  headerRight?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  children: ReactNode;
  /** Inside the tab navigator the tab bar already handles the bottom safe area. */
  inTabs?: boolean;
}

/**
 * Standard screen frame: safe areas, generous padding, centred max width on tablets,
 * an optional large title and a sticky footer for primary actions.
 */
export function Screen({ title, subtitle, back, headerRight, footer, scroll = true, children, inTabs = false }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const header =
    title || back || headerRight ? (
      <View style={styles.header}>
        {back || headerRight ? (
          <View style={styles.headerRow}>
            {back ? (
              <IconButton
                icon={back === 'close' ? 'x' : 'chevron-left'}
                label={back === 'close' ? t('common.close') : t('common.back')}
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              />
            ) : (
              <View />
            )}
            {headerRight}
          </View>
        ) : null}
        {title ? <AppText variant="title">{title}</AppText> : null}
        {subtitle ? (
          <AppText variant="body" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    ) : null;

  const content = (
    <View style={styles.inner}>
      {header}
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl + (footer || inTabs ? 0 : insets.bottom) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, styles.flex]}>{content}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.inner}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md },
  inner: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.lg },
  header: { gap: spacing.xs, marginBottom: spacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
});
