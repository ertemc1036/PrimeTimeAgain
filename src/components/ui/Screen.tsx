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
  eyebrow?: string;
  back?: 'back' | 'close';
  headerRight?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  /** Extra bottom space for the floating tab bar. */
  inTabs?: boolean;
  children: ReactNode;
  background?: string;
  /** Presented as an iOS sheet. Defaults to true for screens with a close button. */
  modal?: boolean;
}

/** Standard screen frame: safe areas, generous padding, title block, optional sticky footer. */
export function Screen({ title, subtitle, eyebrow, back, headerRight, footer, scroll = true, inTabs, children, background = colors.background, modal = back === 'close' }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const header = (
    <>
      {back || headerRight ? (
        <View style={styles.headerRow}>
          {back ? (
            <IconButton
              icon={back === 'close' ? 'close' : 'chevron-back'}
              label={back === 'close' ? t('common.close') : t('common.back')}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          ) : (
            <View />
          )}
          {headerRight}
        </View>
      ) : null}
      {eyebrow || title || subtitle ? (
        <View style={styles.titleBlock}>
          {eyebrow ? (
            <AppText variant="label" color="secondary">
              {eyebrow}
            </AppText>
          ) : null}
          {title ? <AppText variant="title">{title}</AppText> : null}
          {subtitle ? (
            <AppText variant="body" color="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </>
  );
  const content = (
    <View style={styles.inner}>
      {header}
      {children}
    </View>
  );
  // iOS sheets start below the status bar, so the window's top inset would leave a large gap, and the
  // keyboard offset has to account for the sheet's position on screen.
  const iosSheet = Platform.OS === 'ios' && modal;
  const topPad = iosSheet ? spacing.sm : insets.top;
  const keyboardOffset = iosSheet ? insets.top + spacing.sm : 0;
  const bottomPad = footer ? spacing.lg : inTabs ? spacing.xxxl + 48 : insets.bottom + spacing.xxl;
  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: topPad, backgroundColor: background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardOffset}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]} keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, styles.flex]}>{content}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md), backgroundColor: background }]}>
          <View style={[styles.inner, styles.footerInner]}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.xs },
  inner: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  titleBlock: { gap: 6, marginTop: spacing.xs },
  footer: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  footerInner: { gap: spacing.xs },
});
