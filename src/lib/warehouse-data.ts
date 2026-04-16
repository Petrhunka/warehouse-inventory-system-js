import { Location, ZoneConfig, ZonePosition } from '@/types/warehouse';

const ZONE_CONFIGS: Record<string, ZoneConfig> = {
  A: { product: 'T-shirts', rows: 2, cols: 20, depth: 3, color: [0, 0, 220] },
  B: { product: 'Jeans', rows: 2, cols: 20, depth: 3, color: [0, 0, 200] },
  C: { product: 'Dresses', rows: 2, cols: 20, depth: 3, color: [0, 0, 180] },
  D: { product: 'Sweaters', rows: 2, cols: 20, depth: 3, color: [0, 0, 160] },
  E: { product: 'Jackets', rows: 2, cols: 20, depth: 3, color: [0, 0, 140] },
  F: { product: 'Shoes', rows: 2, cols: 20, depth: 3, color: [0, 0, 120] },
  G: { product: 'Accessories', rows: 2, cols: 20, depth: 3, color: [0, 0, 100] },
  H: { product: 'Socks', rows: 1, cols: 20, depth: 3, color: [100, 0, 100] },
  J: { product: 'Underwear', rows: 1, cols: 20, depth: 3, color: [120, 0, 0] },
  K: { product: 'Premium Apparel', rows: 6, cols: 12, depth: 2, color: [160, 0, 0] },
  L: { product: 'Seasonal Items', rows: 6, cols: 10, depth: 3, color: [180, 0, 0] },
  M: { product: 'Designer Brands', rows: 6, cols: 8, depth: 2, color: [200, 0, 0] },
  N: { product: 'New Arrivals', rows: 4, cols: 6, depth: 1, color: [0, 120, 0] },
  P: { product: 'Sale Items', rows: 6, cols: 5, depth: 1, color: [0, 140, 0] },
  Q: { product: 'Kids Clothing', rows: 6, cols: 5, depth: 1, color: [0, 160, 0] },
  R: { product: 'Plus Size Collection', rows: 12, cols: 6, depth: 1, color: [0, 180, 0] },
  S: { product: 'Athletic Wear', rows: 7, cols: 10, depth: 1, color: [220, 120, 0] },
  T: { product: 'Returns Processing', rows: 5, cols: 3, depth: 1, color: [220, 220, 0] },
  U: { product: 'Outbound Shipping', rows: 12, cols: 6, depth: 2, color: [0, 220, 0] },
};

const LOCATION_TYPES: Record<string, string> = {
  'T-shirts': 'Folded Shelves',
  'Jeans': 'Folded Shelves',
  'Dresses': 'Hanging Racks',
  'Sweaters': 'Folded Shelves',
  'Jackets': 'Hanging Racks',
  'Shoes': 'Shoe Racks',
  'Accessories': 'Small Item Bins',
  'Socks': 'Small Item Bins',
  'Underwear': 'Small Item Bins',
  'Premium Apparel': 'Secure Storage',
  'Seasonal Items': 'Bulk Storage',
  'Designer Brands': 'Secure Storage',
  'New Arrivals': 'Front-Facing Displays',
  'Sale Items': 'Sale Racks',
  'Kids Clothing': 'Age-Sorted Shelves',
  'Plus Size Collection': 'Size-Sorted Racks',
  'Athletic Wear': 'Activity-Sorted Racks',
  'Returns Processing': 'Sorting Area',
  'Outbound Shipping': 'Packing Station',
};

const POSITIONS: Record<string, ZonePosition> = {
  A: { x: 10, y: 70, z: 0 },
  B: { x: 10, y: 60, z: 0 },
  C: { x: 10, y: 50, z: 0 },
  D: { x: 10, y: 40, z: 0 },
  E: { x: 10, y: 30, z: 0 },
  F: { x: 10, y: 20, z: 0 },
  G: { x: 10, y: 10, z: 0 },
  H: { x: 10, y: 5, z: 0 },
  J: { x: 60, y: 5, z: 0 },
  K: { x: 60, y: 20, z: 0 },
  L: { x: 60, y: 50, z: 0 },
  M: { x: 80, y: 40, z: 0 },
  N: { x: 90, y: 70, z: 0 },
  P: { x: 70, y: 60, z: 0 },
  Q: { x: 80, y: 60, z: 0 },
  R: { x: 90, y: 40, z: 0 },
  S: { x: 40, y: 80, z: 0 },
  T: { x: 5, y: 40, z: 0 },
  U: { x: 90, y: 15, z: 0 },
};

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SHOE_SIZES = ['6', '7', '8', '9', '10', '11', '12'];
const NUMERIC_ZONE_IDS = new Set(['K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'U']);
const DEEP_ZONE_IDS = new Set(['J', 'K', 'L', 'U']);

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRealisticWarehouse(): Location[] {
  const locations: Location[] = [];

  for (const [zoneId, config] of Object.entries(ZONE_CONFIGS)) {
    const base = POSITIONS[zoneId];
    const productType = config.product;
    const locationType = LOCATION_TYPES[productType];

    for (let row = 1; row <= config.rows; row++) {
      for (let col = 1; col <= config.cols; col++) {
        for (let depth = 1; depth <= config.depth; depth++) {
          let locId: string;
          if (NUMERIC_ZONE_IDS.has(zoneId)) {
            const locNum = row * 2 - 1;
            locId = `${locNum + 100}`;
          } else {
            locId = `${zoneId}-${String(row).padStart(2, '0')}-${String(col).padStart(2, '0')}-${depth}`;
          }

          const hasStock = Math.random() > 0.3;
          let productId: string | null = null;
          let quantity = 0;

          if (hasStock) {
            if (productType === 'Shoes') {
              const size = randomChoice(SHOE_SIZES);
              const style = randomChoice(['Running', 'Casual', 'Dress', 'Sport']);
              productId = `${style}-${size}`;
            } else {
              const size = randomChoice(SIZES);
              const color = randomChoice(['Black', 'White', 'Blue', 'Red', 'Green', 'Gray']);
              productId = `${productType.slice(0, 3)}-${color.slice(0, 3)}-${size}`;
            }
            quantity = Math.floor(Math.random() * 20) + 1;
          }

          const depthInfo = DEEP_ZONE_IDS.has(zoneId)
            ? `${config.depth}-Deep`
            : '';

          locations.push({
            location_id: locId,
            zone: zoneId,
            row,
            column: col,
            depth,
            location_type: locationType,
            product_id: productId,
            quantity,
            product_type: productType,
            x: base.x + col * 1.5,
            y: base.y + row * 2,
            z: base.z + depth * 1.5,
            color: config.color,
            depth_info: depthInfo,
          });
        }
      }
    }
  }

  for (let i = 1; i <= 5; i++) {
    locations.push({
      location_id: `DOCK-${i}`,
      zone: 'DOCK',
      row: i,
      column: 1,
      depth: 1,
      location_type: 'Receiving Dock',
      product_id: null,
      quantity: 0,
      product_type: 'Incoming Shipments',
      x: 2,
      y: 30 + i * 5,
      z: 0,
      color: [255, 255, 0],
      depth_info: '',
    });
  }

  return locations;
}

const STORAGE_KEY = 'warehouse_data';

function isLocation(value: unknown): value is Location {
  if (value === null || typeof value !== 'object') return false;
  const l = value as Record<string, unknown>;
  return (
    typeof l.location_id === 'string' &&
    typeof l.zone === 'string' &&
    typeof l.row === 'number' &&
    typeof l.column === 'number' &&
    typeof l.depth === 'number' &&
    typeof l.location_type === 'string' &&
    (l.product_id === null || typeof l.product_id === 'string') &&
    typeof l.quantity === 'number' &&
    typeof l.product_type === 'string' &&
    typeof l.x === 'number' &&
    typeof l.y === 'number' &&
    typeof l.z === 'number' &&
    Array.isArray(l.color) &&
    l.color.length === 3 &&
    l.color.every((c) => typeof c === 'number') &&
    typeof l.depth_info === 'string'
  );
}

function isLocationArray(value: unknown): value is Location[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  // Spot-check: first, middle, and last entries cover schema drift in most cases.
  const indices = [0, Math.floor(value.length / 2), value.length - 1];
  return indices.every((i) => isLocation(value[i]));
}

export function getWarehouseData(): Location[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isLocationArray(parsed)) {
          return parsed;
        }
        console.warn('warehouse_data failed schema validation; regenerating.');
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Failed to read warehouse_data from localStorage:', err);
    }
  }
  const data = generateRealisticWarehouse();
  persistWarehouseData(data);
  return data;
}

export function persistWarehouseData(data: Location[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to persist warehouse_data (quota?):', err);
    }
  }
}

export function regenerateWarehouseData(): Location[] {
  const data = generateRealisticWarehouse();
  persistWarehouseData(data);
  return data;
}
