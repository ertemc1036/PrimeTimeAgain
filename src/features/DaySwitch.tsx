import { useTranslation } from 'react-i18next';

import { Segmented } from '@/components/ui';
import { addDays } from '@/domain/dates';
import type { ISODate } from '@/domain/types';

/** Today / Yesterday switch for late check-ins (allowed until the end of the next day). */
export function DaySwitch({ today, value, onChange }: { today: ISODate; value: ISODate; onChange: (d: ISODate) => void }) {
  const { t } = useTranslation();
  const yesterday = addDays(today, -1);
  return (
    <Segmented
      value={value === yesterday ? 'y' : 't'}
      options={[
        { value: 't', label: t('common.today') },
        { value: 'y', label: t('common.yesterday') },
      ]}
      onChange={(v) => onChange(v === 'y' ? yesterday : today)}
    />
  );
}
