import { Redirect } from 'expo-router';

/** Former food screen: now the Kitchen tab (kept for existing links and reminders). */
export default function Food() {
  return <Redirect href="/kitchen" />;
}
