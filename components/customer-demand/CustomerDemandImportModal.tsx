"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_URL, getAuthHeaders } from "@/lib/config/api";
import { customerDemandApi } from "@/lib/api/customer-demand";
import type {
  CustomerDemandImportPreview,
  CustomerDemandImportResult,
} from "@/lib/types/customer-demand";
import { DemandButton, DemandModalShell, formatDemandMonth } from "./DemandUi";

export function CustomerDemandImportModal({
  onClose,
}: {
  onClose: () => void;
}) {
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
    onError: (error: Error) => toast.error(error.message || "Import thất bại"),
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

  return (
    <DemandModalShell
      open
      onClose={onClose}
      size="import"
      closeOnOverlay
      title="Import Demand khách hàng"
      subtitle="Gom theo khách hàng thành phiếu nháp; trùng SKU cùng tháng thì tách phiếu mới. Cần duyệt tháng trước khi cộng vào dự kiến đặt hàng."
      footer={
        result ? (
          <>
            <DemandButton type="button" variant="ghost" onClick={reset}>
              Import file khác
            </DemandButton>
            <DemandButton type="button" onClick={onClose}>
              Đóng
            </DemandButton>
          </>
        ) : (
          <>
            <DemandButton type="button" variant="ghost" onClick={onClose}>
              Bỏ qua
            </DemandButton>
            <DemandButton
              type="button"
              disabled={!canCommit || commitMutation.isPending}
              icon={
                commitMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                )
              }
              onClick={() => file && commitMutation.mutate(file)}>
              {commitMutation.isPending
                ? "Đang import..."
                : preview
                  ? `Import ${preview.vouchers} phiếu nháp`
                  : "Import"}
            </DemandButton>
          </>
        )
      }>
      <div className="space-y-4 px-5 py-4">
        {!result ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="cd-subtitle max-w-3xl">
                File cần cột <b>Mã khách hàng</b>, <b>Mã sản phẩm</b>,{" "}
                <b>Tháng cần hàng</b>, <b>Số lượng</b>. Đơn vị để trống = đơn vị
                cơ bản; chọn <b>Thùng</b> để quy đổi.
              </p>
              <DemandButton
                type="button"
                variant="ghost"
                size="tiny"
                disabled={downloading}
                icon={
                  downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )
                }
                onClick={downloadTemplate}>
                File mẫu
              </DemandButton>
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                selectFile(event.dataTransfer.files?.[0]);
              }}
              className="cd-dropzone">
              {file ? (
                <>
                  <FileSpreadsheet
                    className="h-8 w-8 text-[var(--cd-cyan)]"
                    strokeWidth={1.4}
                  />
                  <span className="text-sm font-medium text-[var(--cd-text)]">
                    {file.name}
                  </span>
                  <span className="text-xs">Bấm để chọn file khác</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8" strokeWidth={1.4} />
                  <span className="text-sm">Bấm hoặc kéo thả file Excel (.xlsx)</span>
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
              <p className="py-8 text-center text-sm text-[var(--cd-muted)]">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Đang kiểm tra file...
              </p>
            )}

            {preview && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  {[
                    ["Tổng dòng", preview.total],
                    ["Hợp lệ", preview.valid],
                    ["Phiếu sẽ tạo", preview.vouchers],
                    ["Tháng", preview.months],
                    ["Lỗi", preview.invalid],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="cd-kpi">
                      <p>{label}</p>
                      <p className="cd-mono">{value}</p>
                    </div>
                  ))}
                </div>
                {preview.invalid > 0 && (
                  <div className="flex gap-2 rounded-[14px] bg-[rgba(192,57,43,0.06)] px-3 py-2 text-sm text-[#9b2c2c] shadow-[inset_0_0_0_1px_rgba(192,57,43,0.16)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                    Còn {preview.invalid} dòng lỗi. Sửa file rồi tải lại; hệ
                    thống không ghi dữ liệu khi còn lỗi.
                  </div>
                )}
                <div className="overflow-hidden rounded-[16px] shadow-[inset_0_0_0_1px_var(--cd-hairline)]">
                  <table className="cd-table w-full text-sm">
                    <thead>
                      <tr>
                        <th>Dòng</th>
                        <th>Khách hàng</th>
                        <th>Sản phẩm</th>
                        <th>Tháng</th>
                        <th className="text-right">SL</th>
                        <th>Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.slice(0, 100).map((row) => (
                        <tr key={row.row}>
                          <td className="cd-mono text-[var(--cd-muted)]">
                            {row.row}
                          </td>
                          <td>
                            {row.customer?.name ||
                              row.customerName ||
                              row.customerCode ||
                              "-"}
                            <span className="cd-subtitle block">
                              {row.customer?.code || row.customerCode}
                            </span>
                          </td>
                          <td>
                            {row.product?.name ||
                              row.productName ||
                              row.productCode ||
                              "-"}
                            <span className="cd-subtitle block">
                              {row.product?.code || row.productCode}
                            </span>
                          </td>
                          <td>
                            {row.month ? formatDemandMonth(row.month) : "-"}
                          </td>
                          <td className="cd-mono text-right">
                            {row.quantity ?? "-"}
                            <span className="cd-subtitle block">
                              {row.unit === "CARTON" ? "thùng" : "đv"}
                            </span>
                          </td>
                          <td>
                            {row.errors.length ? (
                              <span className="text-xs text-[#9b2c2c]">
                                {row.errors.join("; ")}
                              </span>
                            ) : (row.voucherIndex ?? 1) > 1 ? (
                              <span className="cd-chip cd-chip-draft">
                                Phiếu {row.voucherIndex}
                              </span>
                            ) : (
                              <span className="cd-chip cd-chip-confirmed">
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
          <div className="space-y-3 py-12 text-center">
            <div className="cd-empty-icon mx-auto">
              <CheckCircle2 className="h-7 w-7" strokeWidth={1.4} />
            </div>
            <p className="text-[16px] font-semibold tracking-tight">
              Import thành công
            </p>
            <p className="cd-subtitle mx-auto max-w-lg">
              Đã tạo {result.vouchers} phiếu nháp, {result.months} tháng,{" "}
              {result.imported} dòng trên tổng {result.total} dòng. Hãy duyệt
              từng tháng nếu muốn cộng vào dự kiến đặt hàng.
            </p>
          </div>
        )}
      </div>
    </DemandModalShell>
  );
}
