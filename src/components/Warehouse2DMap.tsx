'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Location } from '@/types/warehouse';
import { getColorByStockLevel, rgbString } from '@/lib/visualization';
import { groupBy } from '@/lib/utils';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface Props {
  data: Location[];
  highlightOverstock: boolean;
  highlightUnderstock: boolean;
  overstockThreshold: number;
  understockThreshold: number;
}

function dedup(items: Location[]): Location[] {
  const seen = new Set<string>();
  return items.filter((l) => {
    const key = `${l.x},${l.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function Warehouse2DMap({
  data,
  highlightOverstock,
  highlightUnderstock,
  overstockThreshold,
  understockThreshold,
}: Props) {
  const traces = useMemo(() => {
    const byZone = groupBy(data, (l) => l.zone);
    const result: Plotly.Data[] = [];

    for (const [zone, rawItems] of Object.entries(byZone)) {
      const items = dedup(rawItems);
      const empty = items.filter((l) => l.quantity === 0);
      const filled = items.filter((l) => l.quantity > 0);

      if (empty.length > 0) {
        result.push({
          type: 'scatter' as const,
          x: empty.map((l) => l.x),
          y: empty.map((l) => l.y),
          mode: 'markers' as const,
          marker: {
            size: 8,
            color: empty.map((l) => rgbString(l.color)),
            symbol: 'square',
            opacity: 0.5,
            line: { width: 1, color: 'rgb(50,50,50)' },
          },
          text: empty.map(
            (l) =>
              `Zone: ${l.zone}<br>Product Type: ${l.product_type}<br>Status: Empty` +
              (l.depth_info ? `<br>Depth: ${l.depth_info}` : ''),
          ),
          hoverinfo: 'text' as const,
          name: `Zone ${zone} - Empty`,
        });
      }

      if (filled.length > 0) {
        result.push({
          type: 'scatter' as const,
          x: filled.map((l) => l.x),
          y: filled.map((l) => l.y),
          mode: 'markers' as const,
          marker: {
            size: 8,
            color: filled.map((l) =>
              getColorByStockLevel(
                l.quantity,
                highlightOverstock,
                highlightUnderstock,
                overstockThreshold,
                understockThreshold,
                l.color,
              ),
            ),
            symbol: 'square',
            line: { width: 1, color: 'rgb(50,50,50)' },
          },
          text: filled.map(
            (l) =>
              `Zone: ${l.zone}<br>Product Type: ${l.product_type}<br>Quantity: ${l.quantity}` +
              (l.depth_info ? `<br>Depth: ${l.depth_info}` : '') +
              (highlightUnderstock && l.quantity > 0 && l.quantity <= understockThreshold
                ? '<br><b>UNDERSTOCK</b>'
                : '') +
              (highlightOverstock && l.quantity >= overstockThreshold
                ? '<br><b>OVERSTOCK</b>'
                : ''),
          ),
          hoverinfo: 'text' as const,
          name: `Zone ${zone} - ${filled[0].product_type}`,
        });
      }
    }

    // zone labels
    const zoneCenters = groupBy(data, (l) => l.zone);
    for (const [zone, items] of Object.entries(zoneCenters)) {
      if (zone === 'DOCK') continue;
      const cx = items.reduce((s, l) => s + l.x, 0) / items.length;
      const cy = items.reduce((s, l) => s + l.y, 0) / items.length;
      result.push({
        type: 'scatter' as const,
        x: [cx],
        y: [cy],
        mode: 'text' as const,
        text: [` ${zone} `],
        textposition: 'middle center' as const,
        textfont: { size: 14, color: 'black' },
        showlegend: false,
      });
    }

    // legend markers for highlighting
    if (highlightUnderstock) {
      result.push({
        type: 'scatter' as const,
        x: [null],
        y: [null],
        mode: 'markers' as const,
        marker: { size: 10, color: 'rgb(255, 0, 0)' },
        name: 'Understock',
      });
    }
    if (highlightOverstock) {
      result.push({
        type: 'scatter' as const,
        x: [null],
        y: [null],
        mode: 'markers' as const,
        marker: { size: 10, color: 'rgb(255, 215, 0)' },
        name: 'Overstock',
      });
    }

    return result;
  }, [data, highlightOverstock, highlightUnderstock, overstockThreshold, understockThreshold]);

  return (
    <Plot
      data={traces}
      layout={{
        title: 'Warehouse 2D Layout',
        xaxis: { title: 'X' },
        yaxis: { title: 'Y' },
        legend: { yanchor: 'top', y: 0.99, xanchor: 'left', x: 0.01 },
        margin: { l: 40, r: 20, b: 40, t: 40 },
        height: 600,
        autosize: true,
      }}
      config={{ responsive: true }}
      style={{ width: '100%', height: '600px' }}
    />
  );
}
