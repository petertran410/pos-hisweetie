"use client";

import { useLayoutEffect, useRef } from "react";
import {
  useStockConditionTransfer,
  useApproveStockConditionTransfer,
  useCancelStockConditionTransfer,
} from "@/lib/hooks/useStockConditionTransfers";
import { BUCKET_LABELS } from "@/lib/api/stock-condition-transfers";
import { Loader2 } from "lucide-react";
import { usePermission } from "@/lib/hooks/usePermissions";
import Link from "next/link";

interface Props {
  transferId: number;
  colSpan: number;
}

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";
const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "-";

export function StockConditionTransferDetailRow({ transferId, colSpan }: Props) {
  const { data: transfer, isLoading } =
    useStockConditionTransfer(transferId);
  const approveTransfer = useApproveStockConditionTransfer();
  const cancelTransfer = useCancelStockConditionTransfer();
  const canApprove = usePermission("stock_condition_transfers", "approve");
  const canUpdate = usePermission("stock_condition_transfers", "update");
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    const setWidth = () => {
      const next = `${scrollEl!.clientWidth}px`;
      if (el.style.width !== next) el.style.width = next;
    };
    setWidth();
    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(setWidth);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, [transfer]);

  if (isLoading || !transfer) {
    return (
      <tr>
        <td colSpan={colSpan}>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span className="ml-2 text-sm text-gray-500">
              Đang tải chi tiết...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  const isCancelled = transfer.status === 3;
  const isApproved = transfer.status === 2;
  const isPending = transfer.status === 1;

  const handleApprove = () => {
    if (
      confirm(
        "Duyệt phiếu sẽ áp dụng số lượng chuyển vào tồn loại (bục rách / cận date / KM). Bạn có chắc?"
      )
    ) {
      approveTransfer.mutate(transferId);
    }
  };

  const handleCancel = () => {
    if (
      confirm(
        "Hủy phiếu sẽ hoàn tác số lượng đã chuyển (nếu đã duyệt). Bạn có chắc?"
      )
    ) {
      cancelTransfer.mutate(transferId);
    }
  };

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="p-0 border-b-2 border-l-2 border-r-2 border-brand">
        <div ref={wrapperRef}>
          <div className="px-5 pb-5 bg-brand-soft">
            {/* Header info */}
            <div className="grid grid-cols-4 gap-4 text-sm mb-4 pt-4">
              <div>
                <span className="text-gray-500">Mã phiếu:</span>
                <p className="font-semibold">{transfer.code}</p>
              </div>
              <div>
                <span className="text-gray-500">Chi nhánh:</span>
                <p className="font-medium">{transfer.branchName}</p>
              </div>
              <div>
                <span className="text-gray-500">Người tạo:</span>
                <p className="font-medium">{transfer.createdByName}</p>
              </div>
              <div>
                <span className="text-gray-500">Ngày:</span>
                <p className="font-medium">
                  {formatDateTime(transfer.transferDate)}
                </p>
              </div>
              {transfer.approvedByName && (
                <div>
                  <span className="text-gray-500">Người duyệt:</span>
                  <p className="font-medium">{transfer.approvedByName}</p>
                </div>
              )}
              {transfer.approvedAt && (
                <div>
                  <span className="text-gray-500">Duyệt lúc:</span>
                  <p className="font-medium">
                    {formatDateTime(transfer.approvedAt)}
                  </p>
                </div>
              )}
            </div>

            {transfer.note && (
              <div className="mb-4 text-sm">
                <span className="text-gray-500">Ghi chú: </span>
                <span>{transfer.note}</span>
              </div>
            )}

            {/* Status badge */}
            <div className="mb-4">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  isCancelled
                    ? "bg-red-100 text-red-700"
                    : isApproved
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                }`}>
                {isCancelled ? "Đã hủy" : isApproved ? "Đã duyệt" : "Chờ duyệt"}
              </span>
            </div>

            {/* Details table */}
            <div className="border rounded overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Mã hàng</th>
                    <th className="px-3 py-2 text-left">Tên hàng</th>
                    <th className="px-3 py-2 text-center">Loại đích</th>
                    <th className="px-3 py-2 text-right">Số lượng</th>
                    <th className="px-3 py-2 text-center">Hạn dùng</th>
                    <th className="px-3 py-2 text-right">Tồn lúc tạo</th>
                    <th className="px-3 py-2 text-left">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {transfer.details.map((d) => (
                    <tr key={d.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <Link
                          href={`/san-pham/danh-sach?Code=${d.productCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-brand hover:underline"
                          onClick={(e) => e.stopPropagation()}>
                          {d.productCode}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{d.productName}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                          {BUCKET_LABELS[d.toBucket] || d.toBucket}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {Number(d.quantity).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {d.toBucket === "NEAR_EXPIRY"
                          ? formatDate(d.expiryDate)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">
                        {Number(d.currentOnHand).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {d.note || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                {canApprove && isPending && (
                  <button
                    onClick={handleApprove}
                    disabled={approveTransfer.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors disabled:opacity-50">
                    {approveTransfer.isPending ? "Đang duyệt..." : "Duyệt phiếu"}
                  </button>
                )}
                {canUpdate && !isCancelled && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelTransfer.isPending}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {cancelTransfer.isPending ? "Đang hủy..." : "Hủy phiếu"}
                  </button>
                )}
              </div>
              <div />
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
