import { router } from 'expo-router';
import { Linking } from 'react-native';

import { env } from '@/config/env';

/** Opens the privacy policy or terms: the hosted page when configured, otherwise the in-app text. */
export function openLegal(doc: 'privacy' | 'terms') {
  const url = doc === 'privacy' ? env.privacyPolicyUrl : env.termsUrl;
  if (url) void Linking.openURL(url);
  else router.push({ pathname: '/settings/legal', params: { doc } });
}
