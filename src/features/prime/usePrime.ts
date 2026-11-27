import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { planAction, undoMutations, type PrimeAction } from '@/domain/primeActions';
import type { CoachMessage, PrimeRecordRef } from '@/domain/types';
import { coachContext } from '@/features/coachContext';
import { askPrime, type AiError } from '@/services/ai/client';
import { useAppState } from '@/state/AppStateProvider';
import { localDateTime, newId, nowISO } from '@/utils/id';

import { describeAction } from './describe';

const nowTime = () => new Date().toTimeString().slice(0, 5);

/**
 * Prime's conversation and actions. Messages live in the synced coach history; a suggested action
 * changes nothing until `apply`, which saves all of its records in one batch together with an
 * entry in the action log, so `undo` can remove exactly those records again.
 */
export function usePrime() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, today, dispatch, getData } = useAppState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AiError | null>(null);

  const ask = useCallback(
    async (history: CoachMessage[]) => {
      setError(null);
      setBusy(true);
      const d = getData();
      const consent = d.coach.consentToContext;
      const res = await askPrime(
        history.slice(-14).map((m) => ({ role: m.role, content: m.content })),
        coachContext(d, today),
        consent ? d.memories.map((m) => ({ category: m.category, text: m.text })) : null,
        { date: today, time: nowTime() },
      );
      setBusy(false);
      if (!res.ok) return setError(res.error);
      const message: CoachMessage = {
        id: newId('cm'),
        role: 'assistant',
        content: res.data.reply.trim(),
        createdAt: nowISO(),
        ...(res.data.actions.length ? { actions: res.data.actions.map((a) => ({ ...a, status: 'pending' as const })) } : {}),
      };
      await dispatch({ type: 'addCoachMessage', message });
    },
    [getData, today, dispatch],
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim().slice(0, 1000);
      if (!content || busy) return;
      const userMsg: CoachMessage = { id: newId('cm'), role: 'user', content, createdAt: nowISO() };
      const r = await dispatch({ type: 'addCoachMessage', message: userMsg });
      if (!r.ok) return;
      await ask([...getData().coach.messages]);
    },
    [busy, dispatch, ask, getData],
  );

  const retry = useCallback(() => void ask(getData().coach.messages), [ask, getData]);

  const apply = useCallback(
    async (messageId: string, index: number, action: PrimeAction) => {
      const ctx = { today, nowTime: nowTime(), nowISO: nowISO(), newId, at: localDateTime };
      const { mutations, created } = planAction(action, ctx, t('prime.action.workoutDefault'));
      const logId = newId('pa');
      const r = await dispatch({
        type: 'batch',
        mutations: [
          ...mutations,
          { type: 'addPrimeAction', log: { id: logId, summary: describeAction(action, t).title.slice(0, 200), created, appliedAt: ctx.nowISO } },
          { type: 'setMessageAction', messageId, index, state: { status: 'applied', logId } },
        ],
      });
      if (r.ok) toast(t('prime.action.saved'), 'checkmark-circle-outline');
      else toast(r.reason === 'locked' ? t('states.locked') : r.reason === 'duplicate' ? t('prime.action.duplicate') : t('states.saveError'), 'alert-circle-outline');
      return r.ok;
    },
    [today, dispatch, toast, t],
  );

  const undo = useCallback(
    async (logId: string, messageId?: string, index?: number) => {
      const d = getData();
      const log = d.primeActions.find((a) => a.id === logId);
      if (!log || log.undoneAt) return false;
      const exists = (ref: PrimeRecordRef) => {
        switch (ref.kind) {
          case 'food':
            return d.foodLogs.some((x) => x.id === ref.id);
          case 'activity':
            return d.activityLogs.some((x) => x.id === ref.id);
          case 'water':
            return d.water.some((x) => x.id === ref.id);
          case 'weight':
            return d.weights.some((x) => x.id === ref.id);
          case 'memory':
            return d.memories.some((x) => x.id === ref.id);
          case 'rest':
            return !!d.recoveryLogs[ref.id];
        }
      };
      const r = await dispatch({
        type: 'batch',
        mutations: [
          ...undoMutations(log.created, exists),
          { type: 'markPrimeActionUndone', id: logId, at: nowISO() },
          ...(messageId !== undefined && index !== undefined ? [{ type: 'setMessageAction' as const, messageId, index, state: { status: 'undone' as const, logId } }] : []),
        ],
      });
      if (r.ok) toast(t('prime.action.undone'), 'arrow-undo-outline');
      else toast(r.reason === 'locked' ? t('prime.action.undoLocked') : t('states.saveError'), 'alert-circle-outline');
      return r.ok;
    },
    [getData, dispatch, toast, t],
  );

  const dismiss = useCallback(
    (messageId: string, index: number) => void dispatch({ type: 'setMessageAction', messageId, index, state: { status: 'dismissed' } }),
    [dispatch],
  );

  return { messages: data.coach.messages, busy, error, send, retry, apply, undo, dismiss };
}
