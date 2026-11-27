/**
 * GTGT chọn theo từng dòng hàng trên trang Bán hàng (hiện chỉ SP007601).
 *
 * KHÁC với `vat.ts` (bóc VAT ra khỏi giá đã gồm thuế để đẩy Misa): ở đây 5% là
 * phần CỘNG THÊM vào thành tiền của dòng.
 *
 * Cách lưu:
 *  - Trong giỏ (CartItem) `price`/`discount` luôn là giá CHƯA cộng GTGT → đổi
 *    bảng giá hay sửa giá tay thì GTGT vẫn cộng đúng trên giá mới.
 *  - Khi lưu, đơn giá + giảm giá được nhân (1 + rate/100) → BE vẫn tính
 *    totalPrice = (price − discount) × SL như cũ; công nợ, in phiếu, báo cáo,
 *    trả hàng đều thấy đúng số tiền mà không cần sửa logic tính tiền.
 *  - Cột `lineVatRate` chỉ để NHỚ lựa chọn → khi mở lại đơn, bóc GTGT ra để hiện
 *    lại đơn giá gốc. Xóa cột sau này không ảnh hưởng tiền đã lưu.
 *  - Dòng mới thêm vào giỏ để TRỐNG (`lineVatRate` undefined) → người dùng bắt
 *    buộc tự chọn 0% hoặc 5%; trang Bán hàng chặn lưu/tạo nếu còn dòng chưa chọn.
 */

export const LINE_VAT_PRODUCT_CODES = ["SP007601"];

export const LINE_VAT_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
];

interface LineVatItem {
  product?: { code?: string | null } | null;
  isPromoGift?: boolean;
  lineVatRate?: number;
  price: number;
  discount: number;
  quantity: number;
}

interface SavedLine {
  price?: number | string | null;
  discount?: number | string | null;
  lineVatRate?: number | string | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Dòng này có được chọn GTGT không (đúng mã SP, không phải dòng quà KM). */
export const canChooseLineVat = (item: LineVatItem): boolean =>
  !item.isPromoGift &&
  LINE_VAT_PRODUCT_CODES.includes(String(item.product?.code ?? ""));

/** % GTGT đang áp cho dòng (0 nếu dòng không được chọn GTGT hoặc chưa chọn). */
export const getLineVatRate = (item: LineVatItem): number =>
  canChooseLineVat(item) ? Number(item.lineVatRate) || 0 : 0;

/** Dòng bắt buộc chọn GTGT nhưng người dùng chưa chọn. */
export const isLineVatMissing = (item: LineVatItem): boolean =>
  canChooseLineVat(item) && item.lineVatRate == null;

/** Dòng đầu tiên chưa chọn GTGT (để cảnh báo, chặn lưu/tạo). */
export const findLineVatMissing = <T extends LineVatItem>(
  items: T[]
): T | undefined => items.find(isLineVatMissing);

/** Giá trị cho ô chọn GTGT: "" = chưa chọn (ô hiện placeholder). */
export const getLineVatPickerValue = (item: LineVatItem): string =>
  item.lineVatRate == null ? "" : String(Number(item.lineVatRate) || 0);

export const LINE_VAT_PLACEHOLDER = "Chọn";

export const addLineVat = (amount: number, rate: number): number =>
  rate ? round2(amount * (1 + rate / 100)) : amount;

export const removeLineVat = (amount: number, rate: number): number =>
  rate ? round2(amount / (1 + rate / 100)) : amount;

/** Đơn giá + giảm giá (đã cộng GTGT) gửi lên BE, kèm % GTGT để BE ghi nhớ. */
export const getSavedLinePrice = (item: LineVatItem) => {
  const lineVatRate = getLineVatRate(item);
  return {
    price: addLineVat(Number(item.price) || 0, lineVatRate),
    discount: addLineVat(Number(item.discount) || 0, lineVatRate),
    lineVatRate,
  };
};

/** Thành tiền dòng — khớp chính xác totalPrice BE tính từ giá đã lưu. */
export const getLineTotal = (item: LineVatItem): number => {
  const saved = getSavedLinePrice(item);
  return (saved.price - saved.discount) * (Number(item.quantity) || 0);
};

/** Dòng đơn/HĐ/ký gửi từ API → giá chưa GTGT cho giỏ + % GTGT đã chọn. */
export const fromSavedLinePrice = (line: SavedLine) => {
  const lineVatRate = Number(line.lineVatRate) || 0;
  return {
    price: removeLineVat(Number(line.price) || 0, lineVatRate),
    discount: removeLineVat(Number(line.discount) || 0, lineVatRate),
    lineVatRate,
  };
};
