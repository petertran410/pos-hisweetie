"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useCustomer } from "@/lib/hooks/useCustomers";
import { CustomerInvoicesTab } from "../customers/CustomerInvoicesTab";
import { CustomerOrdersTab } from "../customers/CustomerOrdersTab";
import { CustomerDebtsTab } from "../customers/CustomerDebtsTab";
import { CustomerInfoTab } from "./CustomerInfoTab";
import { CustomerInvoiceInfoTab } from "./CustomerInvoiceInfoTab";
import { formatCurrency } from "@/lib/utils";
import { CustomerAddressesTab } from "./CustomerAddressesTab";

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  onCustomerUpdate?: (customer: any) => void;
}

type TabType = "info" | "invoiceInfo" | "addresses" | "invoices" | "orders";

export function CustomerDetailModal({
  isOpen,
  onClose,
  customerId,
  onCustomerUpdate,
}: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const { data: customer, isLoading } = useCustomer(customerId);

  if (!isOpen) return null;

  const handleCustomerUpdate = (updatedCustomer: any) => {
    if (onCustomerUpdate) {
      onCustomerUpdate(updatedCustomer);
    }
  };

  const TABS: { key: TabType; label: string }[] = [
    { key: "info", label: "Thông tin" },
    { key: "invoiceInfo", label: "Xuất hóa đơn" },
    { key: "addresses", label: "Địa chỉ" },
    { key: "invoices", label: "Lịch sử bán/trả" },
    { key: "orders", label: "Lịch sử đặt hàng" },
  ];

  return (
    // Mobile: flex justify-end → sheet dán đáy. Desktop: justify-center → centered modal
    <div className="fixed inset-0 z-[99] flex flex-col justify-end lg:items-center lg:justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet / Modal */}
      <div className="relative bg-white w-full flex flex-col h-[80vh] rounded-t-2xl lg:rounded-xl lg:max-w-5xl">
        {/* Handle bar — mobile only */}
        <div className="lg:hidden flex justify-center pt-2.5 pb-0.5 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-2 pb-3 lg:px-6 lg:pt-5 lg:pb-4 border-b flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-base lg:text-xl font-bold leading-snug truncate">
              {customer?.name || "Đang tải..."}
            </h2>
            {customer && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs lg:text-sm text-gray-500">
                <span>{customer.code}</span>
                <span>
                  Nợ:{" "}
                  <span
                    className={
                      customer.totalDebt > 0 ? "text-red-600 font-semibold" : ""
                    }>
                    {formatCurrency(customer.totalDebt)}
                  </span>
                </span>
                <span>Tổng bán: {formatCurrency(customer.totalPurchased)}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 -mt-0.5 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar — scroll ngang trên mobile */}
        <div className="border-b flex-shrink-0">
          <div className="flex overflow-x-auto scrollbar-hide px-2 lg:px-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 lg:px-4 py-2.5 text-xs lg:text-sm font-medium border-b-2 whitespace-nowrap flex-shrink-0 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : customer ? (
            <>
              {activeTab === "info" && (
                <CustomerInfoTab
                  customer={customer}
                  onUpdate={handleCustomerUpdate}
                />
              )}
              {activeTab === "invoiceInfo" && (
                <CustomerInvoiceInfoTab
                  customer={customer}
                  onUpdate={handleCustomerUpdate}
                />
              )}
              {activeTab === "addresses" && (
                <CustomerAddressesTab
                  customer={customer}
                  onUpdate={handleCustomerUpdate}
                />
              )}
              {activeTab === "invoices" && (
                <CustomerInvoicesTab customerId={customer.id} />
              )}
              {activeTab === "orders" && (
                <CustomerOrdersTab customerId={customer.id} />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Không tìm thấy thông tin khách hàng
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
