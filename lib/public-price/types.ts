/** Bảng giá public price.hisweetievietnam.com — khớp backend src/public-price/public-price.types.ts */

export type PriceRegionKey = "N" | "S";
export type PriceGroupKey = "tea" | "jam" | "top" | "froz";
export type PriceTag = "new" | "hot" | "sale";

export const PRICE_GROUPS: { key: PriceGroupKey; name: string; lines: [string, string?] }[] = [
  { key: "tea", name: "Trà", lines: ["Trà"] },
  { key: "jam", name: "Mứt & Syrup", lines: ["Mứt &", "Syrup"] },
  { key: "top", name: "Topping nhiệt thường", lines: ["Topping", "nhiệt thường"] },
  { key: "froz", name: "Topping đông lạnh", lines: ["Topping", "đông lạnh"] },
];

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
  groups: { key: PriceGroupKey; name: string }[];
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

export interface PriceItemConfig {
  productId: number;
  group: PriceGroupKey;
  visible: boolean;
  tag: PriceTag | null;
  hidePrice: PriceRegionKey[];
  name: string;
  desc: string;
}

export interface PricePageConfig {
  regions: PriceRegionConfig[];
  zaloUrl: string;
  banner: { enabled: boolean; tag: string; text: string };
  validFrom: string;
  validTo: string;
  hiddenGroups: PriceGroupKey[];
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
