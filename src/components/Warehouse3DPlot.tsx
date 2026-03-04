'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Location } from '@/types/warehouse';
import { getColorByStockLevel, rgbString } from '@/lib/visualization';
import { groupBy } from '@/lib/utils';

const ReactECharts = dynamic(
  () => import('echarts-gl').then(() => import('echarts-for-react')),
  { ssr: false },
);

interface Scatter3DData {
  value: [number, number, number];
  loc: Location;
  itemStyle: { color: string; opacity?: number };
}

interface Props {
  data: Location[];
  highlightOverstock: boolean;
  highlightUnderstock: boolean;
  overstockThreshold: number;
  understockThreshold: number;
}

export default function Warehouse3DPlot({
  data,
  highlightOverstock,
  highlightUnderstock,
  overstockThreshold,
  understockThreshold,
}: Props) {
  const option = useMemo(() => {
    const byZone = groupBy(data, (l) => l.zone);
    const series: object[] = [];

    for (const [zone, items] of Object.entries(byZone)) {
      const empty = items.filter((l) => l.quantity === 0);
      const filled = items.filter((l) => l.quantity > 0);

      if (empty.length > 0) {
        series.push({
          type: 'scatter3D',
          name: `Zone ${zone} - Empty`,
          data: empty.map((l) => ({
            value: [l.x, l.y, l.z],
            loc: l,
            itemStyle: { color: rgbString(l.color), opacity: 0.5 },
          })) as Scatter3DData[],
          symbolSize: 4,
          emphasis: { itemStyle: { borderColor: '#333', borderWidth: 1 } },
        });
      }

      if (filled.length > 0) {
        series.push({
          type: 'scatter3D',
          name: `Zone ${zone} - ${filled[0].product_type}`,
          data: filled.map((l) => ({
            value: [l.x, l.y, l.z],
            loc: l,
            itemStyle: {
              color: getColorByStockLevel(
                l.quantity,
                highlightOverstock,
                highlightUnderstock,
                overstockThreshold,
                understockThreshold,
                l.color,
              ),
            },
          })) as Scatter3DData[],
          symbolSize: filled.map((l) => Math.max(3, Math.min(l.quantity * 0.5, 12))),
          emphasis: { itemStyle: { borderColor: '#333', borderWidth: 1 } },
        });
      }
    }

    return {
      title: { text: 'Warehouse Layout Visualization', left: 'center', top: 8 },
      tooltip: {
        trigger: 'item',
        formatter: (params: { data?: Scatter3DData }) => {
          const loc = params.data?.loc;
          if (!loc) return '';
          const lines = [
            `ID: ${loc.location_id}`,
            `Zone: ${loc.zone}`,
            `Product Type: ${loc.product_type}`,
            loc.quantity === 0 ? 'Product: Empty' : `Product: ${loc.product_id}`,
            `Quantity: ${loc.quantity}`,
          ];
          if (loc.depth_info) lines.push(`Depth: ${loc.depth_info}`);
          if (highlightUnderstock && loc.quantity > 0 && loc.quantity <= understockThreshold) {
            lines.push('<b>UNDERSTOCK</b>');
          }
          if (highlightOverstock && loc.quantity >= overstockThreshold) {
            lines.push('<b>OVERSTOCK</b>');
          }
          return lines.join('<br/>');
        },
      },
      grid3D: {
        boxWidth: 120,
        boxDepth: 80,
        viewControl: { autoRotate: false, distance: 180 },
        light: {
          main: { intensity: 1.2 },
          ambient: { intensity: 0.4 },
        },
        axisPointer: { show: false },
      },
      xAxis3D: { type: 'value', name: 'X' },
      yAxis3D: { type: 'value', name: 'Y' },
      zAxis3D: { type: 'value', name: 'Z' },
      legend: {
        orient: 'vertical',
        left: 8,
        top: 40,
        data: series.map((s: { name?: string }) => s.name),
      },
      series,
    };
  }, [
    data,
    highlightOverstock,
    highlightUnderstock,
    overstockThreshold,
    understockThreshold,
  ]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden">
      <ReactECharts
        option={option}
        style={{ height: 700, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
