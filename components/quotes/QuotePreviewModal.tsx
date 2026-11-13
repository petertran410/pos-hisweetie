"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, FileDown, Image as ImageIcon, Link2, X } from "lucide-react";
import type { Quote, QuoteLayout } from "@/lib/types/quote";
import { QUOTE_LAYOUT_LABEL, QUOTE_TEMPLATE_LABEL } from "@/lib/types/quote";
import { copyQuoteImage, printQuote } from "@/lib/quotes/export";
import { QuotePreview } from "./QuotePreview";
import { QuotePreviewBrand, type BrandPreviewQuote } from "./QuotePreviewBrand";

type Props = {
  quote: Parameters<typeof QuotePreview>[0]["quote"] &
    BrandPreviewQuote &
    Pick<Quote, "layout"> & { id?: number };
  onClose: () => void;
};

/** Xem trước + xuất báo giá. Chỉ chép ảnh / link, không tự gửi cho khách. */
export function QuotePreviewModal({ quote, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"" | "pdf" | "image">("");
  // Đổi kiểu trình bày ngay trong xem trước (không đổi báo giá đã lưu).
  const [layout, setLayout] = useState<QuoteLayout>(quote.layout);
  const name = quote.code ? `Bao-gia-${quote.code}` : "Bao-gia";

  const run = async (kind: "pdf" | "image") => {
    if (!ref.current || busy) return;
    setBusy(kind);
    try {
      if (kind === "pdf") await printQuote(ref.current, name);
      else if ((await copyQuoteImage(ref.current, name)) === "copied") {
        toast.success("Đã chép ảnh báo giá — dán (Ctrl/Cmd+V) vào khung chat Zalo để gửi");
      } else {
        toast.info("Trình duyệt không cho chép ảnh — đã tải ảnh PNG xuống để gửi Zalo");
      }
    } catch (e) {
      toast.error(kind === "pdf" ? "Không mở được bản in" : `Không chép được ảnh: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  };

  const copyLink = async () => {
    if (!quote.id) return;
    await navigator.clipboard.writeText(`${location.origin}/khach-hang/bao-gia/${quote.id}`);
    toast.success("Đã chép link báo giá (link nội bộ — khách cần link công khai ở giai đoạn 2)");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-[920px] h-full max-h-[94vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b shrink-0">
          <h2 className="font-semibold text-base mr-auto whitespace-nowrap">
            Xem trước báo giá{quote.code ? ` ${quote.code}` : ""}
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-brand-soft text-brand">
              {QUOTE_TEMPLATE_LABEL[quote.template]}
            </span>
          </h2>
          <div className="flex rounded-lg border p-0.5 bg-gray-50" role="group" aria-label="Kiểu trình bày">
            {(Object.keys(QUOTE_LAYOUT_LABEL) as QuoteLayout[]).map((k) => (
              <button
                key={k}
                aria-pressed={layout === k}
                onClick={() => setLayout(k)}
                className={`px-2.5 py-1 text-sm rounded-md whitespace-nowrap ${
                  layout === k ? "bg-white shadow-sm font-medium text-brand" : "text-gray-600"
                }`}>
                {QUOTE_LAYOUT_LABEL[k]}
              </button>
            ))}
          </div>
          <button
            onClick={() => run("pdf")}
            disabled={!!busy}
            className="px-3 py-1.5 text-sm rounded-lg bg-brand text-white hover:bg-brand-dark flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap">
            <FileDown className="w-4 h-4" /> {busy === "pdf" ? "Đang mở…" : "Xuất PDF (A4)"}
          </button>
          <button
            onClick={() => run("image")}
            disabled={!!busy}
            className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap">
            <ImageIcon className="w-4 h-4" /> {busy === "image" ? "Đang tạo ảnh…" : "Chép ảnh"}
          </button>
          <button
            onClick={copyLink}
            disabled={!quote.id}
            title={quote.id ? "" : "Lưu báo giá trước để có link"}
            className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap">
            <Link2 className="w-4 h-4" /> Chép link
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="mx-auto w-fit shadow-md">
            {layout === "brand" ? (
              <QuotePreviewBrand ref={ref} quote={quote} />
            ) : (
              <QuotePreview ref={ref} quote={quote} />
            )}
          </div>
        </div>
        <div className="px-4 py-2 border-t text-xs text-gray-500 flex items-center gap-1.5 shrink-0">
          <Copy className="w-3.5 h-3.5" />
          Hệ thống chỉ chép ảnh / link vào clipboard — Sale tự dán và gửi cho khách trên Zalo.
        </div>
      </div>
    </div>
  );
}
