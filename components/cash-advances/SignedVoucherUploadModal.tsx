"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { EvidenceUploadTiles } from "@/components/internal-finance/EvidenceUploadTiles";
import {
  FinanceFormActions,
  FinanceFormSheet,
} from "@/components/internal-finance/FinanceFormSheet";
import type { CashAdvanceAttachment } from "@/lib/api/cash-advances";
import { uploadCashAdvanceFiles } from "@/lib/cash-advances/upload";

/** Upload ảnh / PDF phiếu in đã ký để phiếu chuyển sang Hoàn thành. */
export function SignedVoucherUploadModal({
  title,
  pending,
  onClose,
  onSubmit,
}: {
  title: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (files: CashAdvanceAttachment[]) => void;
}) {
  const [files, setFiles] = useState<CashAdvanceAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    try {
      const result = await uploadCashAdvanceFiles(Array.from(list));
      setFiles((current) => [...current, ...result.files]);
      if (result.errors.length)
        toast.error(`Có ${result.errors.length} file không upload được`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!files.length) {
      toast.error("Cần chụp hoặc tải lên phiếu đã ký");
      return;
    }
    onSubmit(files);
  };

  return (
    <FinanceFormSheet
      title={title}
      subtitle="Chụp lại phiếu đã in có đủ chữ ký. Lưu xong phiếu chuyển sang Hoàn thành."
      onClose={onClose}
      onSubmit={submit}
      footer={
        <FinanceFormActions
          onCancel={onClose}
          pending={pending}
          disabled={uploading || !files.length}
          submitLabel="Lưu phiếu đã ký"
        />
      }>
      <EvidenceUploadTiles
        label="Phiếu đã ký"
        files={files}
        uploading={uploading}
        onFiles={(list) => void handleUpload(list)}
        onRemove={(file) =>
          setFiles((current) =>
            current.filter((item) => item.fileUrl !== file.fileUrl),
          )
        }
      />
    </FinanceFormSheet>
  );
}
