"use client";

import { useLayoutEffect, useRef } from "react";
import { useProduction } from "@/lib/hooks/useProductions";
import { ExternalLink, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { CodeLink } from "../shared/CodeLink";

interface ProductionDetailRowProps {
  productionId: number;
  colSpan: number;
  onEdit?: () => void;
}

const getStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return "bg-yellow-100 text-yellow-700";
    case 2:
      return "bg-green-100 text-green-700";
    case 3:
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusText = (status: number) => {
  switch (status) {
    case 1:
      return "Phiếu tạm";
    case 2:
      return "Hoàn thành";
    case 3:
      return "Đã hủy";
    default:
      return "Không xác định";
  }
};

export function ProductionDetailRow({
  productionId,
  colSpan,
  onEdit,
}: ProductionDetailRowProps) {
  const { data: production, isLoading } = useProduction(productionId);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sticky width theo scroll container (giống InvoiceDetailRow)
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
  }, [production]);

  if (isLoading) {
    return (
      <tr className="bg-brand-soft">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span className="text-gray-600">
              Đang tải thông tin phiếu sản xuất...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  if (!production) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin phiếu sản xuất
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand p-0 bg-gray-50">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4">
              {/* Header */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <p className="text-md font-bold">
                      <CodeLink
                        entity="production"
                        code={production.code}
                        className="text-md font-bold text-brand hover:underline"
                      />
                    </p>
                    <span className="text-gray-300">-</span>
                    <span className="text-md text-gray-700">
                      {production.productName}
                    </span>
                    <span className="text-gray-300">-</span>
                    <Link
                      href={`/san-pham/danh-sach?Code=${production.productCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-md text-brand hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}>
                      {production.productCode}
                    </Link>
                    <Link
                      href={`/san-pham/danh-sach?Code=${production.productCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-brand transition-colors"
                      onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(production.status)}`}>
                      {getStatusText(production.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-x-8 border-gray-200 pb-2 mb-2">
                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Người tạo:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {production.createdByName || "-"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Thời gian sản xuất:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {formatDate(production.manufacturedDate)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Kho đầu vào:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {production.sourceBranchName}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Kho đầu ra:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {production.destinationBranchName}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Mã hàng:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {production.productCode ? (
                        <CodeLink
                          entity="product"
                          code={production.productCode}
                        />
                      ) : (
                        "-"
                      )}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Số lượng sản xuất:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {production.quantity}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Ngày tạo:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {formatDate(production.createdAt)}
                    </span>
                  </div>
                </div>

                {production.note && (
                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Ghi chú:
                    </label>
                    <p className="px-3 py-2 text-md border rounded bg-gray-50 text-gray-700">
                      {production.note}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end pt-4 mt-4 border-t border-gray-200">
                {onEdit && production.status !== 3 && (
                  <button
                    onClick={onEdit}
                    className="px-4 py-2 text-md font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors">
                    Chỉnh sửa
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
