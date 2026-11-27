import { Redirect } from 'expo-router';

/** Former workout screen: now the Gym tab (kept for existing links and reminders). */
export default function Workout() {
  return <Redirect href="/gym" />;
}
