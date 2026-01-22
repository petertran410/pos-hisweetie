"use client";

import { useState } from "react";
import { Supplier } from "@/lib/types/supplier";
import { formatCurrency } from "@/lib/utils";
import { useDeleteSupplier } from "@/lib/hooks/useSuppliers";
import { SupplierForm } from "./SupplierForm";

interface SupplierDetailRowProps {
  supplier: Supplier;
}

export function SupplierDetailRow({ supplier }: SupplierDetailRowProps) {
  const [activeTab, setActiveTab] = useState<"info" | "history" | "debt">(
    "info"
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const deleteSupplier = useDeleteSupplier();

  const handleDelete = async () => {
    if (confirm("Bạn có chắc chắn muốn xóa nhà cung cấp này?")) {
      await deleteSupplier.mutateAsync(supplier.id);
    }
  };

  const handleToggleStatus = async () => {
    // Implement toggle status
  };

  return (
    <div className="bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "info"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}>
              Thông tin
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "history"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}>
              Lịch sử nhập/trả hàng
            </button>
            <button
              onClick={() => setActiveTab("debt")}
              className={`px-4 py-2 text-sm font-medium ${
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
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
              Chỉnh sửa
            </button>
            <button
              onClick={handleToggleStatus}
              className="px-4 py-2 border rounded hover:bg-gray-50 text-sm">
              {supplier.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 border rounded hover:bg-gray-50 text-sm">
              Xóa
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "info" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">
                  {supplier.name} - {supplier.code}
                </h4>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Điện thoại
                    </label>
                    <div className="text-base">
                      {supplier.contactNumber || supplier.phone || "Chưa có"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Email
                    </label>
                    <div className="text-base">
                      {supplier.email || "Chưa có"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Nhóm nhà cung cấp
                    </label>
                    <div className="text-base">
                      {supplier.supplierGroupDetails &&
                      supplier.supplierGroupDetails.length > 0
                        ? supplier.supplierGroupDetails
                            .map((g) => g.supplierGroup.name)
                            .join(", ")
                        : "Chưa có"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">
                  Địa chỉ
                </h4>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Địa chỉ
                    </label>
                    <div className="text-base">
                      {supplier.address || "Chưa có"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Khu vực
                    </label>
                    <div className="text-base">
                      {supplier.location || "Chưa có"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Phường/Xã
                    </label>
                    <div className="text-base">
                      {supplier.wardName || "Chưa có"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">
                  Thông tin xuất hóa đơn
                </h4>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Mã số thuế
                    </label>
                    <div className="text-base">
                      {supplier.taxCode || "Chưa có"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Người liên hệ
                    </label>
                    <div className="text-base">
                      {supplier.contactPerson || "Chưa có"}
                    </div>
                  </div>
                </div>
              </div>

              {supplier.comments && (
                <div className="border-t pt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">
                    Ghi chú
                  </h4>
                  <div className="text-base">{supplier.comments}</div>
                </div>
              )}
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
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Tổng mua</div>
                  <div className="text-2xl font-semibold text-blue-600">
                    {formatCurrency(supplier.totalInvoiced)}
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Nợ hiện tại</div>
                  <div className="text-2xl font-semibold text-orange-600">
                    {formatCurrency(supplier.totalDebt)}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-sm text-gray-600">
                    Tổng mua trừ trả hàng
                  </div>
                  <div className="text-2xl font-semibold text-green-600">
                    {formatCurrency(supplier.totalInvoicedWithoutReturn)}
                  </div>
                </div>
              </div>
              <p className="text-gray-500 text-sm">
                Chi tiết nợ đang được phát triển
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
    </div>
  );
}
