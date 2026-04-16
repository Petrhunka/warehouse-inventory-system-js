'use client';

import dynamic from 'next/dynamic';
import { memo, useMemo } from 'react';
import { Location } from '@/types/warehouse';
import { getColorByStockLevel, getStockStatus, rgbString } from '@/lib/visualization';
import { groupBy } from '@/lib/utils';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface Props {
  data: Location[];
  highlightOverstock: boolean;
  highlightUnderstock: boolean;
  overstockThreshold: number;
  understockThreshold: number;
}

function Warehouse3DPlot({
  data,
  highlightOverstock,
  highlightUnderstock,
  overstockThreshold,
  understockThreshold,
}: Props) {
  const traces = useMemo(() => {
    const byZone = groupBy(data, (l) => l.zone);
    const result: Plotly.Data[] = [];

    for (const [zone, items] of Object.entries(byZone)) {
      const empty = items.filter((l) => l.quantity === 0);
      const filled = items.filter((l) => l.quantity > 0);

      if (empty.length > 0) {
        result.push({
          type: 'scatter3d' as const,
          x: empty.map((l) => l.x),
          y: empty.map((l) => l.y),
          z: empty.map((l) => l.z),
          mode: 'markers' as const,
          marker: {
            size: 4,
            color: empty.map((l) => rgbString(l.color)),
            opacity: 0.5,
            symbol: 'square',
            line: { width: 1, color: 'rgb(50,50,50)' },
          },
          text: empty.map(
            (l) =>
              `ID: ${l.location_id}<br>Zone: ${l.zone}<br>Product Type: ${l.product_type}<br>Product: Empty<br>Quantity: 0` +
              (l.depth_info ? `<br>Depth: ${l.depth_info}` : ''),
          ),
          hoverinfo: 'text' as const,
          name: `Zone ${zone} - Empty`,
        });
      }

      if (filled.length > 0) {
        result.push({
          type: 'scatter3d' as const,
          x: filled.map((l) => l.x),
          y: filled.map((l) => l.y),
          z: filled.map((l) => l.z),
          mode: 'markers' as const,
          marker: {
            size: filled.map((l) => Math.max(3, Math.min(l.quantity * 0.5, 12))),
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
            opacity: 1.0,
            symbol: 'square',
            line: { width: 1, color: 'rgb(50,50,50)' },
          },
          text: filled.map((l) => {
            const status = getStockStatus(
              l.quantity,
              highlightUnderstock,
              highlightOverstock,
              understockThreshold,
              overstockThreshold,
            );
            return (
              `ID: ${l.location_id}<br>Zone: ${l.zone}<br>Product Type: ${l.product_type}<br>Product: ${l.product_id}<br>Quantity: ${l.quantity}` +
              (l.depth_info ? `<br>Depth: ${l.depth_info}` : '') +
              (status === 'understock' ? '<br><b>UNDERSTOCK</b>' : '') +
              (status === 'overstock' ? '<br><b>OVERSTOCK</b>' : '')
            );
          }),
          hoverinfo: 'text' as const,
          name: `Zone ${zone} - ${filled[0].product_type}`,
        });
      }
    }

    // zone labels
    for (const [zone, items] of Object.entries(byZone)) {
      if (zone === 'DOCK') continue;
      const cx = items.reduce((s, l) => s + l.x, 0) / items.length;
      const cy = items.reduce((s, l) => s + l.y, 0) / items.length;
      const cz = Math.max(...items.map((l) => l.z)) + 2;
      result.push({
        type: 'scatter3d' as const,
        x: [cx],
        y: [cy],
        z: [cz],
        mode: 'text' as const,
        text: [` ${zone} `],
        textposition: 'top center' as const,
        textfont: { size: 14, color: 'black' },
        showlegend: false,
      });
    }

    return result;
  }, [data, highlightOverstock, highlightUnderstock, overstockThreshold, understockThreshold]);

  return (
    <Plot
      data={traces}
      layout={{
        title: 'Warehouse Layout Visualization',
        scene: {
          xaxis: { title: 'X' },
          yaxis: { title: 'Y' },
          zaxis: { title: 'Z' },
          aspectmode: 'data',
          camera: { eye: { x: 0.5, y: 0, z: 2.5 } },
        },
        legend: { yanchor: 'top', y: 0.99, xanchor: 'left', x: 0.01 },
        margin: { l: 0, r: 0, b: 0, t: 40 },
        height: 700,
        autosize: true,
      }}
      config={{ responsive: true }}
      style={{ width: '100%', height: '700px' }}
    />
  );
}

export default memo(Warehouse3DPlot);
