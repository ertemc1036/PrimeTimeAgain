import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui';
import type { AuthErrorCode } from '@/services/auth';

export function AuthError({ code }: { code: AuthErrorCode | null }) {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <AppText variant="bodyStrong" accessibilityLiveRegion="polite" accessibilityRole="alert">
      {t(`auth.errors.${code}`)}
    </AppText>
  );
}

/** Leave the auth flow: back to where the user came from, or to the start. */
export function closeAuth(router: { canDismiss(): boolean; dismissAll(): void; replace(href: '/'): void }) {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}
