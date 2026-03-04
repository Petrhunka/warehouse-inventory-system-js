'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Location } from '@/types/warehouse';
import { getColorByStockLevel, rgbString } from '@/lib/visualization';
import { groupBy } from '@/lib/utils';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface ScatterData {
  value: [number, number];
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
  const option = useMemo(() => {
    const byZone = groupBy(data, (l) => l.zone);
    const series: object[] = [];

    for (const [zone, rawItems] of Object.entries(byZone)) {
      const items = dedup(rawItems);
      const empty = items.filter((l) => l.quantity === 0);
      const filled = items.filter((l) => l.quantity > 0);

      if (empty.length > 0) {
        series.push({
          type: 'scatter',
          name: `Zone ${zone} - Empty`,
          data: empty.map((l) => ({
            value: [l.x, l.y],
            loc: l,
            itemStyle: { color: rgbString(l.color), opacity: 0.5 },
          })) as ScatterData[],
          symbolSize: 8,
          symbol: 'square',
          itemStyle: { borderColor: 'rgb(50,50,50)', borderWidth: 1 },
          emphasis: { scale: true },
        });
      }

      if (filled.length > 0) {
        series.push({
          type: 'scatter',
          name: `Zone ${zone} - ${filled[0].product_type}`,
          data: filled.map((l) => ({
            value: [l.x, l.y],
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
          })) as ScatterData[],
          symbolSize: 8,
          symbol: 'square',
          itemStyle: { borderColor: 'rgb(50,50,50)', borderWidth: 1 },
          emphasis: { scale: true },
        });
      }
    }

    if (highlightUnderstock) {
      series.push({
        type: 'scatter',
        name: 'Understock',
        data: [],
        symbolSize: 10,
        itemStyle: { color: 'rgb(255, 0, 0)' },
        symbol: 'square',
      });
    }
    if (highlightOverstock) {
      series.push({
        type: 'scatter',
        name: 'Overstock',
        data: [],
        symbolSize: 10,
        itemStyle: { color: 'rgb(255, 215, 0)' },
        symbol: 'square',
      });
    }

    return {
      title: { text: 'Warehouse 2D Layout', left: 'center', top: 8 },
      tooltip: {
        trigger: 'item',
        formatter: (params: { data?: ScatterData }) => {
          const loc = params.data?.loc;
          if (!loc) return '';
          const lines = [
            `Zone: ${loc.zone}`,
            `Product Type: ${loc.product_type}`,
            loc.quantity === 0 ? 'Status: Empty' : `Quantity: ${loc.quantity}`,
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
      xAxis: { type: 'value', name: 'X', splitLine: { show: false } },
      yAxis: { type: 'value', name: 'Y', splitLine: { show: false } },
      legend: {
        orient: 'vertical',
        left: 8,
        top: 40,
        data: series.map((s: { name?: string }) => s.name),
      },
      grid: { left: 50, right: 24, bottom: 40, top: 48, containLabel: true },
      series,
    };
  }, [data, highlightOverstock, highlightUnderstock, overstockThreshold, understockThreshold]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden">
      <ReactECharts
        option={option}
        style={{ height: 600, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
