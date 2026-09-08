"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useProducts } from "@/lib/hooks/useProducts";
import {
  useDeletePlanningTrend,
  usePlanningTrends,
  useSavePlanningTrend,
} from "@/lib/hooks/usePurchasingPlanning";
import type { PlanningTrend } from "@/lib/types/purchasing-planning";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PlanningTrendModal({ open, onClose }: Props) {
  const { data, isLoading } = usePlanningTrends(open);
  const save = useSavePlanningTrend();
  const remove = useDeletePlanningTrend();
  const [search, setSearch] = useState("");
  const { data: productsRes } = useProducts(
    { search, limit: 8 },
    { enabled: open && search.trim().length >= 2 }
  );
  const products = productsRes?.data ?? [];

  const [form, setForm] = useState({
    productId: "" as string,
    productLabel: "",
    categoryName: "",
    startDate: "",
    endDate: "",
    kind: "UPLIFT" as "UPLIFT" | "QUANTITY",
    value: "",
    note: "",
  });

  const items: PlanningTrend[] = data?.items ?? [];

  if (!open) return null;

  const submit = async () => {
    if (!form.startDate || !form.endDate) {
      toast.error("Nhập ngày bắt đầu và kết thúc");
      return;
    }
    if (!form.productId && !form.categoryName.trim()) {
      toast.error("Chọn sản phẩm hoặc nhập nhóm hàng");
      return;
    }
    const numeric = Number(form.value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error("Nhập hệ số hoặc số lượng tăng thêm");
      return;
    }
    try {
      await save.mutateAsync({
        data: {
          ...(form.productId ? { productId: Number(form.productId) } : {}),
          ...(form.categoryName.trim()
            ? { categoryName: form.categoryName.trim() }
            : {}),
          startDate: form.startDate,
          endDate: form.endDate,
          kind: form.kind,
          ...(form.kind === "UPLIFT" ? { upliftFactor: numeric } : { extraQuantity: numeric }),
          ...(form.note.trim() ? { note: form.note.trim() } : {}),
        },
      });
      toast.success("Đã lưu trend");
      setForm({
        productId: "",
        productLabel: "",
        categoryName: "",
        startDate: "",
        endDate: "",
        kind: "UPLIFT",
        value: "",
        note: "",
      });
      setSearch("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không lưu được trend");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Trend bán hàng</h2>
            <p className="text-xs text-gray-500">
              Khai khoảng thời gian sản phẩm bán mạnh hơn bình thường. Hệ thống chỉ cộng vào nhu cầu khi trend còn hiệu lực.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto p-4 md:grid-cols-[1fr_1fr]">
          <div className="space-y-3 rounded-lg border p-3">
            <div className="text-sm font-medium">Thêm trend</div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Tìm sản phẩm theo mã / tên"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {form.productLabel && (
              <div className="text-xs text-gray-600">Đang chọn: {form.productLabel}</div>
            )}
            {search.trim().length >= 2 && (
              <div className="max-h-32 overflow-y-auto rounded border text-sm">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="block w-full px-3 py-1.5 text-left hover:bg-gray-50"
                    onClick={() => {
                      setForm({
                        ...form,
                        productId: String(product.id),
                        productLabel: `${product.code} · ${product.name}`,
                      });
                      setSearch("");
                    }}>
                    {product.code} · {product.name}
                  </button>
                ))}
              </div>
            )}
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Hoặc nhóm hàng (tùy chọn)"
              value={form.categoryName}
              onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="rounded-lg border px-3 py-2 text-sm"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              <input
                type="date"
                className="rounded-lg border px-3 py-2 text-sm"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as "UPLIFT" | "QUANTITY" })
              }>
              <option value="UPLIFT">Hệ số tăng so với ngày thường</option>
              <option value="QUANTITY">Số lượng tăng thêm</option>
            </select>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder={form.kind === "UPLIFT" ? "Ví dụ 1.5" : "Số lượng tăng thêm"}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Ghi chú / nguyên nhân"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
            <button
              type="button"
              onClick={submit}
              disabled={save.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm text-white disabled:opacity-50">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Lưu trend
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Trend đang hiệu lực</div>
            {isLoading ? (
              <div className="text-sm text-gray-400">Đang tải...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-gray-400">Chưa có trend nào.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">
                        {item.product
                          ? `${item.product.code} · ${item.product.name}`
                          : item.categoryName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.startDate} → {item.endDate}
                        {item.upliftFactor != null
                          ? ` · ×${item.upliftFactor}`
                          : ` · +${item.extraQuantity}`}
                      </div>
                      {item.note && (
                        <div className="text-xs text-gray-500">{item.note}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                      onClick={async () => {
                        try {
                          await remove.mutateAsync(item.id);
                          toast.success("Đã tắt trend");
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Không xóa được"
                          );
                        }
                      }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
