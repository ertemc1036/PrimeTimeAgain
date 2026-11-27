import { Redirect, useLocalSearchParams } from 'expo-router';

/** The former AI Coach is now Prime; old links (e.g. from reminders) open the Prime tab. */
export default function Coach() {
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  return <Redirect href={topic ? { pathname: '/prime', params: { topic } } : '/prime'} />;
}
