'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Location,
  StocktakeFocus,
  StocktakeSort,
  VerifiedLocation,
} from '@/types/warehouse';
import { getWarehouseData } from '@/lib/warehouse-data';
import { downloadCsv, stocktakingToCsv } from '@/lib/utils';
import {
  LiveStocktakingSession,
  StocktakingScope,
  emptySession,
  loadSession,
  saveSession,
} from '@/lib/stocktaking-session';

export default function WorkerStocktakePage() {
  const [data, setData] = useState<Location[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const sessionRef = useRef<LiveStocktakingSession>(emptySession());

  const [stocktakingDate, setStocktakingDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [workerName, setWorkerName] = useState('');
  const [verified, setVerified] = useState<Record<string, VerifiedLocation>>({});
  const [pendingQty, setPendingQty] = useState<Record<string, number>>({});
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setData(getWarehouseData());
    const existing = loadSession();
    sessionRef.current = existing;
    const hydratedVerified: Record<string, VerifiedLocation> = {};
    for (const [locId, rec] of Object.entries(existing.records)) {
      hydratedVerified[locId] = {
        actual_quantity: rec.actual_quantity,
        notes: rec.notes,
        verification_date: rec.date,
        verified_by: rec.worker,
      };
    }
    setVerified(hydratedVerified);
    setHydrated(true);
  }, []);

  const allZones = useMemo(
    () => Array.from(new Set(data.map((l) => l.zone))).sort(),
    [data],
  );
  const allProducts = useMemo(
    () => Array.from(new Set(data.map((l) => l.product_type))).filter(Boolean).sort(),
    [data],
  );

  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [focus, setFocus] = useState<StocktakeFocus>('overstock');
  const [overstockThreshold, setOverstockThreshold] = useState(15);
  const [sortBy, setSortBy] = useState<StocktakeSort>('zone');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Seed zones/products once data loads, defaulting to first 3 for a short starter list.
  useEffect(() => {
    if (!hydrated) return;
    if (selectedZones.length === 0) setSelectedZones(allZones.slice(0, 3));
    if (selectedProducts.length === 0) setSelectedProducts(allProducts.slice(0, 3));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, allZones.length, allProducts.length]);

  const filteredData = useMemo(() => {
    let result = data.filter(
      (l) => selectedZones.includes(l.zone) && selectedProducts.includes(l.product_type),
    );
    if (focus === 'overstock') {
      result = result.filter((l) => l.quantity >= overstockThreshold);
    } else if (focus === 'empty') {
      result = result.filter((l) => l.quantity === 0);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.location_id.toLowerCase().includes(q) ||
          l.product_type.toLowerCase().includes(q) ||
          (l.product_id ?? '').toLowerCase().includes(q),
      );
    }
    switch (sortBy) {
      case 'quantity_desc':
        result = [...result].sort((a, b) => b.quantity - a.quantity);
        break;
      case 'zone':
        result = [...result].sort((a, b) => a.zone.localeCompare(b.zone));
        break;
      case 'product_type':
        result = [...result].sort((a, b) => a.product_type.localeCompare(b.product_type));
        break;
      case 'location_id':
        result = [...result].sort((a, b) => a.location_id.localeCompare(b.location_id));
        break;
    }
    return result;
  }, [data, selectedZones, selectedProducts, focus, overstockThreshold, sortBy, search]);

  const completedCount = filteredData.filter((l) => verified[l.location_id]).length;
  const totalToCheck = filteredData.length;
  const progress = totalToCheck > 0 ? completedCount / totalToCheck : 0;

  // Sync scope (filter criteria + denominators) to the session so the dashboard
  // knows the total to verify and per-zone totals.
  useEffect(() => {
    if (!hydrated) return;
    const perZoneTotals: Record<string, number> = {};
    for (const loc of filteredData) {
      perZoneTotals[loc.zone] = (perZoneTotals[loc.zone] ?? 0) + 1;
    }
    const scope: StocktakingScope = {
      zones: selectedZones,
      product_types: selectedProducts,
      focus,
      overstock_threshold: overstockThreshold,
      total_in_scope: filteredData.length,
      per_zone_totals: perZoneTotals,
    };
    const prev = sessionRef.current;
    const nextSession: LiveStocktakingSession = {
      ...prev,
      scope,
      last_updated: Date.now(),
    };
    sessionRef.current = nextSession;
    saveSession(nextSession);
  }, [hydrated, filteredData, selectedZones, selectedProducts, focus, overstockThreshold]);

  const handleVerify = (loc: Location) => {
    const qty = pendingQty[loc.location_id] ?? loc.quantity;
    const notes = pendingNotes[loc.location_id] ?? '';
    const worker = workerName.trim();
    const now = Date.now();

    setVerified((prev) => ({
      ...prev,
      [loc.location_id]: {
        actual_quantity: qty,
        notes,
        verification_date: stocktakingDate,
        verified_by: worker,
      },
    }));

    const prevSession = sessionRef.current;
    const existingWorker = prevSession.workers[worker];
    const nextSession: LiveStocktakingSession = {
      ...prevSession,
      records: {
        ...prevSession.records,
        [loc.location_id]: {
          location_id: loc.location_id,
          zone: loc.zone,
          product_type: loc.product_type,
          location_type: loc.location_type,
          system_quantity: loc.quantity,
          actual_quantity: qty,
          difference: qty - loc.quantity,
          notes,
          worker,
          verified_at: now,
          date: stocktakingDate,
        },
      },
      workers: {
        ...prevSession.workers,
        [worker]: {
          last_active: now,
          verification_count: (existingWorker?.verification_count ?? 0) + 1,
        },
      },
      last_updated: now,
    };
    sessionRef.current = nextSession;
    saveSession(nextSession);
  };

  const handleEdit = (locId: string) => {
    setVerified((prev) => {
      const next = { ...prev };
      delete next[locId];
      return next;
    });
    const prev = sessionRef.current;
    const nextRecords = { ...prev.records };
    delete nextRecords[locId];
    const nextSession: LiveStocktakingSession = {
      ...prev,
      records: nextRecords,
      last_updated: Date.now(),
    };
    sessionRef.current = nextSession;
    saveSession(nextSession);
  };

  const handleReset = () => {
    if (!confirm('Reset this stocktaking session? All verified entries will be cleared.')) return;
    setVerified({});
    setPendingQty({});
    setPendingNotes({});
    const nextSession: LiveStocktakingSession = {
      ...sessionRef.current,
      records: {},
      workers: {},
      last_updated: Date.now(),
    };
    sessionRef.current = nextSession;
    saveSession(nextSession);
  };

  const verifiedRows = useMemo(
    () =>
      Object.entries(verified)
        .map(([locId, v]) => {
          const loc = data.find((l) => l.location_id === locId);
          if (!loc) return null;
          return {
            location_id: locId,
            zone: loc.zone,
            product_type: loc.product_type,
            location_type: loc.location_type,
            system_quantity: loc.quantity,
            actual_quantity: v.actual_quantity,
            difference: v.actual_quantity - loc.quantity,
            notes: v.notes,
            verification_date: v.verification_date,
            verified_by: v.verified_by,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
    [verified, data],
  );

  const toggle = (list: string[], set: (v: string[]) => void, val: string) => {
    set(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
              aria-label="Back to admin app"
            >
              &larr; Admin
            </Link>
            <h1 className="text-base md:text-lg font-semibold truncate">Stocktaking</h1>
            <Link
              href="/dashboard"
              className="hidden sm:inline text-xs text-blue-600 hover:underline whitespace-nowrap"
            >
              Dashboard &rarr;
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="md:hidden px-3 py-2 bg-gray-100 rounded text-sm font-medium active:bg-gray-200 min-h-[44px]"
            aria-label="Open filters"
            aria-expanded={filtersOpen}
          >
            Filters
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 pb-3 max-w-5xl mx-auto">
          <div
            className="h-2 bg-gray-200 rounded overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Stocktaking progress"
          >
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            <strong>{completedCount}</strong> of <strong>{totalToCheck}</strong> verified
          </p>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-4 md:py-6 flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Filter panel: inline on desktop, drawer on mobile */}
        <FilterPanel
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          stocktakingDate={stocktakingDate}
          setStocktakingDate={setStocktakingDate}
          workerName={workerName}
          setWorkerName={setWorkerName}
          allZones={allZones}
          allProducts={allProducts}
          selectedZones={selectedZones}
          setSelectedZones={setSelectedZones}
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
          focus={focus}
          setFocus={setFocus}
          overstockThreshold={overstockThreshold}
          setOverstockThreshold={setOverstockThreshold}
          sortBy={sortBy}
          setSortBy={setSortBy}
          search={search}
          setSearch={setSearch}
          onToggle={toggle}
        />

        <main className="flex-1 min-w-0">
          {!hydrated ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : filteredData.length === 0 ? (
            <p className="text-sm text-gray-500 p-4 bg-white border rounded">
              No locations match the current filters. Tap <strong>Filters</strong> to adjust.
            </p>
          ) : (
            <ul className="space-y-3">
              {filteredData.map((loc) => (
                <LocationCard
                  key={loc.location_id}
                  loc={loc}
                  verification={verified[loc.location_id]}
                  pendingQty={pendingQty[loc.location_id]}
                  pendingNotes={pendingNotes[loc.location_id]}
                  onQtyChange={(v) =>
                    setPendingQty((prev) => ({ ...prev, [loc.location_id]: v }))
                  }
                  onNotesChange={(v) =>
                    setPendingNotes((prev) => ({ ...prev, [loc.location_id]: v }))
                  }
                  onVerify={() => handleVerify(loc)}
                  onEdit={() => handleEdit(loc.location_id)}
                  canVerify={workerName.trim().length > 0}
                />
              ))}
            </ul>
          )}

          {verifiedRows.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold mb-2">
                Results ({verifiedRows.length})
              </h2>
              <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                <table className="min-w-full text-xs border bg-white">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-2 py-1 text-left whitespace-nowrap">Location</th>
                      <th className="border px-2 py-1 text-left">Product</th>
                      <th className="border px-2 py-1 text-right">System</th>
                      <th className="border px-2 py-1 text-right">Actual</th>
                      <th className="border px-2 py-1 text-right">Diff</th>
                      <th className="border px-2 py-1 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifiedRows.map((r) => (
                      <tr key={r.location_id}>
                        <td className="border px-2 py-1 font-mono whitespace-nowrap">
                          {r.location_id}
                        </td>
                        <td className="border px-2 py-1">{r.product_type}</td>
                        <td className="border px-2 py-1 text-right">{r.system_quantity}</td>
                        <td className="border px-2 py-1 text-right">{r.actual_quantity}</td>
                        <td
                          className={`border px-2 py-1 text-right font-medium ${
                            r.difference !== 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {r.difference > 0 ? `+${r.difference}` : r.difference}
                        </td>
                        <td className="border px-2 py-1">{r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      `stocktaking_${stocktakingDate}.csv`,
                      stocktakingToCsv(verifiedRows),
                    )
                  }
                  className="w-full sm:w-auto px-4 py-3 bg-green-600 text-white rounded font-medium active:bg-green-700 min-h-[44px]"
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-4 py-3 bg-white border border-red-300 text-red-700 rounded font-medium active:bg-red-50 min-h-[44px]"
                >
                  Reset session
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

interface LocationCardProps {
  loc: Location;
  verification: VerifiedLocation | undefined;
  pendingQty: number | undefined;
  pendingNotes: string | undefined;
  onQtyChange: (v: number) => void;
  onNotesChange: (v: string) => void;
  onVerify: () => void;
  onEdit: () => void;
  canVerify: boolean;
}

function LocationCard({
  loc,
  verification,
  pendingQty,
  pendingNotes,
  onQtyChange,
  onNotesChange,
  onVerify,
  onEdit,
  canVerify,
}: LocationCardProps) {
  const isVerified = !!verification;

  return (
    <li className="bg-white border rounded-lg p-3 md:p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono font-semibold text-sm md:text-base">
              {loc.location_id}
            </span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                isVerified
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {isVerified ? 'VERIFIED' : 'PENDING'}
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Zone <strong>{loc.zone}</strong> · {loc.location_type}
          </p>
          <p className="text-xs text-gray-600">
            {loc.product_type}
            {loc.product_id ? ` · ${loc.product_id}` : ''}
          </p>
          <p className="text-xs text-gray-600">
            System qty: <strong>{loc.quantity}</strong>
          </p>
        </div>
      </div>

      {isVerified && verification ? (
        <div className="text-xs bg-green-50 border border-green-200 rounded p-2 mb-2">
          <p>
            Verified: <strong>{verification.actual_quantity}</strong> · Diff:{' '}
            <strong
              className={
                verification.actual_quantity - loc.quantity !== 0
                  ? 'text-red-600'
                  : 'text-green-700'
              }
            >
              {verification.actual_quantity - loc.quantity > 0 ? '+' : ''}
              {verification.actual_quantity - loc.quantity}
            </strong>
          </p>
          {verification.notes && <p className="mt-1">Notes: {verification.notes}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2 mb-2">
          <label className="block">
            <span className="block text-[11px] text-gray-600 mb-0.5">Actual qty</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={pendingQty ?? loc.quantity}
              onChange={(e) => onQtyChange(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-base md:text-sm min-h-[44px]"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] text-gray-600 mb-0.5">Notes (optional)</span>
            <input
              type="text"
              value={pendingNotes ?? ''}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="e.g. damaged, mislabeled"
              className="w-full border border-gray-300 rounded px-3 py-2 text-base md:text-sm min-h-[44px]"
            />
          </label>
        </div>
      )}

      <div className="flex gap-2">
        {isVerified ? (
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 px-3 py-3 bg-gray-100 text-gray-800 rounded text-sm font-medium active:bg-gray-200 min-h-[44px]"
          >
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={onVerify}
            disabled={!canVerify}
            className="flex-1 px-3 py-3 bg-blue-600 text-white rounded text-sm font-medium active:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 min-h-[44px]"
          >
            {canVerify ? 'Verify' : 'Enter worker name to verify'}
          </button>
        )}
      </div>
    </li>
  );
}

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  stocktakingDate: string;
  setStocktakingDate: (v: string) => void;
  workerName: string;
  setWorkerName: (v: string) => void;
  allZones: string[];
  allProducts: string[];
  selectedZones: string[];
  setSelectedZones: (v: string[]) => void;
  selectedProducts: string[];
  setSelectedProducts: (v: string[]) => void;
  focus: StocktakeFocus;
  setFocus: (v: StocktakeFocus) => void;
  overstockThreshold: number;
  setOverstockThreshold: (v: number) => void;
  sortBy: StocktakeSort;
  setSortBy: (v: StocktakeSort) => void;
  search: string;
  setSearch: (v: string) => void;
  onToggle: (list: string[], set: (v: string[]) => void, val: string) => void;
}

function FilterPanel(props: FilterPanelProps) {
  const {
    open,
    onClose,
    stocktakingDate,
    setStocktakingDate,
    workerName,
    setWorkerName,
    allZones,
    allProducts,
    selectedZones,
    setSelectedZones,
    selectedProducts,
    setSelectedProducts,
    focus,
    setFocus,
    overstockThreshold,
    setOverstockThreshold,
    sortBy,
    setSortBy,
    search,
    setSearch,
    onToggle,
  } = props;

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          md:w-72 md:flex-shrink-0 md:sticky md:top-[92px] md:self-start md:block
          fixed md:static inset-y-0 right-0 z-50 w-[85%] max-w-sm
          bg-white md:bg-transparent border-l md:border-0 border-gray-200
          overflow-y-auto
          transition-transform duration-200
          ${open ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
        aria-label="Filters"
        aria-hidden={!open && typeof window !== 'undefined' && window.innerWidth < 768}
      >
        <div className="flex items-center justify-between p-4 border-b md:hidden">
          <h2 className="font-semibold">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="px-3 py-2 bg-gray-100 rounded text-sm min-h-[44px]"
          >
            Done
          </button>
        </div>

        <div className="p-4 md:p-0 space-y-4 md:bg-white md:border md:rounded-lg md:p-4">
          <div>
            <label htmlFor="worker-name" className="block text-xs font-medium text-gray-700 mb-1">
              Worker name
            </label>
            <input
              id="worker-name"
              type="text"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="Required to verify"
              autoComplete="name"
              className="w-full border border-gray-300 rounded px-3 py-2 text-base md:text-sm min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="stocktake-date" className="block text-xs font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              id="stocktake-date"
              type="date"
              value={stocktakingDate}
              onChange={(e) => setStocktakingDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-base md:text-sm min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="search" className="block text-xs font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              id="search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Location, product…"
              className="w-full border border-gray-300 rounded px-3 py-2 text-base md:text-sm min-h-[44px]"
            />
          </div>

          <fieldset>
            <legend className="text-xs font-medium text-gray-700 mb-1">Focus</legend>
            <div className="space-y-1">
              {(
                [
                  ['overstock', 'Overstock'],
                  ['all', 'All'],
                  ['empty', 'Empty'],
                ] as const
              ).map(([val, label]) => (
                <label
                  key={val}
                  className="flex items-center gap-2 text-sm py-1 min-h-[32px] cursor-pointer"
                >
                  <input
                    type="radio"
                    name="focus"
                    checked={focus === val}
                    onChange={() => setFocus(val)}
                    className="w-4 h-4"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {focus === 'overstock' && (
            <div>
              <label
                htmlFor="overstock-threshold"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Overstock threshold: {overstockThreshold}
              </label>
              <input
                id="overstock-threshold"
                type="range"
                min={10}
                max={50}
                value={overstockThreshold}
                onChange={(e) => setOverstockThreshold(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          <div>
            <label htmlFor="sort-by" className="block text-xs font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as StocktakeSort)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-base md:text-sm min-h-[44px]"
            >
              <option value="zone">Zone</option>
              <option value="quantity_desc">Quantity (high to low)</option>
              <option value="product_type">Product type</option>
              <option value="location_id">Location ID</option>
            </select>
          </div>

          <FilterChecklist
            label="Zones"
            options={allZones}
            selected={selectedZones}
            onToggle={(v) => onToggle(selectedZones, setSelectedZones, v)}
            onAll={() => setSelectedZones([...allZones])}
            onClear={() => setSelectedZones([])}
          />

          <FilterChecklist
            label="Product types"
            options={allProducts}
            selected={selectedProducts}
            onToggle={(v) => onToggle(selectedProducts, setSelectedProducts, v)}
            onAll={() => setSelectedProducts([...allProducts])}
            onClear={() => setSelectedProducts([])}
          />
        </div>
      </aside>
    </>
  );
}

function FilterChecklist({
  label,
  options,
  selected,
  onToggle,
  onAll,
  onClear,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onAll: () => void;
  onClear: () => void;
}) {
  const allSelected = selected.length === options.length && options.length > 0;
  return (
    <fieldset>
      <div className="flex justify-between items-center mb-1">
        <legend className="text-xs font-medium text-gray-700">{label}</legend>
        <button
          type="button"
          onClick={allSelected ? onClear : onAll}
          aria-label={`${allSelected ? 'Clear' : 'Select all'} ${label.toLowerCase()}`}
          className="text-xs text-blue-600 hover:underline"
        >
          {allSelected ? 'Clear' : 'All'}
        </button>
      </div>
      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-1 space-y-0.5">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-2 text-sm py-1 px-1 min-h-[32px] cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
              className="w-4 h-4"
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
