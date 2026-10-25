let counter = 0;

/** Locally unique id (time + counter + random suffix). Not used for anything security-related. */
export function newId(prefix = 'id'): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Current timestamp as ISO string (kept outside components for the React Compiler purity rule). */
export const nowISO = () => new Date().toISOString();

/** Absolute timestamp for a local date + wall time. */
export function localDateTime(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h || 0, min || 0).toISOString();
}

export const currentHour = () => new Date().getHours();
