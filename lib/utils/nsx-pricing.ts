/**
 * Giá nguyên liệu NSX bổ sung — bản sao logic backend
 * (`hisweetie_ban_hang_backend/src/common/nsx-pricing.util.ts`).
 * Lượng và đơn giá đều theo g | kg | gói; g ↔ kg quy đổi, gói chỉ đi với gói.
 */
export const NSX_UNITS = ["g", "kg", "gói"] as const;
export type NsxUnit = (typeof NSX_UNITS)[number];

const GRAMS: Record<string, number> = { g: 1, kg: 1000 };

export const normalizeNsxUnit = (value?: string | null) =>
  (value ?? "").normalize("NFC").trim().toLowerCase();

export const isNsxUnit = (value?: string | null): value is NsxUnit =>
  (NSX_UNITS as readonly string[]).includes(normalizeNsxUnit(value));

/** Đơn vị giá được chọn cho một đơn vị lượng. */
export const compatiblePriceUnits = (unit?: string | null): NsxUnit[] => {
  const u = normalizeNsxUnit(unit);
  if (u === "gói") return ["gói"];
  if (u in GRAMS) return ["g", "kg"];
  return [];
};

/** Số đơn vị giá trong 1 đơn vị lượng; null khi không quy đổi được. */
export function nsxPriceFactor(
  unit?: string | null,
  priceUnit?: string | null,
): number | null {
  const from = normalizeNsxUnit(unit);
  const to = normalizeNsxUnit(priceUnit);
  if (!isNsxUnit(from) || !isNsxUnit(to)) return null;
  if (from === to) return 1;
  if (from in GRAMS && to in GRAMS) return GRAMS[from] / GRAMS[to];
  return null;
}

export const round2 = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export const round4 = (value: number) =>
  Math.round((value + Number.EPSILON) * 10000) / 10000;
export const round6 = (value: number) =>
  Math.round((value + Number.EPSILON) * 1e6) / 1e6;

/** Thành tiền chưa làm tròn = lượng × quy đổi × đơn giá (0 khi đơn vị không hợp lệ). */
export function nsxRawAmount(line: {
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  priceUnit?: string | null;
}) {
  const factor = nsxPriceFactor(line.unit, line.priceUnit);
  if (factor == null) return 0;
  return Number(line.quantity ?? 0) * factor * Number(line.unitPrice ?? 0);
}

export const currencySymbol = (currency?: string | null) =>
  currency === "CNY" ? "CNY" : "đ";

/** "đ/kg", "CNY/gói". */
export const priceUnitLabel = (
  currency: string | null | undefined,
  unit: string,
) => `${currencySymbol(currency)}/${unit}`;

/** Đơn vị mặc định khi chọn sản phẩm NSX: đơn vị sản phẩm nếu là g/kg/gói, không thì g. */
export function defaultNsxUnits(productUnit?: string | null): {
  unit: NsxUnit;
  priceUnit: NsxUnit;
} {
  const u = normalizeNsxUnit(productUnit);
  if (u === "gói") return { unit: "gói", priceUnit: "gói" };
  if (u === "g") return { unit: "g", priceUnit: "g" };
  return { unit: "g", priceUnit: "kg" };
}

/**
 * Nhân định lượng / 1 sp với số lượng thành phẩm. Lượng trên phiếu lưu 4 số lẻ:
 * nếu kg × số lượng bị cắt mất số lẻ thì đổi sang g (đơn giá giữ nguyên theo kg).
 */
export function scaleNsxQuantity(
  quantityPerUnit: number,
  unit: string,
  outputQuantity: number,
) {
  const raw = Number(quantityPerUnit) * Number(outputQuantity);
  if (normalizeNsxUnit(unit) === "kg" && round4(raw) !== round6(raw)) {
    return { quantity: round4(raw * 1000), unit: "g" as NsxUnit };
  }
  return { quantity: round4(raw), unit: normalizeNsxUnit(unit) as NsxUnit };
}
