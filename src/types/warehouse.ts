export interface Location {
  location_id: string;
  zone: string;
  row: number;
  column: number;
  depth: number;
  location_type: string;
  product_id: string | null;
  quantity: number;
  product_type: string;
  x: number;
  y: number;
  z: number;
  color: [number, number, number];
  depth_info: string;
}

export interface ZoneConfig {
  product: string;
  rows: number;
  cols: number;
  depth: number;
  color: [number, number, number];
}

export interface ZonePosition {
  x: number;
  y: number;
  z: number;
}

export interface VerifiedLocation {
  actual_quantity: number;
  notes: string;
  verification_date: string;
  verified_by: string;
}

export interface StocktakingSession {
  date: string;
  worker: string;
  verified: Record<string, VerifiedLocation>;
}

export interface ZoneStat {
  zone: string;
  locations: number;
  stock: number;
}

export interface ProductInventory {
  product_type: string;
  quantity: number;
}

export interface LocationInventory {
  location_type: string;
  total_items: number;
  locations: number;
  avg_per_location: number;
  utilization: number;
}

export interface BalanceData {
  product_type: string;
  avg_quantity: number;
  std_quantity: number;
  min_quantity: number;
  max_quantity: number;
  total_quantity: number;
  location_count: number;
  cv: number;
}

export type StocktakeFocus = 'overstock' | 'all' | 'empty';
export type StocktakeSort = 'zone' | 'quantity_desc' | 'product_type' | 'location_id';
