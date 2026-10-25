import type { SupabaseClient } from '@supabase/supabase-js';

import { SyncHttpError, type SyncTransport } from './engine';
import type { SyncRequest, SyncResponse } from './protocol';

/** Calls the `sync` Edge Function with the signed-in user's session. */
export function functionTransport(client: () => Promise<SupabaseClient | null>): SyncTransport {
  return {
    async sync(req: SyncRequest): Promise<SyncResponse> {
      const sb = await client();
      if (!sb) throw new SyncHttpError(503, 'not_configured');
      const { data, error } = await sb.functions.invoke<SyncResponse>('sync', { body: req });
      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status;
        if (typeof status === 'number') throw new SyncHttpError(status);
        throw error; // network / offline
      }
      if (!data || !Array.isArray(data.results)) throw new SyncHttpError(502, 'invalid_response');
      return data;
    },
  };
}
