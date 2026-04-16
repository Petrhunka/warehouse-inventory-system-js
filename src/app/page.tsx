'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { getWarehouseData, regenerateWarehouseData } from '@/lib/warehouse-data';
import Sidebar from '@/components/Sidebar';
import WarehouseVizTab from '@/components/WarehouseVizTab';
import InventoryReportTab from '@/components/InventoryReportTab';
import StocktakingTab from '@/components/StocktakingTab';
import { VizControlsProvider } from '@/components/VizControlsContext';

type Tab = 'visualization' | 'reporting' | 'stocktaking';

const TABS: { id: Tab; label: string }[] = [
  { id: 'visualization', label: 'Warehouse Visualization' },
  { id: 'reporting', label: 'Inventory Level Reporting' },
  { id: 'stocktaking', label: 'Stocktaking Assistant' },
];

export default function Home() {
  const [data, setData] = useState(() => getWarehouseData());
  const [activeTab, setActiveTab] = useState<Tab>('visualization');

  const handleRegenerate = useCallback(() => {
    setData(regenerateWarehouseData());
  }, []);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const next = TABS[(idx + delta + TABS.length) % TABS.length];
    setActiveTab(next.id);
    const btn = document.getElementById(`tab-${next.id}`);
    btn?.focus();
  };

  return (
    <VizControlsProvider data={data}>
      <div className="flex h-screen">
        {activeTab === 'visualization' && <Sidebar onRegenerate={handleRegenerate} />}

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="px-6 py-4 border-b bg-white flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold">Warehouse Layout &amp; Inventory System</h1>
            <Link
              href="/worker"
              className="text-sm text-blue-600 hover:underline whitespace-nowrap"
            >
              Worker app &rarr;
            </Link>
          </header>

          <div role="tablist" aria-label="Views" className="flex border-b bg-gray-50">
            {TABS.map((tab, idx) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {TABS.map((tab) => (
              <div
                key={tab.id}
                id={`panel-${tab.id}`}
                role="tabpanel"
                aria-labelledby={`tab-${tab.id}`}
                hidden={activeTab !== tab.id}
              >
                {activeTab === tab.id && tab.id === 'visualization' && <WarehouseVizTab />}
                {activeTab === tab.id && tab.id === 'reporting' && <InventoryReportTab data={data} />}
                {activeTab === tab.id && tab.id === 'stocktaking' && <StocktakingTab data={data} />}
              </div>
            ))}
          </div>

          <footer className="px-6 py-2 border-t text-xs text-gray-400 text-center bg-white">
            Warehouse Layout &amp; Inventory System &mdash; Built with Next.js
          </footer>
        </main>
      </div>
    </VizControlsProvider>
  );
}
