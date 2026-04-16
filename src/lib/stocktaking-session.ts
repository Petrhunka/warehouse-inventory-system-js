'use client';

export interface StocktakingRecord {
  location_id: string;
  zone: string;
  product_type: string;
  location_type: string;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
  notes: string;
  worker: string;
  verified_at: number;
  date: string;
}

export interface StocktakingScope {
  zones: string[];
  product_types: string[];
  focus: 'overstock' | 'all' | 'empty';
  overstock_threshold: number;
  total_in_scope: number;
  per_zone_totals: Record<string, number>;
}

export interface WorkerPresence {
  last_active: number;
  verification_count: number;
}

export interface LiveStocktakingSession {
  scope: StocktakingScope | null;
  records: Record<string, StocktakingRecord>;
  workers: Record<string, WorkerPresence>;
  last_updated: number;
}

const STORAGE_KEY = 'stocktaking_session_v1';
const CHANNEL_NAME = 'stocktaking-session';

export function emptySession(): LiveStocktakingSession {
  return { scope: null, records: {}, workers: {}, last_updated: 0 };
}

// Cached snapshot so useSyncExternalStore gets a stable reference between
// reads. Invalidated when we observe a mutation (save, broadcast, storage
// event). Without this, React treats every render as a store change and
// loops to the max-update-depth error.
let cachedSnapshot: LiveStocktakingSession | null = null;

function readFromStorage(): LiveStocktakingSession {
  if (typeof window === 'undefined') return emptySession();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySession();
    const parsed = JSON.parse(raw) as Partial<LiveStocktakingSession>;
    return {
      scope: parsed.scope ?? null,
      records: parsed.records ?? {},
      workers: parsed.workers ?? {},
      last_updated: parsed.last_updated ?? 0,
    };
  } catch {
    return emptySession();
  }
}

export function loadSession(): LiveStocktakingSession {
  if (typeof window === 'undefined') return emptySession();
  if (cachedSnapshot === null) {
    cachedSnapshot = readFromStorage();
  }
  return cachedSnapshot;
}

export function saveSession(session: LiveStocktakingSession): void {
  if (typeof window === 'undefined') return;
  const next: LiveStocktakingSession = { ...session, last_updated: Date.now() };
  cachedSnapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return;
  }
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: 'update', last_updated: next.last_updated });
    channel.close();
  } catch {
    // BroadcastChannel unsupported; storage event still works cross-tab.
  }
}

export function subscribeToSession(
  callback: (session: LiveStocktakingSession) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    cachedSnapshot = null;
    callback(loadSession());
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handler();
  };
  window.addEventListener('storage', onStorage);

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', handler);
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener('storage', onStorage);
    if (channel) {
      channel.removeEventListener('message', handler);
      channel.close();
    }
  };
}
