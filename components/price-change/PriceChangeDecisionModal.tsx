"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { usePcActions } from "@/lib/hooks/usePriceChange";
import type { PcDecision, PcTicketDetail } from "@/lib/types/price-change";
import { PriceChangeItemsTable } from "./PriceChangeItemsTable";

const INPUT =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none";

/**
 * Modal Kế toán trưởng / CEO duyệt: xem bảng thay đổi cũ → mới.
 * Từ chối bắt buộc ghi lý do; có thể kết thúc phiếu thay vì trả người đề xuất sửa.
 */
export function PriceChangeDecisionModal({
  ticket,
  kind,
  onClose,
}: {
  ticket: PcTicketDetail;
  kind: "KTT" | "CEO";
  onClose: () => void;
}) {
  const actions = usePcActions(ticket.id);
  const mutation = kind === "KTT" ? actions.kttDecision : actions.ceoDecision;
  const [note, setNote] = useState("");
  const [end, setEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = (d: PcDecision) =>
    mutation.isPending && mutation.variables?.decision === d;

  const decide = (decision: PcDecision) => {
    const text = note.trim();
    if (decision === "REJECTED" && !text) {
      setError("Vui lòng nhập lý do từ chối");
      return;
    }
    mutation.mutate(
      {
        decision,
        note: text || undefined,
        end: decision === "REJECTED" ? end : undefined,
      },
      { onSuccess: onClose },
    );
  };
  const close = () => {
    if (!mutation.isPending) onClose();
  };
  const next =
    kind === "KTT" && ticket.hasCost ? "CEO duyệt" : "Phòng Dữ Liệu áp dụng";

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={close}>
      <div
        className="bg-white rounded-lg w-full max-w-5xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand" />
              {kind === "KTT" ? "Kế toán trưởng duyệt" : "CEO duyệt"} thay đổi
              giá
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {ticket.code} · {ticket.summary.productCount} sản phẩm · duyệt
              xong chuyển {next}
            </p>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <PriceChangeItemsTable
            items={ticket.items}
            costBranches={ticket.costBranches}
            priceBooks={ticket.priceBooks}
          />
          {ticket.note && (
            <p className="text-sm text-gray-600">Ghi chú: {ticket.note}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú{" "}
              <span className="font-normal text-gray-500">
                (bắt buộc khi từ chối)
              </span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError(null);
              }}
              className={INPUT}
              placeholder="Lý do / ý kiến"
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={end}
              onChange={(e) => setEnd(e.target.checked)}
              className="accent-brand"
            />
            Khi từ chối: kết thúc phiếu (không trả người đề xuất sửa lại)
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={close}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
            Đóng
          </button>
          <LoadingButton
            loading={pending("REJECTED")}
            disabled={mutation.isPending}
            onClick={() => decide("REJECTED")}
            className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium disabled:opacity-50">
            Từ chối
          </LoadingButton>
          <LoadingButton
            loading={pending("APPROVED")}
            disabled={mutation.isPending}
            onClick={() => decide("APPROVED")}
            className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50">
            Duyệt
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
