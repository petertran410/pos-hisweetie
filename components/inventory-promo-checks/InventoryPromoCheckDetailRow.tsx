"use client";

import { useLayoutEffect, useRef } from "react";
import {
  useInventoryPromoCheck,
  useCancelInventoryPromoCheck,
} from "@/lib/hooks/useInventoryPromoChecks";
import { Loader2 } from "lucide-react";
import { usePermission } from "@/lib/hooks/usePermissions";
import Link from "next/link";

interface Props {
  checkId: number;
  colSpan: number;
}

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

export function InventoryPromoCheckDetailRow({ checkId, colSpan }: Props) {
  const { data: check, isLoading } = useInventoryPromoCheck(checkId);
  const cancelCheck = useCancelInventoryPromoCheck();
  const canUpdate = usePermission("inventory_promo_checks", "update");
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
  }, [check]);

  if (isLoading || !check) {
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

  const isCancelled = check.status === 2;

  const handleCancel = () => {
    if (
      confirm(
        "Hủy phiếu kiểm sẽ khôi phục lại số lượng hàng khuyến mãi trước đó. Bạn có chắc?"
      )
    ) {
      cancelCheck.mutate(checkId);
    }
  };

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="p-0 border-b-2 border-l-2 border-r-2 border-brand">
        <div ref={wrapperRef}>
          <div className="px-5 pb-5 bg-brand-soft">
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

            {isCancelled && (
              <div className="mb-4">
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                  Đã hủy
                </span>
              </div>
            )}

            <div className="border rounded overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Mã hàng</th>
                    <th className="px-3 py-2 text-left">Tên hàng</th>
                    <th className="px-3 py-2 text-right">Tồn lúc kiểm</th>
                    <th className="px-3 py-2 text-right">Loại B</th>
                    <th className="px-3 py-2 text-right">Cận date</th>
                    <th className="px-3 py-2 text-right">KM (trước)</th>
                    <th className="px-3 py-2 text-right">KM (sau)</th>
                    <th className="px-3 py-2 text-left">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {check.details.map((d) => {
                    const changed =
                      Number(d.promoQuantity) !==
                      Number(d.previousPromoQuantity);
                    return (
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
                        <td className="px-3 py-2 text-right">
                          {Number(d.currentOnHand).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {Number(d.currentDamaged).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {Number(d.currentNearExpiry).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {Number(d.previousPromoQuantity).toLocaleString()}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium ${
                            changed ? "text-brand" : ""
                          }`}>
                          {Number(d.promoQuantity).toLocaleString()}
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
