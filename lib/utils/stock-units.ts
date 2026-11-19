import type { Product } from "@/lib/api/products";

/**
 * Quy đổi lượng nguyên liệu (g / kg / đơn vị kho) sang đơn vị kho — cùng quy
 * tắc `ownConversion` ở backend. Dùng chung cho phiếu gửi sản xuất và phiếu
 * nguyên liệu tại NSX.
 */
type UnitProduct = Pick<
  Product,
  "unit" | "weight" | "weightUnit" | "isPieceUnit"
>;

/** Gram của 1 đơn vị kho (0 = chưa khai khối lượng). */
export const gramsPerStockUnit = (product?: Partial<UnitProduct> | null) =>
  Number(product?.weight ?? 0) * (product?.weightUnit === "kg" ? 1000 : 1);

/** Hệ số đổi lượng nhập sang đơn vị kho; null = không quy đổi được. */
export const stockFactor = (
  product: Partial<UnitProduct> | null | undefined,
  unit: string,
) => {
  if (!product) return null;
  if (unit === product.unit || unit === "unit") return 1;
  const grams = gramsPerStockUnit(product);
  if (grams > 0 && (unit === "g" || unit === "kg"))
    return (unit === "kg" ? 1000 : 1) / grams;
  return null;
};

/**
 * Hàng có khối lượng (vd thùng 20 kg) gửi theo gram như công thức; hàng
 * không có khối lượng / tính theo chiếc thì theo đơn vị kho.
 */
export const defaultOwnUnit = (product: Partial<UnitProduct>) =>
  !product.isPieceUnit && gramsPerStockUnit(product) > 0
    ? "g"
    : product.unit || "unit";

/**
 * Các đơn vị chọn được cho một mã: đơn vị kho, rồi g / kg nếu có khối lượng.
 * Thứ tự cố định (không đổi khi chọn); đơn vị đang lưu mà không còn hợp lệ thì thêm cuối.
 */
export const unitOptions = (
  product: Partial<UnitProduct> | null | undefined,
  current?: string,
) => [
  ...new Set(
    [
      product?.unit || "unit",
      ...(gramsPerStockUnit(product) > 0 ? ["g", "kg"] : []),
      current,
    ].filter((unit): unit is string => !!unit),
  ),
];

/** "0.5 Thùng · 10,000 g" — tồn theo đơn vị kho, kèm gram khi có khối lượng. */
export const stockWithGrams = (
  units: number,
  unit: string | null | undefined,
  gramsPerUnit: number,
) => {
  const base =
    `${units.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${unit || ""}`.trim();
  if (!(gramsPerUnit > 0) || unit === "g") return base;
  const grams = Math.round(units * gramsPerUnit * 100) / 100;
  return `${base} · ${grams.toLocaleString("en-US", { maximumFractionDigits: 2 })} g`;
};
