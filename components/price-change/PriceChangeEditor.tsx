"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Paperclip, Trash2, X } from "lucide-react";
import { FormSection } from "@/components/products/FormSection";
import { ProductPickerDropdown } from "@/components/products/ProductPickerDropdown";
import { FilterMultiSelect } from "@/components/ui/filters";
import { NumericInput } from "@/components/ui/NumericInput";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { priceChangeApi } from "@/lib/api/price-change";
import {
  usePriceChangeCurrentValues,
  usePriceChangeReference,
} from "@/lib/hooks/usePriceChange";
import { fmtMoney } from "@/lib/price-change/constants";
import type { NppAttachment } from "@/lib/types/new-product-price";
import type {
  PcNamed,
  PcTicketDetail,
  PcUpsertInput,
} from "@/lib/types/price-change";
import { DiffChip } from "./PriceChangeItemsTable";

export interface PcDraftRow {
  productId: number;
  productCode: string;
  productName: string;
  /** branchId → giá vốn mới (null = không đổi). */
  costs: Record<number, number | null>;
  /** priceBookId → giá mới (0 = Bảng giá chung). */
  prices: Record<number, number | null>;
}

export interface PcDraft {
  branchIds: string[];
  bookIds: string[];
  rows: PcDraftRow[];
  note: string;
  documents: NppAttachment[];
}

/** Bản nháp từ phiếu đang có (sửa) hoặc rỗng (tạo mới). */
export function initPcDraft(ticket: PcTicketDetail | null): PcDraft {
  return {
    branchIds: (ticket?.costBranches ?? []).map((b) => String(b.id)),
    bookIds: (ticket?.priceBooks ?? []).map((p) => String(p.id)),
    rows: (ticket?.items ?? [])
      .filter((i) => i.productId !== null)
      .map((i) => ({
        productId: i.productId!,
        productCode: i.productCode,
        productName: i.productName,
        costs: Object.fromEntries(i.costs.map((c) => [c.branchId, c.newCost])),
        prices: Object.fromEntries(
          i.prices.map((p) => [p.priceBookId, p.newPrice]),
        ),
      })),
    note: ticket?.note ?? "",
    documents: ticket?.documents ?? [],
  };
}

/** Body gửi máy chủ: mỗi dòng đủ các cột đang chọn (giá mới null = không đổi). */
export function draftBody(d: PcDraft): PcUpsertInput {
  const branchIds = d.branchIds.map(Number);
  const bookIds = d.bookIds.map(Number);
  return {
    costBranchIds: branchIds,
    priceBookIds: bookIds,
    items: d.rows.map((r) => ({
      productId: r.productId,
      costs: branchIds.map((id) => ({
        branchId: id,
        newCost: r.costs[id] ?? null,
      })),
      prices: bookIds.map((id) => ({
        priceBookId: id,
        newPrice: r.prices[id] ?? null,
      })),
    })),
    note: d.note.trim() || null,
    documents: d.documents.length ? d.documents : null,
  };
}

/** Số ô có giá mới ở các cột đang chọn. */
export function changedCells(d: PcDraft): number {
  const branchIds = d.branchIds.map(Number);
  const bookIds = d.bookIds.map(Number);
  return d.rows.reduce(
    (n, r) =>
      n +
      branchIds.filter((id) => r.costs[id] != null).length +
      bookIds.filter((id) => r.prices[id] != null).length,
    0,
  );
}

/** Lý do chưa gửi duyệt được (giống kiểm tra ở máy chủ); null = gửi được. */
export function draftBlockReason(d: PcDraft): string | null {
  if (!d.rows.length) return "Chưa có sản phẩm nào";
  if (!d.branchIds.length && !d.bookIds.length)
    return "Chưa chọn chi nhánh đổi giá vốn hoặc bảng giá";
  const branchIds = d.branchIds.map(Number);
  const bookIds = d.bookIds.map(Number);
  const empty = d.rows.filter(
    (r) =>
      !branchIds.some((id) => r.costs[id] != null) &&
      !bookIds.some((id) => r.prices[id] != null),
  );
  if (empty.length) {
    const codes = empty
      .slice(0, 5)
      .map((r) => r.productCode)
      .join(", ");
    return `Chưa nhập giá mới cho: ${codes}${empty.length > 5 ? "…" : ""}`;
  }
  return null;
}

/** Có đổi giá vốn (→ cần CEO duyệt) theo bản nháp. */
export function draftHasCost(d: PcDraft): boolean {
  const branchIds = d.branchIds.map(Number);
  return d.rows.some((r) => branchIds.some((id) => r.costs[id] != null));
}

const TH =
  "px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap";

/**
 * Phần nhập phiếu (dùng trong modal Tạo phiếu và Xử lý bước Đề xuất):
 * cột thay đổi → sản phẩm × giá mới (kèm giá hiện tại trên POS) → ghi chú & tài liệu.
 */
export function PriceChangeEditor({
  draft,
  setDraft,
}: {
  draft: PcDraft;
  setDraft: (fn: (d: PcDraft) => PcDraft) => void;
}) {
  const { data: ref } = usePriceChangeReference();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const named = (ids: string[], list: PcNamed[] | undefined): PcNamed[] =>
    ids.map(Number).map((id) => ({
      id,
      name: list?.find((x) => x.id === id)?.name ?? `#${id}`,
    }));
  const branchCols = useMemo(
    () => named(draft.branchIds, ref?.branches),
    [draft.branchIds, ref],
  );
  const bookCols = useMemo(
    () => named(draft.bookIds, ref?.priceBooks),
    [draft.bookIds, ref],
  );

  const { data: current } = usePriceChangeCurrentValues(
    draft.rows.map((r) => r.productId),
    branchCols.map((c) => c.id),
    bookCols.map((c) => c.id),
  );
  const currentOf = (productId: number) =>
    current?.find((c) => c.productId === productId);

  const addProduct = (p: { id: number; code: string; name: string }) => {
    if (draft.rows.some((r) => r.productId === p.id)) {
      toast.info(`${p.code} đã có trong phiếu`);
      return;
    }
    setDraft((d) => ({
      ...d,
      rows: [
        ...d.rows,
        {
          productId: p.id,
          productCode: p.code,
          productName: p.name,
          costs: {},
          prices: {},
        },
      ],
    }));
  };

  const setCell = (
    productId: number,
    kind: "costs" | "prices",
    targetId: number,
    value: number | null,
  ) =>
    setDraft((d) => ({
      ...d,
      rows: d.rows.map((r) =>
        r.productId === productId
          ? { ...r, [kind]: { ...r[kind], [targetId]: value } }
          : r,
      ),
    }));

  const uploadDocs = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const saved = await priceChangeApi.uploadDocuments([...files]);
      setDraft((d) => ({ ...d, documents: [...d.documents, ...saved] }));
    } catch (e) {
      toast.error((e as Error).message || "Tải tài liệu lỗi");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const cellInput = (
    row: PcDraftRow,
    kind: "costs" | "prices",
    targetId: number,
    currentValue: number | null | undefined,
  ) => {
    const value = row[kind][targetId] ?? null;
    return (
      <div className="space-y-1 min-w-[130px]">
        <div className="text-xs text-gray-400 whitespace-nowrap">
          Hiện tại: {fmtMoney(currentValue ?? null)}
        </div>
        <NumericInput
          value={value ?? NaN}
          onValueChange={(n) => setCell(row.productId, kind, targetId, n)}
          onClear={() => setCell(row.productId, kind, targetId, null)}
          maxFractionDigits={0}
          placeholder="Giá mới"
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <DiffChip oldValue={currentValue ?? null} newValue={value} />
      </div>
    );
  };

  const label = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      <FormSection title="Giá cần thay đổi">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Giá vốn tại chi nhánh</label>
            <FilterMultiSelect
              options={(ref?.branches ?? []).map((b) => ({
                value: String(b.id),
                label: b.name,
              }))}
              values={draft.branchIds}
              onChange={(v) => setDraft((d) => ({ ...d, branchIds: v }))}
              placeholder="Không đổi giá vốn"
              searchPlaceholder="Tìm chi nhánh..."
              multiLabel={(n) => `${n} chi nhánh`}
            />
          </div>
          <div>
            <label className={label}>Bảng giá</label>
            <FilterMultiSelect
              options={(ref?.priceBooks ?? []).map((p) => ({
                value: String(p.id),
                label: p.id === 0 ? `${p.name} (giá bán chung)` : p.name,
              }))}
              values={draft.bookIds}
              onChange={(v) => setDraft((d) => ({ ...d, bookIds: v }))}
              placeholder="Không đổi giá bán"
              searchPlaceholder="Tìm bảng giá..."
              multiLabel={(n) => `${n} bảng giá`}
              panelWidth={320}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Có đổi giá vốn → Kế toán trưởng rồi CEO duyệt; chỉ đổi giá bán → Kế
          toán trưởng duyệt. Sau đó Phòng Dữ Liệu áp dụng lên POS.
        </p>
      </FormSection>

      <FormSection
        title={`Sản phẩm (${draft.rows.length})`}
        headerRight={
          <span className="text-xs text-gray-500">
            {changedCells(draft)} ô có giá mới
          </span>
        }>
        <div className="space-y-3">
          <ProductPickerDropdown
            onAddProduct={addProduct}
            placeholder="Tìm sản phẩm theo mã hoặc tên... (F3)"
          />
          {draft.rows.length > 0 &&
          (branchCols.length > 0 || bookCols.length > 0) ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={TH}>STT</th>
                    <th className={TH}>Mã hàng</th>
                    <th className={TH}>Tên hàng</th>
                    {branchCols.map((c) => (
                      <th key={`c${c.id}`} className={TH}>
                        Giá vốn · {c.name}
                      </th>
                    ))}
                    {bookCols.map((c) => (
                      <th key={`p${c.id}`} className={TH}>
                        {c.name}
                      </th>
                    ))}
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody>
                  {draft.rows.map((row, index) => {
                    const cur = currentOf(row.productId);
                    return (
                      <tr key={row.productId} className="border-t align-top">
                        <td className="px-3 py-2.5 text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-brand font-medium">
                          {row.productCode}
                        </td>
                        <td className="px-3 py-2.5 text-gray-800 min-w-[180px]">
                          {row.productName}
                          {cur && !cur.isActive && (
                            <div className="text-xs text-red-600 mt-1">
                              Đã ngừng kinh doanh
                            </div>
                          )}
                        </td>
                        {branchCols.map((c) => (
                          <td key={`c${c.id}`} className="px-3 py-2.5">
                            {cellInput(row, "costs", c.id, cur?.costs[c.id])}
                          </td>
                        ))}
                        {bookCols.map((c) => (
                          <td key={`p${c.id}`} className="px-3 py-2.5">
                            {cellInput(row, "prices", c.id, cur?.prices[c.id])}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                rows: d.rows.filter(
                                  (r) => r.productId !== row.productId,
                                ),
                              }))
                            }
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Bỏ sản phẩm">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-gray-400">
              {draft.rows.length
                ? "Chọn chi nhánh hoặc bảng giá ở phần trên để nhập giá mới"
                : "Chưa có sản phẩm nào — tìm và thêm sản phẩm ở ô phía trên"}
            </p>
          )}
        </div>
      </FormSection>

      <FormSection title="Ghi chú & tài liệu">
        <div className="space-y-3">
          <div>
            <label className={label}>Ghi chú</label>
            <textarea
              value={draft.note}
              onChange={(e) =>
                setDraft((d) => ({ ...d, note: e.target.value.slice(0, 4000) }))
              }
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              placeholder="Lý do thay đổi giá..."
            />
          </div>
          <div>
            <label className={label}>Tài liệu</label>
            {draft.documents.length > 0 && (
              <ul className="mb-2 space-y-1 text-sm">
                {draft.documents.map((doc) => (
                  <li key={doc.url} className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-brand hover:underline">
                      {doc.originalName || doc.url.split("/").pop()}
                    </a>
                    <button
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          documents: d.documents.filter(
                            (x) => x.url !== doc.url,
                          ),
                        }))
                      }
                      className="p-0.5 rounded hover:bg-gray-100 text-gray-400"
                      title="Bỏ tài liệu">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => uploadDocs(e.target.files)}
            />
            <LoadingButton
              loading={uploading}
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-600">
              <Paperclip className="w-4 h-4" /> Đính kèm tài liệu
            </LoadingButton>
          </div>
        </div>
      </FormSection>
    </>
  );
}
