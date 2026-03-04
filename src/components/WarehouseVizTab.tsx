'use client';

import { Location } from '@/types/warehouse';
import { groupBy } from '@/lib/utils';
import Warehouse3DPlot from './Warehouse3DPlot';
import Warehouse2DMap from './Warehouse2DMap';

interface Props {
  data: Location[];
  vizType: '3d' | '2d';
  highlightOverstock: boolean;
  highlightUnderstock: boolean;
  overstockThreshold: number;
  understockThreshold: number;
}

export default function WarehouseVizTab({
  data,
  vizType,
  highlightOverstock,
  highlightUnderstock,
  overstockThreshold,
  understockThreshold,
}: Props) {
  const filled = data.filter((l) => l.quantity > 0);
  const filledCount = filled.length;

  const understockCount = filled.filter(
    (l) => l.quantity > 0 && l.quantity <= understockThreshold,
  ).length;
  const overstockCount = filled.filter((l) => l.quantity >= overstockThreshold).length;
  const normalCount = filledCount - understockCount - overstockCount;

  const showAnalysis = highlightUnderstock || highlightOverstock;

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Interactive visualization of warehouse layout with multiple storage zones,
        color-coded sections, and detailed product location tracking.
      </p>

      {vizType === '2d' ? (
        <Warehouse2DMap
          data={data}
          highlightOverstock={highlightOverstock}
          highlightUnderstock={highlightUnderstock}
          overstockThreshold={overstockThreshold}
          understockThreshold={understockThreshold}
        />
      ) : (
        <Warehouse3DPlot
          data={data}
          highlightOverstock={highlightOverstock}
          highlightUnderstock={highlightUnderstock}
          overstockThreshold={overstockThreshold}
          understockThreshold={understockThreshold}
        />
      )}
      <p className="text-xs text-gray-500 mt-1">
        {vizType === '3d'
          ? 'Use mouse to navigate: rotate (drag), zoom (scroll), pan (right-click+drag)'
          : '2D Layout - Hover over locations for details'}
      </p>

      {showAnalysis && (
        <details className="mt-4 border rounded p-3">
          <summary className="cursor-pointer font-medium text-sm">
            Stock Level Analysis
          </summary>
          <div className="mt-3">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MetricCard
                label="Understock Locations"
                value={understockCount}
                sub={
                  filledCount > 0
                    ? `${((understockCount / filledCount) * 100).toFixed(1)}% of filled`
                    : '0%'
                }
              />
              <MetricCard
                label="Normal Stock Locations"
                value={normalCount}
                sub={
                  filledCount > 0
                    ? `${((normalCount / filledCount) * 100).toFixed(1)}% of filled`
                    : '0%'
                }
              />
              <MetricCard
                label="Overstock Locations"
                value={overstockCount}
                sub={
                  filledCount > 0
                    ? `${((overstockCount / filledCount) * 100).toFixed(1)}% of filled`
                    : '0%'
                }
              />
            </div>

            <h4 className="text-sm font-semibold mb-2">Stock Levels by Zone</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-2 py-1 text-left">Zone</th>
                    <th className="border px-2 py-1 text-right">Total Items</th>
                    <th className="border px-2 py-1 text-right">Understock</th>
                    <th className="border px-2 py-1 text-right">Normal</th>
                    <th className="border px-2 py-1 text-right">Overstock</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupBy(filled, (l) => l.zone))
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([zone, items]) => {
                      const us = items.filter(
                        (l) => l.quantity > 0 && l.quantity <= understockThreshold,
                      ).length;
                      const os = items.filter((l) => l.quantity >= overstockThreshold).length;
                      const ns = items.length - us - os;
                      const total = items.reduce((s, l) => s + l.quantity, 0);
                      return (
                        <tr key={zone}>
                          <td className="border px-2 py-1 font-medium">{zone}</td>
                          <td className="border px-2 py-1 text-right">{total}</td>
                          <td className="border px-2 py-1 text-right">{us}</td>
                          <td className="border px-2 py-1 text-right">{ns}</td>
                          <td className="border px-2 py-1 text-right">{os}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="border rounded p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
