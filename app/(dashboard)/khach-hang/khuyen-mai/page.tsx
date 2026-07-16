"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, Download, Loader2, ChevronDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import {
  usePromotions,
  useExportPromotions,
} from "@/lib/hooks/usePromotions";
import { Promotion, PROMOTION_TYPE_LABELS } from "@/lib/types/promotion";
import { PromotionsTable } from "@/components/promotions/PromotionsTable";
import { PromotionForm } from "@/components/promotions/PromotionForm";

export default function PromotionsPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code") || "";

  const [search, setSearch] = useState(codeParam);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const { data, isLoading } = usePromotions({
    page,
    pageSize,
    search: search || undefined,
    type: type || undefined,
    status: status || undefined,
  });

  const {
    exportToFile,
    exportDetailToFile,
    isExportingOverview,
    isExportingDetail,
  } = useExportPromotions();
  const isExporting = isExportingOverview || isExportingDetail;
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu]);

  const buildExportFilters = () => ({
    search: search || undefined,
    type: type || undefined,
    status: status || undefined,
  });

  const promotions = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (p: Promotion) => {
    setEditing(p);
    setShowForm(true);
  };

  return (
    <PagePermissionGuard resource="promotions" action="view">
      <div
        className="h-full w-full overflow-y-auto border-t p-4"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Khuyến mãi</h1>
          <div className="flex items-center gap-2">
            <PermissionGate resource="promotions" action="export">
              <div ref={exportMenuRef} className="relative">
                <button
                  onClick={() => setShowExportMenu((o) => !o)}
                  disabled={isExporting}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isExporting ? "Đang xuất..." : "Xuất file"}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        exportToFile(buildExportFilters());
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-soft transition-colors">
                      Xuất tổng quan
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        exportDetailToFile(buildExportFilters());
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-soft transition-colors border-t border-gray-100">
                      Xuất chi tiết
                    </button>
                  </div>
                )}
              </div>
            </PermissionGate>
            <PermissionGate resource="promotions" action="create">
              <button
                onClick={openCreate}
                className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark transition-colors">
                <Plus className="h-4 w-4" />
                Tạo chương trình
              </button>
            </PermissionGate>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
            style={{ borderColor: "var(--dt-border)" }}>
            <Search className="h-4 w-4 text-gray-400" />
            <input
              className="text-sm outline-none bg-transparent"
              placeholder="Tìm theo mã / tên..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="dt-select dt-select-sm !rounded-lg"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}>
            <option value="">Tất cả loại</option>
            {Object.entries(PROMOTION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="dt-select dt-select-sm !rounded-lg"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}>
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="running">Đang chạy</option>
            <option value="paused">Tạm dừng</option>
            <option value="stopped">Đã ngừng</option>
          </select>
        </div>

        <div
          className="rounded-xl border bg-white"
          style={{ borderColor: "var(--dt-border)" }}>
          <PromotionsTable
            promotions={promotions}
            loading={isLoading}
            onEdit={openEdit}
            initialExpandCode={codeParam || undefined}
          />
        </div>

        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="dt-btn-ghost rounded-lg px-3 py-1 disabled:opacity-40">
              Trước
            </button>
            <span className="dt-mono">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="dt-btn-ghost rounded-lg px-3 py-1 disabled:opacity-40">
              Sau
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <PromotionForm
          promotion={editing}
          onClose={() => setShowForm(false)}
        />
      )}
    </PagePermissionGuard>
  );
}
