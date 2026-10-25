import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import type { Mutation } from '@/domain/mutations';
import { useAppState, type DispatchResult } from '@/state/AppStateProvider';

/** Dispatch a change and give neutral feedback (success, milestone, or why it couldn't be saved). */
export function useSave() {
  const { dispatch } = useAppState();
  const toast = useToast();
  const { t } = useTranslation();
  return useCallback(
    async (mutation: Mutation, success?: string): Promise<DispatchResult> => {
      const r = await dispatch(mutation);
      if (r.ok) {
        if (success) toast(success);
        const last = r.earned[r.earned.length - 1];
        if (last) toast(t('today.milestone', { name: t(`journey.milestone.${last.id}` as 'journey.milestone.first_day') }), 'trophy-outline');
      } else if (r.reason === 'locked') toast(t('states.locked'), 'lock-closed-outline');
      else if (r.reason === 'save') toast(t('states.saveError'), 'alert-circle-outline');
      return r;
    },
    [dispatch, toast, t],
  );
}
