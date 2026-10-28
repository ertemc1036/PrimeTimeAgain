import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Chip, Screen } from '@/components/ui';
import { AvatarViewer } from '@/avatar/AvatarViewer';
import { DiagPanel } from '@/avatar/DiagPanel';
import { createDiagLog } from '@/avatar/diagnostics';
import { GLTestStage, type GLTestMode } from '@/avatar/GLTestStage';

type Step = GLTestMode | 'full';
const STEPS: Step[] = ['cube', 'model', 'touch', 'full'];

/**
 * Isolated 3D test for a real phone (Expo Go or a development build). Run the steps in order:
 * if the cube fails, nothing else can work, and the log below shows why.
 */
export default function ThreeDTest() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('cube');
  const [body, setBody] = useState<'male' | 'female'>('male');
  const [run, setRun] = useState(0);
  const [log, setLog] = useState(createDiagLog);
  const restart = (next: Partial<{ step: Step; body: 'male' | 'female' }>) => {
    if (next.step) setStep(next.step);
    if (next.body) setBody(next.body);
    setLog(createDiagLog());
    setRun((r) => r + 1);
  };
  const key = `${step}-${body}-${run}`;

  return (
    <Screen back="back" title={t('test3d.title')} subtitle={t('test3d.subtitle')}>
      <View style={styles.row}>
        {STEPS.map((s, i) => (
          <Chip key={s} label={`${i + 1}. ${t(`test3d.steps.${s}`)}`} selected={step === s} onPress={() => restart({ step: s })} />
        ))}
      </View>
      <AppText variant="caption" color="secondary">
        {t(`test3d.hints.${step}`)}
      </AppText>
      {step !== 'cube' ? (
        <View style={styles.row}>
          <Chip label={t('avatar.body.male')} selected={body === 'male'} onPress={() => restart({ body: 'male' })} />
          <Chip label={t('avatar.body.female')} selected={body === 'female'} onPress={() => restart({ body: 'female' })} />
          <Chip label={t('test3d.restart')} selected={false} onPress={() => restart({})} />
        </View>
      ) : (
        <View style={styles.row}>
          <Chip label={t('test3d.restart')} selected={false} onPress={() => restart({})} />
        </View>
      )}
      {step === 'full' ? (
        <View style={styles.full}>
          <AvatarViewer key={key} body={body} active showDiagnostics />
        </View>
      ) : (
        <>
          <GLTestStage key={key} mode={step} body={body} log={log} />
          <DiagPanel log={log} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  full: { minHeight: 900, borderRadius: 16, overflow: 'hidden' },
});
