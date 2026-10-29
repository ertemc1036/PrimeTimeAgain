import { useCallback, useEffect, useState } from 'react';

import { fetchFounderStatus, type FounderStatus } from '@/services/founders';

/** Live Founders Edition counter. `status` stays null while loading or when the server can't be reached. */
export function useFounderStatus() {
  const [status, setStatus] = useState<FounderStatus | null>(null);
  useEffect(() => {
    let active = true;
    void fetchFounderStatus().then((s) => active && s && setStatus(s));
    return () => {
      active = false;
    };
  }, []);
  const reload = useCallback(async () => {
    const s = await fetchFounderStatus();
    if (s) setStatus(s);
    return s;
  }, []);
  return { status, reload };
}
