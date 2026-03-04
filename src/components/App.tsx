'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Location } from '@/types/warehouse';
import { getWarehouseData, regenerateWarehouseData } from '@/lib/warehouse-data';
import { uniqueValues } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import WarehouseVizTab from '@/components/WarehouseVizTab';
import InventoryReportTab from '@/components/InventoryReportTab';
import StocktakingTab from '@/components/StocktakingTab';

type Tab = 'visualization' | 'reporting' | 'stocktaking';

export default function App() {
  const [data, setData] = useState<Location[]>(() => getWarehouseData());
  const [activeTab, setActiveTab] = useState<Tab>('visualization');

  const allZones = useMemo(() => uniqueValues(data, 'zone'), [data]);
  const allProductTypes = useMemo(() => uniqueValues(data, 'product_type'), [data]);
  const maxStock = useMemo(() => Math.max(...data.map((l) => l.quantity), 0), [data]);

  const [selectedZones, setSelectedZones] = useState<string[]>(() => uniqueValues(data, 'zone'));
  const [selectedProducts, setSelectedProducts] = useState<string[]>(() =>
    uniqueValues(data, 'product_type'),
  );
  const [stockRange, setStockRange] = useState<[number, number]>(() => [
    0,
    Math.max(...data.map((l) => l.quantity), 0),
  ]);
  const [vizType, setVizType] = useState<'3d' | '2d'>('3d');
  const [highlightUnderstock, setHighlightUnderstock] = useState(false);
  const [highlightOverstock, setHighlightOverstock] = useState(false);
  const [understockThreshold, setUnderstockThreshold] = useState(5);
  const [overstockThreshold, setOverstockThreshold] = useState(15);

  const filteredData = useMemo(
    () =>
      data.filter(
        (l) =>
          selectedZones.includes(l.zone) &&
          selectedProducts.includes(l.product_type) &&
          l.quantity >= stockRange[0] &&
          l.quantity <= stockRange[1],
      ),
    [data, selectedZones, selectedProducts, stockRange],
  );

  const handleRegenerate = useCallback(() => {
    const newData = regenerateWarehouseData();
    setData(newData);
    setSelectedZones(uniqueValues(newData, 'zone'));
    setSelectedProducts(uniqueValues(newData, 'product_type'));
    const newMax = Math.max(...newData.map((l) => l.quantity), 0);
    setStockRange([0, newMax]);
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'visualization', label: 'Warehouse Visualization' },
    { id: 'reporting', label: 'Inventory Level Reporting' },
    { id: 'stocktaking', label: 'Stocktaking Assistant' },
  ];

  return (
    <div className="flex h-screen">
      {activeTab === 'visualization' && (
        <Sidebar
          data={data}
          allZones={allZones}
          allProductTypes={allProductTypes}
          selectedZones={selectedZones}
          setSelectedZones={setSelectedZones}
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
          minStock={0}
          maxStock={maxStock}
          stockRange={stockRange}
          setStockRange={setStockRange}
          vizType={vizType}
          setVizType={setVizType}
          highlightUnderstock={highlightUnderstock}
          setHighlightUnderstock={setHighlightUnderstock}
          highlightOverstock={highlightOverstock}
          setHighlightOverstock={setHighlightOverstock}
          understockThreshold={understockThreshold}
          setUnderstockThreshold={setUnderstockThreshold}
          overstockThreshold={overstockThreshold}
          setOverstockThreshold={setOverstockThreshold}
          onRegenerate={handleRegenerate}
          filteredData={filteredData}
        />
      )}

      <main className="flex-1 flex flex-col overflow-hidden bg-surface-50">
        <header className="px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Warehouse Layout &amp; Inventory System
          </h1>
        </header>

        <div className="flex border-b border-gray-200 bg-white">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary-600 text-primary-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-surface-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-surface-50">
          {activeTab === 'visualization' && (
            <WarehouseVizTab
              data={filteredData}
              vizType={vizType}
              highlightOverstock={highlightOverstock}
              highlightUnderstock={highlightUnderstock}
              overstockThreshold={overstockThreshold}
              understockThreshold={understockThreshold}
            />
          )}
          {activeTab === 'reporting' && <InventoryReportTab data={data} />}
          {activeTab === 'stocktaking' && <StocktakingTab data={data} />}
        </div>

        <footer className="px-6 py-3 border-t border-gray-200 text-xs text-gray-500 text-center bg-white">
          Warehouse Layout &amp; Inventory System &mdash; Built with Next.js
        </footer>
      </main>
    </div>
  );
}
