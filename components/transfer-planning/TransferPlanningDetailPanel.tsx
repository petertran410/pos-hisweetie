"use client";

import React, { useState } from "react";
import { X, ArrowRight, Info, Calculator, AlertCircle, PackageCheck, Plus } from "lucide-react";
import type { TransferPlanningItem } from "@/lib/types/transfer-planning";
import { formatNumber, formatQuantity } from "@/lib/utils/transfer-planning-calc";
import { renderAlertBadge } from "./columns";
import { AddToTransferModal } from "./AddToTransferModal";

interface TransferPlanningDetailPanelProps {
  item: TransferPlanningItem | null;
  onClose: () => void;
}

export function TransferPlanningDetailPanel({
  item,
  onClose,
}: TransferPlanningDetailPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  if (!item) return null;

  const c = item.computed;

  const ALERT_TEXT_COLOR: Record<string, string> = {
    DARK_RED: "text-rose-800",
    RED: "text-red-700",
    YELLOW: "text-amber-800",
    GREEN: "text-emerald-700",
  };
  const alertColor = ALERT_TEXT_COLOR[c.alert] || "text-gray-900";

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl border-l flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      style={{ borderColor: "var(--dt-border)" }}>
      {/* Header */}
      <div
        className="p-4 border-b flex items-start justify-between bg-gray-50/70"
        style={{ borderColor: "var(--dt-border)" }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              {item.sku}
            </span>
            {renderAlertBadge(item)}
          </div>
          <h2 className="text-base font-bold text-gray-900 mt-1.5 leading-snug">
            {item.name}
          </h2>
          <div className="text-xs text-gray-500 mt-0.5">
            ĐVT: <strong className="text-gray-700">{item.unit}</strong>
            {item.childName && ` · Danh mục: ${item.childName}`}
            {item.parentName && ` · Loại: ${item.parentName}`}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          title="Đóng chi tiết">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
        {/* Kết quả đề xuất chính */}
        <div className="p-4 rounded-xl border bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Số lượng đề xuất chuyển
            </span>
            <span className="text-xs text-gray-500">HN → SG</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-bold font-mono text-primary">
              {formatNumber(c.suggestedQuantity, 1)}
            </span>
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
              {item.unit}
              {item.packSize > 1 && (
                <>
                  {" "}≈ {formatNumber(c.suggestedQuantity / item.packSize, 1)} thùng
                  <span className="text-gray-400"> (× {item.packSize})</span>
                </>
              )}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-600 bg-white/80 p-2.5 rounded-lg border border-primary/10">
            <strong>Trạng thái: </strong>
            <span>{c.alertReason}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-3 w-full py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Thêm vào danh sách chuyển kho
          </button>
        </div>

        {/* Thông số vị trí tồn kho */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-gray-400" />
            Hiện trạng tồn kho & đơn hàng
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg border bg-gray-50/50">
              <span className="text-gray-500 block">Tồn kho Hà Nội (Nguồn):</span>
              <strong className="text-sm font-mono text-gray-900 mt-0.5 block">
                {formatQuantity(item.stockHN)} {item.unit}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border bg-gray-50/50">
              <span className="text-gray-500 block">Tồn kho Sài Gòn (Đích):</span>
              <strong className={`text-sm font-mono mt-0.5 block ${alertColor}`}>
                {formatQuantity(item.stockSG)} {item.unit}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border bg-gray-50/50">
              <span className="text-gray-500 block">Đang chuyển nội bộ:</span>
              <strong className="text-sm font-mono text-blue-700 mt-0.5 block">
                {formatQuantity(item.inTransit)} {item.unit}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border bg-gray-50/50">
              <span className="text-gray-500 block">Giữ / Đã cam kết:</span>
              <strong className="text-sm font-mono text-gray-900 mt-0.5 block">
                {formatQuantity(item.committed)} {item.unit}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border bg-gray-50/50 col-span-2 flex items-center justify-between">
              <div>
                <span className="text-gray-500 block">Đơn hàng khách đã xác nhận:</span>
                <span className="text-[11px] text-gray-400">Từ các đơn tạm/xác nhận tại chi nhánh SG</span>
              </div>
              <strong
                className={`text-sm font-mono px-2 py-0.5 rounded ${
                  item.confirmedOrders > 0
                    ? "bg-rose-100 text-rose-800 font-bold"
                    : "text-gray-600"
                }`}>
                {formatQuantity(item.confirmedOrders)} {item.unit}
              </strong>
            </div>
          </div>
        </div>

        {/* Giải thích chi tiết công thức (Progressive Disclosure) */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-primary" />
            Chi tiết tính toán & Phân tích nhu cầu
          </h3>

          <div className="space-y-2.5 text-xs">
            {/* Lịch sử bán */}
            <div className="p-3 rounded-lg border bg-gray-50">
              <div className="font-semibold text-gray-800 mb-2">1. Tốc độ bán bình quân (BQ/ngày):</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded border">
                  <div className="text-gray-500 text-[11px]">Bán 5N: {item.sales5}</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5">
                    {formatNumber(c.avg5PerDay, 1)}/ngày
                  </div>
                  <div className="text-[10px] text-primary font-medium">Trọng số 60%</div>
                </div>

                <div className="bg-white p-2 rounded border">
                  <div className="text-gray-500 text-[11px]">Bán 30N: {item.sales30}</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5">
                    {formatNumber(c.avg30PerDay, 1)}/ngày
                  </div>
                  <div className="text-[10px] text-primary font-medium">Trọng số 30%</div>
                </div>

                <div className="bg-white p-2 rounded border">
                  <div className="text-gray-500 text-[11px]">Bán 90N: {item.sales90}</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5">
                    {formatNumber(c.avg90PerDay, 1)}/ngày
                  </div>
                  <div className="text-[10px] text-primary font-medium">Trọng số 10%</div>
                </div>
              </div>

              <div className="mt-2.5 p-2 bg-white rounded border flex items-center justify-between">
                <span className="font-medium text-gray-700">Demand/ngày (nhu cầu dự báo):</span>
                <span className="font-mono font-bold text-sm text-primary">
                  {formatNumber(c.demandPerDay, 2)} {item.unit}/ngày
                </span>
              </div>
            </div>

            {/* Các chỉ số an toàn & điều chuyển */}
            <div className="p-3 rounded-lg border bg-gray-50 space-y-2">
              <div className="font-semibold text-gray-800 mb-1">2. Chỉ số tồn & mục tiêu:</div>

              <div className="flex items-center justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">Tồn an toàn (2 ngày demand):</span>
                <span className="font-mono font-semibold text-gray-800">
                  {formatNumber(c.safetyStock, 1)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">Điểm điều chuyển (An toàn + 5 ngày leadtime):</span>
                <span className="font-mono font-semibold text-gray-800">
                  {formatNumber(c.transferPoint, 1)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">Tồn khả dụng SG (Tồn SG + Chuyển - Giữ):</span>
                <span className="font-mono font-bold text-gray-900">
                  {formatQuantity(c.availableStockSG)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-gray-600">Tồn mục tiêu (An toàn + 7 ngày chu kỳ):</span>
                <span className="font-mono font-bold text-gray-900">
                  {formatNumber(c.targetStockSG, 1)}
                </span>
              </div>
            </div>

            </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50 flex justify-end" style={{ borderColor: "var(--dt-border)" }}>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
          Đóng
        </button>
      </div>

      {/* Add to Transfer Modal */}
      {showAddModal && (
        <AddToTransferModal
          item={item}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </aside>
  );
}
