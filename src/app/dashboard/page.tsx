'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  LiveStocktakingSession,
  StocktakingRecord,
  emptySession,
  loadSession,
  subscribeToSession,
} from '@/lib/stocktaking-session';

const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const RECENT_RATE_WINDOW = 10;

function subscribe(onChange: () => void) {
  return subscribeToSession(() => onChange());
}

const serverSnapshot = emptySession();
function getServerSnapshot(): LiveStocktakingSession {
  return serverSnapshot;
}

export default function DashboardPage() {
  const session = useSyncExternalStore(subscribe, loadSession, getServerSnapshot);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const records = useMemo(
    () => Object.values(session.records).sort((a, b) => a.verified_at - b.verified_at),
    [session.records],
  );
  const totalInScope = session.scope?.total_in_scope ?? 0;
  const completed = records.length;
  const remaining = Math.max(0, totalInScope - completed);
  const progress = totalInScope > 0 ? completed / totalInScope : 0;

  const etaMs = useMemo(() => {
    if (records.length < 2 || remaining === 0) return null;
    const recent = records.slice(-RECENT_RATE_WINDOW);
    const span = recent[recent.length - 1].verified_at - recent[0].verified_at;
    if (span <= 0) return null;
    const rate = (recent.length - 1) / span;
    if (rate <= 0) return null;
    return remaining / rate;
  }, [records, remaining]);

  const perZone = useMemo(() => {
    const totals = session.scope?.per_zone_totals ?? {};
    const zones = new Set<string>([
      ...Object.keys(totals),
      ...records.map((r) => r.zone),
    ]);
    return Array.from(zones)
      .sort()
      .map((zone) => {
        const done = records.filter((r) => r.zone === zone).length;
        const total = totals[zone] ?? done;
        return { zone, done, total };
      });
  }, [records, session.scope]);

  const discrepancy = useMemo(() => {
    let over = 0;
    let under = 0;
    let match = 0;
    for (const r of records) {
      if (r.difference > 0) over++;
      else if (r.difference < 0) under++;
      else match++;
    }
    const top = [...records]
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .filter((r) => r.difference !== 0)
      .slice(0, 5);
    return { over, under, match, top };
  }, [records]);

  const activeWorkers = useMemo(() => {
    const entries = Object.entries(session.workers ?? {});
    return entries
      .map(([name, info]) => ({
        name,
        last_active: info.last_active,
        verification_count: info.verification_count,
        active: now - info.last_active < ACTIVE_WINDOW_MS,
      }))
      .sort((a, b) => b.last_active - a.last_active);
  }, [session.workers, now]);

  const recentActivity = useMemo(() => records.slice().reverse().slice(0, 20), [records]);

  const lastUpdatedLabel = session.last_updated
    ? formatRelative(now - session.last_updated)
    : '—';

  const hasData = records.length > 0 || totalInScope > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-semibold">Stocktaking Dashboard</h1>
            <p className="text-xs text-slate-400">
              Live &middot; last update {lastUpdatedLabel}
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 ml-2 animate-pulse" />
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/worker" className="text-slate-300 hover:text-white underline underline-offset-2">
              Worker app
            </Link>
            <Link href="/" className="text-slate-300 hover:text-white underline underline-offset-2">
              Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <OverallProgressCard
                progress={progress}
                completed={completed}
                total={totalInScope}
                etaMs={etaMs}
              />
              <ScopeCard session={session} />
              <ActiveWorkersCard workers={activeWorkers} now={now} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ZoneProgressCard zones={perZone} />
              <DiscrepancyCard data={discrepancy} />
            </section>

            <section>
              <ActivityFeedCard records={recentActivity} now={now} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 border border-slate-800 rounded-lg bg-slate-900/50">
      <h2 className="text-lg font-semibold mb-2">No session in progress</h2>
      <p className="text-sm text-slate-400 mb-4">
        Open the worker app on this device and start verifying locations — this dashboard
        will update live.
      </p>
      <Link
        href="/worker"
        className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium"
      >
        Open worker app &rarr;
      </Link>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-900/60 border border-slate-800 rounded-lg p-4 md:p-5 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{children}</h2>;
}

function OverallProgressCard({
  progress,
  completed,
  total,
  etaMs,
}: {
  progress: number;
  completed: number;
  total: number;
  etaMs: number | null;
}) {
  const pct = Math.round(progress * 100);
  return (
    <Card className="lg:col-span-2">
      <CardTitle>Overall progress</CardTitle>
      <div className="flex items-end gap-4 mb-4">
        <div className="text-5xl md:text-6xl font-bold tabular-nums">{pct}%</div>
        <div className="text-sm text-slate-400 pb-2">
          <div>
            <span className="text-slate-100 font-semibold">{completed}</span> / {total} verified
          </div>
          <div>
            ETA: <span className="text-slate-100 font-semibold">{formatEta(etaMs)}</span>
          </div>
        </div>
      </div>
      <div className="h-3 bg-slate-800 rounded overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Card>
  );
}

function ScopeCard({ session }: { session: LiveStocktakingSession }) {
  const s = session.scope;
  return (
    <Card>
      <CardTitle>Scope</CardTitle>
      {!s ? (
        <p className="text-sm text-slate-400">Not set yet.</p>
      ) : (
        <dl className="text-sm space-y-1">
          <Row label="Focus" value={s.focus === 'overstock' ? `overstock ≥${s.overstock_threshold}` : s.focus} />
          <Row label="Zones" value={s.zones.length > 0 ? s.zones.join(', ') : '—'} />
          <Row
            label="Products"
            value={
              s.product_types.length === 0
                ? '—'
                : s.product_types.length > 3
                ? `${s.product_types.length} types`
                : s.product_types.join(', ')
            }
          />
          <Row label="Total" value={`${s.total_in_scope} locations`} />
        </dl>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-100 text-right truncate">{value}</dd>
    </div>
  );
}

function ActiveWorkersCard({
  workers,
  now,
}: {
  workers: Array<{ name: string; last_active: number; verification_count: number; active: boolean }>;
  now: number;
}) {
  return (
    <Card>
      <CardTitle>Workers</CardTitle>
      {workers.length === 0 ? (
        <p className="text-sm text-slate-400">Nobody yet.</p>
      ) : (
        <ul className="space-y-2">
          {workers.map((w) => (
            <li key={w.name} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                    w.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                  aria-label={w.active ? 'active' : 'idle'}
                />
                <span className="truncate font-medium">{w.name || '(unnamed)'}</span>
              </div>
              <div className="text-xs text-slate-400 tabular-nums flex-shrink-0">
                {w.verification_count} · {formatRelative(now - w.last_active)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ZoneProgressCard({ zones }: { zones: Array<{ zone: string; done: number; total: number }> }) {
  return (
    <Card>
      <CardTitle>Progress by zone</CardTitle>
      {zones.length === 0 ? (
        <p className="text-sm text-slate-400">No zones in scope.</p>
      ) : (
        <ul className="space-y-3">
          {zones.map((z) => {
            const pct = z.total > 0 ? (z.done / z.total) * 100 : 0;
            const complete = z.total > 0 && z.done >= z.total;
            return (
              <li key={z.zone}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">
                    Zone {z.zone}
                    {complete && <span className="ml-2 text-emerald-400">✓</span>}
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    {z.done}/{z.total} · {Math.round(pct)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      complete ? 'bg-emerald-400' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function DiscrepancyCard({
  data,
}: {
  data: { over: number; under: number; match: number; top: StocktakingRecord[] };
}) {
  return (
    <Card>
      <CardTitle>Discrepancies</CardTitle>
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <Metric label="Match" value={data.match} tone="good" />
        <Metric label="Over" value={data.over} tone="warn" />
        <Metric label="Under" value={data.under} tone="bad" />
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        Top differences
      </h3>
      {data.top.length === 0 ? (
        <p className="text-sm text-slate-400">No discrepancies yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {data.top.map((r) => (
            <li key={r.location_id} className="flex justify-between items-baseline gap-2">
              <span className="font-mono text-xs truncate">{r.location_id}</span>
              <span className="text-xs text-slate-400 truncate flex-1">{r.product_type}</span>
              <span
                className={`font-semibold tabular-nums ${
                  r.difference > 0 ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {r.difference > 0 ? '+' : ''}
                {r.difference}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'good' | 'warn' | 'bad' }) {
  const color =
    tone === 'good' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="bg-slate-800/50 rounded p-2">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
    </div>
  );
}

function ActivityFeedCard({ records, now }: { records: StocktakingRecord[]; now: number }) {
  return (
    <Card>
      <CardTitle>Activity feed</CardTitle>
      {records.length === 0 ? (
        <p className="text-sm text-slate-400">No verifications yet.</p>
      ) : (
        <ul className="divide-y divide-slate-800">
          {records.map((r) => (
            <li
              key={`${r.location_id}-${r.verified_at}`}
              className="py-2 flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{r.location_id}</span>
                  <span className="text-xs text-slate-400 truncate">{r.product_type}</span>
                </div>
                <div className="text-xs text-slate-500 truncate">
                  by <span className="text-slate-300">{r.worker || '(unnamed)'}</span>
                  {r.notes ? ` · ${r.notes}` : ''}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    r.difference === 0
                      ? 'text-emerald-400'
                      : r.difference > 0
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {r.difference === 0 ? '✓' : r.difference > 0 ? `+${r.difference}` : r.difference}
                </div>
                <div className="text-[10px] text-slate-500 tabular-nums">
                  {formatRelative(now - r.verified_at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function formatRelative(ms: number): string {
  if (ms < 0 || !Number.isFinite(ms)) return 'just now';
  if (ms < 5_000) return 'just now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

function formatEta(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return '—';
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 1) return '<1 min';
  if (totalMin < 60) return `~${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins === 0 ? `~${hours}h` : `~${hours}h ${mins}m`;
}
