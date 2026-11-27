"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { CloudDownload, X } from "lucide-react";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useImportNppFromLark } from "@/lib/hooks/useNewProductPrice";
import { NPP_STAGE_LABEL } from "@/lib/new-product-price/constants";
import type { NppImportResult, NppStage } from "@/lib/types/new-product-price";

const UNMATCHED_LABEL: Record<string, string> = {
  category_parent: "Loại hàng",
  category_middle: "Nguồn gốc hàng",
  category_child: "Danh mục hàng",
  trademarks: "Thương hiệu",
  units: "Đơn vị tính",
  users: "Người dùng",
  priceBooks: "Bảng giá OEM",
  customers: "Khách OEM",
  stages: "Bước không nhận ra",
};

/** Nhập toàn bộ bảng "Bảng Giá Sản Phẩm Mới" từ Lark Base: xem trước rồi nhập thật. */
export function NewProductPriceImportModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const run = useImportNppFromLark();
  const [downloadMedia, setDownloadMedia] = useState(true);
  const [force, setForce] = useState(false);
  const [result, setResult] = useState<NppImportResult | null>(null);

  const go = (dryRun: boolean) =>
    run.mutate(
      { dryRun, downloadMedia, force },
      { onSuccess: (r) => setResult(r) },
    );

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CloudDownload className="w-5 h-5 text-brand" />
            Nhập từ Lark Base
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-4 text-sm">
          <p className="text-gray-600">
            Đọc toàn bộ phiếu trong bảng “Bảng Giá Sản Phẩm Mới” trên Lark.
            Phiếu đã nhập được cập nhật theo record Lark (không tạo trùng);
            không gửi tin Lark khi nhập.
          </p>
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={downloadMedia}
              onChange={(e) => setDownloadMedia(e.target.checked)}
              className="accent-brand"
            />
            Tải ảnh sản phẩm & tài liệu đính kèm về POS (chậm hơn)
          </label>
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={force}
              onChange={(e) => setForce(e.target.checked)}
              className="accent-brand"
            />
            Ghi đè cả phiếu đã sửa trên POS sau lần nhập trước
          </label>

          {result && (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="font-medium text-gray-800">
                {result.dryRun ? "Xem trước" : "Đã nhập"}: {result.totalFetched}{" "}
                bản ghi · tạo mới {result.created} · cập nhật {result.updated}
                {result.skippedEditedInPos > 0 &&
                  ` · bỏ qua ${result.skippedEditedInPos} phiếu đã sửa trên POS`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(result.byStage).map(([s, n]) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {NPP_STAGE_LABEL[s as NppStage] ?? s}: {n}
                  </span>
                ))}
              </div>
              {!result.dryRun && (
                <p className="text-xs text-gray-500">
                  Ảnh/tài liệu: tải {result.media.downloaded} · đã có{" "}
                  {result.media.skippedExisting} · lỗi {result.media.failed}
                </p>
              )}
              {Object.keys(result.unmatched).length > 0 && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <p className="mb-1 font-medium">
                    Giá trị chưa khớp dữ liệu POS (vẫn nhập, giữ nguyên chữ —
                    nên bổ sung danh mục trước khi nhập thật):
                  </p>
                  {Object.entries(result.unmatched).map(([k, list]) => (
                    <p key={k}>
                      <span className="font-medium">
                        {UNMATCHED_LABEL[k] ?? k}:
                      </span>{" "}
                      {list.join(", ")}
                    </p>
                  ))}
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {result.errors.slice(0, 10).map((e) => (
                    <p key={e.recordId}>
                      {e.recordId}: {e.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
            Đóng
          </button>
          <LoadingButton
            loading={run.isPending && run.variables?.dryRun === true}
            disabled={run.isPending}
            onClick={() => go(true)}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600 disabled:opacity-50">
            Xem trước
          </LoadingButton>
          <LoadingButton
            loading={run.isPending && run.variables?.dryRun === false}
            disabled={run.isPending || !result}
            title={!result ? "Bấm Xem trước trước khi nhập" : undefined}
            onClick={() => go(false)}
            className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50">
            Nhập dữ liệu
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
