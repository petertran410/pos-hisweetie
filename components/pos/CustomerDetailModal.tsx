"use client";

import { useEffect, useState } from "react";
import { X, Phone, Network, UserX, Pencil } from "lucide-react";
import {
  StatBox,
  TAB_BUTTON_PRIMARY,
  TabEmpty,
  TabLoading,
} from "../customers/CustomerTabUI";
import { CustomerInfoPanel } from "../customers/CustomerInfoPanel";
import { CustomerForm } from "../customers/CustomerForm";
import { useCustomer } from "@/lib/hooks/useCustomers";
import { CustomerInvoicesTab } from "../customers/CustomerInvoicesTab";
import { CustomerOrdersTab } from "../customers/CustomerOrdersTab";
import { CustomerConsignmentsTab } from "../customers/CustomerConsignmentsTab";
import { CustomerDebtsTab } from "../customers/CustomerDebtsTab";
import { formatCurrency } from "@/lib/utils";
import { CustomerAddressesTab } from "./CustomerAddressesTab";
import { CodeLink } from "../shared/CodeLink";
import { useCan } from "@/lib/hooks/useCan";
import { createPortal } from "react-dom";

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  onCustomerUpdate?: (customer: any) => void;
}

type TabType =
  | "info"
  | "addresses"
  | "invoices"
  | "orders"
  | "consignments"
  | "debts"
  | "debts_total"
  | "debts_own";

export function CustomerDetailModal({
  isOpen,
  onClose,
  customerId,
  onCustomerUpdate,
}: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [mounted, setMounted] = useState(false);
  const { data: customer, isLoading, refetch } = useCustomer(customerId);
  const canViewDebt = useCan("customers", "view_debt");
  const canUpdateCustomer = useCan("customers", "update");
  // Sửa khách dùng chung CustomerForm với trang Khách hàng. Khi đang sửa thì ẩn
  // modal chi tiết (tránh 2 modal chồng nhau), lưu/đóng xong thì hiện lại.
  const [editing, setEditing] = useState(false);

  const isParent = (customer?.children?.length ?? 0) > 0;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Nếu user mất quyền xem công nợ trong khi đang ở tab công nợ → quay về Thông tin
  useEffect(() => {
    if (
      !canViewDebt &&
      (activeTab === "debts" ||
        activeTab === "debts_total" ||
        activeTab === "debts_own")
    ) {
      setActiveTab("info");
    }
  }, [canViewDebt, activeTab]);

  if (!isOpen || !mounted) return null;

  const handleCustomerUpdate = (updatedCustomer: any) => {
    if (onCustomerUpdate) {
      onCustomerUpdate(updatedCustomer);
    }
  };

  const TABS: { key: TabType; label: string }[] = [
    { key: "info", label: "Thông tin" },
    { key: "addresses", label: "Địa chỉ nhận hàng" },
    { key: "invoices", label: "Lịch sử hóa đơn/trả hàng" },
    { key: "orders", label: "Lịch sử đơn hàng" },
    { key: "consignments", label: "Theo dõi ký gửi" },
    ...(canViewDebt
      ? isParent
        ? [
            { key: "debts_total" as TabType, label: "Công nợ (bao gồm con)" },
            { key: "debts_own" as TabType, label: "Công nợ (chỉ KH này)" },
          ]
        : [{ key: "debts" as TabType, label: "Công nợ" }]
      : []),
  ];

  const ownDebt = Number(customer?.totalDebt) || 0;
  const totalDebtWithChildren =
    ownDebt +
    (customer?.children?.reduce(
      (sum: number, c: any) => sum + Number(c.totalDebt),
      0,
    ) ?? 0);
  const isOrg = Number(customer?.type) === 1;
  // Tab dạng thẻ thông tin dùng nền xám nhạt, tab dạng bảng dùng nền trắng
  const cardTab = activeTab === "info";

  if (editing && customer) {
    return (
      <CustomerForm
        customer={customer}
        onClose={() => setEditing(false)}
        onSuccess={async () => {
          setEditing(false);
          // Lấy bản mới nhất (đủ địa chỉ, nhóm…) để cập nhật khách trong giỏ
          const fresh = await refetch();
          if (fresh.data) handleCustomerUpdate(fresh.data);
        }}
      />
    );
  }

  return createPortal(
    // Mobile: sheet dán đáy. Desktop: modal giữa màn hình
    <div className="fixed inset-0 z-[99] flex flex-col justify-end lg:items-center lg:justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet / Modal */}
      <div className="relative flex h-[95dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl lg:h-[90dvh] lg:max-w-5xl lg:rounded-2xl">
        {/* Handle bar — mobile only */}
        <div className="flex flex-shrink-0 justify-center pb-0.5 pt-2.5 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-2 lg:px-6 lg:pb-4 lg:pt-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="truncate text-base font-semibold text-gray-900 lg:text-xl">
                {customer?.name || "Đang tải..."}
              </h2>
              {customer && (
                <>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      customer.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                    {customer.isActive ? "Hoạt động" : "Ngừng hoạt động"}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {isOrg ? "Tổ chức/Hộ KD" : "Cá nhân"}
                  </span>
                </>
              )}
            </div>
            {customer && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 lg:text-sm">
                <CodeLink
                  entity="customer"
                  code={customer.code}
                  className="font-medium text-brand hover:underline"
                />
                {customer.contactNumber && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {customer.contactNumber}
                  </span>
                )}
                {customer.parent && (
                  <span className="inline-flex items-center gap-1">
                    <Network className="h-3.5 w-3.5" />
                    Thuộc {customer.parent.code} – {customer.parent.name}
                  </span>
                )}
              </div>
            )}
          </div>

          {customer && (
            <div className="hidden shrink-0 gap-2 sm:flex">
              <StatBox
                label="Tổng bán"
                value={formatCurrency(customer.totalPurchased)}
              />
              <StatBox
                label={isParent ? "Nợ riêng" : "Nợ hiện tại"}
                value={formatCurrency(ownDebt)}
                tone={ownDebt > 0 ? "danger" : "muted"}
              />
              {isParent && (
                <StatBox
                  label="Nợ tổng (gồm con)"
                  value={formatCurrency(totalDebtWithChildren)}
                  tone={totalDebtWithChildren > 0 ? "danger" : "muted"}
                />
              )}
            </div>
          )}

          <button
            onClick={onClose}
            aria-label="Đóng"
            className="-mr-2 flex-shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chỉ số — mobile hiện thành 1 hàng dưới tiêu đề */}
        {customer && (
          <div className="flex flex-shrink-0 gap-2 overflow-x-auto px-4 pb-3 sm:hidden">
            <StatBox
              label="Tổng bán"
              value={formatCurrency(customer.totalPurchased)}
            />
            <StatBox
              label={isParent ? "Nợ riêng" : "Nợ hiện tại"}
              value={formatCurrency(ownDebt)}
              tone={ownDebt > 0 ? "danger" : "muted"}
            />
          </div>
        )}

        {/* Tab bar — cuộn ngang khi hẹp */}
        <div className="flex-shrink-0 border-b">
          <div className="flex overflow-x-auto px-2 [scrollbar-width:none] lg:px-6 [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`-mb-px flex-shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div
          className={`flex-1 overflow-y-auto p-3 lg:p-5 ${
            cardTab ? "bg-gray-50" : "bg-white"
          }`}>
          {isLoading ? (
            <TabLoading />
          ) : customer ? (
            <>
              {activeTab === "info" && (
                <CustomerInfoPanel
                  customer={customer}
                  onEdit={
                    canUpdateCustomer ? () => setEditing(true) : undefined
                  }
                  onViewAddresses={() => setActiveTab("addresses")}
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
              {activeTab === "consignments" && (
                <CustomerConsignmentsTab customerId={customer.id} />
              )}
              {activeTab === "debts" && canViewDebt && (
                <CustomerDebtsTab
                  customerId={customer.id}
                  customerDebt={ownDebt}
                  hideSummary
                />
              )}
              {activeTab === "debts_total" && canViewDebt && (
                <CustomerDebtsTab
                  customerId={customer.id}
                  customerDebt={totalDebtWithChildren}
                  includeChildren
                  hideSummary
                />
              )}
              {activeTab === "debts_own" && canViewDebt && (
                <CustomerDebtsTab
                  customerId={customer.id}
                  customerDebt={ownDebt}
                  hideSummary
                />
              )}
            </>
          ) : (
            <TabEmpty
              icon={UserX}
              title="Không tìm thấy thông tin khách hàng"
            />
          )}
        </div>

        {/* Footer — sửa khách mở CustomerForm giống trang Khách hàng */}
        {customer && canUpdateCustomer && (
          <div className="flex flex-shrink-0 justify-end border-t bg-white px-4 py-3 lg:px-6">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={TAB_BUTTON_PRIMARY}>
              <Pencil className="h-4 w-4" />
              Chỉnh sửa
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
