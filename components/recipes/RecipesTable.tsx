"use client";

import { Fragment, useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Swal from "sweetalert2";
import { AlertCircle, Archive, Beaker, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, EyeOff, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { RecipeQueryParams } from "@/lib/api/recipes";
import { useArchiveRecipe, useDeleteRecipe, useRecipes, useRestoreRecipe, useUnpublishRecipe } from "@/lib/hooks/useRecipes";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useCan } from "@/lib/hooks/useCan";
import { RecipeDetailRow } from "@/components/recipes/RecipeDetailRow";

interface Props {
  filters: RecipeQueryParams & { page: number; limit: number };
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const statusStyle: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-200",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ARCHIVED: "bg-gray-100 text-gray-600 ring-gray-200",
};
const statusLabel: Record<string, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã publish",
  ARCHIVED: "Đã lưu trữ",
};
const money = (value?: number | null) =>
  value == null
    ? "—"
    : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(Number(value)))}đ`;

export function RecipesTable({ filters, onPageChange, onLimitChange }: Props) {
  const { data, isLoading, isError, refetch } = useRecipes(filters);
  const archiveRecipe = useArchiveRecipe();
  const deleteRecipe = useDeleteRecipe();
  const restoreRecipe = useRestoreRecipe();
  const unpublishRecipe = useUnpublishRecipe();
  const [expandedRecipe, setExpandedRecipe] = useState<{ id: number; filterKey: string } | null>(null);
  const canViewCost = useCan("recipes", "view_cost");
  const rows = data?.data || [];
  const total = data?.total || 0;
  const pages = Math.max(Math.ceil(total / filters.limit), 1);
  const [jumpPage, setJumpPage] = useState("");

  const handleJump = useCallback(() => {
    const target = parseInt(jumpPage, 10);
    if (Number.isFinite(target) && target >= 1 && target <= pages) {
      onPageChange(target);
    }
    setJumpPage("");
  }, [jumpPage, pages, onPageChange]);

  const filterKey = JSON.stringify(filters);

  const confirmAction = async (id: number, name: string, status: string) => {
    const draft = status === "DRAFT";
    const archived = status === "ARCHIVED";
    const result = await Swal.fire({
      title: draft ? "Xóa công thức?" : archived ? "Khôi phục công thức?" : "Lưu trữ công thức?",
      text: archived ? `Công thức “${name}” sẽ được đưa trở lại trạng thái bản nháp.` : `Công thức “${name}” sẽ không còn trong danh sách đang dùng.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: draft ? "Xóa" : archived ? "Khôi phục" : "Lưu trữ",
      cancelButtonText: "Hủy",
      confirmButtonColor: draft ? "#dc2626" : "#0D3B42",
    });
    if (!result.isConfirmed) return;
    if (draft) await deleteRecipe.mutateAsync(id);
    else if (archived) await restoreRecipe.mutateAsync(id);
    else await archiveRecipe.mutateAsync(id);
  };

  const confirmUnpublish = async (id: number, name: string) => {
    const result = await Swal.fire({
      title: "Bỏ phiên bản công khai?",
      text: `Công thức "${name}" sẽ chuyển về trạng thái bản nháp và không hiển thị cho khách hàng.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Bỏ publish",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#0D3B42",
    });
    if (!result.isConfirmed) return;
    await unpublishRecipe.mutateAsync(id);
  };

  const colSpan = canViewCost ? 7 : 6;

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-4 md:px-6" style={{ borderColor: "var(--dt-border)" }}>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Công thức pha chế</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total ? `${total} công thức` : "Chưa có công thức"}</p>
        </div>
        <PermissionGate resource="recipes" action="create">
          <Link href="/san-pham/pha-che/new" className="flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 md:px-4">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Thêm công thức</span>
          </Link>
        </PermissionGate>
      </header>

      <div className="hidden flex-1 overflow-auto md:block">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left">
            <tr>
              <th className="w-10 px-3 py-3"><span className="sr-only">Mở rộng</span></th>
               <th className="w-20 px-4 py-3 font-medium">Media</th>
              <th className="px-4 py-3 font-medium">Tên công thức</th>
              <th className="px-4 py-3 font-medium">Loại</th>
              {canViewCost && <th className="px-4 py-3 text-right font-medium">Giá vốn</th>}
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={colSpan} className="py-16 text-center text-gray-500">Đang tải...</td></tr>
            ) : isError ? (
              <tr><td colSpan={colSpan} className="py-16 text-center"><AlertCircle className="mx-auto mb-2 h-9 w-9 text-red-500" /><p className="text-sm font-medium text-gray-800">Không thể tải danh sách công thức</p><button type="button" onClick={() => refetch()} className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-brand"><RotateCcw className="h-4 w-4" />Thử lại</button></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={colSpan} className="py-16 text-center text-gray-500"><Beaker className="mx-auto mb-2 h-10 w-10 opacity-25" />Chưa có công thức phù hợp</td></tr>
            ) : rows.map((recipe) => {
              const version = recipe;
              const expanded = expandedRecipe?.id === recipe.id && expandedRecipe.filterKey === filterKey;
              return (
                <Fragment key={recipe.id}>
                <tr
                  onClick={() => setExpandedRecipe((current) => current?.id === recipe.id && current.filterKey === filterKey ? null : { id: recipe.id, filterKey })}
                  aria-expanded={expanded}
                  aria-controls={`recipe-detail-${recipe.id}`}
                  className={`cursor-pointer border-t transition-colors ${expanded ? "border-l-2 border-r-2 border-brand bg-cyan-50" : "hover:bg-gray-50"}`}
                  style={{ borderColor: expanded ? undefined : "var(--dt-border)" }}>
                  <td className="px-3 py-3"><button type="button" onClick={(event) => { event.stopPropagation(); setExpandedRecipe((current) => current?.id === recipe.id && current.filterKey === filterKey ? null : { id: recipe.id, filterKey }); }} aria-label={`${expanded ? "Thu gọn" : "Mở rộng"} công thức ${recipe.name}`} aria-expanded={expanded} className="rounded p-1 hover:bg-cyan-100"><ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-180 text-brand" : ""}`} /></button></td>
                    <td className="px-4 py-3">{recipe.thumbnail ? <Image unoptimized src={recipe.thumbnail.fileUrl} alt={recipe.thumbnail.altText || recipe.name} width={48} height={48} className="h-12 w-12 rounded-lg border object-cover" style={{ borderColor: "var(--dt-border)" }} /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100"><Beaker className="h-5 w-5 text-gray-300" /></div>}</td>
                    <td className="px-4 py-3">
                      <Link onClick={(event) => event.stopPropagation()} href={`/san-pham/pha-che/${recipe.id}`} className="font-medium text-gray-900 hover:text-brand hover:underline">{recipe.name}</Link>
                    <div className="mt-0.5 text-xs text-gray-500">{recipe.category?.name || "Chưa phân nhóm"}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{recipe.type === "SEMI_FINISHED" ? "Bán thành phẩm" : "Thành phẩm"}</td>
                  {canViewCost && (
                    <td className="px-4 py-3 text-right font-mono">
                      {money(version?.liveTotalCost)}
                    </td>
                  )}
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs ring-1 ${statusStyle[recipe.status]}`}>{statusLabel[recipe.status]}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link onClick={(event) => event.stopPropagation()} href={`/san-pham/pha-che/${recipe.id}`} className="rounded-lg p-2 text-gray-500 hover:bg-cyan-50 hover:text-brand" title="Mở công thức"><Pencil className="h-4 w-4" /></Link>
                      {recipe.status === "PUBLISHED" && (
                        <PermissionGate resource="recipes" action="publish">
                          <button onClick={(event) => { event.stopPropagation(); confirmUnpublish(recipe.id, recipe.name); }} disabled={unpublishRecipe.isPending} className="rounded-lg p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50" title="Bỏ phiên bản công khai">
                            <EyeOff className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                      )}
                      <PermissionGate resource="recipes" action={recipe.status === "DRAFT" ? "delete" : "archive"}>
                        <button onClick={(event) => { event.stopPropagation(); confirmAction(recipe.id, recipe.name, recipe.status); }} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" title={recipe.status === "DRAFT" ? "Xóa" : recipe.status === "ARCHIVED" ? "Khôi phục" : "Lưu trữ"}>
                          {recipe.status === "DRAFT" ? <Trash2 className="h-4 w-4" /> : recipe.status === "ARCHIVED" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
                {expanded && <RecipeDetailRow recipeId={recipe.id} colSpan={colSpan} onDeleted={() => setExpandedRecipe(null)} />}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:hidden">
        {isLoading ? (
          <div className="space-y-3" aria-label="Đang tải công thức">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-xl border bg-gray-50" style={{ borderColor: "var(--dt-border)" }} />)}</div>
        ) : isError ? (
          <div className="rounded-xl border bg-white px-4 py-10 text-center" style={{ borderColor: "var(--dt-border)" }}><AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" /><h2 className="font-semibold text-[#0D3B42]">Không thể tải danh sách</h2><p className="mt-1 text-sm text-gray-500">Vui lòng kiểm tra kết nối và thử lại.</p><button type="button" onClick={() => refetch()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white"><RotateCcw className="h-4 w-4" />Thử lại</button></div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white px-4 py-12 text-center" style={{ borderColor: "var(--dt-border)" }}><Beaker className="mx-auto mb-3 h-10 w-10 text-gray-300" /><p className="text-sm font-medium text-gray-700">Chưa có công thức phù hợp</p><p className="mt-1 text-xs text-gray-500">Hãy thay đổi hoặc đặt lại bộ lọc.</p></div>
        ) : (
          <div className="space-y-3">{rows.map((recipe) => { const version = recipe; return (
             <article key={recipe.id} className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: "var(--dt-border)" }}>
               <div className="flex items-start justify-between gap-3">
                 <div className="flex min-w-0 gap-3">{recipe.thumbnail ? <Image unoptimized src={recipe.thumbnail.fileUrl} alt={recipe.thumbnail.altText || recipe.name} width={56} height={56} className="h-14 w-14 shrink-0 rounded-lg border object-cover" style={{ borderColor: "var(--dt-border)" }} /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100"><Beaker className="h-5 w-5 text-gray-300" /></div>}<div className="min-w-0"><Link href={`/san-pham/pha-che/${recipe.id}`} className="block truncate font-semibold text-[#0D3B42]">{recipe.name}</Link><div className="mt-1 text-xs text-gray-500">{recipe.category?.name || "Chưa phân nhóm"}</div></div></div>
                <span className={`shrink-0 rounded-lg px-2 py-1 text-xs ring-1 ${statusStyle[recipe.status] || statusStyle.ARCHIVED}`}>{statusLabel[recipe.status] || "Không xác định"}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-y py-3 text-xs" style={{ borderColor: "var(--dt-border)" }}>
                <div><dt className="text-gray-500">Loại</dt><dd className="mt-1 font-medium text-gray-800">{recipe.type === "SEMI_FINISHED" ? "Bán thành phẩm" : "Thành phẩm"}</dd></div>
                {canViewCost && <div className="col-span-2"><dt className="text-gray-500">Giá vốn</dt><dd className="mt-1 font-mono font-semibold text-[#0D3B42]">{money(version?.liveTotalCost)}</dd></div>}
              </dl>
               <div className="mt-3 flex justify-end gap-2"><Link href={`/san-pham/pha-che/${recipe.id}`} aria-label={`Mở công thức ${recipe.name}`} className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium text-brand" style={{ borderColor: "var(--dt-border)" }}><Pencil className="h-4 w-4" />Mở</Link>{recipe.status === "PUBLISHED" && <PermissionGate resource="recipes" action="publish"><button type="button" disabled={unpublishRecipe.isPending} onClick={() => confirmUnpublish(recipe.id, recipe.name)} className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm text-amber-700 disabled:opacity-50" style={{ borderColor: "var(--dt-border)" }}><EyeOff className="h-4 w-4" />Bỏ publish</button></PermissionGate>}<PermissionGate resource="recipes" action={recipe.status === "DRAFT" ? "delete" : "archive"}><button type="button" onClick={() => confirmAction(recipe.id, recipe.name, recipe.status)} className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm text-gray-600" style={{ borderColor: "var(--dt-border)" }}>{recipe.status === "DRAFT" ? <Trash2 className="h-4 w-4" /> : recipe.status === "ARCHIVED" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{recipe.status === "DRAFT" ? "Xóa" : recipe.status === "ARCHIVED" ? "Khôi phục" : "Lưu trữ"}</button></PermissionGate></div>
            </article>
          ); })}</div>
        )}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-y-2 border-t bg-white px-4 py-2.5" style={{ borderColor: "var(--dt-border)" }}>
        {/* ── Trái: Hiển thị N / trang ── */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Hiển thị</span>
          <select
            value={filters.limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded border bg-white px-2 py-1 text-xs focus:ring-1 focus:ring-brand focus:outline-none"
            style={{ borderColor: "var(--dt-border)" }}>
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">/ trang</span>
        </div>

        {/* ── Giữa: Pagination ── */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={filters.page <= 1}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: "var(--dt-border)" }}>
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(filters.page - 1)}
            disabled={filters.page <= 1}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: "var(--dt-border)" }}>
            <ChevronLeft className="h-4 w-4" />
          </button>

          {(() => {
            const MAX_BUTTONS = 5;
            const buttons: (number | "ellipsis")[] = [];
            if (pages <= MAX_BUTTONS + 2) {
              for (let i = 1; i <= pages; i++) buttons.push(i);
            } else {
              buttons.push(1);
              let start = Math.max(2, filters.page - 1);
              let end = Math.min(pages - 1, filters.page + 1);
              if (filters.page <= 3) { start = 2; end = 4; }
              if (filters.page >= pages - 2) { start = pages - 3; end = pages - 1; }
              if (start > 2) buttons.push("ellipsis");
              for (let i = start; i <= end; i++) buttons.push(i);
              if (end < pages - 1) buttons.push("ellipsis");
              buttons.push(pages);
            }
            return buttons.map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  className={`h-7 w-7 rounded border text-xs font-medium transition-colors ${
                    item === filters.page
                      ? "border-brand bg-brand text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}>
                  {item}
                </button>
              )
            );
          })()}

          <button
            type="button"
            onClick={() => onPageChange(filters.page + 1)}
            disabled={filters.page >= pages}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: "var(--dt-border)" }}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(pages)}
            disabled={filters.page >= pages}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: "var(--dt-border)" }}>
            <ChevronsRight className="h-4 w-4" />
          </button>

          <span className="mx-1 text-xs text-gray-500">Nhảy đến:</span>
          <input
            type="text"
            inputMode="numeric"
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleJump(); }}
            onBlur={handleJump}
            placeholder={`${filters.page}`}
            className="w-10 rounded border px-1.5 py-0.5 text-center text-xs focus:ring-1 focus:ring-brand focus:outline-none"
            style={{ borderColor: "var(--dt-border)" }}
          />
        </div>

        {/* ── Phải: Đang hiển thị X–Y / Z ── */}
        <span className="text-xs text-gray-400">
          Đang hiển thị {total === 0 ? 0 : (filters.page - 1) * filters.limit + 1}–{Math.min(filters.page * filters.limit, total)} / {total}
        </span>
      </footer>
    </section>
  );
}
