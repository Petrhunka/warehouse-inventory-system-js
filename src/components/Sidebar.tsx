'use client';

import { useId } from 'react';
import { computeZoneStats } from '@/lib/utils';
import { useVizControls } from './VizControlsContext';

interface Props {
  onRegenerate: () => void;
}

export default function Sidebar({ onRegenerate }: Props) {
  const {
    allZones,
    allProductTypes,
    maxStock,
    selectedZones,
    setSelectedZones,
    selectedProducts,
    setSelectedProducts,
    stockRange,
    setStockRange,
    vizType,
    setVizType,
    highlightUnderstock,
    setHighlightUnderstock,
    highlightOverstock,
    setHighlightOverstock,
    understockThreshold,
    setUnderstockThreshold,
    overstockThreshold,
    setOverstockThreshold,
    filteredData,
  } = useVizControls();

  const understockId = useId();
  const overstockId = useId();
  const stockMinId = useId();
  const stockMaxId = useId();

  const totalLocations = filteredData.length;
  const filledLocations = filteredData.filter((l) => l.quantity > 0).length;
  const emptyLocations = totalLocations - filledLocations;
  const totalStock = filteredData.reduce((s, l) => s + l.quantity, 0);
  const zoneStats = computeZoneStats(filteredData);

  const toggle = (list: string[], set: (v: string[]) => void, val: string) => {
    set(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  return (
    <aside className="w-72 min-w-[18rem] bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto text-sm flex-shrink-0">
      <button
        onClick={onRegenerate}
        className="w-full mb-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
      >
        Regenerate Warehouse Data
      </button>

      <h3 className="font-semibold mb-2">Visualization Type</h3>
      <div className="flex gap-2 mb-4" role="group" aria-label="Visualization type">
        <button
          type="button"
          onClick={() => setVizType('3d')}
          aria-pressed={vizType === '3d'}
          className={`flex-1 px-2 py-1 rounded text-xs font-medium ${
            vizType === '3d' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          3D Plotly
        </button>
        <button
          type="button"
          onClick={() => setVizType('2d')}
          aria-pressed={vizType === '2d'}
          className={`flex-1 px-2 py-1 rounded text-xs font-medium ${
            vizType === '2d' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          2D Map
        </button>
      </div>

      <h3 className="font-semibold mb-2">Highlight Options</h3>
      <div className="space-y-2 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={highlightUnderstock}
            onChange={(e) => setHighlightUnderstock(e.target.checked)}
          />
          Highlight Understock
        </label>
        {highlightUnderstock && (
          <div className="ml-5">
            <label htmlFor={understockId} className="block text-xs text-gray-600 mb-1">
              Threshold: {understockThreshold}
            </label>
            <input
              id={understockId}
              type="range"
              min={1}
              max={10}
              value={understockThreshold}
              onChange={(e) => setUnderstockThreshold(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={highlightOverstock}
            onChange={(e) => setHighlightOverstock(e.target.checked)}
          />
          Highlight Overstock
        </label>
        {highlightOverstock && (
          <div className="ml-5">
            <label htmlFor={overstockId} className="block text-xs text-gray-600 mb-1">
              Threshold: {overstockThreshold}
            </label>
            <input
              id={overstockId}
              type="range"
              min={10}
              max={50}
              value={overstockThreshold}
              onChange={(e) => setOverstockThreshold(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}
        {(highlightUnderstock || highlightOverstock) && (
          <div className="text-xs bg-blue-50 p-2 rounded">
            {highlightUnderstock && (
              <span className="text-red-600 font-medium">
                Red = Understock (0 &lt; qty &le; {understockThreshold})
              </span>
            )}
            {highlightUnderstock && highlightOverstock && <br />}
            {highlightOverstock && (
              <span className="text-yellow-600 font-medium">
                Gold = Overstock (qty &ge; {overstockThreshold})
              </span>
            )}
          </div>
        )}
      </div>

      <h3 className="font-semibold mb-2">Filters</h3>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-gray-700">Zones</span>
          <button
            type="button"
            aria-label={
              selectedZones.length === allZones.length ? 'Clear all zones' : 'Select all zones'
            }
            onClick={() =>
              setSelectedZones(selectedZones.length === allZones.length ? [] : [...allZones])
            }
            className="text-xs text-blue-600 hover:underline"
          >
            {selectedZones.length === allZones.length ? 'Clear' : 'All'}
          </button>
        </div>
        <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-1 space-y-0.5">
          {allZones.map((z) => (
            <label key={z} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={selectedZones.includes(z)}
                onChange={() => toggle(selectedZones, setSelectedZones, z)}
              />
              {z}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-gray-700">Product Types</span>
          <button
            type="button"
            aria-label={
              selectedProducts.length === allProductTypes.length
                ? 'Clear all product types'
                : 'Select all product types'
            }
            onClick={() =>
              setSelectedProducts(
                selectedProducts.length === allProductTypes.length ? [] : [...allProductTypes],
              )
            }
            className="text-xs text-blue-600 hover:underline"
          >
            {selectedProducts.length === allProductTypes.length ? 'Clear' : 'All'}
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-1 space-y-0.5">
          {allProductTypes.map((p) => (
            <label key={p} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={selectedProducts.includes(p)}
                onChange={() => toggle(selectedProducts, setSelectedProducts, p)}
              />
              {p}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <span className="block text-xs font-medium text-gray-700 mb-1">
          Stock Range: {stockRange[0]} &ndash; {stockRange[1]}
        </span>
        <div className="flex gap-2 items-center">
          <label htmlFor={stockMinId} className="sr-only">
            Minimum stock
          </label>
          <input
            id={stockMinId}
            type="number"
            min={0}
            max={maxStock}
            value={stockRange[0]}
            onChange={(e) => setStockRange([Number(e.target.value), stockRange[1]])}
            className="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs"
          />
          <span className="text-gray-400" aria-hidden="true">
            &ndash;
          </span>
          <label htmlFor={stockMaxId} className="sr-only">
            Maximum stock
          </label>
          <input
            id={stockMaxId}
            type="number"
            min={0}
            max={maxStock}
            value={stockRange[1]}
            onChange={(e) => setStockRange([stockRange[0], Number(e.target.value)])}
            className="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs"
          />
        </div>
      </div>

      <h3 className="font-semibold mb-2">Statistics</h3>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white rounded border p-2 text-center">
          <div className="text-lg font-bold">{totalLocations}</div>
          <div className="text-[10px] text-gray-500">Total Locations</div>
        </div>
        <div className="bg-white rounded border p-2 text-center">
          <div className="text-lg font-bold">{filledLocations}</div>
          <div className="text-[10px] text-gray-500">Filled</div>
        </div>
        <div className="bg-white rounded border p-2 text-center">
          <div className="text-lg font-bold">{emptyLocations}</div>
          <div className="text-[10px] text-gray-500">Empty</div>
        </div>
        <div className="bg-white rounded border p-2 text-center">
          <div className="text-lg font-bold">{totalStock.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500">Total Stock</div>
        </div>
      </div>

      <h4 className="text-xs font-semibold mb-1">Zone Statistics</h4>
      <div className="max-h-48 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pr-2">Zone</th>
              <th className="pr-2">Locs</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {zoneStats.map((zs) => (
              <tr key={zs.zone} className="border-t border-gray-100">
                <td className="pr-2 font-medium">{zs.zone}</td>
                <td className="pr-2">{zs.locations}</td>
                <td>{zs.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
