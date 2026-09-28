"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { CashFlowsTable } from "@/components/cashflows/CashFlowsTable";
import { CashFlowsSidebar } from "@/components/cashflows/CashFlowsSidebar";
import { ApprovalRequestsPanel } from "@/components/cashflows/ApprovalRequestsPanel";
import { CashFlowHistoryAuditPanel } from "@/components/cashflows/CashFlowHistoryAuditPanel";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import type { CashFlowQueryParams } from "@/lib/types/cashflow";

export default function SoQuyPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<CashFlowQueryParams>(() =>
    codeParam ? { code: [codeParam] } : {}
  );
  const [view, setView] = useState<"cashflows" | "approvals" | "history">(
    "cashflows"
  );

  const handleFiltersChange = useCallback(
    (newFilters: CashFlowQueryParams) => {
      if (codeParam) {
        // Khi đang filter theo code: bỏ qua toàn bộ sidebar filters
        // để queryKey không thay đổi, tránh React Query refetch gây mất data
        setFilters({ code: [codeParam] });
        return;
      }
      setFilters(newFilters);
    },
    [codeParam]
  );

  return (
    <PagePermissionGuard resource="cash_flows" action="view">
      <div className="flex h-full min-h-0 flex-col border-t">
        <div className="flex shrink-0 items-center gap-1 border-b bg-white px-4 pt-2">
          <button
            type="button"
            onClick={() => setView("cashflows")}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              view === "cashflows"
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Sổ quỹ
          </button>
          <button
            type="button"
            onClick={() => setView("approvals")}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              view === "approvals"
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Approval
          </button>
          <button
            type="button"
            onClick={() => setView("history")}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              view === "history"
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Đối chiếu Lark
          </button>
        </div>

        {view === "cashflows" ? (
          <div
            className="flex min-h-0 flex-1"
            style={{ borderColor: "var(--dt-border)" }}>
            <CashFlowsSidebar
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
            <CashFlowsTable filters={filters} />
          </div>
        ) : view === "approvals" ? (
          <ApprovalRequestsPanel />
        ) : (
          <CashFlowHistoryAuditPanel />
        )}
      </div>
    </PagePermissionGuard>
  );
}
