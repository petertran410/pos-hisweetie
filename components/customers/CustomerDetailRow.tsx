"use client";

import {
  useCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "@/lib/hooks/useCustomers";
import { Loader2, Pencil, Trash2, Ban, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Customer } from "@/lib/types/customer";
import { toast } from "sonner";

interface CustomerDetailRowProps {
  customerId: number;
  colSpan: number;
  onEditClick: (customer: Customer) => void;
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN");
};

export function CustomerDetailRow({
  customerId,
  colSpan,
  onEditClick,
}: CustomerDetailRowProps) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const handleToggleActive = async () => {
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
                    Ngày tạo: <strong>{formatDate(customer.createdAt)}</strong>
                  </span>
                  {customer.customerGroupDetails &&
                    customer.customerGroupDetails.length > 0 && (
                      <span>
                        Nhóm khách:{" "}
                        <strong>
                          {customer.customerGroupDetails.length} nhóm.{" "}
                        </strong>
                        <button className="text-blue-600 hover:underline">
                          Xem chi tiết
                        </button>
                      </span>
                    )}
                </div>
              </div>
            </div>

            <div className="p-6">
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
                  <div className="text-base">{customer.email || "Chưa có"}</div>
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
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-semibold mb-4">
                    Thông tin xuất hóa đơn
                  </h4>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="text-sm space-y-1">
                      {customer.type === 1 && customer.organization && (
                        <p>
                          <strong>{customer.organization}</strong>
                        </p>
                      )}
                      {customer.taxCode && (
                        <p>
                          {customer.taxCode} / {customer.invoiceAddress || ""}
                        </p>
                      )}
                      {customer.invoiceAddress && (
                        <p>
                          {[
                            customer.invoiceAddress,
                            customer.invoiceWardName,
                            customer.invoiceCityName,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      {customer.invoiceEmail && <p>{customer.invoiceEmail}</p>}
                      {customer.invoicePhone && <p>{customer.invoicePhone}</p>}
                      {customer.invoiceBuyerName && (
                        <p className="mt-2">
                          <strong>
                            Ghi chú: Đây là {customer.invoiceBuyerName}
                          </strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Xóa
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditClick(customer)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={handleToggleActive}
                    className={`px-4 py-2 border rounded flex items-center gap-2 ${
                      customer.isActive
                        ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                        : "border-green-500 text-green-700 hover:bg-green-50"
                    }`}>
                    {customer.isActive ? (
                      <>
                        <Ban className="w-4 h-4" />
                        Ngừng hoạt động
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Kích hoạt
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
