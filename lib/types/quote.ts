/**
 * Báo giá (/khach-hang/bao-gia) — hợp đồng dữ liệu giữa giao diện và API.
 *
 * Backend (hisweetie_ban_hang_backend/src/quotes) trả đúng các kiểu này.
 */

/** Miền áp dụng. "ALL" = sheet không tách miền (Bột, Mứt/Siro). */
export type QuoteRegion = "HN" | "SG" | "ALL";

/** Ngành hàng — trùng cách chia sheet trong file Excel báo giá tổng hợp. */
export type QuoteCategory =
  | "frozen_topping"
  | "ambient_topping"
  | "powder"
  | "jam_syrup";

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

/** Kiểu trình bày khi xem trước / xuất: Mẫu 1 = bảng giá theo file Excel, Mẫu 2 = thiết kế thương hiệu LerMao. */
export type QuoteLayout = "classic" | "brand";

export const QUOTE_LAYOUT_LABEL: Record<QuoteLayout, string> = {
  classic: "Mẫu 1 · Bảng giá",
  brand: "Mẫu 2 · LerMao",
};

/** Logo đầu trang khi mẫu chưa tải logo riêng. */
export const QUOTE_DEFAULT_LOGO = "/brands/lermao.webp";

export const QUOTE_REGION_LABEL: Record<QuoteRegion, string> = {
  HN: "Hà Nội",
  SG: "Sài Gòn",
  ALL: "Toàn quốc",
};

export const QUOTE_CATEGORY_LABEL: Record<QuoteCategory, string> = {
  frozen_topping: "Topping đông lạnh",
  ambient_topping: "Topping nhiệt thường",
  powder: "Bột",
  jam_syrup: "Mứt/Siro",
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Nháp",
  sent: "Đã gửi",
  accepted: "Khách chấp nhận",
  rejected: "Từ chối",
  expired: "Hết hạn",
};

export const QUOTE_STATUS_COLOR: Record<QuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-yellow-100 text-yellow-800",
};

/** Trạng thái chuyển được từ trạng thái hiện tại (Nháp → Đã gửi → kết quả). */
export const QUOTE_STATUS_NEXT: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

/**
 * Một khung giá của một dòng: giá áp dụng khi mua từ `minQty` đến `maxQty`
 * (`unit`, mặc định thùng). `null` ở cận = không giới hạn.
 */
export interface QuoteTier {
  /** Khoá ổn định để ghép cột khi xem trước: le, ctv, dl_lt10, dl_ge10, buon… */
  key: string;
  label: string;
  minQty: number | null;
  maxQty: number | null;
  unit: string;
  /** Đơn giá (VNĐ, đã gồm VAT) trên 1 đơn vị bán của sản phẩm (túi/hộp…). */
  price: number | null;
  /** true = Sale sửa tay, không tự điền lại khi đổi bảng giá. */
  manual: boolean;
}

export interface QuoteItem {
  /** Khoá dòng phía client (uuid); backend trả id số sau giai đoạn 2. */
  id: string;
  /** null = dòng nhập từ Excel chưa khớp sản phẩm POS. */
  productId: number | null;
  productCode: string | null;
  productName: string;
  /** Quy cách đóng gói, ví dụ "30 túi/thùng". */
  spec: string;
  /** Đơn vị bán của giá (túi, hộp, gói…). */
  unit: string;
  imageUrl: string | null;
  /** Giá niêm yết của sản phẩm (Bảng giá chung) — dùng khi bảng giá không có sản phẩm. */
  basePrice: number | null;
  /** Giá bảng giá đang chọn tại lúc điền (để tính % chênh lệch). */
  priceBookPrice: number | null;
  tiers: QuoteTier[];
  comingSoon?: boolean;
  note?: string;
}

export interface QuoteCustomerRef {
  /** null = khách chưa có trong danh sách khách POS, Sale nhập tay chỉ để in lên báo giá. */
  id: number | null;
  code: string | null;
  name: string;
  contactNumber?: string | null;
  address?: string | null;
}

export interface QuoteUserRef {
  id: number;
  name: string;
}

export interface Quote {
  id: number;
  /** BG000123 — backend tự sinh. Mẫu thư viện: TV + số. */
  code: string;
  /** true = báo giá mẫu trong Thư viện (không gắn khách). */
  isLibrary: boolean;
  status: QuoteStatus;
  /** Mẫu báo giá (Cài đặt › Mẫu báo giá) đã áp dụng; null = báo giá cũ / không theo mẫu. */
  templateId: number | null;
  layout: QuoteLayout;
  region: QuoteRegion;
  /** Ngành hàng — bắt buộc với mẫu thư viện, tuỳ chọn với báo giá thường. */
  category: QuoteCategory | null;
  customer: QuoteCustomerRef | null;
  priceBook: { id: number; name: string } | null;
  /** Đầu trang: logo (null = logo LerMao mặc định), tên công ty ("\n" = xuống dòng), phòng ban. */
  logoUrl: string | null;
  companyName: string;
  department: string;
  /** Tiêu đề in đậm, ví dụ "BẢNG BÁO GIÁ ĐẠI LÝ HÀ NỘI TOPPING ĐÔNG LẠNH LERMAO". */
  title: string;
  /** Người nhận sau "Kính gửi:", ví dụ "Quý khách hàng", "Quý Đại lý". */
  greeting: string;
  intro: string;
  closing: string;
  /** Ghi chú / chính sách in dưới bảng giá. */
  note: string;
  /** Hiện cột "Lợi nhuận" (giá lẻ so với khung giá thấp nhất) — sheet đại lý. */
  showMargin: boolean;
  /** Ngày áp dụng (YYYY-MM-DD). */
  appliedFrom: string;
  /** Hiệu lực đến (YYYY-MM-DD) — null = không thời hạn. */
  validUntil: string | null;
  items: QuoteItem[];
  createdBy: QuoteUserRef;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  /** Mẫu thư viện đã dùng để tạo báo giá này (nếu có). */
  sourceLibraryId: number | null;
}

/** Một dòng ở trang danh sách (không kèm items). */
export interface QuoteListItem
  extends Omit<Quote, "items" | "intro" | "closing" | "note" | "logoUrl" | "companyName" | "department"> {
  /** Tên mẫu báo giá đã áp dụng (null = không theo mẫu). */
  templateName: string | null;
  itemCount: number;
}

export interface QuoteFilters {
  tab: "quotes" | "library";
  search?: string;
  status?: QuoteStatus[];
  /** Lọc theo mẫu báo giá (Cài đặt › Mẫu báo giá). */
  templateId?: number[];
  createdById?: number[];
  region?: QuoteRegion[];
  category?: QuoteCategory[];
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface QuoteListResponse {
  data: QuoteListItem[];
  total: number;
}

/** Thân request tạo / sửa báo giá. */
export type QuotePayload = Omit<
  Quote,
  "id" | "code" | "createdBy" | "createdAt" | "updatedAt" | "sentAt"
>;

/** Khung giá mặc định của một mẫu (chưa có giá). */
export type QuoteTierDef = Pick<QuoteTier, "key" | "label" | "minQty" | "maxQty" | "unit">;

/**
 * Mẫu báo giá — cấu hình ở Cài đặt › Mẫu báo giá. Đúng 1 mẫu mặc định (chọn sẵn khi tạo báo giá);
 * tạo báo giá thì nội dung + khung giá của mẫu được chép vào báo giá (sửa mẫu sau đó
 * không đổi báo giá đã tạo).
 */
export interface QuoteTemplateConfig {
  id: number;
  name: string;
  isDefault: boolean;
  /** false = Ngừng sử dụng: ẩn khỏi form tạo báo giá, vẫn giữ để tra cứu báo giá cũ. */
  isActive: boolean;
  /** Đầu trang: logo (null = logo LerMao mặc định), tên công ty ("\n" = xuống dòng), phòng ban. */
  logoUrl: string | null;
  companyName: string;
  department: string;
  tiers: QuoteTierDef[];
  /** Tiêu đề mặc định; {MIEN} = tên miền viết hoa ("HÀ NỘI"), bỏ trống khi Toàn quốc. */
  titlePattern: string;
  greeting: string;
  intro: string;
  note: string;
  closing: string;
  showMargin: boolean;
  updatedAt: string;
  updatedBy: QuoteUserRef;
}

export type QuoteTemplatePayload = Omit<
  QuoteTemplateConfig,
  "id" | "isDefault" | "isActive" | "updatedAt" | "updatedBy"
>;
