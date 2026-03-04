'use client';

import { Location, ZoneStat } from '@/types/warehouse';
import { groupBy } from '@/lib/utils';

interface Props {
  data: Location[];
  allZones: string[];
  allProductTypes: string[];
  selectedZones: string[];
  setSelectedZones: (zones: string[]) => void;
  selectedProducts: string[];
  setSelectedProducts: (products: string[]) => void;
  minStock: number;
  maxStock: number;
  stockRange: [number, number];
  setStockRange: (range: [number, number]) => void;
  vizType: '3d' | '2d';
  setVizType: (t: '3d' | '2d') => void;
  highlightUnderstock: boolean;
  setHighlightUnderstock: (v: boolean) => void;
  highlightOverstock: boolean;
  setHighlightOverstock: (v: boolean) => void;
  understockThreshold: number;
  setUnderstockThreshold: (v: number) => void;
  overstockThreshold: number;
  setOverstockThreshold: (v: number) => void;
  onRegenerate: () => void;
  filteredData: Location[];
}

export default function Sidebar({
  allZones,
  allProductTypes,
  selectedZones,
  setSelectedZones,
  selectedProducts,
  setSelectedProducts,
  maxStock,
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
  onRegenerate,
  filteredData,
}: Props) {
  const totalLocations = filteredData.length;
  const filledLocations = filteredData.filter((l) => l.quantity > 0).length;
  const emptyLocations = totalLocations - filledLocations;
  const totalStock = filteredData.reduce((s, l) => s + l.quantity, 0);

  const zoneStats: ZoneStat[] = Object.entries(groupBy(filteredData, (l) => l.zone))
    .map(([zone, items]) => ({
      zone,
      locations: items.length,
      stock: items.reduce((s, l) => s + l.quantity, 0),
    }))
    .sort((a, b) => a.zone.localeCompare(b.zone));

  const toggleZone = (z: string) => {
    if (selectedZones.includes(z)) {
      setSelectedZones(selectedZones.filter((x) => x !== z));
    } else {
      setSelectedZones([...selectedZones, z]);
    }
  };

  const toggleProduct = (p: string) => {
    if (selectedProducts.includes(p)) {
      setSelectedProducts(selectedProducts.filter((x) => x !== p));
    } else {
      setSelectedProducts([...selectedProducts, p]);
    }
  };

  return (
    <aside className="w-72 min-w-[18rem] bg-surface-50 border-r border-gray-200 p-4 overflow-y-auto text-sm flex-shrink-0 shadow-card">
      <button
        onClick={onRegenerate}
        className="w-full mb-4 px-3 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
      >
        Regenerate Warehouse Data
      </button>

      <h3 className="font-semibold text-gray-800 mb-2">Visualization Type</h3>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setVizType('3d')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            vizType === '3d'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          3D View
        </button>
        <button
          onClick={() => setVizType('2d')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            vizType === '2d'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          2D Map
        </button>
      </div>

      <h3 className="font-semibold text-gray-800 mb-2">Highlight Options</h3>
      <div className="space-y-2 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={highlightUnderstock}
            onChange={(e) => setHighlightUnderstock(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Highlight Understock
        </label>
        {highlightUnderstock && (
          <div className="ml-5">
            <label className="block text-xs text-gray-600 mb-1">
              Threshold: {understockThreshold}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={understockThreshold}
              onChange={(e) => setUnderstockThreshold(Number(e.target.value))}
              className="w-full h-2 rounded-lg accent-primary-500"
            />
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={highlightOverstock}
            onChange={(e) => setHighlightOverstock(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Highlight Overstock
        </label>
        {highlightOverstock && (
          <div className="ml-5">
            <label className="block text-xs text-gray-600 mb-1">
              Threshold: {overstockThreshold}
            </label>
            <input
              type="range"
              min={10}
              max={50}
              value={overstockThreshold}
              onChange={(e) => setOverstockThreshold(Number(e.target.value))}
              className="w-full h-2 rounded-lg accent-primary-500"
            />
          </div>
        )}
        {(highlightUnderstock || highlightOverstock) && (
          <div className="text-xs bg-primary-50 p-2.5 rounded-lg">
            {highlightUnderstock && (
              <span className="text-red-600 font-medium">Red = Understock (0 &lt; qty &le; {understockThreshold})</span>
            )}
            {highlightUnderstock && highlightOverstock && <br />}
            {highlightOverstock && (
              <span className="text-yellow-600 font-medium">Gold = Overstock (qty &ge; {overstockThreshold})</span>
            )}
          </div>
        )}
      </div>

      <h3 className="font-semibold text-gray-800 mb-2">Filters</h3>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-gray-700">Zones</span>
          <button
            onClick={() =>
              setSelectedZones(selectedZones.length === allZones.length ? [] : [...allZones])
            }
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            {selectedZones.length === allZones.length ? 'Clear' : 'All'}
          </button>
        </div>
        <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 space-y-1">
          {allZones.map((z) => (
            <label key={z} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded">
              <input
                type="checkbox"
                checked={selectedZones.includes(z)}
                onChange={() => toggleZone(z)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
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
            onClick={() =>
              setSelectedProducts(
                selectedProducts.length === allProductTypes.length ? [] : [...allProductTypes],
              )
            }
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            {selectedProducts.length === allProductTypes.length ? 'Clear' : 'All'}
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 space-y-1">
          {allProductTypes.map((p) => (
            <label key={p} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded">
              <input
                type="checkbox"
                checked={selectedProducts.includes(p)}
                onChange={() => toggleProduct(p)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              {p}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Stock Range: {stockRange[0]} &ndash; {stockRange[1]}
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={0}
            max={maxStock}
            value={stockRange[0]}
            onChange={(e) => setStockRange([Number(e.target.value), stockRange[1]])}
            className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none"
          />
          <span className="text-gray-400">&ndash;</span>
          <input
            type="number"
            min={0}
            max={maxStock}
            value={stockRange[1]}
            onChange={(e) => setStockRange([stockRange[0], Number(e.target.value)])}
            className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none"
          />
        </div>
      </div>

      <h3 className="font-semibold text-gray-800 mb-2">Statistics</h3>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-card">
          <div className="text-lg font-bold text-gray-900">{totalLocations}</div>
          <div className="text-[10px] text-gray-500">Total Locations</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-card">
          <div className="text-lg font-bold text-gray-900">{filledLocations}</div>
          <div className="text-[10px] text-gray-500">Filled</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-card">
          <div className="text-lg font-bold text-gray-900">{emptyLocations}</div>
          <div className="text-[10px] text-gray-500">Empty</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-card">
          <div className="text-lg font-bold text-gray-900">{totalStock.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500">Total Stock</div>
        </div>
      </div>

      <h4 className="text-xs font-semibold text-gray-700 mb-1">Zone Statistics</h4>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-50 text-left">
              <th className="px-3 py-2 font-medium text-gray-700">Zone</th>
              <th className="px-3 py-2 font-medium text-gray-700">Locs</th>
              <th className="px-3 py-2 font-medium text-gray-700">Stock</th>
            </tr>
          </thead>
          <tbody>
            {zoneStats.map((zs) => (
              <tr key={zs.zone} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-1.5 font-medium">{zs.zone}</td>
                <td className="px-3 py-1.5">{zs.locations}</td>
                <td className="px-3 py-1.5">{zs.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
