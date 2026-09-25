export type CartQuantityUnit = "base" | "carton";

export interface QuantityProduct {
  unit?: string | null;
  conversionValue?: number | null;
}

const MAX_QUANTITY_DECIMALS = 4;
const MAX_DISPLAY_DECIMALS = 2;

function roundToDisplayDecimals(value: number): number {
  const factor = 10 ** MAX_DISPLAY_DECIMALS;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function getConversionValue(
  product: QuantityProduct | null | undefined,
  conversionValueSnapshot?: number | null,
): number {
  const snapshot = Number(conversionValueSnapshot);
  if (Number.isFinite(snapshot) && snapshot > 1) return snapshot;
  const current = Number(product?.conversionValue);
  return Number.isFinite(current) && current > 1 ? current : 1;
}

export function supportsCartonUnit(
  product: QuantityProduct | null | undefined,
): boolean {
  const current = Number(product?.conversionValue);
  return Number.isFinite(current) && current > 1;
}

export function getBaseUnitLabel(
  product: QuantityProduct | null | undefined,
): string {
  return product?.unit || "Đơn vị";
}

export function normalizeQuantityUnit(
  unit: CartQuantityUnit | undefined,
  product: QuantityProduct | null | undefined,
  conversionValueSnapshot?: number | null,
): CartQuantityUnit {
  void conversionValueSnapshot;
  return unit === "carton" && supportsCartonUnit(product) ? "carton" : "base";
}

export function formatQuantity(value: number): string {
  return roundToDisplayDecimals(Number(value || 0)).toLocaleString("vi-VN", {
    useGrouping: false,
    maximumFractionDigits: MAX_DISPLAY_DECIMALS,
  });
}

export function getDisplayedQuantity(
  quantity: number,
  unit: CartQuantityUnit,
  product: QuantityProduct | null | undefined,
  conversionValueSnapshot?: number | null,
): number {
  const conversionValue = getConversionValue(product, conversionValueSnapshot);
  return unit === "carton" ? Number(quantity || 0) / conversionValue : quantity;
}

export function formatDisplayedQuantity(
  quantity: number,
  unit: CartQuantityUnit,
  product: QuantityProduct | null | undefined,
  conversionValueSnapshot?: number | null,
): string {
  return formatQuantity(
    getDisplayedQuantity(quantity, unit, product, conversionValueSnapshot),
  );
}

export function parseQuantityInput(value: string): number | null {
  const normalized = value.replace(/[^\d,]/g, "");
  const commaIndex = normalized.indexOf(",");
  const canonical =
    commaIndex >= 0
      ? `${normalized.slice(0, commaIndex)}.${normalized
          .slice(commaIndex + 1)
          .replace(/,/g, "")}`
      : normalized;

  if (!canonical || canonical === ".") return null;

  const parsed = Number(canonical);
  return Number.isFinite(parsed) && parsed > 0
    ? roundToDisplayDecimals(parsed)
    : null;
}

export function sanitizeQuantityInput(
  value: string,
  previousValue: string,
): string {
  if (value.includes(".")) return previousValue;

  const normalized = value.replace(/[^\d,]/g, "");
  const commaIndex = normalized.indexOf(",");
  if (commaIndex < 0) return normalized;

  const fraction = normalized.slice(commaIndex + 1).replace(/,/g, "");
  if (fraction.length <= MAX_DISPLAY_DECIMALS) {
    return `${normalized.slice(0, commaIndex)},${fraction}`;
  }

  const rounded = roundToDisplayDecimals(
    Number(`${normalized.slice(0, commaIndex)}.${fraction}`),
  );
  return formatQuantity(rounded);
}

export function toBaseQuantity(
  displayQuantity: number,
  unit: CartQuantityUnit,
  product: QuantityProduct | null | undefined,
  conversionValueSnapshot?: number | null,
): number {
  const conversionValue = getConversionValue(product, conversionValueSnapshot);
  const roundedDisplayQuantity = roundToDisplayDecimals(displayQuantity);
  const baseQuantity =
    unit === "carton"
      ? roundedDisplayQuantity * conversionValue
      : roundedDisplayQuantity;
  const factor = 10 ** MAX_QUANTITY_DECIMALS;
  return Math.round(baseQuantity * factor) / factor;
}

export function getQuantityStep(
  unit: CartQuantityUnit,
  product: QuantityProduct | null | undefined,
  conversionValueSnapshot?: number | null,
): number {
  return unit === "carton"
    ? getConversionValue(product, conversionValueSnapshot)
    : 1;
}
