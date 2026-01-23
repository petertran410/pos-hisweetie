"use client";

import { useState } from "react";
import { useSupplier, useDeleteSupplier } from "@/lib/hooks/useSuppliers";
import { formatCurrency } from "@/lib/utils";
import { SupplierForm } from "./SupplierForm";

interface SupplierDetailRowProps {
  supplierId: number;
  colSpan: number;
}

const formatDateTime = (date?: string) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

export function SupplierDetailRow({
  supplierId,
  colSpan,
}: SupplierDetailRowProps) {
  const { data: supplier, isLoading } = useSupplier(supplierId);
  const [activeTab, setActiveTab] = useState<"info" | "history" | "debt">(
    "info"
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInvoiceInfo, setShowInvoiceInfo] = useState(false);
  const deleteSupplier = useDeleteSupplier();

  const handleDelete = async () => {
    if (!supplier) return;
    if (confirm("Bạn có chắc chắn muốn xóa nhà cung cấp này?")) {
      await deleteSupplier.mutateAsync(supplier.id);
    }
  };

  console.log(supplier);

  const handleToggleStatus = async () => {};

  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 py-4 bg-gray-50">
          <div className="text-center text-gray-500">Đang tải...</div>
        </td>
      </tr>
    );
  }

  if (!supplier) {
    return null;
  }

  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-4 bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sm:max-w-[640px] md:max-w-[768px] lg:max-w-[830px] xl:max-w-[1090px] 2xl:max-w-[1520px]">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("info")}
                className={` py-2 text-md font-medium ${
                  activeTab === "info"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}>
                Thông tin
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-2 text-md font-medium ${
                  activeTab === "history"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}>
                Lịch sử nhập/trả hàng
              </button>
              <button
                onClick={() => setActiveTab("debt")}
                className={`px-3 py-2 text-md font-medium ${
                  activeTab === "debt"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}>
                Nợ cần trả nhà cung cấp
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                Chỉnh sửa
              </button>
              <button
                onClick={handleToggleStatus}
                className="px-3 py-1.5 border rounded hover:bg-gray-50 text-sm">
                {supplier.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
              </button>
            </div>
          </div>

          <div className="p-4">
            {activeTab === "info" && (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">
                      {supplier.name} {" - "}
                      <span className="text-gray-500 font-normal">
                        {supplier.code}
                      </span>
                    </h4>
                  </div>
                  <div className="text-sm text-gray-600">
                    {supplier.location || ""}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Người tạo: </span>
                    <span className="text-gray-900">Admin - DA</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Ngày tạo: </span>
                    <span className="text-gray-900">
                      {formatDateTime(supplier.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Nhóm nhà cung cấp: </span>
                    <span className="text-gray-900">
                      {supplier.supplierGroupDetails &&
                      supplier.supplierGroupDetails.length > 0
                        ? supplier.supplierGroupDetails
                            .map((g) => g.supplierGroup.name)
                            .join(", ")
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-sm text-gray-600 mb-0.5">
                      Điện thoại
                    </label>
                    <div className="text-sm text-gray-900">
                      {supplier.contactNumber || "Chưa có"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-0.5">
                      Email
                    </label>
                    <div className="text-sm text-gray-900">
                      {supplier.email || ""}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-0.5">
                      Địa chỉ
                    </label>
                    <div className="text-sm text-gray-900">
                      {supplier.address || "Chưa có"}
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setShowInvoiceInfo(!showInvoiceInfo)}
                    className="text-sm text-blue-600 hover:underline">
                    {showInvoiceInfo
                      ? "Ẩn thông tin xuất hóa đơn"
                      : "Thêm thông tin xuất hóa đơn"}
                  </button>
                </div>

                {showInvoiceInfo && (
                  <div className="space-y-2 pt-2">
                    <div>
                      <label className="block text-sm text-gray-600 mb-0.5">
                        Mã số thuế
                      </label>
                      <div className="text-sm text-gray-900">
                        {supplier.taxCode || "Chưa có"}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="no-notes"
                    disabled
                    checked={!supplier.comments}
                    className="cursor-not-allowed"
                  />
                  <label
                    htmlFor="no-notes"
                    className="text-sm text-gray-600 cursor-not-allowed">
                    Chưa có ghi chú
                  </label>
                </div>

                {supplier.comments && (
                  <div className="pt-2">
                    <label className="block text-sm text-gray-600 mb-0.5">
                      Ghi chú
                    </label>
                    <div className="text-sm text-gray-900">
                      {supplier.comments}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleDelete}
                    className="px-4 py-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm">
                    Xóa
                  </button>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div>
                <p className="text-gray-500 text-sm">
                  Lịch sử nhập/trả hàng đang được phát triển
                </p>
              </div>
            )}

            {activeTab === "debt" && (
              <div>
                <p className="text-gray-500 text-sm">
                  Thông tin nợ cần trả đang được phát triển
                </p>
              </div>
            )}
          </div>
        </div>

        {showEditModal && (
          <SupplierForm
            supplier={supplier}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </td>
    </tr>
  );
}
