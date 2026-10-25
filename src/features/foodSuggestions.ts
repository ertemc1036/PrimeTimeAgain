import { useTranslation } from 'react-i18next';

/** Quick-pick food preferences in the app language (from the locale files). */
export function useFoodSuggestions() {
  const { t } = useTranslation();
  const list = (key: 'preferred' | 'restrictions' | 'allergies') => t(`onboarding.nutrition.suggest.${key}`, { returnObjects: true }) as unknown as string[];
  return { preferred: list('preferred'), restrictions: list('restrictions'), allergies: list('allergies') };
}
