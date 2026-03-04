import { Location } from '@/types/warehouse';

export function groupBy<K extends string>(
  items: Location[],
  keyFn: (item: Location) => K,
): Record<K, Location[]> {
  const result = {} as Record<K, Location[]>;
  for (const item of items) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

export function sum(items: Location[], field: keyof Location): number {
  let total = 0;
  for (const item of items) {
    const v = item[field];
    if (typeof v === 'number') total += v;
  }
  return total;
}

export function mean(items: Location[], field: keyof Location): number {
  if (items.length === 0) return 0;
  return sum(items, field) / items.length;
}

export function std(items: Location[], field: keyof Location): number {
  if (items.length === 0) return 0;
  const avg = mean(items, field);
  let sumSq = 0;
  for (const item of items) {
    const v = item[field];
    if (typeof v === 'number') {
      sumSq += (v - avg) ** 2;
    }
  }
  return Math.sqrt(sumSq / items.length);
}

export function minVal(items: Location[], field: keyof Location): number {
  let min = Infinity;
  for (const item of items) {
    const v = item[field];
    if (typeof v === 'number' && v < min) min = v;
  }
  return min === Infinity ? 0 : min;
}

export function maxVal(items: Location[], field: keyof Location): number {
  let max = -Infinity;
  for (const item of items) {
    const v = item[field];
    if (typeof v === 'number' && v > max) max = v;
  }
  return max === -Infinity ? 0 : max;
}

export function uniqueValues(items: Location[], field: keyof Location): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const v = item[field];
    if (v != null) set.add(String(v));
  }
  return Array.from(set).sort();
}

export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function locationsToCsv(locations: Location[]): string {
  if (locations.length === 0) return '';
  const headers = [
    'location_id', 'zone', 'row', 'column', 'depth', 'location_type',
    'product_id', 'quantity', 'product_type', 'x', 'y', 'z',
  ];
  const rows = locations.map((loc) =>
    headers.map((h) => {
      const val = loc[h as keyof Location];
      return val == null ? '' : String(val);
    }).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

export function stocktakingToCsv(
  rows: Array<{
    location_id: string;
    zone: string;
    product_type: string;
    location_type: string;
    system_quantity: number;
    actual_quantity: number;
    difference: number;
    notes: string;
    verification_date: string;
    verified_by: string;
  }>,
): string {
  if (rows.length === 0) return '';
  const headers = [
    'location_id', 'zone', 'product_type', 'location_type',
    'system_quantity', 'actual_quantity', 'difference',
    'notes', 'verification_date', 'verified_by',
  ];
  const csvRows = rows.map((r) =>
    headers.map((h) => {
      const val = r[h as keyof typeof r];
      const s = val == null ? '' : String(val);
      return s.includes(',') ? `"${s}"` : s;
    }).join(','),
  );
  return [headers.join(','), ...csvRows].join('\n');
}
