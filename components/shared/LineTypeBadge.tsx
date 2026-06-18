"use client";

import { CodeLink } from "./CodeLink";

export interface PromotionRef {
  id: number;
  code: string;
  name: string;
}

export interface LineTypeInfo {
  lineType?: string | null;
  isGift?: boolean | null;
  promotionId?: number | null;
  promotion?: PromotionRef | null;
}

type LineKind = "normal" | "promo_buy" | "reward";

/** Phân loại dòng hàng theo field DB (lineType/isGift/promotionId). */
export function getLineKind(item: LineTypeInfo): LineKind {
  const lineType = item.lineType || "normal";
  if (item.isGift || lineType === "gift" || lineType === "discounted_buy")
    return "reward";
  if (item.promotionId != null) return "promo_buy";
  return "normal";
}

const PINK_BADGE =
  "px-1.5 py-0.5 text-xs rounded-full border border-pink-300 bg-pink-50 text-pink-700 font-medium";

/**
 * Badge cạnh tên hàng phân biệt: hàng bán thường / hàng bán KM (dòng X) / quà reward.
 * - reward: badge "KM"
 * - dòng X: badge mã KM (link tới chi tiết KM); fallback "KM" nếu thiếu mã.
 * - thường: không render gì.
 */
export function LineTypeBadge({ item }: { item: LineTypeInfo }) {
  const kind = getLineKind(item);
  if (kind === "normal") return null;

  if (kind === "reward") {
    return (
      <span className={`inline-flex items-center gap-0.5 ${PINK_BADGE}`}>KM</span>
    );
  }

  // promo_buy (dòng X)
  if (item.promotion?.code) {
    return (
      <CodeLink
        entity="promotion"
        code={item.promotion.code}
        label={item.promotion.code}
        className={`${PINK_BADGE} hover:bg-pink-100`}
      />
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 ${PINK_BADGE}`}>KM</span>
  );
}

/** Dòng tên chương trình KM (đặt dưới tên hàng), giống màn tạo đơn. */
export function PromotionLineName({ item }: { item: LineTypeInfo }) {
  const kind = getLineKind(item);
  if (kind === "normal" || !item.promotion?.name) return null;
  const prefix = kind === "reward" ? "🎁 " : "";
  return (
    <div className="text-xs text-blue-600 font-medium">
      {prefix}
      {item.promotion.name}
    </div>
  );
}
