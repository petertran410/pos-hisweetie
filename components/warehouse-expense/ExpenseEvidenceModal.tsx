"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { EvidenceUploadTiles } from "@/components/internal-finance/EvidenceUploadTiles";
import {
  FinanceFormActions,
  FinanceFormSheet,
} from "@/components/internal-finance/FinanceFormSheet";
import type {
  InternalFinanceAttachment,
  InternalFinanceEntry,
} from "@/lib/api/internal-finance";
import { useReplaceWarehouseExpenseAttachments } from "@/lib/hooks/useInternalFinance";
import { uploadPackingSlipExpenseFiles } from "@/lib/hooks/usePackingSlips";
import { displayDescription } from "@/lib/internal-finance/display";

/**
 * Sửa chứng từ phiếu chi đồng bộ từ LarkBase (không có báo đơn / phiếu xe để
 * sửa ở nguồn): thêm ảnh / file, bỏ file sai rồi lưu cả danh sách.
 */
export function ExpenseEvidenceModal({
  expense,
  onClose,
}: {
  expense: InternalFinanceEntry;
  onClose: () => void;
}) {
  const replace = useReplaceWarehouseExpenseAttachments();
  const [files, setFiles] = useState<InternalFinanceAttachment[]>(() =>
    (expense.attachments || []).map((file) => ({
      fileUrl: file.fileUrl,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      kind: file.kind || "EVIDENCE",
    })),
  );
  const [uploading, setUploading] = useState(false);

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    try {
      const result = await uploadPackingSlipExpenseFiles(Array.from(list));
      setFiles((current) => [
        ...current,
        ...result.files.map((file) => ({ ...file, kind: "EVIDENCE" })),
      ]);
      if (result.errors.length)
        toast.error(`Có ${result.errors.length} file không upload được`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload chứng từ thất bại",
      );
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    replace.mutate(
      { id: expense.id, attachments: files },
      { onSuccess: onClose },
    );
  };

  return (
    <FinanceFormSheet
      title="Sửa chứng từ"
      subtitle={`${expense.code} · ${displayDescription(expense.description) || ""}`}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <FinanceFormActions
          onCancel={onClose}
          pending={replace.isPending}
          disabled={uploading}
          submitLabel="Lưu chứng từ"
          summary={`${files.length} file`}
        />
      }>
      <EvidenceUploadTiles
        label="Chứng từ (bấm × để bỏ file sai)"
        files={files}
        uploading={uploading}
        onFiles={(list) => void upload(list)}
        onRemove={(file) =>
          setFiles((current) =>
            current.filter((item) => item.fileUrl !== file.fileUrl),
          )
        }
      />
    </FinanceFormSheet>
  );
}
