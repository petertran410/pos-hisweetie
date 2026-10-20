"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { MobilePrintPreviewModal } from "@/components/pos/MobilePrintPreviewModal";
import { printTemplatesApi } from "@/lib/api/print-templates";
import { buildPrintDocumentHtml } from "@/lib/utils/print";

export type VoucherTemplate = "cash_advance" | "cash_advance_refund";

/** In phiếu theo mẫu mặc định, khổ giấy lấy theo mẫu (mặc định A5 ngang). */
async function printVoucher(templateFor: VoucherTemplate, id: number) {
  const templates: Array<{
    id: number;
    isDefault?: boolean;
    paperSize?: string | null;
    orientation?: string | null;
  }> = await printTemplatesApi.getAll({ templateFor, isActive: true });
  if (!templates?.length)
    throw new Error(
      templateFor === "cash_advance"
        ? "Chưa có mẫu in phiếu tạm ứng"
        : "Chưa có mẫu in phiếu hoàn ứng",
    );
  const template = templates.find((item) => item.isDefault) || templates[0];
  const preview = await printTemplatesApi.renderPreview(template.id, id);
  if (!preview?.content) throw new Error("Không render được nội dung in");

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Không tạo được iframe in");
  }
  const pageSize = `${template.paperSize || "A5"} ${
    template.orientation || "landscape"
  }`;
  doc.open();
  doc.write(buildPrintDocumentHtml(preview.content, pageSize));
  doc.close();
  await new Promise<void>((resolve) => {
    const cleanup = () =>
      setTimeout(() => iframe.parentNode?.removeChild(iframe), 100);
    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (win) {
        win.focus();
        win.print();
      }
      cleanup();
      resolve();
    };
  });
}

/**
 * In phiếu tạm ứng / hoàn ứng giống trang Bán hàng: máy tính mở hộp thoại in
 * ngay, điện thoại hiện bản xem trước để bấm "In phiếu".
 */
export function useVoucherPrint() {
  const [mobile, setMobile] = useState<{
    templateFor: VoucherTemplate;
    id: number;
  } | null>(null);

  const print = useCallback(
    async (templateFor: VoucherTemplate, id: number) => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setMobile({ templateFor, id });
        return;
      }
      try {
        await printVoucher(templateFor, id);
      } catch (error) {
        // Lỗi in không làm hỏng thao tác tạo phiếu đã thành công.
        toast.error(
          error instanceof Error ? error.message : "In phiếu thất bại",
        );
      }
    },
    [],
  );

  const modal = mobile ? (
    <MobilePrintPreviewModal
      templateFor={mobile.templateFor}
      entityId={mobile.id}
      onClose={() => setMobile(null)}
    />
  ) : null;

  return { print, modal };
}
