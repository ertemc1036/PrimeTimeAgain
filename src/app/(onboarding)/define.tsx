import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { AppText, Button, Chip, Glyph, IconButton, SelectCard, TextField } from '@/components/ui';
import { AREA_ICONS, GOAL_TEMPLATES, MAX_GOALS } from '@/domain/catalog';
import { newId } from '@/domain/plan';
import { AREAS, type AreaId } from '@/domain/types';
import { goalTemplateTitle } from '@/i18n/content';
import { radii, spacing, useColors } from '@/theme';

/** Screen 3: "What does your Prime look like?" Multi-select goals plus the user's own goals. */
export default function DefineScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { draft, update } = useOnboardingDraft();
  const [customOpen, setCustomOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customArea, setCustomArea] = useState<AreaId>('lifestyle');
  const count = draft.goalIds.length + draft.customGoals.length;
  const atMax = count >= MAX_GOALS;

  const toggle = (id: (typeof GOAL_TEMPLATES)[number]['id']) =>
    update({ goalIds: draft.goalIds.includes(id) ? draft.goalIds.filter((g) => g !== id) : [...draft.goalIds, id] });

  const addCustom = () => {
    if (!customTitle.trim()) return;
    update({ customGoals: [...draft.customGoals, { id: newId('g'), title: customTitle.trim(), area: customArea }] });
    setCustomTitle('');
    setCustomOpen(false);
  };

  const note =
    count === 0 ? t('onboarding.goals.minOne') : atMax ? t('onboarding.goals.max', { count }) : t('onboarding.goals.selected', { count });

  return (
    <OnboardingStep
      step={2}
      title={t('onboarding.goals.title')}
      subtitle={t('onboarding.goals.subtitle')}
      nextDisabled={count === 0}
      footerNote={note}
      onNext={() => router.push('/remember')}>
      <View style={styles.grid}>
        {GOAL_TEMPLATES.map((g) => {
          const selected = draft.goalIds.includes(g.id);
          return (
            <SelectCard
              key={g.id}
              layout="tile"
              glyph={g.icon}
              title={goalTemplateTitle(t, g.id)}
              badge={t(`areas.${g.area}`)}
              selected={selected}
              disabled={!selected && atMax}
              onPress={() => toggle(g.id)}
            />
          );
        })}
        {draft.customGoals.map((g) => (
          <View key={g.id} style={[styles.customTile, { backgroundColor: colors.accent }]}>
            <Glyph name={AREA_ICONS[g.area]} color={colors.onAccent} />
            <AppText variant="overline" color={colors.onAccent}>
              {t(`areas.${g.area}`)}
            </AppText>
            <AppText variant="subheading" color={colors.onAccent}>
              {g.title}
            </AppText>
            <View style={styles.remove}>
              <IconButton
                icon="x"
                variant="plain"
                color={colors.onAccent}
                label={t('onboarding.goals.customRemove', { goal: g.title })}
                onPress={() => update({ customGoals: draft.customGoals.filter((c) => c.id !== g.id) })}
              />
            </View>
          </View>
        ))}
        {!customOpen ? (
          <SelectCard
            layout="tile"
            glyph="add"
            title={goalTemplateTitle(t, 'custom')}
            selected={false}
            disabled={atMax}
            onPress={() => setCustomOpen(true)}
          />
        ) : null}
      </View>

      {customOpen ? (
        <View style={[styles.customForm, { borderColor: colors.text }]}>
          <TextField
            label={t('onboarding.goals.customTitle')}
            placeholder={t('onboarding.goals.customPlaceholder')}
            value={customTitle}
            onChangeText={setCustomTitle}
            maxLength={60}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={addCustom}
          />
          <AppText variant="label">{t('onboarding.goals.customArea')}</AppText>
          <View style={styles.chips}>
            {AREAS.map((a) => (
              <Chip key={a} mode="radio" label={t(`areas.${a}`)} selected={customArea === a} onPress={() => setCustomArea(a)} />
            ))}
          </View>
          <View style={styles.formActions}>
            <Button label={t('common.cancel')} variant="ghost" size="md" fullWidth={false} onPress={() => setCustomOpen(false)} />
            <Button label={t('onboarding.goals.customAdd')} size="md" fullWidth={false} disabled={!customTitle.trim()} onPress={addCustom} />
          </View>
        </View>
      ) : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  customTile: { flexBasis: '47%', flexGrow: 1, padding: spacing.md, borderRadius: radii.md, minHeight: 118, gap: 4 },
  remove: { position: 'absolute', top: 2, end: 2 },
  customForm: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
});
