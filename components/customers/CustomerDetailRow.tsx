// components/customers/CustomerDetailRow.tsx
"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { useCustomer } from "@/lib/hooks/useCustomers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pencil, Trash2, Loader2, ExternalLink, MapPin } from "lucide-react";
import { useDeleteCustomer, useUpdateCustomer } from "@/lib/hooks/useCustomers";
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
  console.log(customer);
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

    // Set initial width
    el.style.width = `${scrollEl.clientWidth}px`;

    let rafId: number;
    const ro = new ResizeObserver((entries) => {
      // Dùng entry.contentRect thay vì đọc scrollEl.clientWidth trong callback
      // → tránh forced layout → tránh oscillation loop
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const entry = entries[entries.length - 1];
        const w =
          entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        el.style.width = `${w}px`;
      });
    });

    ro.observe(scrollEl);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
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
    { key: "addresses", label: "Địa chỉ nhận hàng" },
    { key: "invoices", label: "Lịch sử hóa đơn/trả hàng" },
    { key: "orders", label: "Lịch sử đơn hàng" },
    { key: "debts", label: "Công nợ" },
  ] as const;

  const groups =
    customer.customerGroupDetails
      ?.map((d: any) => d.customerGroup?.name)
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
              <div className=" border-gray-200 mb-4">
                <div className="flex items-center justify-between">
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
                  <span className="text-sm font-medium text-gray-700">
                    {customer.branch?.name || "-"}
                  </span>
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
              </div>

              {/* ── Tab content ── */}
              {activeTab === "info" && (
                <div>
                  {/* ── Profile header (không avatar) ── */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>
                          Ngày tạo:{" "}
                          <span className="text-gray-700">
                            {formatDate(customer.createdAt)}
                          </span>
                        </span>
                        <span className="text-gray-300">|</span>
                        <span>
                          Nhóm khách:{" "}
                          <span className="text-gray-700">
                            {groups.length > 0 ? groups.join(", ") : "Chưa có"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Info fields: label trên, value dưới, 3 cột ── */}
                  <div className="grid grid-cols-3 gap-x-8 border-gray-200 pb-2 mb-2">
                    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                      <label className="block text-sm text-gray-500">
                        Điện thoại:
                      </label>
                      <div className="block text-sm text-gray-900">
                        {customer.contactNumber || "Chưa có"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                      <label className="block text-sm text-gray-500">
                        Sinh nhật:
                      </label>
                      <div className="block text-sm text-gray-900">
                        {customer.birthDate
                          ? formatDate(customer.birthDate)
                          : "Chưa có"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                      <label className="block text-sm text-gray-500">
                        Giới tính:
                      </label>
                      <div className="block text-sm text-gray-900">
                        {customer.gender === true
                          ? "Nam"
                          : customer.gender === false
                            ? "Nữ"
                            : "Chưa có"}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                      <label className="block text-sm text-gray-500">
                        Email:
                      </label>
                      <div className="block text-sm text-gray-900">
                        {customer.email || "Chưa có"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                      <label className="block text-sm text-gray-500">
                        Facebook:
                      </label>
                      <div className="block text-sm text-gray-900">Chưa có</div>
                    </div>
                    <div />
                  </div>

                  {/* ── Địa chỉ ── */}
                  {/* {(() => {
                    const defaultAddr =
                      (customer as any).addresses?.find(
                        (a: any) => a.isDefault
                      ) || (customer as any).addresses?.[0];
                    const fullAddress = [
                      defaultAddr?.address,
                      defaultAddr?.wardName || defaultAddr?.newWardName,
                      defaultAddr?.cityName || defaultAddr?.newCityName,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return fullAddress ? (
                      <div className="border-b border-gray-200 pb-4 mb-4">
                        <label className="block text-sm text-gray-500 mb-1">
                          Địa chỉ
                        </label>
                        <div className="text-base text-gray-900">
                          {fullAddress}
                        </div>
                      </div>
                    ) : null;
                  })()} */}

                  {/* ── Thông tin xuất hóa đơn ── */}
                  {(customer.invoiceBuyerName ||
                    customer.invoiceAddress ||
                    customer.invoiceCccdCmnd ||
                    customer.invoiceBankAccount ||
                    customer.invoiceEmail ||
                    customer.invoicePhone) && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">
                        Thông tin xuất hóa đơn
                      </h4>
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {[
                          customer.invoiceBuyerName,
                          customer.invoiceCccdCmnd,
                          customer.invoiceAddress,
                          [customer.invoiceWardName, customer.invoiceCityName]
                            .filter(Boolean)
                            .join(", "),
                          customer.invoiceEmail,
                          customer.invoicePhone,
                          customer.invoiceBankAccount,
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                      </div>
                    </div>
                  )}

                  {/* ── Ghi chú ── */}
                  {customer.comments && (
                    <div className="flex items-start gap-1 text-md text-gray-700">
                      <svg
                        className="w-4 h-4 text-gray-400 mt-0.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span>Ghi chú: {customer.comments}</span>
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
