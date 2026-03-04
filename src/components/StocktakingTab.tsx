'use client';

import { useState, useMemo } from 'react';
import { Location, StocktakeFocus, StocktakeSort, VerifiedLocation } from '@/types/warehouse';
import { downloadCsv, stocktakingToCsv } from '@/lib/utils';

interface Props {
  data: Location[];
}

export default function StocktakingTab({ data }: Props) {
  const [stocktakingDate, setStocktakingDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [workerName, setWorkerName] = useState('');
  const [verified, setVerified] = useState<Record<string, VerifiedLocation>>({});
  const [pendingQty, setPendingQty] = useState<Record<string, number>>({});
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({});

  // filters
  const allZones = useMemo(
    () => Array.from(new Set(data.map((l) => l.zone))).sort(),
    [data],
  );
  const allProducts = useMemo(
    () =>
      Array.from(new Set(data.map((l) => l.product_type)))
        .filter(Boolean)
        .sort(),
    [data],
  );

  const [selectedZones, setSelectedZones] = useState<string[]>(() =>
    allZones.slice(0, 3),
  );
  const [selectedProducts, setSelectedProducts] = useState<string[]>(() =>
    allProducts.slice(0, 3),
  );
  const [focus, setFocus] = useState<StocktakeFocus>('overstock');
  const [overstockThreshold, setOverstockThreshold] = useState(15);
  const [sortBy, setSortBy] = useState<StocktakeSort>('zone');

  const filteredData = useMemo(() => {
    let result = data.filter(
      (l) => selectedZones.includes(l.zone) && selectedProducts.includes(l.product_type),
    );
    if (focus === 'overstock') {
      result = result.filter((l) => l.quantity >= overstockThreshold);
    } else if (focus === 'empty') {
      result = result.filter((l) => l.quantity === 0);
    }
    switch (sortBy) {
      case 'quantity_desc':
        result.sort((a, b) => b.quantity - a.quantity);
        break;
      case 'zone':
        result.sort((a, b) => a.zone.localeCompare(b.zone));
        break;
      case 'product_type':
        result.sort((a, b) => a.product_type.localeCompare(b.product_type));
        break;
      case 'location_id':
        result.sort((a, b) => a.location_id.localeCompare(b.location_id));
        break;
    }
    return result;
  }, [data, selectedZones, selectedProducts, focus, overstockThreshold, sortBy]);

  const completedCount = filteredData.filter((l) => verified[l.location_id]).length;
  const totalToCheck = filteredData.length;
  const progress = totalToCheck > 0 ? completedCount / totalToCheck : 0;

  const handleVerify = (loc: Location) => {
    const qty = pendingQty[loc.location_id] ?? loc.quantity;
    const notes = pendingNotes[loc.location_id] ?? '';
    setVerified((prev) => ({
      ...prev,
      [loc.location_id]: {
        actual_quantity: qty,
        notes,
        verification_date: stocktakingDate,
        verified_by: workerName,
      },
    }));
  };

  const handleEdit = (locId: string) => {
    setVerified((prev) => {
      const next = { ...prev };
      delete next[locId];
      return next;
    });
  };

  const handleReset = () => {
    setVerified({});
    setPendingQty({});
    setPendingNotes({});
  };

  const verifiedRows = useMemo(() => {
    return Object.entries(verified)
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
      .filter(Boolean) as Array<{
      location_id: string;
      zone: string;
      product_type: string;
      location_type: string;
      system_quantity: number;
      actual_quantity: number;
      difference: number;
      notes: string;
      verification_date: string;
      verified_by: string;
    }>;
  }, [verified, data]);

  const toggleZone = (z: string) => {
    setSelectedZones((prev) =>
      prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z],
    );
  };

  const toggleProduct = (p: string) => {
    setSelectedProducts((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Efficiently check and verify inventory levels, particularly focusing on locations with
        potential overstock or discrepancies.
      </p>

      {/* Session */}
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Stocktaking Date</label>
          <input
            type="date"
            value={stocktakingDate}
            onChange={(e) => setStocktakingDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Worker Name</label>
          <input
            type="text"
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            placeholder="Enter name"
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        {/* Filters */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Stocktaking Filters</h3>

          <div>
            <span className="text-xs font-medium text-gray-700">Zones to Check</span>
            <div className="max-h-28 overflow-y-auto border border-gray-200 rounded p-1 mt-1 space-y-0.5">
              {allZones.map((z) => (
                <label key={z} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedZones.includes(z)}
                    onChange={() => toggleZone(z)}
                  />
                  {z}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-gray-700">Product Types</span>
            <div className="max-h-28 overflow-y-auto border border-gray-200 rounded p-1 mt-1 space-y-0.5">
              {allProducts.map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(p)}
                    onChange={() => toggleProduct(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-gray-700">Focus On</span>
            <div className="space-y-1 mt-1">
              {(
                [
                  ['overstock', 'Overstock Locations'],
                  ['all', 'All Locations'],
                  ['empty', 'Empty Locations'],
                ] as const
              ).map(([val, label]) => (
                <label key={val} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    name="focus"
                    checked={focus === val}
                    onChange={() => setFocus(val)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {focus === 'overstock' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Overstock Threshold: {overstockThreshold}
              </label>
              <input
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as StocktakeSort)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value="zone">Zone</option>
              <option value="quantity_desc">Quantity (High to Low)</option>
              <option value="product_type">Product Type</option>
              <option value="location_id">Location ID</option>
            </select>
          </div>
        </div>

        {/* Stocktaking List */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Stocktaking Task</h3>

          {/* Progress */}
          <div className="mb-3">
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">
              <strong>{completedCount}</strong> of <strong>{totalToCheck}</strong> locations
              verified
            </p>
          </div>

          <h4 className="text-sm font-semibold mb-2">
            Locations to Check ({totalToCheck})
          </h4>

          {filteredData.length === 0 ? (
            <p className="text-sm text-gray-500">
              No locations match the current criteria. Adjust your filters.
            </p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredData.map((loc) => {
                const isVerified = !!verified[loc.location_id];
                const v = verified[loc.location_id];
                return (
                  <div
                    key={loc.location_id}
                    className="border rounded p-3 flex gap-3 items-start"
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-medium text-sm">
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
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div>
                          Zone: {loc.zone} &bull; Type: {loc.location_type}
                        </div>
                        <div>Product: {loc.product_type}</div>
                        <div>System Quantity: {loc.quantity}</div>
                      </div>
                    </div>

                    {/* Verification form or result */}
                    <div className="w-48 flex-shrink-0">
                      {isVerified && v ? (
                        <div className="text-xs space-y-0.5">
                          <div>
                            Verified Qty: <strong>{v.actual_quantity}</strong>
                          </div>
                          <div>
                            Difference:{' '}
                            <strong
                              className={
                                v.actual_quantity - loc.quantity !== 0
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }
                            >
                              {v.actual_quantity - loc.quantity}
                            </strong>
                          </div>
                          {v.notes && <div>Notes: {v.notes}</div>}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="number"
                            min={0}
                            value={pendingQty[loc.location_id] ?? loc.quantity}
                            onChange={(e) =>
                              setPendingQty((prev) => ({
                                ...prev,
                                [loc.location_id]: Number(e.target.value),
                              }))
                            }
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                            placeholder="Actual qty"
                          />
                          <input
                            type="text"
                            value={pendingNotes[loc.location_id] ?? ''}
                            onChange={(e) =>
                              setPendingNotes((prev) => ({
                                ...prev,
                                [loc.location_id]: e.target.value,
                              }))
                            }
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                            placeholder="Notes"
                          />
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0">
                      {isVerified ? (
                        <button
                          onClick={() => handleEdit(loc.location_id)}
                          className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerify(loc)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Results */}
          {verifiedRows.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Stocktaking Results</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-2 py-1 text-left">Location</th>
                      <th className="border px-2 py-1 text-left">Zone</th>
                      <th className="border px-2 py-1 text-left">Product</th>
                      <th className="border px-2 py-1 text-right">System Qty</th>
                      <th className="border px-2 py-1 text-right">Actual Qty</th>
                      <th className="border px-2 py-1 text-right">Diff</th>
                      <th className="border px-2 py-1 text-left">Notes</th>
                      <th className="border px-2 py-1 text-left">Date</th>
                      <th className="border px-2 py-1 text-left">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifiedRows.map((r) => (
                      <tr key={r.location_id}>
                        <td className="border px-2 py-1">{r.location_id}</td>
                        <td className="border px-2 py-1">{r.zone}</td>
                        <td className="border px-2 py-1">{r.product_type}</td>
                        <td className="border px-2 py-1 text-right">{r.system_quantity}</td>
                        <td className="border px-2 py-1 text-right">{r.actual_quantity}</td>
                        <td
                          className={`border px-2 py-1 text-right font-medium ${
                            r.difference !== 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {r.difference}
                        </td>
                        <td className="border px-2 py-1">{r.notes}</td>
                        <td className="border px-2 py-1">{r.verification_date}</td>
                        <td className="border px-2 py-1">{r.verified_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-3">
                <button
                  onClick={() =>
                    downloadCsv(
                      `stocktaking_results_${stocktakingDate}.csv`,
                      stocktakingToCsv(verifiedRows),
                    )
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                >
                  Download Stocktaking Results
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                >
                  Reset Stocktaking Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
