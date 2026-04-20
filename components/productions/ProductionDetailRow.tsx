"use client";

import { useLayoutEffect, useRef } from "react";
import { useProduction } from "@/lib/hooks/useProductions";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

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
      el.style.width = `${scrollEl!.clientWidth}px`;
    };
    setWidth();
    const ro = new ResizeObserver(setWidth);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [production]);

  if (isLoading) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
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
      <td colSpan={colSpan} className="p-0 bg-gray-50">
        <div ref={wrapperRef} style={{ overflow: "hidden" }}>
          <div className="px-6 py-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {production.code}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Sản phẩm: {production.productName}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(production.status)}`}>
                  {getStatusText(production.status)}
                </span>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1.5">
                      Người tạo:
                    </label>
                    <span className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 block">
                      {production.createdByName || "-"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1.5">
                      Thời gian sản xuất:
                    </label>
                    <span className="w-full px-3 py-2 text-sm border rounded-lg bg-white block">
                      {formatDate(production.manufacturedDate)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1.5">
                      Kho đầu vào:
                    </label>
                    <span className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 block">
                      {production.sourceBranchName}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1.5">
                      Kho đầu ra:
                    </label>
                    <span className="w-full px-3 py-2 text-sm border rounded-lg bg-white block">
                      {production.destinationBranchName}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1.5">
                      Mã hàng:
                    </label>
                    <span className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 block">
                      {production.productCode}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1.5">
                      Số lượng sản xuất:
                    </label>
                    <span className="w-full px-3 py-2 text-sm border rounded-lg bg-white font-semibold block">
                      {production.quantity}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1.5">
                      Ngày tạo:
                    </label>
                    <span className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 block">
                      {formatDate(production.createdAt)}
                    </span>
                  </div>
                </div>

                {production.note && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1.5">
                      Ghi chú:
                    </label>
                    <p className="px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700">
                      {production.note}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
                {onEdit && production.status !== 3 && (
                  <button
                    onClick={onEdit}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
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
