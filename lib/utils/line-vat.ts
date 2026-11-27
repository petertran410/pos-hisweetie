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
 *  - Giá lấy từ bảng giá mặc định TRỪ 8% (× 0,92) trước khi vào giỏ
 *    (`applyLinePriceReduction`); giá bảng giá gốc giữ ở `listPrice` để hiện
 *    "giá cũ". Ô Đơn giá trên card hiện giá ĐÃ GỒM GTGT (`getLineUnitPrice`) để
 *    đơn giá × SL = thành tiền.
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
  listPrice?: number;
  price: number;
  discount: number;
  quantity: number;
}

type LineVatProduct = { code?: string | null } | null | undefined;

/** % trừ mặc định trên giá bảng giá của các SP trong LINE_VAT_PRODUCT_CODES. */
export const LINE_PRICE_REDUCTION_PERCENT = 8;

const isLineVatProduct = (product: LineVatProduct): boolean =>
  LINE_VAT_PRODUCT_CODES.includes(String(product?.code ?? ""));

interface SavedLine {
  price?: number | string | null;
  discount?: number | string | null;
  lineVatRate?: number | string | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Dòng này có được chọn GTGT không (đúng mã SP, không phải dòng quà KM). */
export const canChooseLineVat = (item: LineVatItem): boolean =>
  !item.isPromoGift && isLineVatProduct(item.product);

/** Dòng hiện ô "Giá trừ 8%" (cùng điều kiện với ô GTGT). */
export const canReduceLinePrice = canChooseLineVat;

/**
 * Giá bảng giá → giá mặc định vào giỏ: SP áp dụng thì trừ 8% (làm tròn đồng),
 * SP khác giữ nguyên. Chỉ gọi khi giá lấy từ bảng giá/giá gốc, KHÔNG gọi cho
 * dòng nạp từ đơn đã lưu (giá đã trừ sẵn).
 */
export const applyLinePriceReduction = (
  product: LineVatProduct,
  listPrice: number
): number =>
  isLineVatProduct(product)
    ? Math.round(listPrice * (1 - LINE_PRICE_REDUCTION_PERCENT / 100))
    : listPrice;

/**
 * "Giá cũ" (giá bảng giá trước khi trừ 8%) để hiển thị. Dòng mở lại từ đơn đã
 * lưu không có listPrice → suy ngược từ đơn giá.
 */
export const getLineListPrice = (item: LineVatItem): number =>
  item.listPrice ??
  Math.round(
    (Number(item.price) || 0) / (1 - LINE_PRICE_REDUCTION_PERCENT / 100)
  );

/** "Giá đã trừ 8%" để hiển thị cạnh giá cũ (sửa tay đơn giá không đổi ô này). */
export const getLineReducedPrice = (item: LineVatItem): number =>
  applyLinePriceReduction(item.product, getLineListPrice(item));

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

/**
 * Đơn giá hiển thị trên card = giá đã trừ giảm giá, ĐÃ GỒM GTGT dòng. Bằng đúng
 * (price − discount) BE lưu → đơn giá × SL = thành tiền.
 */
export const getLineUnitPrice = (item: LineVatItem): number => {
  const saved = getSavedLinePrice(item);
  return round2(saved.price - saved.discount);
};

/** Thành tiền dòng — khớp chính xác totalPrice BE tính từ giá đã lưu. */
export const getLineTotal = (item: LineVatItem): number =>
  getLineUnitPrice(item) * (Number(item.quantity) || 0);

/** Đơn giá người dùng gõ (đã gồm GTGT) → giá chưa GTGT để ghi vào giỏ. */
export const toNetUnitPrice = (item: LineVatItem, typedGross: number): number =>
  removeLineVat(typedGross, getLineVatRate(item));

/** Dòng đơn/HĐ/ký gửi từ API → giá chưa GTGT cho giỏ + % GTGT đã chọn. */
export const fromSavedLinePrice = (line: SavedLine) => {
  const lineVatRate = Number(line.lineVatRate) || 0;
  return {
    price: removeLineVat(Number(line.price) || 0, lineVatRate),
    discount: removeLineVat(Number(line.discount) || 0, lineVatRate),
    lineVatRate,
  };
};
