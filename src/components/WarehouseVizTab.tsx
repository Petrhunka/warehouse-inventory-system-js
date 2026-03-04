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
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
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
      <p className="text-xs text-gray-500">
        {vizType === '3d'
          ? 'Use mouse to navigate: rotate (drag), zoom (scroll), pan (right-click+drag)'
          : '2D Layout - Hover over locations for details'}
      </p>

      {showAnalysis && (
        <details className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <summary className="cursor-pointer font-medium text-sm px-4 py-3 hover:bg-gray-50">
            Stock Level Analysis
          </summary>
          <div className="px-4 pb-4 pt-1 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-4 mb-4">
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
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-surface-50">
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Zone</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Total Items</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Understock</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Normal</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Overstock</th>
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
                        <tr key={zone} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{zone}</td>
                          <td className="px-4 py-2 text-right">{total}</td>
                          <td className="px-4 py-2 text-right">{us}</td>
                          <td className="px-4 py-2 text-right">{ns}</td>
                          <td className="px-4 py-2 text-right">{os}</td>
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
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-card">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
