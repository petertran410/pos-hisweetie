"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { usePromotions } from "@/lib/hooks/usePromotions";
import { Promotion, PROMOTION_TYPE_LABELS } from "@/lib/types/promotion";
import { PromotionsTable } from "@/components/promotions/PromotionsTable";
import { PromotionForm } from "@/components/promotions/PromotionForm";

export default function PromotionsPage() {
  const [search, setSearch] = useState("");
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
      <div className="h-full w-screen border-t bg-gray-50 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Khuyến mãi</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm text-white"
          >
            <Plus className="h-4 w-4" />
            Tạo chương trình
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              className="text-sm outline-none"
              placeholder="Tìm theo mã / tên..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả loại</option>
            {Object.entries(PROMOTION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="running">Đang chạy</option>
            <option value="paused">Tạm dừng</option>
            <option value="stopped">Đã ngừng</option>
          </select>
        </div>

        <div className="rounded-lg border bg-white">
          <PromotionsTable
            promotions={promotions}
            loading={isLoading}
            onEdit={openEdit}
          />
        </div>

        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              Trước
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
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
