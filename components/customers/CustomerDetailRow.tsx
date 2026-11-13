// components/customers/CustomerDetailRow.tsx
"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useCustomer } from "@/lib/hooks/useCustomers";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Pencil,
  Trash2,
  Loader2,
  Store,
  CalendarDays,
  Network,
  Link2,
  Power,
} from "lucide-react";
import { useDeleteCustomer, useUpdateCustomer } from "@/lib/hooks/useCustomers";
import { CustomerInvoicesTab } from "./CustomerInvoicesTab";
import { CustomerOrdersTab } from "./CustomerOrdersTab";
import { CustomerConsignmentsTab } from "./CustomerConsignmentsTab";
import { CustomerDebtsTab } from "./CustomerDebtsTab";
import { CustomerAddressesTab } from "../pos/CustomerAddressesTab";
import { useCan } from "@/lib/hooks/useCan";
import { CodeLink } from "../shared/CodeLink";
import { ZaloContactsManager } from "../chat/ZaloContactsManager";
import { useRegisterCustomerInView } from "@/lib/store/customersInView";
import { useCustomerJourney } from "@/lib/hooks/useLeads";
import { CustomerJourneyTab } from "../journey/CustomerJourneyTab";
import { LEAD_SOURCE_LABEL, leadHref } from "@/lib/leads/constants";
import { StatBox } from "./CustomerTabUI";
import { CustomerInfoPanel } from "./CustomerInfoPanel";

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
    | "info"
    | "addresses"
    | "children"
    | "invoices"
    | "orders"
    | "consignments"
    | "debts"
    | "debts_total"
    | "debts_own"
    | "zalo"
    | "journey"
  >("info");

  const canUpdateCustomer = useCan("customers", "update");
  const canDeleteCustomer = useCan("customers", "delete");
  const canViewDebt = useCan("customers", "view_debt");
  const canViewZalo = useCan("smax_chat", "view");
  // Lead nguồn của khách (dòng "Từ lead" + tab "Hành trình")
  const canViewLeads = useCan("leads", "view");
  const journey = useCustomerJourney(customerId, canViewLeads);
  const sourceLead = journey.data?.lead ?? null;
  useRegisterCustomerInView(customer, "Chi tiết khách hàng");

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
      const next = `${scrollEl!.clientWidth}px`;
      if (el.style.width !== next) el.style.width = next;
    };
    update();

    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, [customer]);

  useEffect(() => {
    if (
      !canViewDebt &&
      ["debts", "debts_total", "debts_own"].includes(activeTab)
    ) {
      setActiveTab("info");
    }
  }, [canViewDebt]);

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
        "Bạn có chắc chắn muốn xóa khách hàng này? Hành động này không thể hoàn tác!",
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
      <tr className="bg-brand-soft">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
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

  const isParent = (customer.children?.length ?? 0) > 0;
  const isChild = !!customer.parentId;

  const TABS = [
    { key: "info", label: "Thông tin" },
    { key: "addresses", label: "Địa chỉ nhận hàng" },
    ...(isParent
      ? [
          {
            key: "children",
            label: `Khách hàng con (${customer.children!.length})`,
          },
        ]
      : []),
    { key: "invoices", label: "Lịch sử hóa đơn/trả hàng" },
    { key: "orders", label: "Lịch sử đơn hàng" },
    { key: "consignments", label: "Theo dõi ký gửi" },
    ...(canViewDebt
      ? isParent
        ? [
            { key: "debts_total", label: "Công nợ (bao gồm con)" },
            { key: "debts_own", label: "Công nợ (chỉ KH này)" },
          ]
        : [{ key: "debts", label: "Công nợ" }]
      : []),
    ...(canViewZalo ? [{ key: "zalo", label: "Smax" }] : []),
    ...(canViewLeads ? [{ key: "journey", label: "Hành trình" }] : []),
  ] as const;

  const isOrg = Number(customer.type) === 1;
  const ownDebt = Number(customer.totalDebt) || 0;
  const totalDebtWithChildren =
    ownDebt +
    (customer.children?.reduce((sum, c) => sum + Number(c.totalDebt), 0) ?? 0);

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand bg-gray-50 p-0">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white">
            {/* ===== Header ===== */}
            <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-3 pt-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <CodeLink
                    entity="customer"
                    code={customer.code}
                    className="text-base font-semibold text-brand hover:underline"
                  />
                  <span className="text-gray-300">·</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {customer.name}
                  </h3>
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
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Store className="h-3.5 w-3.5" />
                    {customer.branch?.name || "Chưa có chi nhánh"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Tạo {formatDate(customer.createdAt)}
                  </span>
                  {customer.parent && (
                    <span className="inline-flex items-center gap-1">
                      <Network className="h-3.5 w-3.5" />
                      Thuộc{" "}
                      <CodeLink
                        entity="customer"
                        code={customer.parent.code}
                        className="font-medium text-brand hover:underline"
                      />
                      <span className="text-gray-600">
                        – {customer.parent.name}
                      </span>
                    </span>
                  )}
                  {sourceLead && (
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="h-3.5 w-3.5" />
                      Từ lead{" "}
                      <a
                        href={leadHref(sourceLead.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-brand hover:underline">
                        {sourceLead.code}
                      </a>
                      <span className="text-gray-600">
                        · {LEAD_SOURCE_LABEL[sourceLead.source]}
                        {sourceLead.cskh
                          ? ` · CSKH ${sourceLead.cskh.name}`
                          : ""}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Chỉ số nhanh */}
              <div className="flex shrink-0 flex-wrap gap-2">
                <StatBox
                  label="Tổng bán"
                  value={formatCurrency(customer.totalPurchased)}
                />
                {canViewDebt && (
                  <StatBox
                    label={isParent ? "Nợ riêng" : "Nợ hiện tại"}
                    value={formatCurrency(ownDebt)}
                    tone={ownDebt > 0 ? "warn" : "muted"}
                  />
                )}
                {canViewDebt && isParent && (
                  <StatBox
                    label="Nợ tổng (gồm con)"
                    value={formatCurrency(totalDebtWithChildren)}
                    tone={totalDebtWithChildren > 0 ? "warn" : "muted"}
                  />
                )}
              </div>
            </div>

            {/* ===== Tabs (cuộn ngang khi hẹp) ===== */}
            <div className="flex gap-1 overflow-x-auto border-b px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "border-brand text-brand"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ===== Tab content ===== */}
            <div
              className={
                activeTab === "info" ? "bg-gray-50 p-4" : "bg-white p-4"
              }>
              {activeTab === "info" && (
                <CustomerInfoPanel
                  customer={customer}
                  onEdit={() => onEditClick(customer)}
                  onViewAddresses={() => setActiveTab("addresses")}
                />
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
              {activeTab === "consignments" && (
                <CustomerConsignmentsTab customerId={customer.id} />
              )}
              {activeTab === "zalo" && (
                <div className="max-w-xl rounded-xl border bg-white p-4">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Liên kết Zalo (Smax)
                    </h4>
                    <p className="mt-0.5 text-xs text-gray-500">
                      ID Zalo cá nhân và các nhóm Zalo của khách, dùng để nhắn
                      tin qua Smax.
                    </p>
                  </div>
                  <ZaloContactsManager customerId={customer.id} />
                </div>
              )}
              {activeTab === "journey" && (
                <CustomerJourneyTab customerId={customer.id} />
              )}
              {activeTab === "debts" && (
                <CustomerDebtsTab
                  hideSummary
                  customerId={customer.id}
                  customerDebt={customer.totalDebt}
                />
              )}

              {activeTab === "children" && customer.children && (
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-2.5 text-left font-medium">
                          Mã KH
                        </th>
                        <th className="px-4 py-2.5 text-left font-medium">
                          Tên
                        </th>
                        <th className="px-4 py-2.5 text-left font-medium">
                          Điện thoại
                        </th>
                        {canViewDebt && (
                          <th className="px-4 py-2.5 text-right font-medium">
                            Công nợ
                          </th>
                        )}
                        <th className="px-4 py-2.5 text-center font-medium">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.children.map((child) => (
                        <tr
                          key={child.id}
                          className="border-b last:border-b-0 hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-sm font-medium text-brand">
                            <CodeLink entity="customer" code={child.code} />
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-900">
                            {child.name}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">
                            {child.contactNumber || "—"}
                          </td>
                          {canViewDebt && (
                            <td
                              className={`px-4 py-2.5 text-right text-sm font-medium tabular-nums ${
                                Number(child.totalDebt) > 0
                                  ? "text-orange-600"
                                  : "text-gray-400"
                              }`}>
                              {formatCurrency(child.totalDebt)}
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-center">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                child.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                              {child.isActive ? "Hoạt động" : "Ngừng"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "debts_total" && (
                <CustomerDebtsTab
                  hideSummary
                  customerId={customer.id}
                  customerDebt={totalDebtWithChildren}
                  includeChildren
                />
              )}

              {activeTab === "debts_own" && (
                <CustomerDebtsTab
                  hideSummary
                  customerId={customer.id}
                  customerDebt={customer.totalDebt}
                />
              )}
            </div>

            {/* ===== Action footer ===== */}
            {(canDeleteCustomer || canUpdateCustomer) && (
              <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
                <div className="flex gap-2">
                  {canDeleteCustomer && (
                    <button
                      onClick={handleDelete}
                      disabled={deleteCustomer.isPending}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                      Xóa
                    </button>
                  )}
                  {canUpdateCustomer && (
                    <button
                      onClick={handleStatusToggle}
                      disabled={updateCustomer.isPending}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
                      <Power className="h-4 w-4" />
                      {customer.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
                    </button>
                  )}
                </div>
                {canUpdateCustomer && (
                  <button
                    onClick={() => onEditClick(customer)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark">
                    <Pencil className="h-4 w-4" />
                    Chỉnh sửa
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
