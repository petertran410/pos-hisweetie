"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import {
  useSupplier,
  useDeleteSupplier,
  useUpdateSupplier,
} from "@/lib/hooks/useSuppliers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { SupplierForm } from "./SupplierForm";
import { SupplierDebtsTab } from "./SupplierDebtsTab";
import { useCan } from "@/lib/hooks/useCan";

interface SupplierDetailRowProps {
  supplierId: number;
  colSpan: number;
}

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString("vi-VN") : "-";

const TABS = [
  { key: "info", label: "Thông tin" },
  { key: "history", label: "Lịch sử nhập/trả hàng" },
  { key: "debt", label: "Nợ cần trả nhà cung cấp" },
] as const;

export function SupplierDetailRow({
  supplierId,
  colSpan,
}: SupplierDetailRowProps) {
  const { data: supplier, isLoading } = useSupplier(supplierId);
  const deleteSupplier = useDeleteSupplier();
  const updateSupplier = useUpdateSupplier();
  const [activeTab, setActiveTab] = useState<"info" | "history" | "debt">(
    "info"
  );
  const [showEditModal, setShowEditModal] = useState(false);

  const canUpdateSupplier = useCan("suppliers", "update");
  const canDeleteSupplier = useCan("suppliers", "delete");

  // ─── Sticky width (giống CustomerDetailRow) ───────────────────────────────
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
    const update = () => {
      el.style.width = `${scrollEl!.clientWidth}px`;
    };
    update();
    // Observe parent của scrollEl — tránh feedback loop ResizeObserver
    const ro = new ResizeObserver(update);
    ro.observe(scrollEl.parentElement ?? scrollEl);
    return () => ro.disconnect();
  }, [supplier]);

  const handleDelete = async () => {
    if (!supplier) return;
    if (
      confirm(
        "Bạn có chắc chắn muốn xóa nhà cung cấp này? Hành động này không thể hoàn tác!"
      )
    ) {
      await deleteSupplier.mutateAsync(supplier.id);
    }
  };

  const handleToggleStatus = () => {
    if (!supplier) return;
    const action = supplier.isActive ? "ngừng hoạt động" : "kích hoạt";
    if (confirm(`Bạn có chắc chắn muốn ${action} nhà cung cấp này?`)) {
      updateSupplier.mutate({
        id: supplier.id,
        data: { isActive: !supplier.isActive },
      });
    }
  };

  if (isLoading) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600">
              Đang tải thông tin nhà cung cấp...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  if (!supplier) return null;

  const groups =
    supplier.supplierGroupDetails
      ?.map((d: any) => d.supplierGroup?.name)
      .filter(Boolean) || [];

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-blue-500 p-0 bg-gray-50">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4">
              {/* ── Header ── */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {supplier.code}
                    </span>
                    <span className="text-gray-400">-</span>
                    <span className="text-lg font-semibold text-gray-800">
                      {supplier.name}
                    </span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                        supplier.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                      {supplier.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {supplier.branch?.name || "-"}
                  </span>
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-1 border-b border-gray-200">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-2 text-md font-medium border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Tab: Thông tin ── */}
              {activeTab === "info" && (
                <div>
                  {/* Meta */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                      <span>
                        Ngày tạo:{" "}
                        <span className="text-gray-700">
                          {formatDate(supplier.createdAt)}
                        </span>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>
                        Người tạo:{" "}
                        <span className="text-gray-700">
                          {supplier.createdName || "admin"}
                        </span>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>
                        Nhóm NCC:{" "}
                        <span className="text-gray-700">
                          {groups.length > 0
                            ? groups.join(", ")
                            : "Chưa có nhóm"}
                        </span>
                      </span>
                    </div>
                    <div className="text-right text-sm shrink-0 ml-4">
                      <div className="text-gray-500">
                        Nợ hiện tại:{" "}
                        <span className="font-semibold text-red-600">
                          {formatCurrency(supplier.debt ?? 0)}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        Tổng mua:{" "}
                        <span className="font-semibold text-gray-800">
                          {formatCurrency(supplier.totalInvoiced ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-6">
                    <div className="flex gap-2 text-gray-700">
                      <span className="text-gray-500 shrink-0">
                        Điện thoại:
                      </span>
                      <span>{supplier.contactNumber || "-"}</span>
                    </div>
                    <div className="flex gap-2 text-gray-700">
                      <span className="text-gray-500 shrink-0">Email:</span>
                      <span>{supplier.email || "-"}</span>
                    </div>
                    <div className="flex gap-2 text-gray-700">
                      <span className="text-gray-500 shrink-0">
                        Mã số thuế:
                      </span>
                      <span>{supplier.taxCode || "-"}</span>
                    </div>
                    <div className="flex gap-2 text-gray-700 col-span-2">
                      <span className="text-gray-500 shrink-0">Địa chỉ:</span>
                      <span>{supplier.address || "-"}</span>
                    </div>
                  </div>

                  {/* ── Action footer ── */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      {canDeleteSupplier && (
                        <button
                          onClick={handleDelete}
                          className="px-4 py-2 text-md font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors">
                          <Trash2 className="w-4 h-4 inline mr-1" />
                          Xóa
                        </button>
                      )}
                      {canUpdateSupplier && (
                        <button
                          onClick={handleToggleStatus}
                          className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                          {supplier.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
                        </button>
                      )}
                    </div>
                    {canUpdateSupplier && (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="px-4 py-2 text-md font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm">
                        <Pencil className="w-4 h-4 inline mr-1" />
                        Chỉnh sửa
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab: Lịch sử nhập/trả hàng ── */}
              {activeTab === "history" && (
                <div className="text-center text-gray-500 py-8 text-sm">
                  Chưa có lịch sử nhập/trả hàng
                </div>
              )}

              {/* ── Tab: Nợ cần trả ── */}
              {activeTab === "debt" && (
                <SupplierDebtsTab
                  supplierId={supplierId}
                  supplierDebt={Number(supplier.debt || 0)}
                />
              )}
            </div>
          </div>
        </div>
      </td>

      {showEditModal && (
        <SupplierForm
          supplier={supplier}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </tr>
  );
}
