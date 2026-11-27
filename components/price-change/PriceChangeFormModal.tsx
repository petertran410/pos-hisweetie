"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Tags, X } from "lucide-react";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { confirmAction } from "@/lib/chat/confirm";
import { useSavePriceChange } from "@/lib/hooks/usePriceChange";
import {
  PriceChangeEditor,
  draftBlockReason,
  draftBody,
  initPcDraft,
  type PcDraft,
} from "./PriceChangeEditor";

/** Tạo phiếu thay đổi giá (khuôn NewProductPriceFormModal). "Lưu & gửi" kiểm tra đủ giá mới. */
export function PriceChangeFormModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  /** Mở sẵn phiếu vừa tạo trong bảng. */
  onCreated?: (code: string) => void;
}) {
  const save = useSavePriceChange(null);
  const [draft, setDraftState] = useState<PcDraft>(() => initPcDraft(null));
  const setDraft = (fn: (d: PcDraft) => PcDraft) => setDraftState(fn);
  const block = draftBlockReason(draft);
  const dirty = draft.rows.length > 0 || draft.note.trim() !== "";

  const submit = (send: boolean) =>
    save.mutate(
      { body: draftBody(draft), submit: send },
      {
        onSuccess: (d) => {
          onClose();
          onCreated?.(d.code);
        },
      },
    );

  const close = async () => {
    if (save.isPending) return;
    if (
      dirty &&
      !(await confirmAction("Phiếu chưa lưu sẽ bị bỏ.", {
        title: "Đóng mà không lưu?",
        confirmText: "Bỏ phiếu",
        danger: true,
      }))
    )
      return;
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={close}>
      <div
        className="bg-white rounded-lg w-full max-w-5xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Tags className="w-5 h-5 text-brand" />
            Tạo phiếu thay đổi giá
          </h2>
          <button
            onClick={close}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-4 bg-gray-50">
          <PriceChangeEditor draft={draft} setDraft={setDraft} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t">
          {block && (
            <p className="mr-auto text-xs text-gray-500">
              Gửi duyệt cần: {block}
            </p>
          )}
          <button
            onClick={close}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
            Đóng
          </button>
          <LoadingButton
            loading={save.isPending && save.variables?.submit === false}
            disabled={!draft.rows.length || save.isPending}
            onClick={() => submit(false)}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600 disabled:opacity-50">
            Lưu nháp
          </LoadingButton>
          <LoadingButton
            loading={save.isPending && save.variables?.submit === true}
            disabled={!!block || save.isPending}
            onClick={() => submit(true)}
            className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50">
            Lưu & gửi Kế toán trưởng
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
