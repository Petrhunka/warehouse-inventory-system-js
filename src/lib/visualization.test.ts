import { describe, expect, it } from 'vitest';
import { getColorByStockLevel, getStockStatus, rgbString } from './visualization';

describe('getStockStatus', () => {
  it('returns "empty" when quantity is 0', () => {
    expect(getStockStatus(0, true, true, 5, 15)).toBe('empty');
  });

  it('returns "understock" only when highlighting is on and quantity is in range', () => {
    expect(getStockStatus(3, true, false, 5, 15)).toBe('understock');
    expect(getStockStatus(3, false, false, 5, 15)).toBe('normal');
    expect(getStockStatus(5, true, false, 5, 15)).toBe('understock');
  });

  it('returns "overstock" only when highlighting is on and quantity meets threshold', () => {
    expect(getStockStatus(20, false, true, 5, 15)).toBe('overstock');
    expect(getStockStatus(20, false, false, 5, 15)).toBe('normal');
    expect(getStockStatus(15, false, true, 5, 15)).toBe('overstock');
  });

  it('understock classification wins over overstock when both flagged (mutually exclusive thresholds)', () => {
    // quantity 3 is only understock candidate; cannot be both
    expect(getStockStatus(3, true, true, 5, 15)).toBe('understock');
    expect(getStockStatus(20, true, true, 5, 15)).toBe('overstock');
  });
});

describe('getColorByStockLevel', () => {
  it('empty -> gray, understock -> red, overstock -> gold', () => {
    expect(getColorByStockLevel(0, true, true, 15, 5)).toBe('rgb(220, 220, 220)');
    expect(getColorByStockLevel(3, true, true, 15, 5)).toBe('rgb(255, 0, 0)');
    expect(getColorByStockLevel(20, true, true, 15, 5)).toBe('rgb(255, 215, 0)');
  });

  it('falls back to baseColor for normal stock', () => {
    expect(getColorByStockLevel(10, false, false, 15, 5, [10, 20, 30])).toBe('rgb(10, 20, 30)');
  });

  it('uses default blue when no baseColor given', () => {
    expect(getColorByStockLevel(10, false, false, 15, 5)).toBe('rgb(0, 0, 255)');
  });
});

describe('rgbString', () => {
  it('formats an RGB triple', () => {
    expect(rgbString([1, 2, 3])).toBe('rgb(1, 2, 3)');
  });
});
