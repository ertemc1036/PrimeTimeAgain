import { View } from 'react-native';

import { SelectCard } from '@/components/ui';
import { LANGUAGES, type LanguageCode } from '@/i18n/languages';
import { spacing } from '@/theme';

export function LanguageList({ value, onChange }: { value: LanguageCode; onChange: (code: LanguageCode) => void }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {LANGUAGES.map((lang) => (
        <SelectCard
          key={lang.code}
          mode="radio"
          title={lang.nativeName}
          description={lang.nativeName === lang.englishName ? undefined : lang.englishName}
          selected={value === lang.code}
          onPress={() => onChange(lang.code)}
        />
      ))}
    </View>
  );
}
