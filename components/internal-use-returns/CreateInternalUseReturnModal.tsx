"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { useInternalUses } from "@/lib/hooks/useInternalUses";
import {
  useCreateInternalUseReturn,
  useInternalUseReturn,
  useInternalUseReturnable,
  useUpdateInternalUseReturn,
} from "@/lib/hooks/useInternalUseReturns";
import { CodeLink } from "@/components/shared/CodeLink";
import { formatMonthYear } from "@/components/ui/DatePickerInput";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  returnId?: number | null;
  initialInternalUseId?: number | null;
}

interface Row {
  internalUseDetailId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit?: string | null;
  issuedQuantity: number;
  remainingQuantity: number;
  conditionType: string;
  soldExpiryDate?: string | null;
  requestQuantity: number;
  note: string;
  detailId?: number;
}

export function CreateInternalUseReturnModal({
  onClose,
  onSuccess,
  returnId,
  initialInternalUseId,
}: Props) {
  const isEditing = !!returnId;
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourceOpen, setSourceOpen] = useState(false);
  const sourceRef = useRef<HTMLDivElement>(null);
  const [sourceId, setSourceId] = useState(initialInternalUseId || 0);
  const [sourceCode, setSourceCode] = useState("");
  const [sourceBranchName, setSourceBranchName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState("");

  const { data: existing } = useInternalUseReturn(returnId || 0);
  const { data: returnable, isLoading: isLoadingReturnable } =
    useInternalUseReturnable(sourceId && !isEditing ? sourceId : 0);
  const { data: sourceList } = useInternalUses({
    status: [2],
    search: sourceSearch || undefined,
    branchIds: selectedBranch?.id ? [selectedBranch.id] : undefined,
    pageSize: 20,
    currentItem: 0,
  });
  const createReturn = useCreateInternalUseReturn();
  const updateReturn = useUpdateInternalUseReturn();

  const availableSources = useMemo(
    () => sourceList?.data || [],
    [sourceList?.data]
  );

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (
        sourceRef.current &&
        !sourceRef.current.contains(event.target as Node)
      ) {
        setSourceOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!existing) return;
    setSourceId(existing.internalUseId);
    setSourceCode(existing.internalUse?.code || "");
    setSourceBranchName(existing.branch?.name || "");
    setNote(existing.note || "");
    setRows(
      (existing.details || []).map((detail) => ({
        internalUseDetailId: detail.internalUseDetailId,
        detailId: detail.id,
        productId: detail.productId,
        productCode: detail.productCode,
        productName: detail.productName,
        unit: detail.unit,
        issuedQuantity: Number(detail.issuedQuantity),
        remainingQuantity: Number(detail.issuedQuantity),
        conditionType: detail.sourceConditionType,
        soldExpiryDate: detail.sourceSoldExpiryDate,
        requestQuantity: Number(detail.requestQuantity),
        note: detail.note || "",
      }))
    );
  }, [existing]);

  useEffect(() => {
    if (isEditing || !returnable) return;
    setSourceCode(returnable.internalUseCode);
    setSourceBranchName(returnable.branchName);
    setRows(
      returnable.details.map((detail) => ({
        ...detail,
        requestQuantity: 0,
        note: "",
      }))
    );
  }, [isEditing, returnable]);

  const selectSource = (source: any) => {
    setSourceId(source.id);
    setSourceCode(source.code);
    setSourceBranchName(source.branchName);
    setRows([]);
    setSourceOpen(false);
  };

  const updateRow = (
    index: number,
    patch: Partial<Pick<Row, "requestQuantity" | "note">>
  ) => {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, ...patch };
        next.requestQuantity = Math.min(
          Math.max(0, Number(next.requestQuantity) || 0),
          row.remainingQuantity
        );
        return next;
      })
    );
  };

  const submit = async (isDraft: boolean) => {
    if (!sourceId || rows.filter((row) => row.requestQuantity > 0).length === 0) {
      toast.error("Vui lòng chọn phiếu xuất và nhập số lượng cần trả");
      return;
    }
    const details = rows
      .filter((row) => row.requestQuantity > 0)
      .map((row) =>
        isEditing
          ? {
              detailId: row.detailId,
              requestQuantity: row.requestQuantity,
              note: row.note || undefined,
            }
          : {
              internalUseDetailId: row.internalUseDetailId,
              requestQuantity: row.requestQuantity,
              note: row.note || undefined,
            }
      );

    try {
      if (isEditing && returnId) {
        await updateReturn.mutateAsync({
          id: returnId,
          data: { details, note: note || undefined, isDraft },
        });
      } else {
        await createReturn.mutateAsync({
          internalUseId: sourceId,
          details,
          note: note || undefined,
          isDraft,
        });
      }
      onSuccess();
    } catch {
      // Hook displays the API error.
    }
  };

  const busy = createReturn.isPending || updateReturn.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">
              {isEditing ? "Sửa phiếu trả xuất dùng nội bộ" : "Tạo phiếu trả xuất dùng nội bộ"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Chỉ chọn được phiếu xuất dùng nội bộ đã hoàn thành.
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 border-b p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div ref={sourceRef} className="relative">
              <label className="mb-1 block text-sm font-medium">
                Phiếu xuất dùng nội bộ
              </label>
              <button
                type="button"
                disabled={isEditing}
                onClick={() => setSourceOpen((open) => !open)}
                className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm disabled:bg-gray-50">
                <span className={sourceCode ? "text-gray-900" : "text-gray-400"}>
                  {sourceCode || "Chọn phiếu xuất"}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {sourceOpen && !isEditing && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-white shadow-lg">
                  <div className="border-b p-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        autoFocus
                        value={sourceSearch}
                        onChange={(event) => setSourceSearch(event.target.value)}
                        placeholder="Tìm mã phiếu..."
                        className="w-full rounded border py-2 pl-8 pr-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {availableSources.map((source: any) => (
                      <button
                        key={source.id}
                        onClick={() => selectSource(source)}
                        className="w-full border-b px-3 py-2 text-left text-sm hover:bg-gray-50">
                        <div className="font-medium">
                          <CodeLink
                            entity="internal-use"
                            code={source.code}
                            sameTab
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          {source.branchName} · {source.purpose?.name || "Không có mục đích"}
                        </div>
                      </button>
                    ))}
                    {availableSources.length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Không tìm thấy phiếu phù hợp
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Chi nhánh</label>
              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {sourceBranchName ||
                  branches?.find((branch: any) => branch.id === selectedBranch?.id)?.name ||
                  "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoadingReturnable && !isEditing ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Đang tải sản phẩm còn có thể trả...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Chưa có dòng sản phẩm để trả.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Sản phẩm</th>
                    <th className="px-3 py-2 text-right">Đã xuất</th>
                    <th className="px-3 py-2 text-right">Còn được trả</th>
                    <th className="px-3 py-2 text-center">Loại tồn gốc</th>
                    <th className="px-3 py-2 text-right">SL trả</th>
                    <th className="px-3 py-2 text-left">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, index) => (
                    <tr key={row.internalUseDetailId}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.productName}</div>
                        <div className="text-xs text-gray-500">{row.productCode}</div>
                      </td>
                      <td className="px-3 py-2 text-right">{row.issuedQuantity}</td>
                      <td className="px-3 py-2 text-right">{row.remainingQuantity}</td>
                      <td className="px-3 py-2 text-center text-xs">
                        {row.conditionType === "damaged"
                          ? "Bục rách"
                          : row.conditionType === "near_expiry"
                            ? `Cận date${
                                row.soldExpiryDate
                                  ? ` (${formatMonthYear(row.soldExpiryDate)})`
                                  : ""
                              }`
                            : "Bình thường"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={row.remainingQuantity}
                          value={row.requestQuantity || ""}
                          onChange={(event) =>
                            updateRow(index, {
                              requestQuantity: Number(event.target.value),
                            })
                          }
                          className="w-24 rounded border px-2 py-1 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.note}
                          onChange={(event) =>
                            updateRow(index, { note: event.target.value })
                          }
                          className="w-full min-w-40 rounded border px-2 py-1"
                          placeholder="Ghi chú"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">Ghi chú phiếu</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 p-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
            Đóng
          </button>
          <button
            disabled={busy}
            onClick={() => submit(true)}
            className="rounded-lg border border-orange-400 px-4 py-2 text-sm text-orange-700 disabled:opacity-50">
            Lưu phiếu tạm
          </button>
          <button
            disabled={busy}
            onClick={() => submit(false)}
            className="rounded-lg bg-brand px-4 py-2 text-sm text-white disabled:opacity-50">
            {busy ? "Đang lưu..." : "Gửi yêu cầu trả"}
          </button>
        </div>
      </div>
    </div>
  );
}
