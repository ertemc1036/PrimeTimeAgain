import { z } from 'zod';

import { getSupabase } from '@/services/supabase/client';

/** Founders Edition counter, straight from the server. Null when unknown (offline, not set up): never guessed. */
const statusSchema = z.object({ capacity: z.number().int().min(0), taken: z.number().int().min(0), remaining: z.number().int().min(0) });
export type FounderStatus = z.infer<typeof statusSchema>;

export async function fetchFounderStatus(): Promise<FounderStatus | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.functions.invoke('founders', { method: 'GET' });
    if (error) return null;
    const parsed = statusSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
