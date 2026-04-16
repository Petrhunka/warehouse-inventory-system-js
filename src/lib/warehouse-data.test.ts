import { describe, expect, it } from 'vitest';
import { generateRealisticWarehouse } from './warehouse-data';

describe('generateRealisticWarehouse', () => {
  it('produces a non-empty list with the expected Location shape', () => {
    const data = generateRealisticWarehouse();
    expect(data.length).toBeGreaterThan(0);

    const sample = data[0];
    expect(typeof sample.location_id).toBe('string');
    expect(typeof sample.zone).toBe('string');
    expect(typeof sample.quantity).toBe('number');
    expect(Array.isArray(sample.color)).toBe(true);
    expect(sample.color).toHaveLength(3);
  });

  it('includes dock locations', () => {
    const data = generateRealisticWarehouse();
    expect(data.some((l) => l.zone === 'DOCK')).toBe(true);
  });

  it('quantity is non-negative for every location', () => {
    const data = generateRealisticWarehouse();
    expect(data.every((l) => l.quantity >= 0)).toBe(true);
  });

  it('filled locations have a non-null product_id', () => {
    const data = generateRealisticWarehouse();
    for (const l of data) {
      if (l.quantity > 0) {
        expect(l.product_id).not.toBeNull();
      }
    }
  });
});
