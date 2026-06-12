"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  useCancelInternalUse,
  useInternalUse,
} from "@/lib/hooks/useInternalUses";
import { usePermission } from "@/lib/hooks/usePermissions";
import { toast } from "sonner";
import Link from "next/link";
import { CodeLink } from "@/components/shared/CodeLink";

interface InternalUseDetailRowProps {
  internalUseId: number;
  colSpan: number;
  onClose: () => void;
}

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

const getStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return "bg-gray-100 text-gray-700";
    case 2:
      return "bg-green-100 text-green-700";
    case 3:
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export function InternalUseDetailRow({
  internalUseId,
  colSpan,
  onClose,
}: InternalUseDetailRowProps) {
  const router = useRouter();
  const cancelInternalUse = useCancelInternalUse();
  const canViewCost = usePermission("internal-use", "view_cost_price");
  const { data: internalUse, isLoading } = useInternalUse(internalUseId);

  const [searchCode, setSearchCode] = useState("");
  const [searchName, setSearchName] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sticky width theo scroll container
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
      const next = `${scrollEl!.clientWidth}px`;
      if (el.style.width !== next) el.style.width = next;
    };
    update();
    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, [internalUse]);

  const filteredDetails = useMemo(() => {
    if (!internalUse) return [];
    return internalUse.details.filter((detail) => {
      const matchCode = searchCode
        ? detail.productCode.toLowerCase().includes(searchCode.toLowerCase())
        : true;
      const matchName = searchName
        ? detail.productName.toLowerCase().includes(searchName.toLowerCase())
        : true;
      return matchCode && matchName;
    });
  }, [internalUse, searchCode, searchName]);

  const handleCancel = async () => {
    if (!confirm("Bạn có chắc chắn muốn hủy phiếu xuất dùng nội bộ này?")) {
      return;
    }
    try {
      await cancelInternalUse.mutateAsync({ id: internalUseId, data: {} });
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra khi hủy phiếu");
    }
  };

  const handleOpenEdit = () => {
    router.push(`/san-pham/xuat-dung-noi-bo/${internalUseId}`);
  };

  if (isLoading) {
    return (
      <tr className="bg-brand-soft">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span className="text-gray-600">
              Đang tải thông tin phiếu xuất dùng nội bộ...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  if (!internalUse) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin phiếu xuất dùng nội bộ
        </td>
      </tr>
    );
  }

  const showCancelButton =
    internalUse.status === 1 || internalUse.status === 2;
  const showOpenButton = internalUse.status === 1;

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand bg-gray-50">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4">
              {/* Header */}
              <div className="flex border-b pb-2 items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    <CodeLink
                      entity="internal-use"
                      code={internalUse.code}
                      className="text-lg font-bold text-brand hover:underline"
                    />
                  </span>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                      internalUse.status
                    )}`}>
                    {getStatusText(internalUse.status)}
                  </span>
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  {internalUse.branchName || "-"}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-4 gap-x-8 gap-y-3 pb-4 mb-4 border-b border-gray-200">
                <div className="flex flex-col gap-1">
                  <label className="block text-sm text-gray-500">
                    Mục đích sử dụng:
                  </label>
                  <span className="block text-sm font-medium text-gray-900 py-1.5">
                    {internalUse.purpose?.name || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="block text-sm text-gray-500">
                    Người sử dụng:
                  </label>
                  <span className="block text-sm font-medium text-gray-900 py-1.5">
                    {internalUse.userName || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="block text-sm text-gray-500">
                    Người tạo:
                  </label>
                  <span className="block text-sm font-medium text-gray-900 py-1.5">
                    {internalUse.createdByName || "-"}
                  </span>
                </div>
                {canViewCost && (
                  <div className="flex flex-col gap-1">
                    <label className="block text-sm text-gray-500">
                      Tổng giá trị:
                    </label>
                    <span className="block text-sm font-semibold text-gray-900 py-1.5">
                      {formatCurrency(Number(internalUse.totalValue))}
                    </span>
                  </div>
                )}
              </div>

              {/* Product search */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Tìm theo mã
                  </label>
                  <input
                    type="text"
                    placeholder="Tìm theo mã"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Tìm theo tên
                  </label>
                  <input
                    type="text"
                    placeholder="Tìm theo tên"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
                  />
                </div>
              </div>

              {/* Product table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Danh sách sản phẩm
                  </h4>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700 tracking-wider">
                          Mã hàng
                        </th>
                        <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700 tracking-wider">
                          Tên hàng
                        </th>
                        <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700 tracking-wider">
                          ĐVT
                        </th>
                        <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700 tracking-wider">
                          Số lượng
                        </th>
                        {canViewCost && (
                          <>
                            <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider">
                              Giá vốn
                            </th>
                            <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider">
                              Giá trị xuất
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDetails.length === 0 ? (
                        <tr>
                          <td
                            colSpan={canViewCost ? 6 : 4}
                            className="px-4 py-8 text-center text-sm text-gray-400">
                            Không tìm thấy sản phẩm
                          </td>
                        </tr>
                      ) : (
                        filteredDetails.map((detail, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 transition-colors">
                            <td className="px-[10px] py-2">
                              {detail.productCode ? (
                                <Link
                                  href={`/san-pham/danh-sach?Code=${detail.productCode}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-brand hover:underline inline-flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}>
                                  {detail.productCode}
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              ) : (
                                <span className="text-sm">-</span>
                              )}
                            </td>
                            <td className="px-[10px] py-2 text-sm text-gray-900">
                              {detail.productName}
                            </td>
                            <td className="px-[10px] py-2 text-center text-sm text-gray-900">
                              {detail.unit || "-"}
                            </td>
                            <td className="px-[10px] py-2 text-center text-sm font-medium text-gray-900">
                              {Number(detail.quantity)}
                            </td>
                            {canViewCost && (
                              <>
                                <td className="px-[10px] py-2 text-right text-sm text-gray-900">
                                  {formatCurrency(Number(detail.cost))}
                                </td>
                                <td className="px-[10px] py-2 text-right text-sm font-semibold text-brand">
                                  {formatCurrency(Number(detail.value))}
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Description */}
              {internalUse.description && (
                <div className="mt-4">
                  <label className="block text-sm text-gray-500 mb-1.5">
                    Ghi chú:
                  </label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {internalUse.description}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end pt-4 mt-4 border-t border-gray-200 gap-2">
                {showCancelButton && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelInternalUse.isPending}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50">
                    Hủy
                  </button>
                )}
                {showOpenButton && (
                  <button
                    onClick={handleOpenEdit}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-brand rounded-full hover:bg-brand-dark transition-colors">
                    Mở phiếu
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
