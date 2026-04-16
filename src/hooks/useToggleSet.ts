'use client';

import { useCallback, useState } from 'react';

export function useToggleSet(initial: string[]) {
  const [values, setValues] = useState<string[]>(initial);

  const toggle = useCallback((v: string) => {
    setValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }, []);

  const replaceAll = useCallback((next: string[]) => {
    setValues(next);
  }, []);

  const clear = useCallback(() => setValues([]), []);

  return { values, setValues: replaceAll, toggle, clear };
}
