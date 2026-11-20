/** Bảng giá public price.hisweetievietnam.com — khớp backend src/public-price/public-price.types.ts */

export type PriceRegionKey = "N" | "S";
/** Mã nhóm: 4 nhóm mặc định (tea/jam/top/froz) hoặc mã sinh khi thêm nhóm mới */
export type PriceGroupKey = string;
/** Kiểu hiển thị (màu + biểu tượng) của nhóm */
export type PriceGroupIcon = "tea" | "jam" | "top" | "froz" | "pow";
export type PriceTag = "new" | "hot" | "sale";

/** 5 nhóm mặc định; `lines` = cách xuống dòng trên tab mobile khi tên nhóm giữ nguyên */
export const PRICE_GROUPS: { key: PriceGroupIcon; name: string; lines: [string, string?] }[] = [
  { key: "tea", name: "Trà", lines: ["Trà"] },
  { key: "jam", name: "Mứt & Syrup", lines: ["Mứt &", "Syrup"] },
  { key: "top", name: "Topping nhiệt thường", lines: ["Topping", "nhiệt thường"] },
  { key: "froz", name: "Topping đông lạnh", lines: ["Topping", "đông lạnh"] },
  { key: "pow", name: "Bột", lines: ["Bột"] },
];

export const PRICE_GROUP_ICON_LABEL: Record<PriceGroupIcon, string> = { tea: "Lá trà", jam: "Túi mứt", top: "Ly topping", froz: "Bông tuyết", pow: "Túi bột" };
export const PRICE_GROUP_MAX = 8;
export const isGroupIcon = (v: string): v is PriceGroupIcon => v in PRICE_GROUP_ICON_LABEL;

export const PRICE_TAG_LABEL: Record<PriceTag, string> = { new: "Mới", hot: "Bán chạy", sale: "Khuyến mãi" };

/** ?region=bac / ?region=nam trên URL */
export const REGION_PARAM: Record<PriceRegionKey, string> = { N: "bac", S: "nam" };

export interface PublicPriceProduct {
  id: number;
  code: string;
  name: string;
  size: string;
  spec: string;
  unit: string;
  brandId: number | null;
  group: PriceGroupKey;
  image: string | null;
  tag: PriceTag | null;
  desc: string;
  /** null = "Liên hệ" */
  price: Record<PriceRegionKey, number | null>;
}

export interface PublicPriceData {
  publishedAt: string | null;
  validFrom: string;
  validTo: string;
  zaloUrl: string;
  banner: { enabled: boolean; tag: string; text: string };
  regions: { key: PriceRegionKey; name: string; listName: string; hotline: string }[];
  /** `icon` thiếu ở bản xuất bản cũ: suy từ mã nhóm */
  groups: { key: PriceGroupKey; name: string; icon?: PriceGroupIcon }[];
  brands: { id: number; name: string }[];
  products: PublicPriceProduct[];
}

export interface PriceRegionConfig {
  key: PriceRegionKey;
  name: string;
  listName: string;
  priceBookId: number | null;
  hotline: string;
  enabled: boolean;
}

export interface PriceGroupConfig {
  key: PriceGroupKey;
  name: string;
  icon: PriceGroupIcon;
  visible: boolean;
}

export interface PriceItemConfig {
  productId: number;
  group: PriceGroupKey;
  visible: boolean;
  tag: PriceTag | null;
  hidePrice: PriceRegionKey[];
  name: string;
  desc: string;
  /** Id ảnh sản phẩm hiện trên trang public; null = ảnh chính */
  imageId: number | null;
  /** Thương hiệu hiển thị (tradeMarkId trong `brands`); null = thương hiệu của sản phẩm */
  brandId: number | null;
  /** Ghi đè khối lượng / quy cách / đơn vị tính; rỗng = tự tách từ tên POS */
  size: string;
  spec: string;
  unit: string;
}

export interface PriceSpecInfo {
  size: string;
  spec: string;
  unit: string;
}

export interface PricePageConfig {
  regions: PriceRegionConfig[];
  zaloUrl: string;
  banner: { enabled: boolean; tag: string; text: string };
  validFrom: string;
  validTo: string;
  /** Thứ tự mảng = thứ tự tab nhóm */
  groups: PriceGroupConfig[];
  brands: { tradeMarkId: number; label: string; visible: boolean }[];
  items: PriceItemConfig[];
}

export interface PriceCatalogEntry {
  id: number;
  code: string;
  fullName: string;
  image: string | null;
  isActive: boolean;
  tradeMarkId: number | null;
  tradeMarkName: string | null;
  price: Record<PriceRegionKey, number | null>;
  /** Mọi ảnh của sản phẩm, ảnh chính đứng đầu */
  images: { id: number; image: string }[];
  /** Giá trị tự động (tách từ tên POS) khi không ghi đè */
  auto: PriceSpecInfo & { name: string };
}

export interface PricePageAdmin {
  config: PricePageConfig;
  publishedAt: string | null;
  publishedByName: string | null;
  updatedAt: string | null;
  hasPublished: boolean;
  dirty: boolean;
}

/** Địa chỉ trang public (nút "Mở trang public" trong POS). */
export const PUBLIC_PRICE_URL = process.env.NEXT_PUBLIC_PRICE_URL?.replace(/\/$/, "") || "https://price.hisweetievietnam.com";
