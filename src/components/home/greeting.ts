export type GreetingKey = 'morning' | 'afternoon' | 'evening';

export const greetingFor = (date = new Date()): GreetingKey => {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
};
