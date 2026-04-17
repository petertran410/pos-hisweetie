// components/customers/CustomerDetailRow.tsx
"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { useCustomer } from "@/lib/hooks/useCustomers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";
import { useDeleteCustomer, useUpdateCustomer } from "@/lib/hooks/useCustomers";
import { CustomerGroupsModal } from "./CustomerGroupsModal";
import { CustomerInvoicesTab } from "./CustomerInvoicesTab";
import { CustomerOrdersTab } from "./CustomerOrdersTab";
import { CustomerDebtsTab } from "./CustomerDebtsTab";
import { CustomerAddressesTab } from "../pos/CustomerAddressesTab";

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

  // ─── Sticky width trick (giống OrderDetailRow) ───
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

    const ro = new ResizeObserver(update);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [customer]);

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
      try {
        await deleteCustomer.mutateAsync(customer.id);
      } catch (error) {
        // handled by hook
      }
    }
  };

  if (isLoading) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600">
              Đang tải thông tin khách hàng...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  if (!customer) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin khách hàng
        </td>
      </tr>
    );
  }

  const TABS = [
    { key: "info", label: "Thông tin" },
    { key: "addresses", label: "Địa chỉ" },
    { key: "invoices", label: "Hóa đơn" },
    { key: "orders", label: "Đơn hàng" },
    { key: "debts", label: "Công nợ" },
    { key: "points", label: "Điểm" },
  ] as const;

  const groups =
    customer.customerGroupDetails
      ?.map((d: any) => d.customerGroup?.name)
      .filter(Boolean) || [];

  return (
    <tr>
      <td colSpan={colSpan} className="p-0 bg-gray-50">
        <div
          ref={wrapperRef}
          className="sticky left-0 p-2 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4">
              {/* ── Header (giống OrderDetailRow) ── */}
              <div className=" border-gray-200 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {customer.code}
                    </span>
                    <span className="text-gray-400">-</span>
                    <span className="text-lg font-semibold text-gray-800">
                      {customer.name}
                    </span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                        customer.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                      {customer.isActive ? "Hoạt động" : "Ngừng hoạt động"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Tabs ── */}
              <div className="flex gap-1 border-b border-gray-200 mb-4">
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

              {/* ── Tab content ── */}
              {activeTab === "info" && (
                <div>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Mã khách hàng
                      </label>
                      <div className="text-base">{customer.code}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Tên khách hàng
                      </label>
                      <div className="text-base font-medium">
                        {customer.name}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Số điện thoại
                      </label>
                      <div className="text-base">
                        {customer.contactNumber || "Chưa có"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Loại khách hàng
                      </label>
                      <div className="text-base">
                        {customer.type === 0 ? "Cá nhân" : "Công ty"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Ngày sinh
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
                  </div>

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

              {activeTab === "addresses" && (
                <CustomerAddressesTab customer={customer} />
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

              {/* ── Action footer (giống OrderDetailRow) ── */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-md font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors">
                    <Trash2 className="w-4 h-4 inline mr-1" />
                    Xóa
                  </button>
                  <button
                    onClick={handleStatusToggle}
                    className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                    {customer.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
                  </button>
                </div>
                <button
                  onClick={() => onEditClick(customer)}
                  className="px-4 py-2 text-md font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm">
                  <Pencil className="w-4 h-4 inline mr-1" />
                  Chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
