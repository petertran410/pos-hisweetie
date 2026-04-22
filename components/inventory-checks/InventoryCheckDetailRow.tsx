"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  useInventoryCheck,
  useDeleteInventoryCheck,
} from "@/lib/hooks/useInventoryChecks";
import { Loader2, Trash2 } from "lucide-react";
import { usePermission } from "@/lib/hooks/usePermissions";

interface Props {
  checkId: number;
  colSpan: number;
}

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

export function InventoryCheckDetailRow({ checkId, colSpan }: Props) {
  const { data: check, isLoading } = useInventoryCheck(checkId);
  const deleteCheck = useDeleteInventoryCheck();
  const canDelete = usePermission("inventory_checks", "delete");
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

  const handleDelete = () => {
    if (
      confirm(
        "Xóa phiếu kiểm sẽ khôi phục lại giá trị hàng loại B / cận date trước đó. Bạn có chắc?"
      )
    ) {
      deleteCheck.mutate(checkId);
    }
  };

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="p-0 border-b-2 border-l-2 border-r-2 border-blue-500">
        <div ref={wrapperRef}>
          <div className="p-4 bg-blue-50/30">
            {/* Header info */}
            <div className="flex items-start justify-between mb-4">
              <div className="grid grid-cols-4 gap-4 text-sm flex-1">
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
                  <p className="font-medium">
                    {formatDateTime(check.checkDate)}
                  </p>
                </div>
              </div>
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleteCheck.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa phiếu
                </button>
              )}
            </div>

            {check.note && (
              <div className="mb-4 text-sm">
                <span className="text-gray-500">Ghi chú: </span>
                <span>{check.note}</span>
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
                        <td className="px-3 py-2 font-mono text-xs">
                          {d.productCode}
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
          </div>
        </div>
      </td>
    </tr>
  );
}
