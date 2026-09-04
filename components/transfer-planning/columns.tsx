import React from "react";
import Link from "next/link";
import type { ColumnConfig } from "@/lib/hooks/useColumnVisibility";
import type { TransferPlanningItem } from "@/lib/types/transfer-planning";
import { formatNumber, formatQuantity, formatWholeQuantity } from "@/lib/utils/transfer-planning-calc";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export interface TransferPlanningColumnCtx {
  onOpenInTransit?: (item: TransferPlanningItem) => void;
  onOpenPending?: (item: TransferPlanningItem) => void;
  onOpenAddToTransfer?: (item: TransferPlanningItem) => void;
}

export function renderAlertBadge(item: TransferPlanningItem) {
  const { alert, alertLabel, alertReason } = item.computed;

  let textStyle = "text-emerald-700 font-medium";
  let dotStyle = "bg-emerald-500";
  let bgStyle = "bg-emerald-50 border-emerald-200/80";

  if (alert === "DARK_RED") {
    textStyle = "text-rose-800 font-bold";
    dotStyle = "bg-rose-700";
    bgStyle = "bg-rose-100/90 border-rose-300";
  } else if (alert === "RED") {
    textStyle = "text-red-700 font-semibold";
    dotStyle = "bg-red-500";
    bgStyle = "bg-red-50 border-red-200";
  } else if (alert === "YELLOW") {
    textStyle = "text-amber-800 font-medium";
    dotStyle = "bg-amber-500";
    bgStyle = "bg-amber-50 border-amber-200";
  }

  return (
    <div className="flex items-center justify-center">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs border ${bgStyle} ${textStyle}`}
        title={alertReason}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
        <span>{alertLabel}</span>
      </span>
    </div>
  );
}

export function buildTransferPlanningColumns(): ColumnConfig<TransferPlanningItem, TransferPlanningColumnCtx>[] {
  return [
    {
      key: "sku",
      label: "SKU",
      visible: true,
      width: "110px",
      render: (item) => (
        <Link
          href={`/san-pham/danh-sach?Code=${encodeURIComponent(item.sku)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm font-semibold text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
          title={`Xem chi tiết sản phẩm ${item.sku}`}>
          {item.sku}
        </Link>
      ),
      exportValue: (item) => item.sku,
    },
    {
      key: "name",
      label: "Tên sản phẩm",
      visible: true,
      width: "320px",
      render: (item) => (
        <div className="max-w-[310px] truncate font-medium text-gray-900" title={item.name}>
          {item.name}
        </div>
      ),
      exportValue: (item) => item.name,
    },
    {
      key: "unit",
      label: "ĐVT",
      visible: true,
      width: "70px",
      render: (item) => <span className="text-xs text-gray-500 block text-center">{item.unit}</span>,
      exportValue: (item) => item.unit,
    },
    {
      key: "stockHN",
      label: "Tồn HN",
      visible: true,
      width: "90px",
      render: (item) => (
        <span className="font-mono text-sm text-gray-700 block text-right">
          {formatWholeQuantity(item.stockHN)}
        </span>
      ),
      exportValue: (item) => item.stockHN,
    },
    {
      key: "stockSG",
      label: "Tồn SG",
      visible: true,
      width: "90px",
      render: (item) => (
        <span className="font-mono text-sm text-gray-700 block text-right">
          {formatWholeQuantity(item.stockSG)}
        </span>
      ),
      exportValue: (item) => item.stockSG,
    },
    {
      key: "inTransit",
      label: "Đang chuyển",
      visible: true,
      width: "105px",
      tooltip: "Hàng transfer nội bộ đang đi từ Hà Nội → Sài Gòn",
      render: (item, ctx) => {
        if (item.inTransit <= 0) {
          return (
            <span className="font-mono text-sm block text-right text-gray-400">
              {formatWholeQuantity(item.inTransit)}
            </span>
          );
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ctx?.onOpenInTransit?.(item);
            }}
            className="font-mono text-sm block text-right text-brand hover:underline font-medium w-full cursor-pointer">
            {formatWholeQuantity(item.inTransit)}
          </button>
        );
      },
      exportValue: (item) => item.inTransit,
    },
    {
      key: "committed",
      label: "Đơn tạm",
      visible: true,
      width: "100px",
      tooltip: "Tổng số lượng đơn PENDING (tạm) tại Kho Sài Gòn",
      render: (item) => (
        <span
          className={`font-mono text-sm block text-right ${
            item.committed > 0 ? "text-gray-900 font-medium" : "text-gray-400"
          }`}>
          {formatWholeQuantity(item.committed)}
        </span>
      ),
      exportValue: (item) => item.committed,
    },
    {
      key: "confirmedOrders",
      label: "Đơn xác nhận",
      visible: true,
      width: "115px",
      tooltip: "Tổng số lượng đơn CONFIRMED (đã xác nhận) tại Kho Sài Gòn",
      render: (item) => (
        <div className="text-right">
          <span
            className={`font-mono text-sm ${
              item.confirmedOrders > 0
                ? "text-gray-900 font-bold"
                : "text-gray-400"
            }`}>
            {formatWholeQuantity(item.confirmedOrders)}
          </span>
        </div>
      ),
      exportValue: (item) => item.confirmedOrders,
    },
    {
      key: "demandPerDay",
      label: "Demand/ngày",
      visible: true,
      width: "115px",
      tooltip: "Nhu cầu bán trung bình/ngày = 60%×BQ5 + 30%×BQ30 + 10%×BQ90",
      render: (item) => (
        <span className="font-mono text-sm text-gray-900 font-bold block text-right">
          {formatNumber(item.computed.demandPerDay, 1)}
        </span>
      ),
      exportValue: (item) => item.computed.demandPerDay,
    },
    {
      key: "availableStockSG",
      label: "Tồn khả dụng SG",
      visible: true,
      width: "130px",
      tooltip: "Tồn SG + Đang chuyển − Đơn tạm − Đơn xác nhận",
      render: (item) => (
        <span
          className={`font-mono text-sm block text-right ${
            item.computed.availableStockSG <= 0
              ? "text-red-600 font-semibold"
              : "text-gray-800"
          }`}>
          {formatWholeQuantity(item.computed.availableStockSG)}
        </span>
      ),
      exportValue: (item) => item.computed.availableStockSG,
    },
    {
      key: "availableDays",
      label: "Khả dụng (ngày)",
      visible: true,
      width: "130px",
      tooltip: "Tồn khả dụng SG ÷ Demand/ngày",
      render: (item) => {
        const demand = item.computed.demandPerDay;
        if (demand <= 0) {
          return <span className="font-mono text-sm text-gray-400 block text-right">—</span>;
        }
        const days = Math.round(item.computed.availableStockSG / demand);
        return (
          <span
            className={`font-mono text-sm block text-right ${
              days < 2 ? "text-red-600 font-semibold" : "text-gray-800"
            }`}>
            {days} ngày
          </span>
        );
      },
      exportValue: (item) =>
        item.computed.demandPerDay > 0
          ? Math.round(item.computed.availableStockSG / item.computed.demandPerDay)
          : null,
    },
    {
      key: "targetStockSG",
      label: "Tồn mục tiêu",
      visible: true,
      width: "115px",
      tooltip: "Tồn an toàn (2 ngày) + Demand × Chu kỳ (5-7 ngày tùy loại vận chuyển)",
      render: (item) => (
        <span className="font-mono text-sm text-gray-700 block text-right">
          {formatNumber(item.computed.targetStockSG, 1)}
        </span>
      ),
      exportValue: (item) => item.computed.targetStockSG,
    },
    {
      key: "suggestedQuantity",
      label: "SL đề xuất",
      visible: true,
      width: "120px",
      tooltip: "MAX(0, Tồn mục tiêu - Tồn khả dụng SG)",
      render: (item, ctx) => {
        const qty = item.computed.suggestedQuantity;
        if (qty <= 0) {
          return <span className="font-mono text-sm text-gray-300 block text-right">0</span>;
        }
        return (
          <PermissionGate resource="transfers" action="create">
            <div className="text-right">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx?.onOpenAddToTransfer?.(item);
                }}
                title="Thêm vào danh sách chuyển kho"
                className="inline-block px-2 py-0.5 rounded font-mono text-sm font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer">
                {formatNumber(qty, 1)}
              </button>
            </div>
          </PermissionGate>
        );
      },
      exportValue: (item) => item.computed.suggestedQuantity,
    },
    {
      key: "pendingTransfer",
      label: "Phiếu tạm",
      visible: true,
      width: "105px",
      tooltip: "Tổng số lượng trên phiếu tạm từ Kho Hà Nội → Kho Sài Gòn",
      render: (item, ctx) => {
        if (item.pendingTransfer <= 0) {
          return (
            <span className="font-mono text-sm block text-right text-gray-400">
              {formatWholeQuantity(item.pendingTransfer)}
            </span>
          );
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ctx?.onOpenPending?.(item);
            }}
            className="font-mono text-sm block text-right text-orange-600 hover:underline font-medium w-full cursor-pointer">
            {formatWholeQuantity(item.pendingTransfer)}
          </button>
        );
      },
      exportValue: (item) => item.pendingTransfer,
    },
    {
      key: "alert",
      label: "Cảnh báo",
      visible: true,
      width: "130px",
      render: (item) => renderAlertBadge(item),
      exportValue: (item) => item.computed.alertLabel,
    },
    {
      key: "alertReason",
      label: "Lý do",
      visible: true,
      width: "210px",
      render: (item) => (
        <span className="text-xs text-gray-600 truncate max-w-[200px] block" title={item.computed.alertReason}>
          {item.computed.alertReason}
        </span>
      ),
      exportValue: (item) => item.computed.alertReason,
    },
  ];
}
