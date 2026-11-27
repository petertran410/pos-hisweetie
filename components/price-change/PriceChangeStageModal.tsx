"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardCheck, X } from "lucide-react";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { confirmAction } from "@/lib/chat/confirm";
import { useSavePriceChange } from "@/lib/hooks/usePriceChange";
import type { PcTicketDetail } from "@/lib/types/price-change";
import {
  PriceChangeEditor,
  draftBlockReason,
  draftBody,
  initPcDraft,
  type PcDraft,
} from "./PriceChangeEditor";

const BTN =
  "px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600 disabled:opacity-50";
const BTN_PRIMARY =
  "px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Modal Xử lý bước Đề xuất (khuôn NewProductPriceStageModal): sửa giá mới / cột / ghi chú,
 * "Gửi duyệt cần" cập nhật khi nhập, Lưu / Lưu & gửi Kế toán trưởng.
 */
export function PriceChangeStageModal({
  ticket,
  onClose,
}: {
  ticket: PcTicketDetail;
  onClose: () => void;
}) {
  const save = useSavePriceChange(ticket.id);
  const initial = useMemo(() => initPcDraft(ticket), [ticket]);
  const [draft, setDraftState] = useState<PcDraft>(initial);
  const setDraft = (fn: (d: PcDraft) => PcDraft) => setDraftState(fn);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const block = draftBlockReason(draft);
  const canSubmit = ticket.access.actions.includes("SUBMIT");

  const run = async (submit: boolean) => {
    if (submit) {
      const ok = await confirmAction(
        "Lưu và gửi phiếu cho Kế toán trưởng duyệt? Giá cũ sẽ được chụp lại theo giá hiện tại trên POS.",
        { title: "Gửi duyệt", confirmText: "Gửi" },
      );
      if (!ok) return;
    }
    if (!submit && !dirty) return onClose();
    save.mutate(
      { body: dirty ? draftBody(draft) : {}, submit },
      { onSuccess: onClose },
    );
  };

  const close = async () => {
    if (save.isPending) return;
    if (
      dirty &&
      !(await confirmAction("Các thay đổi chưa lưu sẽ bị bỏ.", {
        title: "Đóng mà không lưu?",
        confirmText: "Bỏ thay đổi",
        danger: true,
      }))
    )
      return;
    onClose();
  };

  const pending = (submit: boolean) =>
    save.isPending && save.variables?.submit === submit;

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
              <ClipboardCheck className="w-5 h-5 text-brand" />
              Xử lý bước Đề xuất
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {ticket.code} · {ticket.summary.productCount} sản phẩm
            </p>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4 bg-gray-50">
          {ticket.status === "REJECTED" &&
            (ticket.kttNote || ticket.ceoNote) && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                <span className="font-medium">
                  {ticket.ceoDecision === "REJECTED"
                    ? "CEO từ chối"
                    : "Kế toán trưởng từ chối"}
                  :
                </span>{" "}
                {ticket.ceoDecision === "REJECTED"
                  ? ticket.ceoNote
                  : ticket.kttNote}
              </div>
            )}
          <PriceChangeEditor draft={draft} setDraft={setDraft} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t">
          {block && canSubmit && (
            <p className="mr-auto text-xs text-red-600">
              Gửi duyệt cần: {block}
            </p>
          )}
          <button onClick={close} className={BTN}>
            Đóng
          </button>
          <LoadingButton
            loading={pending(false)}
            disabled={save.isPending}
            onClick={() => run(false)}
            className={BTN}>
            Lưu
          </LoadingButton>
          {canSubmit && (
            <LoadingButton
              loading={pending(true)}
              disabled={save.isPending || !!block}
              onClick={() => run(true)}
              className={BTN_PRIMARY}>
              Lưu & gửi Kế toán trưởng
            </LoadingButton>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
