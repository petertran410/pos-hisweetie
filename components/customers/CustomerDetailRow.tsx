"use client";

import { useState } from "react";
import { useCustomer } from "@/lib/hooks/useCustomers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { useDeleteCustomer, useUpdateCustomer } from "@/lib/hooks/useCustomers";
import { CustomerGroupsModal } from "./CustomerGroupsModal";
import { CustomerInvoicesTab } from "./CustomerInvoicesTab";
import { CustomerOrdersTab } from "./CustomerOrdersTab";
import { CustomerDebtsTab } from "./CustomerDebtsTab";

interface CustomerDetailRowProps {
  customerId: number;
  colSpan: number;
  onEditClick: (customer: any) => void;
}

export function CustomerDetailRow({
  customerId,
  colSpan,
  onEditClick,
}: CustomerDetailRowProps) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const [activeTab, setActiveTab] = useState<
    "info" | "addresses" | "invoices" | "orders" | "debts" | "points"
  >("info");
  const [showGroupsModal, setShowGroupsModal] = useState(false);

  const handleStatusToggle = () => {
    if (!customer) return;
    const action = customer.isActive ? "ngừng hoạt động" : "kích hoạt";
    if (confirm(`Bạn có chắc chắn muốn ${action} khách hàng này?`)) {
      updateCustomer.mutate({
        id: customer.id,
        data: { isActive: !customer.isActive },
      });
    }
  };

  const handleDelete = async () => {
    if (!customer) return;

    if (
      confirm(
        "Bạn có chắc chắn muốn xóa khách hàng này? Hành động này không thể hoàn tác!"
      )
    ) {
      deleteCustomer.mutate(customer.id);
    }
  };

  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        </td>
      </tr>
    );
  }

  if (!customer) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 py-8 text-center text-gray-500">
          Không tìm thấy thông tin khách hàng
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="border-y-2 border-blue-200">
          <div className="sm:max-w-[640px] md:max-w-[768px] lg:max-w-[830px] xl:max-w-[1210px] 2xl:max-w-[1585px]">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold">
                  {customer.name}{" "}
                  <span className="text-gray-500 font-normal text-lg">
                    {customer.code}
                  </span>
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>
                    Người tạo: <strong>admin</strong>
                  </span>
                  <span>
                    Ngày tạo: <strong>{formatDate(customer.createdAt)}</strong>
                  </span>
                  {customer.customerGroupDetails &&
                    customer.customerGroupDetails.length > 0 && (
                      <span>
                        Nhóm khách:{" "}
                        <strong>
                          {customer.customerGroupDetails.length} nhóm.{" "}
                        </strong>
                        <button
                          onClick={() => setShowGroupsModal(true)}
                          className="text-blue-600 hover:underline">
                          Xem chi tiết
                        </button>
                      </span>
                    )}
                </div>
              </div>
            </div>

            <div className="border-b">
              <div className="flex gap-1 px-6">
                <button
                  onClick={() => setActiveTab("info")}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "info"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}>
                  Thông tin
                </button>
                <button
                  onClick={() => setActiveTab("invoices")}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "invoices"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}>
                  Lịch sử bán hàng/trả hàng
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "orders"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}>
                  Lịch sử đặt hàng
                </button>
                <button
                  onClick={() => setActiveTab("debts")}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "debts"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}>
                  Nợ cần thu từ khách
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === "info" && (
                <div>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Điện thoại
                      </label>
                      <div className="text-base">
                        {customer.contactNumber || customer.phone || "Chưa có"}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Sinh nhật
                      </label>
                      <div className="text-base">
                        {customer.birthDate
                          ? formatDate(customer.birthDate)
                          : "Chưa có"}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Giới tính
                      </label>
                      <div className="text-base">
                        {customer.gender === true
                          ? "Nam"
                          : customer.gender === false
                          ? "Nữ"
                          : "Chưa có"}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Email
                      </label>
                      <div className="text-base">
                        {customer.email || "Chưa có"}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Facebook
                      </label>
                      <div className="text-base">Chưa có</div>
                    </div>

                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Địa chỉ
                      </label>
                      <div className="text-base">
                        {[
                          customer.address,
                          customer.wardName,
                          customer.districtName,
                          customer.cityName,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Chưa có"}
                      </div>
                    </div>
                  </div>

                  {(customer.type === 1 ||
                    customer.invoiceBuyerName ||
                    customer.invoiceAddress) && (
                    <div className="mt-8 pt-6 border-t">
                      <h4 className="text-lg font-semibold mb-4">
                        Thông tin xuất hóa đơn
                      </h4>
                      <div className="grid grid-cols-3 gap-6">
                        {customer.type === 1 && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">
                                Mã số thuế
                              </label>
                              <div className="text-base">
                                {customer.taxCode || "Chưa có"}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">
                                Tên công ty
                              </label>
                              <div className="text-base">
                                {customer.organization || "Chưa có"}
                              </div>
                            </div>
                          </>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Địa chỉ
                          </label>
                          <div className="text-base">
                            {customer.invoiceAddress || "Chưa có"}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Tỉnh/Thành phố
                          </label>
                          <div className="text-base">
                            {customer.invoiceCityName || "Chưa có"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {customer.comments && (
                    <div className="mt-8 pt-6 border-t">
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        Ghi chú
                      </label>
                      <div className="text-base bg-gray-50 p-4 rounded">
                        {customer.comments}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "invoices" && (
                <CustomerInvoicesTab customerId={customer.id} />
              )}

              {activeTab === "orders" && (
                <CustomerOrdersTab customerId={customer.id} />
              )}

              {activeTab === "debts" && (
                <CustomerDebtsTab
                  customerId={customer.id}
                  customerDebt={customer.totalDebt}
                />
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex gap-2">
              <button
                onClick={() => onEditClick(customer)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                Chỉnh sửa
              </button>
              <button
                onClick={handleStatusToggle}
                className="px-4 py-2 border rounded hover:bg-gray-50">
                {customer.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Xóa
              </button>
            </div>
          </div>
        </div>

        <CustomerGroupsModal
          isOpen={showGroupsModal}
          onClose={() => setShowGroupsModal(false)}
          customerGroups={customer.customerGroupDetails || []}
          customerName={customer.name}
        />
      </td>
    </tr>
  );
}
