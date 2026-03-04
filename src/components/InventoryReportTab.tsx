'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Location } from '@/types/warehouse';
import { groupBy, sum, mean, std, minVal, maxVal, downloadCsv, locationsToCsv } from '@/lib/utils';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface Props {
  data: Location[];
}

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

  // overview metrics
  const totalInventory = data.reduce((s, l) => s + l.quantity, 0);
  const totalProductTypes = productTypes.length;
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

  // product inventory bar chart data
  const productInventory = Object.entries(groupBy(data, (l) => l.product_type))
    .map(([pt, items]) => ({
      product_type: pt,
      quantity: items.reduce((s, l) => s + l.quantity, 0),
    }))
    .sort((a, b) => b.quantity - a.quantity);

  // location type analysis
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

  // selected product analysis
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

  // stock level breakdown for pie chart
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

  // issue analysis
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

  // balance analysis
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Detailed reporting on inventory levels across the warehouse, helping identify stocking
        issues, optimize distribution, and support decision-making.
      </p>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Total Inventory" value={totalInventory.toLocaleString()} />
        <MetricCard label="Product Categories" value={String(totalProductTypes)} />
        <MetricCard label="Avg Per Category" value={avgPerCategory.toFixed(1)} />
        <MetricCard label="Space Utilization" value={`${filledPct.toFixed(1)}%`} />
      </div>

      {/* Product Type Bar Chart */}
      <div>
        <h3 className="text-base font-semibold mb-2">Inventory by Product Type</h3>
        <Plot
          data={[
            {
              type: 'bar',
              x: productInventory.map((p) => p.product_type),
              y: productInventory.map((p) => p.quantity),
              marker: {
                color: productInventory.map((p) => p.quantity),
                colorscale: 'Blues',
              },
            },
          ]}
          layout={{
            title: 'Total Stock by Product Type',
            xaxis: { title: 'Product Type', tickangle: -45 },
            yaxis: { title: 'Total Quantity' },
            margin: { b: 120, t: 40, l: 50, r: 20 },
            height: 400,
            autosize: true,
          }}
          config={{ responsive: true }}
          style={{ width: '100%' }}
        />
      </div>

      {/* Location Type Analysis */}
      <div>
        <h3 className="text-base font-semibold mb-2">Inventory by Location Type</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-1 text-left">Location Type</th>
                <th className="border px-2 py-1 text-right">Total Items</th>
                <th className="border px-2 py-1 text-right">Locations</th>
                <th className="border px-2 py-1 text-right">Avg Items/Loc</th>
                <th className="border px-2 py-1 text-right">Utilization %</th>
              </tr>
            </thead>
            <tbody>
              {locationInventory
                .sort((a, b) => b.total_items - a.total_items)
                .map((r) => (
                  <tr key={r.location_type}>
                    <td className="border px-2 py-1">{r.location_type}</td>
                    <td className="border px-2 py-1 text-right">{r.total_items}</td>
                    <td className="border px-2 py-1 text-right">{r.locations}</td>
                    <td className="border px-2 py-1 text-right">{r.avg_per_location}</td>
                    <td className="border px-2 py-1 text-right">{r.utilization}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Product Information */}
      <div>
        <h3 className="text-base font-semibold mb-2">Detailed Product Information</h3>
        <select
          value={currentProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm mb-3"
        >
          {productTypes.map((pt) => (
            <option key={pt} value={pt}>
              {pt}
            </option>
          ))}
        </select>

        <h4 className="text-sm font-semibold mb-2">{currentProduct} - Inventory Details</h4>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <MetricCard label="Total Quantity" value={String(prodTotal)} />
          <MetricCard label="Total Locations" value={String(productData.length)} />
          <MetricCard label="Filled Locations" value={String(prodFilled)} />
          <MetricCard label="Avg Qty/Location" value={prodAvg.toFixed(1)} />
        </div>

        <h4 className="text-sm font-semibold mb-2">
          {currentProduct} - Distribution by Zone
        </h4>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-xs border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-1 text-left">Zone</th>
                <th className="border px-2 py-1 text-right">Total Qty</th>
                <th className="border px-2 py-1 text-right">Locations</th>
                <th className="border px-2 py-1 text-right">Filled</th>
                <th className="border px-2 py-1 text-right">Avg Qty</th>
                <th className="border px-2 py-1 text-right">Max</th>
                <th className="border px-2 py-1 text-right">Min</th>
              </tr>
            </thead>
            <tbody>
              {productByZone
                .sort((a, b) => b.total_qty - a.total_qty)
                .map((r) => (
                  <tr key={r.zone}>
                    <td className="border px-2 py-1 font-medium">{r.zone}</td>
                    <td className="border px-2 py-1 text-right">{r.total_qty}</td>
                    <td className="border px-2 py-1 text-right">{r.locations}</td>
                    <td className="border px-2 py-1 text-right">{r.filled_locs}</td>
                    <td className="border px-2 py-1 text-right">{r.avg_qty}</td>
                    <td className="border px-2 py-1 text-right">{r.max_qty}</td>
                    <td className="border px-2 py-1 text-right">{r.min_qty}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <h4 className="text-sm font-semibold mb-2">
          {currentProduct} - Distribution by Location Type
        </h4>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-xs border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-1 text-left">Location Type</th>
                <th className="border px-2 py-1 text-right">Total Qty</th>
                <th className="border px-2 py-1 text-right">Locations</th>
                <th className="border px-2 py-1 text-right">Filled</th>
                <th className="border px-2 py-1 text-right">Utilization %</th>
              </tr>
            </thead>
            <tbody>
              {productByLocType
                .sort((a, b) => b.total_qty - a.total_qty)
                .map((r) => (
                  <tr key={r.location_type}>
                    <td className="border px-2 py-1">{r.location_type}</td>
                    <td className="border px-2 py-1 text-right">{r.total_qty}</td>
                    <td className="border px-2 py-1 text-right">{r.locations}</td>
                    <td className="border px-2 py-1 text-right">{r.filled_locs}</td>
                    <td className="border px-2 py-1 text-right">{r.utilization}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Stock Level Pie Chart */}
        <h4 className="text-sm font-semibold mb-2">
          {currentProduct} - Stock Level Analysis
        </h4>
        <Plot
          data={[
            {
              type: 'pie',
              values: [stockLevels.empty, stockLevels.low, stockLevels.normal, stockLevels.high],
              labels: ['Empty', 'Low', 'Normal', 'High'],
              marker: {
                colors: ['lightgray', 'red', 'green', 'gold'],
              },
            },
          ]}
          layout={{
            title: `${currentProduct} - Stock Level Distribution`,
            height: 350,
            autosize: true,
            margin: { t: 40, b: 20, l: 20, r: 20 },
          }}
          config={{ responsive: true }}
          style={{ width: '100%' }}
        />

        {lowStockLocations.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">
              {currentProduct} - Locations Needing Replenishment
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-2 py-1 text-left">Location ID</th>
                    <th className="border px-2 py-1 text-left">Zone</th>
                    <th className="border px-2 py-1 text-left">Location Type</th>
                    <th className="border px-2 py-1 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockLocations.map((l) => (
                    <tr key={l.location_id}>
                      <td className="border px-2 py-1">{l.location_id}</td>
                      <td className="border px-2 py-1">{l.zone}</td>
                      <td className="border px-2 py-1">{l.location_type}</td>
                      <td className="border px-2 py-1 text-right">{l.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Issues Analysis */}
      <div>
        <h3 className="text-base font-semibold mb-3">Inventory Issues Analysis</h3>
        <div className="grid grid-cols-2 gap-6">
          {/* Low stock */}
          <div>
            <label className="block text-xs font-medium mb-1">
              Low Stock Threshold: {lowThreshold}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={lowThreshold}
              onChange={(e) => setLowThreshold(Number(e.target.value))}
              className="w-full mb-2"
            />
            <div className="border rounded p-3 text-center mb-3">
              <div className="text-2xl font-bold">{lowStockAll.length}</div>
              <div className="text-xs text-gray-500">Low Stock Locations</div>
              <div className="text-[10px] text-gray-400">
                {filledData.length > 0
                  ? `${((lowStockAll.length / filledData.length) * 100).toFixed(1)}% of filled`
                  : '0%'}
              </div>
            </div>
            {lowByProduct.length > 0 ? (
              <Plot
                data={[
                  {
                    type: 'bar',
                    x: lowByProduct.map((p) => p.product_type),
                    y: lowByProduct.map((p) => p.count),
                    marker: {
                      color: lowByProduct.map((p) => p.count),
                      colorscale: 'Reds',
                    },
                  },
                ]}
                layout={{
                  title: 'Top Products with Low Stock',
                  xaxis: { tickangle: -45 },
                  yaxis: { title: 'Low Stock Locations' },
                  margin: { b: 100, t: 40, l: 40, r: 10 },
                  height: 300,
                  autosize: true,
                }}
                config={{ responsive: true }}
                style={{ width: '100%' }}
              />
            ) : (
              <p className="text-xs text-gray-500 text-center">No low stock locations found</p>
            )}
          </div>

          {/* High stock */}
          <div>
            <label className="block text-xs font-medium mb-1">
              High Stock Threshold: {highThreshold}
            </label>
            <input
              type="range"
              min={10}
              max={50}
              value={highThreshold}
              onChange={(e) => setHighThreshold(Number(e.target.value))}
              className="w-full mb-2"
            />
            <div className="border rounded p-3 text-center mb-3">
              <div className="text-2xl font-bold">{highStockAll.length}</div>
              <div className="text-xs text-gray-500">High Stock Locations</div>
              <div className="text-[10px] text-gray-400">
                {filledData.length > 0
                  ? `${((highStockAll.length / filledData.length) * 100).toFixed(1)}% of filled`
                  : '0%'}
              </div>
            </div>
            {highByProduct.length > 0 ? (
              <Plot
                data={[
                  {
                    type: 'bar',
                    x: highByProduct.map((p) => p.product_type),
                    y: highByProduct.map((p) => p.count),
                    marker: {
                      color: highByProduct.map((p) => p.count),
                      colorscale: 'Greens',
                    },
                  },
                ]}
                layout={{
                  title: 'Top Products with High Stock',
                  xaxis: { tickangle: -45 },
                  yaxis: { title: 'High Stock Locations' },
                  margin: { b: 100, t: 40, l: 40, r: 10 },
                  height: 300,
                  autosize: true,
                }}
                config={{ responsive: true }}
                style={{ width: '100%' }}
              />
            ) : (
              <p className="text-xs text-gray-500 text-center">No high stock locations found</p>
            )}
          </div>
        </div>
      </div>

      {/* Balance Analysis */}
      <div>
        <h3 className="text-base font-semibold mb-2">Inventory Balance Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-1 text-left">Product Type</th>
                <th className="border px-2 py-1 text-right">Avg Qty</th>
                <th className="border px-2 py-1 text-right">Std Dev</th>
                <th className="border px-2 py-1 text-right">Min</th>
                <th className="border px-2 py-1 text-right">Max</th>
                <th className="border px-2 py-1 text-right">Total</th>
                <th className="border px-2 py-1 text-right">Locations</th>
                <th className="border px-2 py-1 text-right">CV %</th>
              </tr>
            </thead>
            <tbody>
              {balanceData.map((r) => (
                <tr key={r.product_type}>
                  <td className="border px-2 py-1">{r.product_type}</td>
                  <td className="border px-2 py-1 text-right">{r.avg_quantity}</td>
                  <td className="border px-2 py-1 text-right">{r.std_quantity}</td>
                  <td className="border px-2 py-1 text-right">{r.min_quantity}</td>
                  <td className="border px-2 py-1 text-right">{r.max_quantity}</td>
                  <td className="border px-2 py-1 text-right">{r.total_quantity}</td>
                  <td className="border px-2 py-1 text-right">{r.location_count}</td>
                  <td className="border px-2 py-1 text-right">{r.cv}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          CV % = Coefficient of Variation - Higher values indicate less balanced inventory
          distribution
        </p>
      </div>

      {/* Download */}
      <button
        onClick={() => downloadCsv('warehouse_inventory_report.csv', locationsToCsv(data))}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
      >
        Download Full Inventory Report
      </button>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
