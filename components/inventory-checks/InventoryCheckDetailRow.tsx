"use client";

import { useLayoutEffect, useRef } from "react";
import {
  useInventoryCheck,
  useCancelInventoryCheck,
} from "@/lib/hooks/useInventoryChecks";
import { Loader2 } from "lucide-react";
import { usePermission } from "@/lib/hooks/usePermissions";
import Link from "next/link";

interface Props {
  checkId: number;
  colSpan: number;
}

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

export function InventoryCheckDetailRow({ checkId, colSpan }: Props) {
  const { data: check, isLoading } = useInventoryCheck(checkId);
  const cancelCheck = useCancelInventoryCheck();
  const canUpdate = usePermission("inventory_checks", "update");
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
      el.style.width = `${scrollEl!.clientWidth}px`;
    };
    setWidth();
    const ro = new ResizeObserver(setWidth);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [check]);

  if (isLoading || !check) {
    return (
      <tr>
        <td colSpan={colSpan}>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-500">
              Đang tải chi tiết...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  const isCancelled = check.status === 2;

  const handleCancel = () => {
    if (
      confirm(
        "Hủy phiếu kiểm sẽ khôi phục lại giá trị hàng loại B / cận date trước đó. Bạn có chắc?"
      )
    ) {
      cancelCheck.mutate(checkId);
    }
  };

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="p-0 border-b-2 border-l-2 border-r-2 border-blue-500">
        <div ref={wrapperRef}>
          <div className="px-5 pb-5 bg-blue-50/30">
            {/* Header info */}
            <div className="grid grid-cols-4 gap-4 text-sm mb-4 pt-4">
              <div>
                <span className="text-gray-500">Mã phiếu:</span>
                <p className="font-semibold">{check.code}</p>
              </div>
              <div>
                <span className="text-gray-500">Chi nhánh:</span>
                <p className="font-medium">{check.branchName}</p>
              </div>
              <div>
                <span className="text-gray-500">Người kiểm:</span>
                <p className="font-medium">{check.createdByName}</p>
              </div>
              <div>
                <span className="text-gray-500">Ngày kiểm:</span>
                <p className="font-medium">{formatDateTime(check.checkDate)}</p>
              </div>
            </div>

            {check.note && (
              <div className="mb-4 text-sm">
                <span className="text-gray-500">Ghi chú: </span>
                <span>{check.note}</span>
              </div>
            )}

            {/* Status badge */}
            {isCancelled && (
              <div className="mb-4">
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                  Đã hủy
                </span>
              </div>
            )}

            {/* Details table */}
            <div className="border rounded overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Mã hàng</th>
                    <th className="px-3 py-2 text-left">Tên hàng</th>
                    <th className="px-3 py-2 text-right">Tồn kho lúc kiểm</th>
                    <th className="px-3 py-2 text-right">Loại B (trước)</th>
                    <th className="px-3 py-2 text-right">Loại B (sau)</th>
                    <th className="px-3 py-2 text-right">Cận date (trước)</th>
                    <th className="px-3 py-2 text-right">Cận date (sau)</th>
                    <th className="px-3 py-2 text-left">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {check.details.map((d) => {
                    const damagedChanged =
                      Number(d.damagedQuantity) !== Number(d.previousDamaged);
                    const nearExpiryChanged =
                      Number(d.nearExpiryQuantity) !==
                      Number(d.previousNearExpiry);

                    return (
                      <tr key={d.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <Link
                            href={`/san-pham/danh-sach?Code=${d.productCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}>
                            {d.productCode}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{d.productName}</td>
                        <td className="px-3 py-2 text-right">
                          {Number(d.currentOnHand).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {Number(d.previousDamaged).toLocaleString()}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium ${damagedChanged ? "text-red-600" : ""}`}>
                          {Number(d.damagedQuantity).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {Number(d.previousNearExpiry).toLocaleString()}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium ${nearExpiryChanged ? "text-orange-600" : ""}`}>
                          {Number(d.nearExpiryQuantity).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {d.note || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer - giống ProductDetailRow */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
              <div>
                {canUpdate && !isCancelled && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelCheck.isPending}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {cancelCheck.isPending ? "Đang hủy..." : "Hủy phiếu"}
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
