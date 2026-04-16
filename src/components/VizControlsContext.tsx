'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Location } from '@/types/warehouse';
import { uniqueValues } from '@/lib/utils';

export interface VizControls {
  allZones: string[];
  allProductTypes: string[];
  maxStock: number;

  selectedZones: string[];
  setSelectedZones: (zones: string[]) => void;
  selectedProducts: string[];
  setSelectedProducts: (products: string[]) => void;

  stockRange: [number, number];
  setStockRange: (range: [number, number]) => void;

  vizType: '3d' | '2d';
  setVizType: (v: '3d' | '2d') => void;

  highlightUnderstock: boolean;
  setHighlightUnderstock: (v: boolean) => void;
  highlightOverstock: boolean;
  setHighlightOverstock: (v: boolean) => void;
  understockThreshold: number;
  setUnderstockThreshold: (v: number) => void;
  overstockThreshold: number;
  setOverstockThreshold: (v: number) => void;

  filteredData: Location[];
}

const VizControlsCtx = createContext<VizControls | null>(null);

interface ProviderProps {
  data: Location[];
  children: ReactNode;
}

export function VizControlsProvider({ data, children }: ProviderProps) {
  const allZones = useMemo(() => uniqueValues(data, 'zone'), [data]);
  const allProductTypes = useMemo(() => uniqueValues(data, 'product_type'), [data]);
  const maxStock = useMemo(() => Math.max(...data.map((l) => l.quantity), 0), [data]);

  const [selectedZones, setSelectedZones] = useState<string[]>(allZones);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(allProductTypes);
  const [stockRange, setStockRange] = useState<[number, number]>([0, maxStock]);
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

  const value: VizControls = {
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
  };

  return <VizControlsCtx.Provider value={value}>{children}</VizControlsCtx.Provider>;
}

export function useVizControls(): VizControls {
  const ctx = useContext(VizControlsCtx);
  if (!ctx) {
    throw new Error('useVizControls must be used inside <VizControlsProvider>');
  }
  return ctx;
}
