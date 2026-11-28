"use client";

import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Tags, X, XCircle } from "lucide-react";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { usePcActions, usePcApplyPreview } from "@/lib/hooks/usePriceChange";
import { fmtMoney } from "@/lib/price-change/constants";
import type { PcTicketDetail } from "@/lib/types/price-change";
import { DiffChip } from "./PriceChangeItemsTable";

const TH =
  "px-3 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide";

/** Xem trước + áp dụng giá mới lên POS (bước Phòng Dữ Liệu); còn lỗi thì chặn. */
export function PriceChangeApplyModal({
  ticket,
  onClose,
}: {
  ticket: PcTicketDetail;
  onClose: () => void;
}) {
  const { data: preview, isLoading } = usePcApplyPreview(ticket.id, true);
  const { apply } = usePcActions(ticket.id);
  const errors = preview?.issues.filter((i) => i.severity === "error") ?? [];
  const warnings =
    preview?.issues.filter((i) => i.severity === "warning") ?? [];
  const close = () => {
    if (!apply.isPending) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={close}>
      <div
        className="bg-white rounded-lg w-full max-w-4xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Tags className="w-5 h-5 text-brand" />
              Áp dụng thay đổi giá
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {ticket.code}
              {preview &&
                ` · ${preview.counts.products} sản phẩm · ${preview.counts.costCells} ô giá vốn · ${preview.counts.priceCells} ô giá bán`}
            </p>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4 text-sm">
          {isLoading || !preview ? (
            <p className="text-gray-500">
              <Loader2 className="inline h-4 w-4 animate-spin" /> Đang kiểm tra…
            </p>
          ) : (
            <>
              {errors.length > 0 && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-red-700 space-y-0.5">
                  {errors.map((e, i) => (
                    <p key={i} className="flex items-start gap-1.5">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {e.message}
                    </p>
                  ))}
                </div>
              )}
              {warnings.length > 0 && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800 space-y-0.5">
                  {warnings.map((w, i) => (
                    <p key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {w.message}
                    </p>
                  ))}
                </div>
              )}
              <div className="overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "Sản phẩm",
                        "Ghi vào",
                        "Giá hiện tại",
                        "Giá lúc đề xuất",
                        "Giá mới",
                      ].map((h) => (
                        <th key={h} className={TH}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.flatMap((row) =>
                      row.cells.map((c, i) => (
                        <tr
                          key={`${row.itemId}-${c.kind}-${c.targetId}`}
                          className={`align-top ${i === 0 ? "border-t" : ""}`}>
                          <td className="px-3 py-2 text-gray-800">
                            {i === 0 && (
                              <>
                                <span className="font-medium text-brand">
                                  {row.productCode}
                                </span>{" "}
                                {row.productName}
                              </>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {c.kind === "COST" ? "Giá vốn · " : ""}
                            {c.targetName}
                            {c.createsRow && (
                              <span className="ml-1 text-xs text-amber-700">
                                (tạo mới)
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-3 py-2 whitespace-nowrap ${c.changedSinceProposal ? "text-amber-700 font-medium" : "text-gray-700"}`}>
                            {fmtMoney(c.currentValue)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                            {fmtMoney(c.oldValue)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-gray-900 whitespace-nowrap">
                              {fmtMoney(c.newValue)}
                            </div>
                            <DiffChip
                              oldValue={c.currentValue}
                              newValue={c.newValue}
                            />
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">
                Áp dụng ghi giá vốn theo chi nhánh, giá bán chung và giá trong
                bảng giá; mỗi sản phẩm được ghi lịch sử (giá trước / sau) và
                đồng bộ lên Lark.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={close}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
            Đóng
          </button>
          <LoadingButton
            loading={apply.isPending}
            disabled={!preview?.ok}
            onClick={() => apply.mutate(undefined, { onSuccess: onClose })}
            className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50">
            Áp dụng giá mới
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
