"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCancelInternalUse,
  useInternalUse,
} from "@/lib/hooks/useInternalUses";
import { usePermission } from "@/lib/hooks/usePermissions";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  Search,
  User,
  Building2,
  Calendar,
  Tag,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { CodeLink } from "../shared/CodeLink";

const STATUS_TEXT: Record<number, string> = {
  1: "Phiếu tạm",
  2: "Hoàn thành",
  3: "Đã hủy",
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

interface InternalUsesMobileDetailSheetProps {
  internalUseId: number;
  onClose: () => void;
}

export function InternalUsesMobileDetailSheet({
  internalUseId,
  onClose,
}: InternalUsesMobileDetailSheetProps) {
  const router = useRouter();
  const { data: internalUse, isLoading } = useInternalUse(internalUseId);
  const cancelInternalUse = useCancelInternalUse();
  const canViewCost = usePermission("internal-use", "view_cost_price");

  const [productSearch, setProductSearch] = useState("");

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const filteredDetails = useMemo(() => {
    if (!internalUse) return [];
    const s = productSearch.trim().toLowerCase();
    if (!s) return internalUse.details;
    return internalUse.details.filter(
      (d) =>
        d.productCode.toLowerCase().includes(s) ||
        d.productName.toLowerCase().includes(s)
    );
  }, [internalUse, productSearch]);

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

  const showCancelButton =
    internalUse?.status === 1 || internalUse?.status === 2;
  const showOpenButton = internalUse?.status === 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right duration-200">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-1 rounded-full hover:bg-gray-100 active:scale-95 transition-all flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        {isLoading || !internalUse ? (
          <div className="h-6 w-40 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-base font-bold text-gray-900 flex-shrink-0">
              <CodeLink entity="internal-use" code={internalUse.code} />
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(internalUse.status)}`}>
              {STATUS_TEXT[internalUse.status] || "—"}
            </span>
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span className="text-sm text-gray-400">
              Đang tải thông tin phiếu...
            </span>
          </div>
        ) : !internalUse ? (
          <div className="py-20 text-center text-sm text-red-500">
            Không tìm thấy thông tin phiếu xuất dùng nội bộ
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4 pb-6">
            {/* ── Info grid ── */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Mục đích
                </span>
                <span className="text-sm font-medium text-gray-800 text-right max-w-[60%]">
                  {internalUse.purpose?.name || "-"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Người sử dụng
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {internalUse.userName || "-"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Người tạo
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {internalUse.createdByName || "-"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Thời gian
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {formatDate(internalUse.transDate || internalUse.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Chi nhánh
                </span>
                <span className="text-sm font-medium text-gray-800 text-right max-w-[55%]">
                  {internalUse.branchName || "-"}
                </span>
              </div>

              {canViewCost && (
                <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                  <span className="text-sm font-semibold text-gray-900">
                    Tổng giá trị
                  </span>
                  <span className="text-base font-bold text-brand">
                    {formatCurrency(Number(internalUse.totalValue))}
                  </span>
                </div>
              )}
            </div>

            {/* ── Danh sách sản phẩm ── */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Danh sách sản phẩm ({internalUse.details.length})
                </p>
              </div>

              {/* Search inline */}
              {internalUse.details.length > 0 && (
                <div className="relative mb-2.5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Tìm theo mã hoặc tên..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all"
                  />
                </div>
              )}

              {filteredDetails.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  Không tìm thấy sản phẩm
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDetails.map((detail, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                      {/* Row 1: code */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-brand">
                          {detail.productCode ? (
                            <Link
                              href={`/san-pham/danh-sach?Code=${detail.productCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:underline"
                              onClick={(e) => e.stopPropagation()}>
                              {detail.productCode}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>

                      {/* Row 2: name */}
                      <p className="text-sm text-gray-900 leading-tight">
                        {detail.productName}
                      </p>

                      {/* Dashed separator */}
                      <div className="border-t border-dashed border-gray-200 my-2.5" />

                      {/* Row 3: qty / cost / value */}
                      <div className="flex items-start justify-between">
                        <span className="text-sm text-gray-500">
                          SL:{" "}
                          <span className="font-bold text-gray-800">
                            {Number(detail.quantity)}
                          </span>
                          {detail.unit ? (
                            <span className="text-gray-400"> {detail.unit}</span>
                          ) : null}
                          {canViewCost && (
                            <>
                              {" × "}
                              <span className="text-gray-600">
                                {formatCurrency(Number(detail.cost))}
                              </span>
                            </>
                          )}
                        </span>
                        {canViewCost && (
                          <span className="text-sm font-bold text-brand ml-2 flex-shrink-0">
                            {formatCurrency(Number(detail.value))}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Ghi chú ── */}
            {internalUse.description && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
                <p className="text-xs text-amber-500 font-medium mb-1">
                  Ghi chú
                </p>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">
                  {internalUse.description}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Action bar ── */}
      {internalUse && (showCancelButton || showOpenButton) && (
        <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3 flex items-center gap-2">
          {showCancelButton && (
            <button
              onClick={handleCancel}
              disabled={cancelInternalUse.isPending}
              className="px-3.5 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0">
              {cancelInternalUse.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Hủy"
              )}
            </button>
          )}
          {showOpenButton && (
            <button
              onClick={handleOpenEdit}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand rounded-xl hover:bg-brand-dark active:scale-95 transition-all">
              Mở phiếu
            </button>
          )}
        </div>
      )}
    </div>
  );
}
