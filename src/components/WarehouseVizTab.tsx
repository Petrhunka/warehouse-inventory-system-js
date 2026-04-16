'use client';

import { useMemo } from 'react';
import { groupBy } from '@/lib/utils';
import Warehouse3DPlot from './Warehouse3DPlot';
import Warehouse2DMap from './Warehouse2DMap';
import MetricCard from './MetricCard';
import { useVizControls } from './VizControlsContext';

export default function WarehouseVizTab() {
  const {
    filteredData,
    vizType,
    highlightOverstock,
    highlightUnderstock,
    overstockThreshold,
    understockThreshold,
  } = useVizControls();

  const { filledCount, understockCount, overstockCount, normalCount, byZone } = useMemo(() => {
    const filled = filteredData.filter((l) => l.quantity > 0);
    const us = filled.filter(
      (l) => l.quantity > 0 && l.quantity <= understockThreshold,
    ).length;
    const os = filled.filter((l) => l.quantity >= overstockThreshold).length;
    return {
      filledCount: filled.length,
      understockCount: us,
      overstockCount: os,
      normalCount: filled.length - us - os,
      byZone: Object.entries(groupBy(filled, (l) => l.zone)).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    };
  }, [filteredData, understockThreshold, overstockThreshold]);

  const showAnalysis = highlightUnderstock || highlightOverstock;
  const pct = (n: number) => (filledCount > 0 ? `${((n / filledCount) * 100).toFixed(1)}% of filled` : '0%');

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Interactive visualization of warehouse layout with multiple storage zones, color-coded
        sections, and detailed product location tracking.
      </p>

      {vizType === '2d' ? (
        <Warehouse2DMap
          data={filteredData}
          highlightOverstock={highlightOverstock}
          highlightUnderstock={highlightUnderstock}
          overstockThreshold={overstockThreshold}
          understockThreshold={understockThreshold}
        />
      ) : (
        <Warehouse3DPlot
          data={filteredData}
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
          <summary className="cursor-pointer font-medium text-sm">Stock Level Analysis</summary>
          <div className="mt-3">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MetricCard label="Understock Locations" value={understockCount} sub={pct(understockCount)} />
              <MetricCard label="Normal Stock Locations" value={normalCount} sub={pct(normalCount)} />
              <MetricCard label="Overstock Locations" value={overstockCount} sub={pct(overstockCount)} />
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
                  {byZone.map(([zone, items]) => {
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
