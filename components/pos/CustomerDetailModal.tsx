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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99]">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">
              {customer?.name || "Đang tải..."}
            </h2>
            {customer && (
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span>Mã: {customer.code}</span>
                <span>•</span>
                <span>
                  Nợ:{" "}
                  <span
                    className={
                      customer.totalDebt > 0 ? "text-red-600" : "text-gray-600"
                    }>
                    {formatCurrency(customer.totalDebt)}
                  </span>
                </span>
                <span>•</span>
                <span>Tổng bán: {formatCurrency(customer.totalPurchased)}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
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
              onClick={() => setActiveTab("invoiceInfo")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "invoiceInfo"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              Thông tin xuất hóa đơn
            </button>
            <button
              onClick={() => setActiveTab("addresses")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "addresses"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              Địa chỉ nhận hàng
            </button>
            <button
              onClick={() => setActiveTab("invoices")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "invoices"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              Lịch sử bán/trả hàng
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
            {/* <button
              onClick={() => setActiveTab("debts")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "debts"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              Dư nợ
            </button> */}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
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
              {/* {activeTab === "debts" && (
                <CustomerDebtsTab
                  customerId={customer.id}
                  customerDebt={customer.totalDebt}
                  hidePaymentButton={true}
                />
              )} */}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Không tìm thấy thông tin khách hàng
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
