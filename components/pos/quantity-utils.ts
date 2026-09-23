export type CartQuantityUnit = "base" | "carton";

export interface QuantityProduct {
  unit?: string | null;
  conversionValue?: number | null;
}

const MAX_QUANTITY_DECIMALS = 4;

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
  return unit === "carton" && supportsCartonUnit(product) ? "carton" : "base";
}

export function formatQuantity(value: number): string {
  return Number(value || 0).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
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
  const normalized = value
    .replace(/,/g, ".")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");

  if (!normalized || normalized === ".") return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function toBaseQuantity(
  displayQuantity: number,
  unit: CartQuantityUnit,
  product: QuantityProduct | null | undefined,
  conversionValueSnapshot?: number | null,
): number {
  const conversionValue = getConversionValue(product, conversionValueSnapshot);
  const baseQuantity =
    unit === "carton" ? displayQuantity * conversionValue : displayQuantity;
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
