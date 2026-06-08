"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { usePromotion, usePromotionUsage } from "@/lib/hooks/usePromotions";
import {
  Promotion,
  PromotionReward,
  PromotionUsageDoc,
  PROMOTION_TYPE_LABELS,
  PROMOTION_STATUS_LABELS,
} from "@/lib/types/promotion";
import { formatCurrency } from "@/lib/utils";
import { CodeLink } from "../shared/CodeLink";

interface Props {
  promotionId: number;
  colSpan: number;
}

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  running: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  stopped: "bg-red-100 text-red-700",
  expired: "bg-gray-200 text-gray-500",
};

const WEEKDAY_LABELS = ["", "T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// Loại KM dùng nhiều SP/nhóm (lưu ở bảng products), không dùng buyProduct/rewardProduct đơn.
const MULTI_TYPES = ["BUY_X_GET_Y", "BUY_X_BUY_Y_PRICE"];

function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function productLabel(p?: { name: string; code: string } | null) {
  if (!p) return "";
  return `${p.code} - ${p.name}`;
}

/** Gộp danh sách SP/nhóm theo role từ promotion.products. */
function listProductsByRole(promo: Promotion, role: "buy" | "reward"): string {
  const items = (promo.products || []).filter((p) => p.role === role);
  if (items.length === 0) return "";
  return items
    .map((p) =>
      p.product
        ? productLabel(p.product)
        : p.categoryName
          ? `nhóm "${p.categoryName}"`
          : "sản phẩm",
    )
    .join(", ");
}

/** Mô tả "Điều kiện mua hàng" cho 1 reward theo loại KM. */
function buyConditionText(promo: Promotion, rw: PromotionReward): string {
  const qty = Number(rw.buyQuantity || 0);
  switch (promo.type) {
    case "BUY_X_GET_Y":
    case "BUY_X_BUY_Y_PRICE": {
      const list = listProductsByRole(promo, "buy");
      return `Mua ${qty} ${list || "sản phẩm"}`;
    }
    case "BUY_N_GET_M_SAME":
      return rw.buyProduct
        ? `Mua ${qty} ${productLabel(rw.buyProduct)}`
        : `Mua ${qty} sản phẩm`;
    case "PRODUCT_DISCOUNT":
      return rw.buyProduct
        ? `Mua ${productLabel(rw.buyProduct)}`
        : "Sản phẩm áp dụng";
    case "CATEGORY_DISCOUNT":
      return rw.buyCategoryName
        ? `Nhóm hàng "${rw.buyCategoryName}"`
        : "Nhóm hàng áp dụng";
    case "INVOICE_DISCOUNT":
    case "GIFT_BY_INVOICE":
      return Number(promo.minOrderValue) > 0
        ? `Hóa đơn từ ${formatCurrency(promo.minOrderValue)}`
        : "Mọi hóa đơn";
    default:
      return "—";
  }
}

/** Mô tả "Khuyến mại" cho 1 reward theo loại KM. */
function rewardText(promo: Promotion, rw: PromotionReward): string {
  const rewardQty = Number(rw.rewardQuantity || 0);

  if (promo.type === "BUY_X_GET_Y") {
    const list = listProductsByRole(promo, "reward");
    return `Tặng ${rewardQty} ${list || "sản phẩm"}`;
  }
  if (promo.type === "BUY_X_BUY_Y_PRICE") {
    const list = listProductsByRole(promo, "reward");
    return `Mua kèm ${rewardQty} ${list || "sản phẩm"} giá ${formatCurrency(
      rw.rewardValue || 0,
    )}`;
  }

  switch (rw.rewardType) {
    case "discount_percent":
      return `Giảm ${Number(rw.rewardValue || 0)}%${
        promo.maxDiscountAmount
          ? ` (tối đa ${formatCurrency(promo.maxDiscountAmount)})`
          : ""
      }`;
    case "discount_amount":
      return `Giảm ${formatCurrency(rw.rewardValue || 0)}`;
    case "gift":
      return rw.rewardProduct
        ? `Tặng ${rewardQty} ${productLabel(rw.rewardProduct)}`
        : `Tặng ${rewardQty} sản phẩm`;
    case "discounted_buy":
      return `Mua kèm ${rewardQty} ${
        rw.rewardProduct ? productLabel(rw.rewardProduct) : "sản phẩm"
      } giá ${formatCurrency(rw.rewardValue || 0)}`;
    default:
      return "—";
  }
}

export function PromotionDetailRow({ promotionId, colSpan }: Props) {
  const { data: promotion, isLoading } = usePromotion(promotionId);
  const { data: usage, isLoading: isLoadingUsage } =
    usePromotionUsage(promotionId);
  const [activeTab, setActiveTab] = useState("info");

  if (isLoading) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Đang tải chi tiết khuyến mãi...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!promotion) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy chương trình khuyến mãi
        </td>
      </tr>
    );
  }

  const TABS = [
    { value: "info", label: "Thông tin" },
    { value: "orders", label: "Đơn đặt hàng có khuyến mại" },
    { value: "invoices", label: "Hóa đơn có khuyến mại" },
  ];

  const effectiveText = `${fmtDateTime(promotion.startDate)} - ${fmtDateTime(
    promotion.endDate,
  )}`;
  const timeText =
    promotion.applyTimeFrom && promotion.applyTimeTo
      ? `${promotion.applyTimeFrom} - ${promotion.applyTimeTo}`
      : null;
  const weekdaysText =
    promotion.applyWeekdays && promotion.applyWeekdays.length > 0
      ? promotion.applyWeekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")
      : null;

  return (
    <tr>
      <td colSpan={colSpan} className="border-b-2 border-l-2 border-r-2 border-blue-500 bg-gray-50">
        <div className="bg-white p-4">
          {/* Header */}
          <div className="mb-4 border-b border-gray-200 pb-3">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                {promotion.name}
              </span>
              <span className="text-sm font-medium text-gray-500">
                {promotion.code}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  statusColor[promotion.status] || "bg-gray-100"
                }`}
              >
                {PROMOTION_STATUS_LABELS[promotion.status]}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.value
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab: Thông tin */}
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-1 border-b pb-1">
                  <label className="text-xs text-gray-500">Hiệu lực</label>
                  <span className="text-sm text-gray-900">{effectiveText}</span>
                  {timeText && (
                    <span className="text-xs text-gray-500">Khung giờ: {timeText}</span>
                  )}
                  {weekdaysText && (
                    <span className="text-xs text-gray-500">Ngày: {weekdaysText}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 border-b pb-1">
                  <label className="text-xs text-gray-500">Hình thức khuyến mại</label>
                  <span className="text-sm text-gray-900">
                    {PROMOTION_TYPE_LABELS[promotion.type]}
                  </span>
                </div>
                <div className="flex flex-col gap-1 border-b pb-1">
                  <label className="text-xs text-gray-500">Chi nhánh</label>
                  <span className="text-sm text-gray-900">
                    {promotion.forAllBranch
                      ? "Tất cả chi nhánh"
                      : `${promotion.branches?.length ?? 0} chi nhánh`}
                  </span>
                </div>
                <div className="flex flex-col gap-1 border-b pb-1">
                  <label className="text-xs text-gray-500">Nhóm khách hàng</label>
                  <span className="text-sm text-gray-900">
                    {promotion.forAllCustomer
                      ? "Tất cả nhóm khách hàng"
                      : `${
                          (promotion.customerGroups?.length ?? 0) +
                          (promotion.customers?.length ?? 0)
                        } nhóm/khách hàng`}
                  </span>
                </div>
                <div className="flex flex-col gap-1 border-b pb-1">
                  <label className="text-xs text-gray-500">Người tạo giao dịch</label>
                  <span className="text-sm text-gray-900">
                    {promotion.forAllUser
                      ? "Tất cả người tạo giao dịch"
                      : `${promotion.users?.length ?? 0} người`}
                  </span>
                </div>
              </div>

              {promotion.description && (
                <div className="text-sm text-gray-600">{promotion.description}</div>
              )}

              {/* Điều kiện khuyến mại */}
              <div className="rounded-lg border border-gray-200 p-3">
                <h4 className="mb-3 text-sm font-semibold text-gray-700">
                  Điều kiện khuyến mại
                </h4>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-100">
                        <th className="w-16 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                          STT
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Điều kiện mua hàng
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Khuyến mại
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {promotion.rewards?.length ? (
                        promotion.rewards.map((rw, idx) => (
                          <tr key={rw.id ?? idx}>
                            <td className="px-3 py-2 text-center text-sm text-gray-700">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-800">
                              {buyConditionText(promotion, rw)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-800">
                              {rewardText(promotion, rw)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-6 text-center text-sm text-gray-400"
                          >
                            Chưa có cấu hình phần thưởng
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Đơn đặt hàng có khuyến mại */}
          {activeTab === "orders" && (
            <UsageTable
              entity="order"
              docs={usage?.orders || []}
              loading={isLoadingUsage}
              emptyText="Chưa có đơn đặt hàng nào áp dụng chương trình này"
            />
          )}

          {/* Tab: Hóa đơn có khuyến mại */}
          {activeTab === "invoices" && (
            <UsageTable
              entity="invoice"
              docs={usage?.invoices || []}
              loading={isLoadingUsage}
              emptyText="Chưa có hóa đơn nào áp dụng chương trình này"
            />
          )}
        </div>
      </td>
    </tr>
  );
}

function UsageTable({
  entity,
  docs,
  loading,
  emptyText,
}: {
  entity: "order" | "invoice";
  docs: PromotionUsageDoc[];
  loading?: boolean;
  emptyText: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span className="text-gray-600">Đang tải...</span>
      </div>
    );
  }
  if (!docs.length) {
    return <p className="py-8 text-center text-sm text-gray-400">{emptyText}</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-100">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              {entity === "order" ? "Mã đơn hàng" : "Mã hóa đơn"}
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              Thời gian
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {docs.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-sm">
                <CodeLink entity={entity} code={d.code} />
              </td>
              <td className="px-3 py-2 text-xs text-gray-600">
                {fmtDateTime(d.date)}
              </td>
              <td className="px-3 py-2 text-center text-sm text-gray-700">
                {d.statusValue || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
