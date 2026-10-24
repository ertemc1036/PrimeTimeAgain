import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { layout, spacing, ThemeProvider, useColors } from '@/theme';

import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  /** Small label above the title. */
  eyebrow?: string;
  back?: 'back' | 'close';
  headerRight?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  children: ReactNode;
  /** Inside the tab navigator the tab bar already handles the bottom safe area. */
  inTabs?: boolean;
  mode?: 'light' | 'dark';
}

/**
 * Standard screen frame: safe areas, generous padding, centred max width on tablets,
 * a bold title block and an optional sticky footer for the primary action.
 */
export function Screen(props: ScreenProps) {
  return (
    <ThemeProvider mode={props.mode ?? 'light'}>
      <ScreenBody {...props} />
    </ThemeProvider>
  );
}

function ScreenBody({ title, subtitle, eyebrow, back, headerRight, footer, scroll = true, children, inTabs = false }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useTranslation();

  const header = (
    <>
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
      {eyebrow || title || subtitle ? (
        <View style={styles.titleBlock}>
          {eyebrow ? <AppText variant="overline" color="secondary">{eyebrow}</AppText> : null}
          {title ? <AppText variant="display">{title}</AppText> : null}
          {subtitle ? <AppText variant="body" color="secondary">{subtitle}</AppText> : null}
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

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.background }]}
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
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, spacing.md), backgroundColor: colors.background, borderTopColor: colors.border },
          ]}>
          <View style={[styles.inner, styles.footerInner]}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm },
  inner: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  titleBlock: { gap: spacing.xs, marginTop: spacing.xs },
  footer: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  footerInner: { gap: spacing.xs },
});
