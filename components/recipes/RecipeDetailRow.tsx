"use client";

import Link from "next/link";
import Image from "next/image";
import Swal from "sweetalert2";
import { useLayoutEffect, useRef, useState } from "react";
import {
  Archive,
  ClipboardList,
  ExternalLink,
  EyeOff,
  Info,
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { useCan } from "@/lib/hooks/useCan";
import {
  useArchiveRecipe,
  useDeleteRecipe,
  usePublishRecipe,
  useRecipe,
  useRestoreRecipe,
  useUnpublishRecipe,
} from "@/lib/hooks/useRecipes";
import type { RecipeIngredientPayload } from "@/lib/api/recipes";
import { RecipeComments } from "@/components/recipes/RecipeComments";

interface Props {
  recipeId: number;
  colSpan: number;
  onDeleted?: () => void;
}

type Tab = "info" | "recipe" | "comment";

const money = (value?: number | null) =>
  value == null
    ? "—"
    : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(Number(value)))}đ`;

const ingredientUnitCost = (row: RecipeIngredientPayload) => {
  if (row.includeInCost === false) return null;
  if (row.sourceType === "CUSTOM") return Number(row.customPrice || 0);
  if (row.sourceType === "PRODUCT") {
    return row.product?.unitCost == null ? null : Number(row.product.unitCost);
  }
  const unitCost = row.unitCostSnapshot ?? row.recipeReference?.costPerOutputUnit;
  return unitCost == null ? null : Number(unitCost);
};

const ingredientLineCost = (row: RecipeIngredientPayload) => {
  const unitCost = ingredientUnitCost(row);
  return unitCost == null ? null : unitCost * Number(row.quantity || 0);
};

const sourceLabel = (row: RecipeIngredientPayload) => {
  if (row.sourceType === "PRODUCT") return row.product ? `${row.product.code} - ${row.product.name}` : "Sản phẩm";
  if (row.sourceType === "SEMI_FINISHED") return row.recipeReference ? `${row.recipeReference.code} - ${row.recipeReference.name}` : "Bán thành phẩm";
  return row.customName || row.ingredientId ? row.customName || "Nguyên liệu ngoài" : "Nguyên liệu ngoài";
};

export function RecipeDetailRow({ recipeId, colSpan, onDeleted }: Props) {
  const { data: recipe, isLoading, isError, refetch } = useRecipe(recipeId);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canUpdate = useCan("recipes", "update");
  const canPublish = useCan("recipes", "publish");
  const canViewCost = useCan("recipes", "view_cost");
  const canDelete = useCan("recipes", "delete");
  const canArchive = useCan("recipes", "archive");
  const publishRecipe = usePublishRecipe();
  const archiveRecipe = useArchiveRecipe();
  const restoreRecipe = useRestoreRecipe();
  const deleteRecipe = useDeleteRecipe();
  const unpublishRecipe = useUnpublishRecipe();
  const busy = publishRecipe.isPending || archiveRecipe.isPending || restoreRecipe.isPending || deleteRecipe.isPending || unpublishRecipe.isPending;

  useLayoutEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    let scrollElement: HTMLElement | null = element.parentElement;
    while (scrollElement) {
      const overflowX = getComputedStyle(scrollElement).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") break;
      scrollElement = scrollElement.parentElement;
    }
    if (!scrollElement) return;
    const setWidth = () => {
      const width = `${scrollElement!.clientWidth}px`;
      if (element.style.width !== width) element.style.width = width;
    };
    setWidth();
    const observer = new ResizeObserver(setWidth);
    observer.observe(scrollElement);
    return () => observer.disconnect();
  }, [recipe]);

  if (isLoading) {
    return <tr><td colSpan={colSpan}><div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500"><Loader2 className="h-5 w-5 animate-spin text-brand" />Đang tải chi tiết...</div></td></tr>;
  }
  if (isError || !recipe) {
    return <tr><td colSpan={colSpan}><div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-gray-500"><p>Không thể tải chi tiết công thức.</p><button type="button" onClick={() => refetch()} className="rounded-lg border px-3 py-2 text-brand" style={{ borderColor: "var(--dt-border)" }}>Thử lại</button></div></td></tr>;
  }

  const version = recipe;
  const ingredients = version?.ingredients || [];
  const totalCost = ingredients.reduce((sum, row) => sum + (ingredientLineCost(row) || 0), 0);
  const isDraft = recipe.status === "DRAFT";
  const isArchived = recipe.status === "ARCHIVED";

  const confirmMutation = async (kind: "publish" | "archive" | "restore" | "delete") => {
    const copy = {
      publish: ["Publish công thức?", "Version hiện tại sẽ trở thành bất biến.", "Publish"],
      archive: ["Lưu trữ công thức?", "Công thức sẽ không còn trong danh sách đang dùng.", "Lưu trữ"],
      restore: ["Khôi phục công thức?", "Công thức sẽ trở lại trạng thái trước khi lưu trữ.", "Khôi phục"],
      delete: ["Xóa công thức?", "Thao tác này không thể hoàn tác.", "Xóa"],
    }[kind];
    const result = await Swal.fire({ title: copy[0], text: copy[1], icon: "warning", showCancelButton: true, confirmButtonText: copy[2], cancelButtonText: "Hủy", confirmButtonColor: kind === "delete" ? "#dc2626" : "#0D3B42" });
    if (!result.isConfirmed) return;
    if (kind === "publish") await publishRecipe.mutateAsync({ id: recipe.id });
    if (kind === "archive") await archiveRecipe.mutateAsync(recipe.id);
    if (kind === "restore") await restoreRecipe.mutateAsync(recipe.id);
    if (kind === "delete") { await deleteRecipe.mutateAsync(recipe.id); onDeleted?.(); }
  };

  const confirmUnpublish = async () => {
    if (!recipe.publishedAt) return;
    const result = await Swal.fire({
      title: "Bỏ phiên bản công khai?",
      text: `Công thức sẽ chuyển về trạng thái bản nháp và không hiển thị cho khách hàng.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Bỏ publish",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#0D3B42",
    });
    if (!result.isConfirmed) return;
    await unpublishRecipe.mutateAsync(recipe.id);
  };

  return (
    <tr>
      <td colSpan={colSpan} className="border-b-2 border-l-2 border-r-2 border-brand p-0" style={{ width: 0 }}>
        <div id={`recipe-detail-${recipe.id}`} ref={wrapperRef} className="sticky left-0 bg-white">
          <div className="px-5 pb-5 pt-4">
            <div className="mb-5 flex flex-wrap items-center gap-1 border-b" style={{ borderColor: "var(--dt-border)" }}>
              <button type="button" onClick={() => setActiveTab("info")} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${activeTab === "info" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-800"}`}><Info className="h-4 w-4" />Thông tin</button>
               <button type="button" onClick={() => setActiveTab("recipe")} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${activeTab === "recipe" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-800"}`}><ClipboardList className="h-4 w-4" />Công thức</button>
               <button type="button" onClick={() => setActiveTab("comment")} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${activeTab === "comment" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-800"}`}><MessageCircle className="h-4 w-4" />Comment</button>
            </div>

            {activeTab === "info" && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-gray-500">{recipe.code}</div>
                    <h2 className="mt-1 text-lg font-semibold text-[#0D3B42]">{recipe.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded bg-cyan-50 px-2 py-1 text-cyan-800">{recipe.type === "SEMI_FINISHED" ? "Bán thành phẩm" : "Thành phẩm"}</span><span className={`rounded px-2 py-1 ${isDraft ? "bg-amber-50 text-amber-700" : isArchived ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"}`}>{isDraft ? "Bản nháp" : isArchived ? "Đã lưu trữ" : "Đã publish"}</span>{recipe.category?.name && <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">{recipe.category.name}</span>}</div>
                  </div>
                  </div>
                <dl className="grid gap-x-6 gap-y-4 border-y py-4 text-sm sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: "var(--dt-border)" }}>
                  <div><dt className="text-xs text-gray-500">Sản phẩm thành phẩm</dt><dd className="mt-1 font-medium text-gray-800">{recipe.outputProduct ? `${recipe.outputProduct.code} - ${recipe.outputProduct.name}` : "—"}</dd></div>
                  <div><dt className="text-xs text-gray-500">Định lượng</dt><dd className="mt-1 font-medium text-gray-800">{recipe.quantity ?? "—"} {recipe.quantityUnit || ""}</dd></div>
                  <div><dt className="text-xs text-gray-500">Đơn vị thành phẩm</dt><dd className="mt-1 font-medium text-gray-800">{recipe.unit || "—"}</dd></div>
                  <div><dt className="text-xs text-gray-500">Bảo quản</dt><dd className="mt-1 font-medium text-gray-800">{recipe.storage || "—"}</dd></div>
                </dl>
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div><h3 className="mb-1 text-sm font-semibold text-[#0D3B42]">Mô tả</h3><p className="whitespace-pre-wrap text-sm text-gray-600">{recipe.description || "Chưa có mô tả."}</p></div>
                  {canViewCost && <div className="rounded-xl border bg-[#E8F4F5] p-4" style={{ borderColor: "var(--dt-border)" }}><div className="text-xs text-gray-500">Tổng giá cost</div><div className="mt-1 font-mono text-xl font-semibold text-[#0D3B42]">{money(version?.totalCost ?? totalCost)}</div></div>}
                </div>
                {!!version?.images?.length && <div><h3 className="mb-2 text-sm font-semibold text-[#0D3B42]">Media ({version.images.length})</h3><div className="flex gap-3 overflow-x-auto pb-1">{version.images.slice(0, 6).map((media, index) => <div key={media.id || `${media.fileUrl}-${index}`} className="w-36 max-h-40 shrink-0 overflow-hidden rounded-lg border bg-gray-50" style={{ borderColor: "var(--dt-border)" }}>{media.mediaType === "VIDEO" ? <video src={media.fileUrl} controls preload="metadata" className="aspect-video w-full max-h-32 bg-black object-contain" /> : <Image unoptimized width={288} height={180} src={media.fileUrl} alt={media.altText || media.fileName || recipe.name} className="aspect-video w-full max-h-32 object-cover" />}<div className="truncate px-2 py-1.5 text-xs text-gray-500" title={media.fileName || undefined}>{media.fileName || (media.mediaType === "VIDEO" ? "Video" : "Hình ảnh")}</div></div>)}</div></div>}
              </div>
            )}

            {activeTab === "recipe" && (
              <div className="space-y-4">
                {ingredients.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-gray-500" style={{ borderColor: "var(--dt-border)" }}>
                    Chưa có nguyên liệu.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border bg-white" style={{ borderColor: "var(--dt-border)" }}>
                    <table className="w-full min-w-[560px] text-xs">
                      <thead className="bg-gray-50 text-left text-[11px] uppercase text-gray-500">
                        <tr>
                          <th className="px-2 py-2">#</th>
                          <th className="px-2 py-2">Nguyên liệu</th>
                          <th className="px-2 py-2">Định lượng</th>
                          {canViewCost && <th className="px-2 py-2 text-right">Cost</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map((row, index) => (
                          <tr key={row.id || `${row.sourceType}-${index}`} className="border-t" style={{ borderColor: "var(--dt-border)" }}>
                            <td className="px-2 py-2 text-gray-400">{index + 1}</td>
                            <td className="px-2 py-2 font-medium text-gray-800">{sourceLabel(row)}</td>
                            <td className="px-2 py-2 text-gray-700">
                              {row.quantity} {row.unit || row.customUnit || ""}
                            </td>
                            {canViewCost && (
                              <td className="px-2 py-2 text-right font-mono text-gray-700">
                                {money(ingredientLineCost(row))}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {canViewCost && (
                      <div className="flex justify-end border-t px-2 py-2 text-xs font-mono" style={{ borderColor: "var(--dt-border)" }}>
                        <span className="font-semibold text-[#0D3B42]">
                          Tổng: {money(version?.totalCost ?? totalCost)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {version?.steps && version.steps.length > 0 ? (
                  <ol className="grid gap-2 md:grid-cols-2">
                    {version.steps.map((step, index) => (
                      <li key={step.id || index} className="rounded-lg border bg-white p-3 text-xs" style={{ borderColor: "var(--dt-border)" }}>
                        <div className="flex gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-800">{step.title || `Bước ${index + 1}`}</div>
                            <p className="mt-1 whitespace-pre-wrap text-gray-600">{step.content}</p>
                            {step.notes && (
                              <p className="mt-1 text-[11px] text-gray-500">Ghi chú: {step.notes}</p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-gray-500" style={{ borderColor: "var(--dt-border)" }}>
                    Chưa có quy trình.
                  </div>
                )}
                {!!version?.images?.length && (
                  <div>
                    <div className="mb-2 text-xs font-semibold text-[#0D3B42]">Media ({version.images.length})</div>
                    <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                      {version.images.slice(0, 8).map((media, index) => (
                        <div key={media.id || `${media.fileUrl}-${index}`} className="overflow-hidden rounded-lg border bg-white" style={{ borderColor: "var(--dt-border)" }}>
                          {media.mediaType === "VIDEO" ? (
                            <video src={media.fileUrl} controls preload="metadata" className="aspect-video w-full bg-black object-contain" />
                          ) : (
                            <Image unoptimized width={160} height={160} src={media.fileUrl} alt={media.altText || media.fileName || ""} className="aspect-square w-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "comment" && <RecipeComments recipeId={recipe.id} compact />}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--dt-border)" }}>
              <div className="flex flex-wrap gap-2">{isDraft && canDelete && <button type="button" disabled={busy} onClick={() => confirmMutation("delete")} className="flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50" style={{ borderColor: "var(--dt-border)" }}><Trash2 className="h-4 w-4" />Xóa</button>}{!isDraft && !isArchived && canArchive && <button type="button" disabled={busy} onClick={() => confirmMutation("archive")} className="flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50" style={{ borderColor: "var(--dt-border)" }}><Archive className="h-4 w-4" />Lưu trữ</button>}{isArchived && canArchive && <button type="button" disabled={busy} onClick={() => confirmMutation("restore")} className="flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50" style={{ borderColor: "var(--dt-border)" }}><RotateCcw className="h-4 w-4" />Khôi phục</button>}</div>
              <div className="flex flex-wrap gap-2">
                {canPublish && recipe.status === "PUBLISHED" && (
                  <button type="button" disabled={busy} onClick={confirmUnpublish} className="flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none" style={{ borderColor: "var(--dt-border)" }} title="Bỏ phiên bản công khai — công thức sẽ chuyển về DRAFT">
                    <EyeOff className="h-4 w-4" />Bỏ publish
                  </button>
                )}
                {isDraft && canPublish && <button type="button" disabled={busy} onClick={() => confirmMutation("publish")} className="flex min-h-10 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"><Send className="h-4 w-4" />Publish</button>}
                <Link href={`/san-pham/pha-che/${recipe.id}`} className="flex min-h-10 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:opacity-90"><ExternalLink className="h-4 w-4" />{canUpdate ? "Chỉnh sửa" : "Xem chi tiết"}</Link>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
