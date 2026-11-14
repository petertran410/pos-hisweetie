"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Eye, FileText, Info, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { CustomTooltip } from "@/components/ui/CustomTooltip";
import { confirmAction } from "@/lib/chat/confirm";
import { FilterMultiSelect } from "@/components/ui/filters";
import { useDeleteQuote, useDuplicateQuote, useQuote, useQuotes } from "@/lib/hooks/useQuotes";
import type { QuoteCategory, QuoteFilters, QuoteListItem, QuoteRegion } from "@/lib/types/quote";
import {
  QUOTE_CATEGORY_LABEL,
  QUOTE_REGION_LABEL,
  QUOTE_STATUS_COLOR,
  QUOTE_STATUS_LABEL,
} from "@/lib/types/quote";
import { QuotePreviewModal } from "./QuotePreviewModal";

type Props = {
  filters: QuoteFilters;
  onChange: (patch: Partial<QuoteFilters>) => void;
};

/** dd/mm/yyyy — chỉ ngày, không giờ. */
const formatDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const options = <K extends string>(labels: Record<K, string>) =>
  (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));

const TABS: { key: QuoteFilters["tab"]; label: string }[] = [
  { key: "quotes", label: "Báo giá" },
  { key: "library", label: "Thư viện" },
];

/** Ngày hôm nay theo giờ máy (YYYY-MM-DD). */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Cảnh báo hiệu lực cho báo giá còn mở (Nháp / Đã gửi): đã quá hạn, hoặc còn ≤ 3 ngày. */
function validityNote(q: QuoteListItem): { text: string; className: string } | null {
  if (!q.validUntil || (q.status !== "draft" && q.status !== "sent")) return null;
  const days = Math.round(
    (new Date(`${q.validUntil}T00:00:00`).getTime() - new Date(`${todayIso()}T00:00:00`).getTime()) / 864e5
  );
  if (days < 0) return { text: "Quá hạn", className: "text-red-600" };
  if (days <= 3) return { text: days === 0 ? "Hết hạn hôm nay" : `Còn ${days} ngày`, className: "text-amber-700" };
  return null;
}

/** Nút biểu tượng + tooltip (hiện sau 200ms). */
function IconButton({
  title,
  onClick,
  danger,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <CustomTooltip content={title} delayMs={200}>
      <button
        aria-label={title}
        // aria-disabled thay cho disabled: nút disabled không nhận hover nên tooltip không hiện.
        aria-disabled={disabled}
        onClick={disabled ? undefined : onClick}
        className={`p-1.5 rounded-lg text-gray-500 ${disabled ? "opacity-30 cursor-not-allowed" : ""} ${
          disabled ? "" : danger ? "hover:text-red-600 hover:bg-red-50" : "hover:text-brand hover:bg-brand-soft"
        }`}>
        {children}
      </button>
    </CustomTooltip>
  );
}

export function QuotesTable({ filters, onChange }: Props) {
  const router = useRouter();
  const library = filters.tab === "library";
  const { data, isLoading } = useQuotes(filters);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageSize = filters.pageSize ?? 20;
  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Gõ tìm kiếm: chờ 300ms mới gọi API (như trang Đặt hàng).
  const [search, setSearch] = useState(filters.search ?? "");
  useEffect(() => {
    const next = search.trim() || undefined;
    if (next === filters.search) return;
    const t = setTimeout(() => onChange({ search: next, page: 1 }), 300);
    return () => clearTimeout(t);
  }, [search, filters.search, onChange]);
  const filtered = Boolean(
    filters.search ||
      filters.status?.length ||
      filters.templateId?.length ||
      filters.createdById?.length ||
      filters.fromDate ||
      filters.category?.length ||
      filters.region?.length
  );

  const [previewId, setPreviewId] = useState<number | null>(null);
  const { data: preview } = useQuote(previewId);
  const duplicate = useDuplicateQuote();
  const remove = useDeleteQuote();

  const removeQuote = async (q: QuoteListItem) => {
    const ok = await confirmAction(
      `Xoá báo giá ${q.code}${q.customer ? ` của ${q.customer.name}` : ""}? Không khôi phục được.`,
      { title: "Xoá báo giá", confirmText: "Xoá", danger: true }
    );
    if (!ok) return;
    await remove.mutateAsync(q.id);
    toast.success(`Đã xoá ${q.code}`);
  };

  const copyFrom = async (q: QuoteListItem) => {
    const created = await duplicate.mutateAsync(q.id);
    toast.success(
      q.isLibrary
        ? `Đã tạo báo giá ${created.code} từ mẫu ${q.code}`
        : `Đã nhân bản ${q.code} thành ${created.code}`
    );
    router.push(`/khach-hang/bao-gia/${created.id}`);
  };

  const columns = library
    ? ["Mã", "Tiêu đề", "Ngành hàng", "Miền", "Số SP", "Áp dụng từ", ""]
    : ["Mã", "Khách hàng", "Mẫu", "Số SP", "Ngày tạo", "Hiệu lực", "Trạng thái", "Sale", ""];

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0 ${library ? "ml-4" : ""}`}>
      {/* Toolbar */}
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">Báo giá</h2>
          <div className="flex rounded-lg border p-0.5 bg-gray-50" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={filters.tab === t.key}
                onClick={() =>
                  onChange({
                    tab: t.key,
                    page: 1,
                    status: undefined,
                    templateId: undefined,
                    region: undefined,
                    category: undefined,
                    createdById: undefined,
                  })
                }
                className={`px-3 py-1 text-sm rounded-md ${
                  filters.tab === t.key ? "bg-white shadow-sm font-medium text-brand" : "text-gray-600"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder={library ? "Tìm mã, tiêu đề mẫu..." : "Tìm mã báo giá, khách hàng..."}
            aria-label={library ? "Tìm mẫu thư viện" : "Tìm báo giá"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          onClick={() => router.push("/khach-hang/bao-gia/new")}
          className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          Tạo báo giá
        </button>
      </div>

      {library && (
        // Bộ lọc thư viện: ngành hàng × miền
        <div className="px-4 py-2 border-b bg-gray-50 flex flex-wrap items-center gap-2 shrink-0">
          {[
            {
              label: "Ngành hàng",
              opts: options(QUOTE_CATEGORY_LABEL),
              values: filters.category ?? [],
              set: (v: string[]) => onChange({ category: v.length ? (v as QuoteCategory[]) : undefined }),
            },
            {
              label: "Miền",
              opts: options(QUOTE_REGION_LABEL),
              values: filters.region ?? [],
              set: (v: string[]) => onChange({ region: v.length ? (v as QuoteRegion[]) : undefined }),
            },
          ].map((f) => (
            <div key={f.label} className="w-48">
              <FilterMultiSelect
                options={f.opts}
                values={f.values}
                onChange={f.set}
                placeholder={`${f.label}: tất cả`}
                multiLabel={(n) => `${f.label}: ${n} mục`}
                searchable={false}
              />
            </div>
          ))}
          {Boolean(filters.category?.length || filters.region?.length) && (
            <button
              onClick={() => onChange({ category: undefined, region: undefined })}
              className="text-sm text-brand hover:text-brand-dark font-medium px-1">
              Xóa lọc
            </button>
          )}
          <span
            className="ml-auto flex items-center gap-1 text-xs text-gray-600"
            title="Báo giá mẫu dựng từ file “Bảng báo giá tổng hợp 01.09.26”">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Bấm <b>Dùng mẫu này</b> để tạo báo giá mới rồi sửa tiếp
          </span>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400" role="status">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
                    <span className="text-xs">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" aria-hidden="true" />
                  <div className="text-sm">
                    {library
                      ? "Không có mẫu phù hợp"
                      : filtered
                        ? "Không tìm thấy báo giá phù hợp với bộ lọc"
                        : "Chưa có báo giá nào"}
                  </div>
                  {!library && !filtered && (
                    <button
                      onClick={() => router.push("/khach-hang/bao-gia/new")}
                      className="mt-3 px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium inline-flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /> Tạo báo giá đầu tiên
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((q) => (
                <tr
                  key={q.id}
                  // Bấm dòng: báo giá → mở để sửa; mẫu thư viện → xem trước. Các nút trong dòng chặn lan sự kiện.
                  onClick={() => (library ? setPreviewId(q.id) : router.push(`/khach-hang/bao-gia/${q.id}`))}
                  className="border-b hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setPreviewId(q.id)}
                      className="text-brand font-medium hover:underline">
                      {q.code}
                    </button>
                  </td>
                  {library ? (
                    <>
                      <td className="px-4 py-2 min-w-[280px]">{q.title}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {q.category ? QUOTE_CATEGORY_LABEL[q.category] : "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{QUOTE_REGION_LABEL[q.region]}</td>
                      <td className="px-4 py-2">{q.itemCount}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(q.appliedFrom)}</td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton title="Xem trước" onClick={() => setPreviewId(q.id)}>
                            <Eye className="w-4 h-4" />
                          </IconButton>
                          <button
                            onClick={() => copyFrom(q)}
                            disabled={duplicate.isPending}
                            className="ml-1 px-2.5 py-1 text-xs rounded-lg border border-brand text-brand hover:bg-brand-soft flex items-center gap-1 whitespace-nowrap disabled:opacity-50">
                            <Sparkles className="w-3.5 h-3.5" /> Dùng mẫu này
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2">
                        {q.customer ? (
                          <>
                            <div>{q.customer.name}</div>
                            <div className="text-xs text-gray-400">{q.customer.code ?? "Chưa có trong POS"}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">Khách chung</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {q.templateName ?? <span className="text-gray-400">Không theo mẫu</span>}
                        <div className="text-xs text-gray-400">{QUOTE_REGION_LABEL[q.region]}</div>
                      </td>
                      <td className="px-4 py-2">{q.itemCount}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(q.createdAt)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {q.validUntil ? formatDate(q.validUntil) : "—"}
                        {(() => {
                          const note = validityNote(q);
                          return note && <div className={`text-xs font-medium ${note.className}`}>{note.text}</div>;
                        })()}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${QUOTE_STATUS_COLOR[q.status]}`}>
                          {QUOTE_STATUS_LABEL[q.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{q.createdBy.name}</td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <IconButton title="Xem / xuất PDF, ảnh" onClick={() => setPreviewId(q.id)}>
                            <Eye className="w-4 h-4" />
                          </IconButton>
                          <IconButton title="Sửa" onClick={() => router.push(`/khach-hang/bao-gia/${q.id}`)}>
                            <Pencil className="w-4 h-4" />
                          </IconButton>
                          <IconButton
                            title={duplicate.isPending ? "Đang nhân bản…" : "Nhân bản"}
                            disabled={duplicate.isPending}
                            onClick={() => copyFrom(q)}>
                            <Copy className="w-4 h-4" />
                          </IconButton>
                          <IconButton
                            title={q.status === "draft" ? "Xoá" : "Chỉ xoá được báo giá Nháp"}
                            danger
                            disabled={q.status !== "draft"}
                            onClick={() => removeQuote(q)}>
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-white text-sm shrink-0">
          <span className="text-gray-500">
            {total} {library ? "mẫu" : "báo giá"}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onChange({ page: page - 1 })}
              className="px-3 py-1 rounded border disabled:opacity-40">
              Trước
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onChange({ page: page + 1 })}
              className="px-3 py-1 rounded border disabled:opacity-40">
              Sau
            </button>
          </div>
        </div>
      )}

      {previewId && preview && preview.id === previewId && (
        <QuotePreviewModal quote={preview} onClose={() => setPreviewId(null)} />
      )}
    </div>
  );
}
