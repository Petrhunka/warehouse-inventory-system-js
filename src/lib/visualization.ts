export function getColorByStockLevel(
  quantity: number,
  highlightOverstock: boolean,
  highlightUnderstock: boolean,
  overstockThreshold: number,
  understockThreshold: number,
  baseColor?: [number, number, number],
): string {
  if (quantity === 0) {
    return 'rgb(220, 220, 220)';
  }
  if (highlightUnderstock && quantity > 0 && quantity <= understockThreshold) {
    return 'rgb(255, 0, 0)';
  }
  if (highlightOverstock && quantity >= overstockThreshold) {
    return 'rgb(255, 215, 0)';
  }
  if (baseColor && baseColor.length >= 3) {
    return `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;
  }
  return 'rgb(0, 0, 255)';
}

export function rgbString(color: [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}
