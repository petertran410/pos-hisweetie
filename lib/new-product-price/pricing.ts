// Bản sao công thức backend (hisweetie_ban_hang_backend/src/new-product-price/new-product-price.calc.ts)
// để xem trước khi đang sửa giá. Sửa ở đây thì sửa cả bên đó.
import type { NppAnalysisRow } from "@/lib/types/new-product-price";

const VAT_DIVISOR = 1.08;

type Num = number | null | undefined;

export interface PricingInput {
  goodsPrice?: Num;
  exchangeRate?: Num;
  cogsHn?: Num;
  cogsSg?: Num;
  cogsDt?: Num;
  priceHnRetail?: Num;
  priceHnWholesale?: Num;
  priceSgRetail?: Num;
  priceSgWholesale?: Num;
  priceDlcl?: Num;
  priceShopee?: Num;
  priceOem?: Num;
}

const present = (v: Num) =>
  v === null || v === undefined || !Number.isFinite(v) || v === 0 ? null : v;

export function goodsPriceVnd(t: PricingInput): number | null {
  if (t.goodsPrice === null || t.goodsPrice === undefined) return null;
  return Math.round(t.goodsPrice * (t.exchangeRate ?? 1) * 100) / 100;
}

function row(
  key: string,
  label: string,
  price: Num,
  cost: Num,
  exVat: boolean,
  basis: string,
): NppAnalysisRow {
  const p = present(price);
  const c = present(cost);
  const priceExVat = p === null ? null : exVat ? p / VAT_DIVISOR : p;
  const cogs = c === null ? null : exVat ? c / VAT_DIVISOR : c;
  const profit =
    priceExVat !== null && cogs !== null ? priceExVat - cogs : null;
  const margin = profit !== null && cogs ? profit / cogs : null;
  return { key, label, price: p, priceExVat, cogs, profit, margin, basis };
}

export function priceAnalysis(t: PricingInput): NppAnalysisRow[] {
  return [
    row(
      "HN_RETAIL",
      "HN - Giá Lẻ",
      t.priceHnRetail,
      t.cogsHn,
      true,
      "Giá vốn Hà Nội",
    ),
    row(
      "HN_WHOLESALE",
      "HN - Giá Buôn",
      t.priceHnWholesale,
      t.cogsHn,
      true,
      "Giá vốn Hà Nội",
    ),
    row(
      "HN_DLCL",
      "HN - Giá ĐLCL",
      t.priceDlcl,
      t.cogsHn,
      true,
      "Giá vốn Hà Nội",
    ),
    row(
      "SG_RETAIL",
      "SG - Giá Lẻ",
      t.priceSgRetail,
      t.cogsSg,
      true,
      "Giá vốn Sài Gòn",
    ),
    row(
      "SG_WHOLESALE",
      "SG - Giá Buôn",
      t.priceSgWholesale,
      t.cogsSg,
      true,
      "Giá vốn Sài Gòn",
    ),
    row(
      "SG_DLCL",
      "SG - Giá ĐLCL",
      t.priceDlcl,
      t.cogsSg,
      true,
      "Giá vốn Sài Gòn",
    ),
    row("OEM", "Giá OEM", t.priceOem, t.cogsHn, true, "Giá vốn Hà Nội"),
    row(
      "SHOPEE",
      "Giá Shopee",
      t.priceShopee,
      t.cogsDt,
      false,
      "Giá vốn CH Diệp Trà",
    ),
  ];
}
