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
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const deleteSupplier = useDeleteSupplier();

  const handleDelete = async () => {
    if (!supplier) return;
    if (confirm("Bạn có chắc chắn muốn xóa nhà cung cấp này?")) {
      await deleteSupplier.mutateAsync(supplier.id);
    }
  };

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
      <td colSpan={colSpan} className="py-2 bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sm:max-w-[640px] md:max-w-[768px] lg:max-w-[830px] xl:max-w-[1090px] 2xl:max-w-[1520px]">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("info")}
                className={`py-2 text-md font-medium ${
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
          </div>

          <div className="p-4">
            {activeTab === "info" && (
              <div className="space-y-4">
                <div className="text-md flex gap-1">
                  <h4 className="font-semibold text-gray-900">
                    {supplier.name}
                  </h4>
                  {" - "}
                  <p className="text-gray-500">{supplier.code}</p>
                </div>
                <div className="grid grid-cols-2">
                  <div className="flex gap-2 text-md">
                    <div>
                      <span className="text-gray-600">Người tạo: </span>
                      <span className="text-gray-900">
                        {supplier.createdName || "admin"}
                      </span>
                    </div>
                    |
                    <div>
                      <span className="text-gray-600">Ngày tạo: </span>
                      <span className="text-gray-900">
                        {formatDateTime(supplier.createdAt)}
                      </span>
                    </div>
                    |
                    <div>
                      <span className="text-gray-600">Nhóm nhà cung cấp: </span>
                      {supplier.supplierGroupDetails &&
                      supplier.supplierGroupDetails.length > 0 ? (
                        <button
                          onClick={() => setShowGroupsModal(true)}
                          className="text-blue-600 hover:underline">
                          {supplier.supplierGroupDetails.length} nhóm
                        </button>
                      ) : (
                        <span className="text-gray-900">-</span>
                      )}
                    </div>
                  </div>
                  <div className="justify-self-end-safe">
                    <span className="text-gray-600">Chi nhánh: </span>
                    <span className="text-gray-900">
                      {supplier.branch?.name || "-"}
                    </span>
                  </div>
                </div>

                <div className="text-md">
                  <div className="grid grid-cols-2 mb-4">
                    <div>
                      <label className=" text-gray-600 mb-0.5">
                        Điện thoại
                      </label>
                      <div className=" text-gray-900">
                        {supplier.contactNumber || "Chưa có"}
                      </div>
                    </div>

                    <div>
                      <label className=" text-gray-600 mb-0.5">Email</label>
                      <div className=" text-gray-900">
                        {supplier.email || "Chưa có"}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="mb-2">
                      <label className=" text-gray-600 mb-0.5">Địa chỉ</label>
                      <div className=" text-gray-900">
                        {supplier.address || "Chưa có"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2">
                      <div>
                        <label className=" text-gray-600 mb-0.5">Khu vực</label>
                        <div className=" text-gray-900">
                          {supplier.location || "Chưa có"}
                        </div>
                      </div>
                      <div>
                        <label className=" text-gray-600 mb-0.5">
                          Phường/Xã
                        </label>
                        <div className=" text-gray-900">
                          {supplier.wardName || "Chưa có"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className=" text-gray-600 mb-0.5">Ghi chú</label>
                    <div className=" text-gray-900">
                      {supplier.comments || "Chưa có"}
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setShowInvoiceInfo(!showInvoiceInfo)}
                    className=" text-blue-600 hover:underline">
                    {showInvoiceInfo
                      ? "Ẩn thông tin xuất hóa đơn"
                      : "Hiển thị thông tin xuất hóa đơn"}
                  </button>
                </div>

                {showInvoiceInfo && (
                  <div className="border-t pt-4 space-y-2">
                    <h5 className="font-medium ">Thông tin xuất hóa đơn</h5>
                    <div className="grid grid-cols-2 gap-4 ">
                      <div>
                        <label className="text-gray-600 mb-0.5">
                          Tên công ty
                        </label>
                        <div className="text-gray-900">
                          {supplier.organization || "Chưa có"}
                        </div>
                      </div>
                      <div>
                        <label className="text-gray-600 mb-0.5">
                          Mã số thuế
                        </label>
                        <div className="text-gray-900">
                          {supplier.taxCode || "Chưa có"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-red-600 border border-red-600 rounded hover:bg-red-50 ">
                    Xóa
                  </button>

                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 ">
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={handleToggleStatus}
                      className="px-3 py-1.5 border rounded hover:bg-gray-50 ">
                      {supplier.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="text-center text-gray-500 py-8">
                Chưa có lịch sử nhập/trả hàng
              </div>
            )}

            {activeTab === "debt" && (
              <div className="text-center text-gray-500 py-8">
                Chưa có thông tin công nợ
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

        {showGroupsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Nhóm nhà cung cấp</h3>
                <button
                  onClick={() => setShowGroupsModal(false)}
                  className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
              <div className="p-4">
                {supplier.supplierGroupDetails &&
                supplier.supplierGroupDetails.length > 0 ? (
                  <div className="space-y-2">
                    {supplier.supplierGroupDetails.map((detail) => (
                      <div
                        key={detail.id}
                        className="p-3 border rounded hover:bg-gray-50">
                        <div className="font-medium">
                          {detail.supplierGroup.name}
                        </div>
                        {detail.supplierGroup.description && (
                          <div className=" text-gray-600">
                            {detail.supplierGroup.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Chưa thuộc nhóm nào
                  </div>
                )}
              </div>
              <div className="border-t p-4 flex justify-end">
                <button
                  onClick={() => setShowGroupsModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
