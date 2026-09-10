"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_URL, getAuthHeaders } from "@/lib/config/api";
import { customerDemandApi } from "@/lib/api/customer-demand";
import type {
  CustomerDemandImportPreview,
  CustomerDemandImportResult,
} from "@/lib/types/customer-demand";

export function CustomerDemandImportModal({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CustomerDemandImportPreview | null>(
    null
  );
  const [result, setResult] = useState<CustomerDemandImportResult | null>(null);
  const [downloading, setDownloading] = useState(false);

  const previewMutation = useMutation({
    mutationFn: customerDemandApi.importPreview,
    onSuccess: setPreview,
    onError: (error: Error) =>
      toast.error(error.message || "Không đọc được file"),
  });
  const commitMutation = useMutation({
    mutationFn: customerDemandApi.importCommit,
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["customer-demand"] });
      queryClient.invalidateQueries({ queryKey: ["purchasing-planning"] });
      toast.success(
        `Đã import ${data.vouchers} phiếu nháp (${data.imported} dòng)`
      );
    },
    onError: (error: Error) =>
      toast.error(error.message || "Import thất bại"),
  });

  const errors = preview?.rows.filter((row) => row.errors.length) ?? [];
  const displayRows = errors.length ? errors : (preview?.rows ?? []);
  const canCommit =
    !!file && !!preview && preview.invalid === 0 && preview.valid > 0;

  const selectFile = (selected?: File | null) => {
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Chỉ hỗ trợ file .xlsx");
      return;
    }
    setFile(selected);
    setPreview(null);
    setResult(null);
    previewMutation.mutate(selected);
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const headers = getAuthHeaders();
      delete headers["Content-Type"];
      const response = await fetch(
        `${API_URL}${customerDemandApi.importTemplateUrl}`,
        { headers }
      );
      if (!response.ok) throw new Error("Không tải được file mẫu");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "mau-import-demand-khach-hang.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không tải được file mẫu"
      );
    } finally {
      setDownloading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center"
      onMouseDown={onClose}>
      <div
        className="flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:m-4 sm:h-auto sm:max-h-[90vh] sm:rounded-2xl"
        onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">
              Import Demand khách hàng
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gom theo mã khách hàng thành phiếu nháp. Cần duyệt tháng trước khi
              cộng vào dự kiến đặt hàng.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!result ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 text-sm text-gray-600">
                <p>
                  File cần cột <b>Mã khách hàng</b>, <b>Mã sản phẩm</b>,{" "}
                  <b>Tháng cần hàng</b>, <b>Số lượng</b>. Đơn vị để trống = đơn
                  vị cơ bản; chọn <b>Thùng</b> để quy đổi.
                </p>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  disabled={downloading}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5">
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  File mẫu
                </button>
              </div>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="hover:border-brand flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8">
                {file ? (
                  <>
                    <FileSpreadsheet className="text-brand h-8 w-8" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      Bấm để chọn file khác
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Bấm để chọn file Excel (.xlsx)
                    </span>
                  </>
                )}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />

              {previewMutation.isPending && (
                <p className="py-8 text-center text-sm text-gray-500">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Đang kiểm tra file...
                </p>
              )}

              {preview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                    {[
                      ["Tổng dòng", preview.total, "text-gray-900"],
                      ["Hợp lệ", preview.valid, "text-emerald-600"],
                      ["Phiếu sẽ tạo", preview.vouchers, "text-blue-600"],
                      ["Tháng", preview.months, "text-gray-900"],
                      ["Lỗi", preview.invalid, "text-red-600"],
                    ].map(([label, value, tone]) => (
                      <div key={String(label)} className="rounded-lg border px-3 py-2">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className={`text-lg font-semibold ${tone}`}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {preview.invalid > 0 && (
                    <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Còn {preview.invalid} dòng lỗi. Sửa file rồi tải lại; hệ
                      thống không ghi dữ liệu khi còn lỗi.
                    </div>
                  )}
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs">Dòng</th>
                          <th className="px-3 py-2 text-left text-xs">
                            Khách hàng
                          </th>
                          <th className="px-3 py-2 text-left text-xs">
                            Sản phẩm
                          </th>
                          <th className="px-3 py-2 text-left text-xs">Tháng</th>
                          <th className="px-3 py-2 text-right text-xs">SL</th>
                          <th className="px-3 py-2 text-left text-xs">
                            Kết quả
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {displayRows.slice(0, 100).map((row) => (
                          <tr key={row.row}>
                            <td className="px-3 py-2 text-gray-500">
                              {row.row}
                            </td>
                            <td className="px-3 py-2">
                              {row.customer?.name ||
                                row.customerName ||
                                row.customerCode ||
                                "—"}
                              <span className="block text-xs text-gray-500">
                                {row.customer?.code || row.customerCode}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {row.product?.name ||
                                row.productName ||
                                row.productCode ||
                                "—"}
                              <span className="block text-xs text-gray-500">
                                {row.product?.code || row.productCode}
                              </span>
                            </td>
                            <td className="px-3 py-2">{row.month || "—"}</td>
                            <td className="px-3 py-2 text-right">
                              {row.quantity ?? "—"}
                              <span className="block text-[10px] text-gray-500">
                                {row.unit === "CARTON" ? "thùng" : "đv"}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {row.errors.length ? (
                                <span className="text-xs text-red-600">
                                  {row.errors.join("; ")}
                                </span>
                              ) : (
                                <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                  Hợp lệ
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2 py-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="font-semibold">Import thành công</p>
              <p className="text-sm text-gray-600">
                Đã tạo {result.vouchers} phiếu nháp, {result.months} tháng,{" "}
                {result.imported} dòng trên tổng {result.total} dòng. Hãy duyệt
                từng tháng nếu muốn cộng vào dự kiến đặt hàng.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          {result ? (
            <>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border px-4 py-2 text-sm">
                Import file khác
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-brand rounded-lg px-4 py-2 text-sm text-white">
                Đóng
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border px-4 py-2 text-sm">
                Bỏ qua
              </button>
              <button
                type="button"
                disabled={!canCommit || commitMutation.isPending}
                onClick={() => file && commitMutation.mutate(file)}
                className="bg-brand rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50">
                {commitMutation.isPending
                  ? "Đang import..."
                  : preview
                    ? `Import ${preview.vouchers} phiếu nháp`
                    : "Import"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
