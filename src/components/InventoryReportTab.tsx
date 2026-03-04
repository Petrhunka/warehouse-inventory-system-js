'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Location } from '@/types/warehouse';
import { groupBy, sum, mean, std, minVal, maxVal, downloadCsv, locationsToCsv } from '@/lib/utils';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface Props {
  data: Location[];
}

const chartGrid = { left: 48, right: 24, bottom: 80, top: 40, containLabel: true };

export default function InventoryReportTab({ data }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [lowThreshold, setLowThreshold] = useState(5);
  const [highThreshold, setHighThreshold] = useState(15);

  const productTypes = useMemo(
    () =>
      Array.from(new Set(data.map((l) => l.product_type)))
        .filter(Boolean)
        .sort(),
    [data],
  );

  const currentProduct = selectedProduct || productTypes[0] || '';

  const totalInventory = data.reduce((s, l) => s + l.quantity, 0);
  const productTotals = Object.entries(groupBy(data, (l) => l.product_type)).map(
    ([, items]) => items.reduce((s, l) => s + l.quantity, 0),
  );
  const avgPerCategory =
    productTotals.length > 0
      ? productTotals.reduce((a, b) => a + b, 0) / productTotals.length
      : 0;
  const filledPct =
    data.length > 0
      ? (data.filter((l) => l.quantity > 0).length / data.length) * 100
      : 0;

  const productInventory = Object.entries(groupBy(data, (l) => l.product_type))
    .map(([pt, items]) => ({
      product_type: pt,
      quantity: items.reduce((s, l) => s + l.quantity, 0),
    }))
    .sort((a, b) => b.quantity - a.quantity);

  const locationInventory = Object.entries(groupBy(data, (l) => l.location_type)).map(
    ([lt, items]) => ({
      location_type: lt,
      total_items: items.reduce((s, l) => s + l.quantity, 0),
      locations: items.length,
      avg_per_location:
        items.length > 0
          ? +(items.reduce((s, l) => s + l.quantity, 0) / items.length).toFixed(1)
          : 0,
      utilization:
        items.length > 0
          ? +((items.filter((l) => l.quantity > 0).length / items.length) * 100).toFixed(1)
          : 0,
    }),
  );

  const productData = data.filter((l) => l.product_type === currentProduct);
  const prodTotal = productData.reduce((s, l) => s + l.quantity, 0);
  const prodFilled = productData.filter((l) => l.quantity > 0).length;
  const prodAvg = prodFilled > 0 ? prodTotal / prodFilled : 0;

  const productByZone = Object.entries(groupBy(productData, (l) => l.zone)).map(
    ([zone, items]) => ({
      zone,
      total_qty: sum(items, 'quantity'),
      locations: items.length,
      filled_locs: items.filter((l) => l.quantity > 0).length,
      avg_qty: +mean(items, 'quantity').toFixed(1),
      max_qty: maxVal(items, 'quantity'),
      min_qty: minVal(items, 'quantity'),
    }),
  );

  const productByLocType = Object.entries(groupBy(productData, (l) => l.location_type)).map(
    ([lt, items]) => ({
      location_type: lt,
      total_qty: sum(items, 'quantity'),
      locations: items.length,
      filled_locs: items.filter((l) => l.quantity > 0).length,
      utilization:
        items.length > 0
          ? +((items.filter((l) => l.quantity > 0).length / items.length) * 100).toFixed(1)
          : 0,
    }),
  );

  const stockLevels = useMemo(() => {
    const empty = productData.filter((l) => l.quantity === 0).length;
    const low = productData.filter((l) => l.quantity > 0 && l.quantity <= 5).length;
    const normal = productData.filter((l) => l.quantity > 5 && l.quantity < 15).length;
    const high = productData.filter((l) => l.quantity >= 15).length;
    return { empty, low, normal, high };
  }, [productData]);

  const lowStockLocations = productData
    .filter((l) => l.quantity > 0 && l.quantity <= 5)
    .sort((a, b) => a.quantity - b.quantity);

  const filledData = data.filter((l) => l.quantity > 0);
  const lowStockAll = filledData.filter((l) => l.quantity <= lowThreshold);
  const highStockAll = data.filter((l) => l.quantity >= highThreshold);
  const lowByProduct = Object.entries(groupBy(lowStockAll, (l) => l.product_type))
    .map(([pt, items]) => ({ product_type: pt, count: items.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const highByProduct = Object.entries(groupBy(highStockAll, (l) => l.product_type))
    .map(([pt, items]) => ({ product_type: pt, count: items.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const balanceData = Object.entries(groupBy(data, (l) => l.product_type))
    .map(([pt, items]) => {
      const avgQ = mean(items, 'quantity');
      const stdQ = std(items, 'quantity');
      return {
        product_type: pt,
        avg_quantity: +avgQ.toFixed(1),
        std_quantity: +stdQ.toFixed(1),
        min_quantity: minVal(items, 'quantity'),
        max_quantity: maxVal(items, 'quantity'),
        total_quantity: sum(items, 'quantity'),
        location_count: items.length,
        cv: avgQ > 0 ? +((stdQ / avgQ) * 100).toFixed(1) : 0,
      };
    })
    .sort((a, b) => b.cv - a.cv);

  const productBarOption = useMemo(
    () => ({
      grid: chartGrid,
      xAxis: {
        type: 'category',
        data: productInventory.map((p) => p.product_type),
        axisLabel: { rotate: 45, fontSize: 11 },
      },
      yAxis: { type: 'value', name: 'Total Quantity' },
      tooltip: { trigger: 'axis' },
      series: [
        {
          type: 'bar',
          data: productInventory.map((p) => p.quantity),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#93c5fd' },
                { offset: 1, color: '#1d4ed8' },
              ],
            },
          },
          barWidth: '60%',
        },
      ],
    }),
    [productInventory],
  );

  const pieOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      legend: { bottom: 8 },
      series: [
        {
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['50%', '45%'],
          data: [
            { value: stockLevels.empty, name: 'Empty', itemStyle: { color: '#cbd5e1' } },
            { value: stockLevels.low, name: 'Low', itemStyle: { color: '#ef4444' } },
            { value: stockLevels.normal, name: 'Normal', itemStyle: { color: '#22c55e' } },
            { value: stockLevels.high, name: 'High', itemStyle: { color: '#eab308' } },
          ],
        },
      ],
    }),
    [stockLevels],
  );

  const lowBarOption = useMemo(
    () => ({
      grid: chartGrid,
      xAxis: {
        type: 'category',
        data: lowByProduct.map((p) => p.product_type),
        axisLabel: { rotate: 45, fontSize: 10 },
      },
      yAxis: { type: 'value', name: 'Low Stock Locations' },
      tooltip: { trigger: 'axis' },
      series: [
        {
          type: 'bar',
          data: lowByProduct.map((p) => p.count),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#fecaca' },
                { offset: 1, color: '#b91c1c' },
              ],
            },
          },
          barWidth: '60%',
        },
      ],
    }),
    [lowByProduct],
  );

  const highBarOption = useMemo(
    () => ({
      grid: chartGrid,
      xAxis: {
        type: 'category',
        data: highByProduct.map((p) => p.product_type),
        axisLabel: { rotate: 45, fontSize: 10 },
      },
      yAxis: { type: 'value', name: 'High Stock Locations' },
      tooltip: { trigger: 'axis' },
      series: [
        {
          type: 'bar',
          data: highByProduct.map((p) => p.count),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#86efac' },
                { offset: 1, color: '#15803d' },
              ],
            },
          },
          barWidth: '60%',
        },
      ],
    }),
    [highByProduct],
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Detailed reporting on inventory levels across the warehouse, helping identify stocking
        issues, optimize distribution, and support decision-making.
      </p>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Inventory" value={totalInventory.toLocaleString()} />
        <MetricCard label="Product Categories" value={String(productTypes.length)} />
        <MetricCard label="Avg Per Category" value={avgPerCategory.toFixed(1)} />
        <MetricCard label="Space Utilization" value={`${filledPct.toFixed(1)}%`} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-card p-4">
        <h3 className="text-base font-semibold mb-3">Inventory by Product Type</h3>
        <ReactECharts option={productBarOption} style={{ height: 400, width: '100%' }} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-card p-4">
        <h3 className="text-base font-semibold mb-3">Inventory by Location Type</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-surface-50">
                <th className="px-4 py-2.5 text-left font-medium text-gray-700">
                  Location Type
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">
                  Total Items
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Locations</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">
                  Avg Items/Loc
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">
                  Utilization %
                </th>
              </tr>
            </thead>
            <tbody>
              {[...locationInventory]
                .sort((a, b) => b.total_items - a.total_items)
                .map((r) => (
                  <tr key={r.location_type} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5">{r.location_type}</td>
                    <td className="px-4 py-2.5 text-right">{r.total_items}</td>
                    <td className="px-4 py-2.5 text-right">{r.locations}</td>
                    <td className="px-4 py-2.5 text-right">{r.avg_per_location}</td>
                    <td className="px-4 py-2.5 text-right">{r.utilization}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-card p-4">
        <h3 className="text-base font-semibold mb-3">Detailed Product Information</h3>
        <select
          value={currentProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none mb-4"
        >
          {productTypes.map((pt) => (
            <option key={pt} value={pt}>
              {pt}
            </option>
          ))}
        </select>

        <h4 className="text-sm font-semibold mb-2">{currentProduct} - Inventory Details</h4>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <MetricCard label="Total Quantity" value={String(prodTotal)} />
          <MetricCard label="Total Locations" value={String(productData.length)} />
          <MetricCard label="Filled Locations" value={String(prodFilled)} />
          <MetricCard label="Avg Qty/Location" value={prodAvg.toFixed(1)} />
        </div>

        <h4 className="text-sm font-semibold mb-2">
          {currentProduct} - Distribution by Zone
        </h4>
        <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-surface-50">
                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Zone</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Total Qty</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Locations</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Filled</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Avg Qty</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Max</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Min</th>
              </tr>
            </thead>
            <tbody>
              {[...productByZone]
                .sort((a, b) => b.total_qty - a.total_qty)
                .map((r) => (
                  <tr key={r.zone} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{r.zone}</td>
                    <td className="px-4 py-2.5 text-right">{r.total_qty}</td>
                    <td className="px-4 py-2.5 text-right">{r.locations}</td>
                    <td className="px-4 py-2.5 text-right">{r.filled_locs}</td>
                    <td className="px-4 py-2.5 text-right">{r.avg_qty}</td>
                    <td className="px-4 py-2.5 text-right">{r.max_qty}</td>
                    <td className="px-4 py-2.5 text-right">{r.min_qty}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <h4 className="text-sm font-semibold mb-2">
          {currentProduct} - Distribution by Location Type
        </h4>
        <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-surface-50">
                <th className="px-4 py-2.5 text-left font-medium text-gray-700">
                  Location Type
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Total Qty</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Locations</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Filled</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Utilization %</th>
              </tr>
            </thead>
            <tbody>
              {[...productByLocType]
                .sort((a, b) => b.total_qty - a.total_qty)
                .map((r) => (
                  <tr
                    key={r.location_type}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2.5">{r.location_type}</td>
                    <td className="px-4 py-2.5 text-right">{r.total_qty}</td>
                    <td className="px-4 py-2.5 text-right">{r.locations}</td>
                    <td className="px-4 py-2.5 text-right">{r.filled_locs}</td>
                    <td className="px-4 py-2.5 text-right">{r.utilization}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <h4 className="text-sm font-semibold mb-2">
          {currentProduct} - Stock Level Analysis
        </h4>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <ReactECharts option={pieOption} style={{ height: 320, width: '100%' }} />
        </div>

        {lowStockLocations.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-2">
              {currentProduct} - Locations Needing Replenishment
            </h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-surface-50">
                    <th className="px-4 py-2.5 text-left font-medium text-gray-700">
                      Location ID
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-700">Zone</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-700">
                      Location Type
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-gray-700">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockLocations.map((l) => (
                    <tr key={l.location_id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono">{l.location_id}</td>
                      <td className="px-4 py-2.5">{l.zone}</td>
                      <td className="px-4 py-2.5">{l.location_type}</td>
                      <td className="px-4 py-2.5 text-right">{l.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-card p-4">
        <h3 className="text-base font-semibold mb-4">Inventory Issues Analysis</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Low Stock Threshold: {lowThreshold}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={lowThreshold}
              onChange={(e) => setLowThreshold(Number(e.target.value))}
              className="w-full h-2 rounded-lg accent-primary-500 mb-3"
            />
            <div className="rounded-lg border border-gray-200 p-4 text-center mb-3 shadow-card">
              <div className="text-2xl font-bold text-gray-900">{lowStockAll.length}</div>
              <div className="text-sm text-gray-500">Low Stock Locations</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {filledData.length > 0
                  ? `${((lowStockAll.length / filledData.length) * 100).toFixed(1)}% of filled`
                  : '0%'}
              </div>
            </div>
            {lowByProduct.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <ReactECharts option={lowBarOption} style={{ height: 280, width: '100%' }} />
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No low stock locations found</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              High Stock Threshold: {highThreshold}
            </label>
            <input
              type="range"
              min={10}
              max={50}
              value={highThreshold}
              onChange={(e) => setHighThreshold(Number(e.target.value))}
              className="w-full h-2 rounded-lg accent-primary-500 mb-3"
            />
            <div className="rounded-lg border border-gray-200 p-4 text-center mb-3 shadow-card">
              <div className="text-2xl font-bold text-gray-900">{highStockAll.length}</div>
              <div className="text-sm text-gray-500">High Stock Locations</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {filledData.length > 0
                  ? `${((highStockAll.length / filledData.length) * 100).toFixed(1)}% of filled`
                  : '0%'}
              </div>
            </div>
            {highByProduct.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <ReactECharts option={highBarOption} style={{ height: 280, width: '100%' }} />
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No high stock locations found</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-card p-4">
        <h3 className="text-base font-semibold mb-3">Inventory Balance Analysis</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-surface-50">
                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Product Type</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Avg Qty</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Std Dev</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Min</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Max</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Total</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Locations</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">CV %</th>
              </tr>
            </thead>
            <tbody>
              {balanceData.map((r) => (
                <tr key={r.product_type} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">{r.product_type}</td>
                  <td className="px-4 py-2.5 text-right">{r.avg_quantity}</td>
                  <td className="px-4 py-2.5 text-right">{r.std_quantity}</td>
                  <td className="px-4 py-2.5 text-right">{r.min_quantity}</td>
                  <td className="px-4 py-2.5 text-right">{r.max_quantity}</td>
                  <td className="px-4 py-2.5 text-right">{r.total_quantity}</td>
                  <td className="px-4 py-2.5 text-right">{r.location_count}</td>
                  <td className="px-4 py-2.5 text-right">{r.cv}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          CV % = Coefficient of Variation - Higher values indicate less balanced inventory
          distribution
        </p>
      </div>

      <button
        onClick={() => downloadCsv('warehouse_inventory_report.csv', locationsToCsv(data))}
        className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
      >
        Download Full Inventory Report
      </button>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-card">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
