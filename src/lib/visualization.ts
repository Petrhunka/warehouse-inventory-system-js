export type StockStatus = 'empty' | 'understock' | 'overstock' | 'normal';

export function getStockStatus(
  quantity: number,
  highlightUnderstock: boolean,
  highlightOverstock: boolean,
  understockThreshold: number,
  overstockThreshold: number,
): StockStatus {
  if (quantity === 0) return 'empty';
  if (highlightUnderstock && quantity > 0 && quantity <= understockThreshold) return 'understock';
  if (highlightOverstock && quantity >= overstockThreshold) return 'overstock';
  return 'normal';
}

export function getColorByStockLevel(
  quantity: number,
  highlightOverstock: boolean,
  highlightUnderstock: boolean,
  overstockThreshold: number,
  understockThreshold: number,
  baseColor?: [number, number, number],
): string {
  const status = getStockStatus(
    quantity,
    highlightUnderstock,
    highlightOverstock,
    understockThreshold,
    overstockThreshold,
  );
  if (status === 'empty') return 'rgb(220, 220, 220)';
  if (status === 'understock') return 'rgb(255, 0, 0)';
  if (status === 'overstock') return 'rgb(255, 215, 0)';
  if (baseColor && baseColor.length >= 3) {
    return `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;
  }
  return 'rgb(0, 0, 255)';
}

export function rgbString(color: [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}
