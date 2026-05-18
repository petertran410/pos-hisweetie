"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { useTransfer } from "@/lib/hooks/useTransfers";
import { Loader2, Pencil } from "lucide-react";
import type { Transfer } from "@/lib/api/transfers";
import { useCan } from "@/lib/hooks/useCan";

interface TransferDetailRowProps {
  transferId: number;
  colSpan: number;
  onEdit: (transfer: Transfer) => void;
}

const STATUS_COLOR: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-green-100 text-green-700",
  4: "bg-red-100 text-red-700",
};

const STATUS_TEXT: Record<number, string> = {
  1: "Phiếu tạm",
  2: "Đang chuyển",
  3: "Đã nhận",
  4: "Đã hủy",
};

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString("vi-VN") : "-";

const formatMoney = (amount: number) =>
  Number(amount).toLocaleString("vi-VN") + " đ";

export function TransferDetailRow({
  transferId,
  colSpan,
  onEdit,
}: TransferDetailRowProps) {
  const { data: transfer, isLoading } = useTransfer(transferId);
  const canUpdate = useCan("transfers", "update");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ─── Sticky width — giống OrderDetailRow ────────────────────────────────
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let scrollEl: HTMLElement | null = el.parentElement;
    while (scrollEl) {
      const ox = getComputedStyle(scrollEl).overflowX;
      if (ox === "auto" || ox === "scroll") break;
      scrollEl = scrollEl.parentElement;
    }
    if (!scrollEl) return;
    const update = () => {
      el.style.width = `${scrollEl!.clientWidth}px`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [transfer]);

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <tr>
        <td
          colSpan={colSpan}
          className="border-b-2 border-l-2 border-r-2 border-blue-500 bg-gray-50 px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600 text-sm">Đang tải...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!transfer) return null;

  // ─── Logic ───────────────────────────────────────────────────────────────
  // Cho phép chỉnh sửa khi chưa hoàn thành (status 3) và chưa hủy (status 4)
  const canEdit = canUpdate && transfer.status !== 3 && transfer.status !== 4;

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-blue-500 bg-gray-50 p-0">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4">
              {/* ── Header ── */}
              <div className="border-b border-gray-200 pb-3 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {transfer.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[transfer.status] || "bg-gray-100 text-gray-700"}`}>
                      {STATUS_TEXT[transfer.status] || "-"}
                    </span>
                  </div>

                  {/* Nút chỉnh sửa — chỉ hiện khi chưa hoàn thành */}
                  {canEdit && (
                    <button
                      onClick={() => onEdit(transfer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                      Chỉnh sửa
                    </button>
                  )}
                </div>

                {/* Chi nhánh chuyển / nhận */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium text-gray-800">
                    {transfer.fromBranchName}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-800">
                    {transfer.toBranchName}
                  </span>
                </div>
              </div>

              {/* ── Info Grid ── */}
              <div className="grid grid-cols-3 gap-x-8 mb-4">
                <div className="flex flex-col gap-1 mb-3 border-b pb-2">
                  <label className="text-xs text-gray-500">Người tạo</label>
                  <span className="text-sm text-gray-900">
                    {transfer.createdByName || "-"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 mb-3 border-b pb-2">
                  <label className="text-xs text-gray-500">Ngày chuyển</label>
                  <span className="text-sm text-gray-900">
                    {formatDateTime(transfer.transferredDate)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 mb-3 border-b pb-2">
                  <label className="text-xs text-gray-500">Ngày nhận</label>
                  <span className="text-sm text-gray-900">
                    {formatDateTime(transfer.receivedDate)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 mb-3 border-b pb-2">
                  <label className="text-xs text-gray-500">Thời gian tạo</label>
                  <span className="text-sm text-gray-900">
                    {formatDateTime(transfer.createdAt)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 mb-3 border-b pb-2">
                  <label className="text-xs text-gray-500">
                    Giá trị chuyển
                  </label>
                  <span className="text-sm font-medium text-gray-900">
                    {formatMoney(transfer.totalTransfer || 0)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 mb-3 border-b pb-2">
                  <label className="text-xs text-gray-500">Giá trị nhận</label>
                  <span className="text-sm font-medium text-gray-900">
                    {formatMoney(transfer.totalReceive || 0)}
                  </span>
                </div>

                {transfer.noteBySource && (
                  <div className="flex flex-col gap-1 mb-3 border-b pb-2 col-span-3">
                    <label className="text-xs text-gray-500">
                      Ghi chú bên chuyển
                    </label>
                    <span className="text-sm text-gray-900">
                      {transfer.noteBySource}
                    </span>
                  </div>
                )}

                {transfer.noteByDestination && (
                  <div className="flex flex-col gap-1 mb-3 border-b pb-2 col-span-3">
                    <label className="text-xs text-gray-500">
                      Ghi chú bên nhận
                    </label>
                    <span className="text-sm text-gray-900">
                      {transfer.noteByDestination}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Chi tiết sản phẩm ── */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Mã hàng
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Tên hàng
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        SL chuyển
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        SL nhận
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Đơn giá
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {transfer.details?.length ? (
                      transfer.details.map((detail, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                            {detail.productCode}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {detail.productName}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-900">
                            {Number(detail.sendQuantity).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-900">
                            {Number(detail.receivedQuantity).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-900">
                            {formatMoney(detail.sendPrice)}
                          </td>
                          <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                            {formatMoney(
                              Number(detail.sendQuantity) *
                                Number(detail.sendPrice)
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-gray-400 text-sm">
                          Không có sản phẩm
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* Footer tổng */}
                  {transfer.details?.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td
                          colSpan={4}
                          className="px-3 py-2 text-sm font-semibold text-gray-700">
                          Tổng ({transfer.details.length} mặt hàng)
                        </td>
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2 text-sm font-semibold text-right text-gray-900">
                          {formatMoney(transfer.totalTransfer || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
