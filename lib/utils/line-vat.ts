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
 *  - Ô Đơn giá trên card hiện giá ĐÃ GỒM GTGT (`getLineUnitPrice`) để
 *    đơn giá × SL = thành tiền.
 *
 * Bóc VAT 8% (giá ÷ 1,08 — KHÔNG phải × 0,92) CHỈ cho chứng từ CŨ (lập trước khi
 * có quy tắc mới), KHÔNG cho đơn/HĐ mới. Giá cũ đã gồm 8% VAT nên giá trước VAT
 * = giá ÷ 1,08 (vd 120,000 → 111,111.11; chọn 5% → 116,666.67):
 *  - DB: `line_vat_rate` NULL = dòng của chứng từ cũ (chưa qua POS mới). POS mới
 *    luôn ghi 0/5 khi lưu → dòng có số không bao giờ bị bóc nữa (bóc đúng 1 lần).
 *  - Nạp dòng NULL (`fromSavedLinePrice`) → `legacyLine` + `listPrice` = giá đã
 *    lưu (giá cũ); trang Bán hàng bóc 8% VAT khỏi đơn giá + giảm giá một lần
 *    (`applyLegacyReduction`, trừ khi đơn đang khóa dòng) và bắt chọn GTGT.
 *  - Đơn/HĐ mới (kể cả copy từ chứng từ cũ): giữ nguyên giá, không có ô "Giá trước VAT 8%".
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
  legacyLine?: boolean;
  legacyReduced?: boolean;
  price: number;
  discount: number;
  quantity: number;
}

type LineVatProduct = { code?: string | null } | null | undefined;

/** % VAT đã gồm trong giá của dòng chứng từ cũ (SP trong LINE_VAT_PRODUCT_CODES). */
export const LINE_PRICE_REDUCTION_PERCENT = 8;

const isLineVatProduct = (product: LineVatProduct): boolean =>
  LINE_VAT_PRODUCT_CODES.includes(String(product?.code ?? ""));

interface SavedLine {
  product?: { code?: string | null } | null;
  price?: number | string | null;
  discount?: number | string | null;
  lineVatRate?: number | string | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Làm tròn tiền 2 số thập phân (tiền POS giữ tối đa 2 số lẻ). */
export const roundMoney = round2;

/** Dòng này có được chọn GTGT không (đúng mã SP, không phải dòng quà KM). */
export const canChooseLineVat = (item: LineVatItem): boolean =>
  !item.isPromoGift && isLineVatProduct(item.product);

/** Dòng của chứng từ cũ → hiện ô "Giá trước VAT 8%" (đơn/HĐ mới không có ô này). */
export const canReduceLinePrice = (item: LineVatItem): boolean =>
  canChooseLineVat(item) && !!item.legacyLine;

/**
 * Bóc 8% VAT khỏi một số tiền đã gồm VAT: số tiền ÷ 1,08, làm tròn 2 số lẻ
 * (120,000 → 111,111.11), nếu SP thuộc diện áp dụng. KHÔNG dùng × 0,92: giá cũ
 * là giá SAU VAT nên phải chia ngược mới ra giá trước VAT.
 */
export const applyLinePriceReduction = (
  product: LineVatProduct,
  amount: number
): number =>
  isLineVatProduct(product)
    ? round2(amount / (1 + LINE_PRICE_REDUCTION_PERCENT / 100))
    : amount;

/**
 * Dòng chứng từ cũ → bóc 8% VAT khỏi cả đơn giá và giảm giá (÷ 1,08), đánh dấu
 * đã bóc để không bóc lần nữa trong giỏ.
 */
export const applyLegacyReduction = (item: LineVatItem) => ({
  price: applyLinePriceReduction(item.product, Number(item.price) || 0),
  discount: applyLinePriceReduction(item.product, Number(item.discount) || 0),
  legacyReduced: true,
});

/** "Giá cũ" (đơn giá đã lưu của chứng từ cũ, đã gồm 8% VAT) để hiển thị. */
export const getLineListPrice = (item: LineVatItem): number | null =>
  item.legacyLine ? (item.listPrice ?? null) : null;

/** "Giá trước VAT 8%" (giá cũ ÷ 1,08) hiển thị cạnh giá cũ (sửa tay đơn giá không đổi ô này). */
export const getLineReducedPrice = (item: LineVatItem): number | null => {
  const listPrice = getLineListPrice(item);
  return listPrice == null
    ? null
    : applyLinePriceReduction(item.product, listPrice);
};

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

/**
 * Thành tiền dòng gửi BE = (đơn giá − giảm giá) × SL, mọi bước làm tròn 2 số lẻ
 * (tiền giữ tối đa 2 số thập phân; tránh lỗi số thực kiểu 333333.32999999996).
 */
export const getSavedLineTotal = (
  price: number,
  discount: number,
  quantity: number
): number => round2(round2(price - discount) * (Number(quantity) || 0));

/** Thành tiền dòng — khớp chính xác totalPrice gửi BE. */
export const getLineTotal = (item: LineVatItem): number =>
  round2(getLineUnitPrice(item) * (Number(item.quantity) || 0));

/** Tổng tiền hàng của giỏ (cộng thành tiền từng dòng), làm tròn 2 số lẻ. */
export const sumLineTotals = (items: LineVatItem[]): number =>
  round2(items.reduce((sum, item) => sum + getLineTotal(item), 0));

/** Đơn giá người dùng gõ (đã gồm GTGT) → giá chưa GTGT để ghi vào giỏ. */
export const toNetUnitPrice = (item: LineVatItem, typedGross: number): number =>
  removeLineVat(typedGross, getLineVatRate(item));

/**
 * Dòng đơn/HĐ/ký gửi từ API → giá chưa GTGT cho giỏ + % GTGT đã chọn.
 * SP áp dụng mà `lineVatRate` NULL = dòng chứng từ cũ:
 *  - mặc định: `legacyLine` + `listPrice` (giá cũ), GTGT để trống bắt chọn; trang
 *    Bán hàng sẽ bóc 8% VAT (÷ 1,08) một lần.
 *  - `asNewDocument` (copy sang đơn/HĐ mới): giữ nguyên giá, không bóc 8%, GTGT
 *    vẫn để trống bắt chọn.
 */
export const fromSavedLinePrice = (
  line: SavedLine,
  options: { asNewDocument?: boolean } = {}
): {
  price: number;
  discount: number;
  lineVatRate?: number;
  legacyLine?: boolean;
  listPrice?: number;
} => {
  const price = Number(line.price) || 0;
  const discount = Number(line.discount) || 0;
  if (line.lineVatRate == null && isLineVatProduct(line.product)) {
    return options.asNewDocument
      ? { price, discount, lineVatRate: undefined }
      : {
          price,
          discount,
          lineVatRate: undefined,
          legacyLine: true,
          listPrice: price,
        };
  }
  const lineVatRate = Number(line.lineVatRate) || 0;
  return {
    price: removeLineVat(price, lineVatRate),
    discount: removeLineVat(discount, lineVatRate),
    lineVatRate,
  };
};
