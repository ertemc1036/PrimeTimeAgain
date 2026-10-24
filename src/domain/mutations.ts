import type { AvatarConfig } from '@/avatar/types';

import { canEditMissions } from './days';
import type {
  AppData,
  ComebackProfile,
  DayRecord,
  ISODate,
  Measurement,
  Mission,
  MissionStatus,
  Preferences,
  ProgressPhoto,
  Program,
  Reflection,
  UserGoal,
} from './types';

/**
 * Every change to user data is a Mutation. The same pure reducer updates the UI optimistically and
 * the local store; a future Supabase repository maps each mutation to its tables.
 */
export type Mutation =
  | { type: 'replaceAll'; data: AppData }
  | { type: 'ensureDay'; date: ISODate; missions: Mission[] }
  | { type: 'setMissionStatus'; date: ISODate; missionId: string; status: MissionStatus; at?: string }
  | { type: 'replaceMission'; date: ISODate; missionId: string; next: Mission }
  | { type: 'postponeMission'; date: ISODate; missionId: string; toDate: ISODate }
  | { type: 'editMission'; date: ISODate; missionId: string; patch: Partial<Pick<Mission, 'minutes' | 'title'>> }
  | { type: 'addMission'; date: ISODate; mission: Mission }
  | { type: 'setRecovery'; date: ISODate; recovery: boolean }
  | { type: 'upsertGoal'; goal: UserGoal }
  | { type: 'archiveGoal'; goalId: string }
  | { type: 'updateProgram'; patch: Partial<Pick<Program, 'durationDays' | 'dailyMinutes'>> }
  | { type: 'updateProfile'; patch: Partial<ComebackProfile> }
  | { type: 'setAvatar'; avatar: AvatarConfig }
  | { type: 'addReflection'; reflection: Reflection }
  | { type: 'deleteReflection'; id: string }
  | { type: 'addMeasurement'; measurement: Measurement }
  | { type: 'deleteMeasurement'; id: string }
  | { type: 'addPhoto'; photo: ProgressPhoto }
  | { type: 'deletePhoto'; id: string }
  | { type: 'updatePreferences'; patch: Partial<Preferences> };

const emptyDay = (date: ISODate): DayRecord => ({ date, missions: [], generated: false, recovery: false });

const updateDay = (data: AppData, date: ISODate, fn: (day: DayRecord) => DayRecord): AppData => ({
  ...data,
  days: { ...data.days, [date]: fn(data.days[date] ?? emptyDay(date)) },
});

const updateMission = (data: AppData, date: ISODate, id: string, fn: (m: Mission) => Mission): AppData =>
  updateDay(data, date, (day) => ({ ...day, missions: day.missions.map((m) => (m.id === id ? fn(m) : m)) }));

/** Mutations that change a day's missions are only allowed for today (history is protected). */
const DAY_EDITS = new Set<Mutation['type']>(['setMissionStatus', 'replaceMission', 'postponeMission', 'editMission', 'addMission']);

export function applyMutation(data: AppData, m: Mutation, today: ISODate): AppData {
  if (DAY_EDITS.has(m.type) && 'date' in m && !canEditMissions(m.date, today)) return data;

  switch (m.type) {
    case 'replaceAll':
      return m.data;
    case 'ensureDay':
      return updateDay(data, m.date, (day) =>
        day.generated ? day : { ...day, generated: true, missions: [...day.missions, ...m.missions] },
      );
    case 'setMissionStatus':
      return updateMission(data, m.date, m.missionId, (x) => ({
        ...x,
        status: m.status,
        completedAt: m.status === 'done' ? (m.at ?? new Date().toISOString()) : undefined,
      }));
    case 'replaceMission':
      return updateDay(data, m.date, (day) => ({
        ...day,
        missions: day.missions.map((x) => (x.id === m.missionId ? m.next : x)),
      }));
    case 'postponeMission': {
      const mission = data.days[m.date]?.missions.find((x) => x.id === m.missionId);
      if (!mission || mission.status === 'done') return data;
      const moved: Mission = { ...mission, id: `${m.toDate}:p:${mission.id}`, status: 'open', carriedFrom: m.date };
      const next = updateMission(data, m.date, m.missionId, (x) => ({ ...x, status: 'postponed' }));
      return updateDay(next, m.toDate, (day) =>
        day.missions.some((x) => x.id === moved.id) ? day : { ...day, missions: [...day.missions, moved] },
      );
    }
    case 'editMission':
      return updateMission(data, m.date, m.missionId, (x) => ({ ...x, ...m.patch }));
    case 'addMission':
      return updateDay(data, m.date, (day) => ({ ...day, missions: [...day.missions, m.mission] }));
    case 'setRecovery':
      if (m.date < today) return data;
      return updateDay(data, m.date, (day) => ({ ...day, recovery: m.recovery }));
    case 'upsertGoal': {
      const exists = data.goals.some((g) => g.id === m.goal.id);
      return { ...data, goals: exists ? data.goals.map((g) => (g.id === m.goal.id ? m.goal : g)) : [...data.goals, m.goal] };
    }
    case 'archiveGoal':
      return { ...data, goals: data.goals.map((g) => (g.id === m.goalId ? { ...g, archived: true } : g)) };
    case 'updateProgram':
      return data.program ? { ...data, program: { ...data.program, ...m.patch } } : data;
    case 'updateProfile':
      return data.profile ? { ...data, profile: { ...data.profile, ...m.patch } } : data;
    case 'setAvatar':
      return { ...data, avatar: m.avatar };
    case 'addReflection':
      return { ...data, reflections: [m.reflection, ...data.reflections] };
    case 'deleteReflection':
      return { ...data, reflections: data.reflections.filter((r) => r.id !== m.id) };
    case 'addMeasurement':
      return { ...data, measurements: [...data.measurements, m.measurement] };
    case 'deleteMeasurement':
      return { ...data, measurements: data.measurements.filter((x) => x.id !== m.id) };
    case 'addPhoto':
      return { ...data, photos: [...data.photos, m.photo] };
    case 'deletePhoto':
      return { ...data, photos: data.photos.filter((p) => p.id !== m.id) };
    case 'updatePreferences':
      return { ...data, preferences: { ...data.preferences, ...m.patch } };
  }
}
