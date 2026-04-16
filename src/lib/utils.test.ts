import { describe, expect, it } from 'vitest';
import type { Location } from '@/types/warehouse';
import {
  computeZoneStats,
  escapeCsvField,
  groupBy,
  locationsToCsv,
  maxVal,
  mean,
  minVal,
  stocktakingToCsv,
  std,
  sum,
  uniqueValues,
} from './utils';

const loc = (overrides: Partial<Location>): Location => ({
  location_id: 'A-01-01-1',
  zone: 'A',
  row: 1,
  column: 1,
  depth: 1,
  location_type: 'Folded Shelves',
  product_id: 'X',
  quantity: 0,
  product_type: 'T-shirts',
  x: 0,
  y: 0,
  z: 0,
  color: [0, 0, 0],
  depth_info: '',
  ...overrides,
});

describe('groupBy', () => {
  it('buckets items by the key function', () => {
    const items = [loc({ zone: 'A' }), loc({ zone: 'B' }), loc({ zone: 'A' })];
    const out = groupBy(items, (l) => l.zone);
    expect(Object.keys(out).sort()).toEqual(['A', 'B']);
    expect(out.A).toHaveLength(2);
    expect(out.B).toHaveLength(1);
  });
});

describe('aggregations', () => {
  const items = [loc({ quantity: 1 }), loc({ quantity: 3 }), loc({ quantity: 5 })];

  it('sum / mean / min / max', () => {
    expect(sum(items, 'quantity')).toBe(9);
    expect(mean(items, 'quantity')).toBe(3);
    expect(minVal(items, 'quantity')).toBe(1);
    expect(maxVal(items, 'quantity')).toBe(5);
  });

  it('std is 0 for identical values and positive otherwise', () => {
    expect(std([loc({ quantity: 4 }), loc({ quantity: 4 })], 'quantity')).toBe(0);
    expect(std(items, 'quantity')).toBeGreaterThan(0);
  });

  it('handles empty input', () => {
    expect(mean([], 'quantity')).toBe(0);
    expect(minVal([], 'quantity')).toBe(0);
    expect(maxVal([], 'quantity')).toBe(0);
    expect(std([], 'quantity')).toBe(0);
  });
});

describe('uniqueValues', () => {
  it('returns a sorted unique list of string-coerced values', () => {
    const items = [loc({ zone: 'B' }), loc({ zone: 'A' }), loc({ zone: 'B' })];
    expect(uniqueValues(items, 'zone')).toEqual(['A', 'B']);
  });
});

describe('computeZoneStats', () => {
  it('returns per-zone location count and stock total, sorted by zone', () => {
    const items = [
      loc({ zone: 'B', quantity: 2 }),
      loc({ zone: 'A', quantity: 3 }),
      loc({ zone: 'A', quantity: 4 }),
    ];
    expect(computeZoneStats(items)).toEqual([
      { zone: 'A', locations: 2, stock: 7 },
      { zone: 'B', locations: 1, stock: 2 },
    ]);
  });
});

describe('escapeCsvField', () => {
  it('passes plain values through', () => {
    expect(escapeCsvField('hello')).toBe('hello');
    expect(escapeCsvField(42)).toBe('42');
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('quotes and escapes commas, quotes, and newlines', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('a"b')).toBe('"a""b"');
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvField('line1\r\nline2')).toBe('"line1\r\nline2"');
  });
});

describe('locationsToCsv', () => {
  it('emits a header row + one row per location', () => {
    const csv = locationsToCsv([loc({ location_id: 'A-01', quantity: 5 })]);
    const [header, row] = csv.split('\n');
    expect(header).toContain('location_id');
    expect(row.startsWith('A-01,')).toBe(true);
    expect(row).toContain(',5,');
  });

  it('returns an empty string for empty input', () => {
    expect(locationsToCsv([])).toBe('');
  });
});

describe('stocktakingToCsv', () => {
  it('escapes user-supplied notes containing commas and quotes', () => {
    const csv = stocktakingToCsv([
      {
        location_id: 'A-01',
        zone: 'A',
        product_type: 'T-shirts',
        location_type: 'Shelf',
        system_quantity: 5,
        actual_quantity: 4,
        difference: -1,
        notes: 'damaged, "urgent"',
        verification_date: '2026-04-16',
        verified_by: 'Alice',
      },
    ]);
    expect(csv).toContain('"damaged, ""urgent"""');
  });
});
