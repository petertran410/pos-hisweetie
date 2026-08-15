"use client";

import { useMemo, useRef, useState } from "react";
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
import {
  factoryProductsApi,
  FactoryProductImportPreview,
  FactoryProductImportResult,
} from "@/lib/api/factory-products";
import { API_URL, getAuthHeaders } from "@/lib/config/api";

interface FactoryProductImportModalProps {
  onClose: () => void;
}

const ACCEPTED = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const ACTION_LABEL: Record<string, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  error: "Lỗi",
};

/**
 * Import file Excel liên kết sản phẩm ↔ nhà máy theo 2 bước:
 * 1. Kiểm tra: gửi file lên `/import/preview`, backend chỉ đọc và đối chiếu DB.
 * 2. Ghi: gửi lại chính file đó lên `/import`. Backend từ chối toàn bộ nếu còn
 *    dòng lỗi nên không thể ghi nửa vời.
 */
export function FactoryProductImportModal({
  onClose,
}: FactoryProductImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<FactoryProductImportPreview | null>(
    null
  );
  const [result, setResult] = useState<FactoryProductImportResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const previewMutation = useMutation({
    mutationFn: (selected: File) => factoryProductsApi.importPreview(selected),
    onSuccess: (data) => setPreview(data),
    onError: (error: Error) =>
      toast.error(error.message || "Không đọc được file"),
  });

  const commitMutation = useMutation({
    mutationFn: (selected: File) => factoryProductsApi.importCommit(selected),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["factory-products"] });
      queryClient.invalidateQueries({ queryKey: ["factories"] });
      toast.success(
        `Đã import: ${data.created} tạo mới, ${data.updated} cập nhật`
      );
    },
    onError: (error: Error) => toast.error(error.message || "Import thất bại"),
  });

  const errorRows = useMemo(
    () => preview?.rows.filter((row) => row.errors.length) ?? [],
    [preview]
  );

  const handleSelect = (selected?: File | null) => {
    if (!selected) return;
    if (
      !ACCEPTED.includes(selected.type) &&
      !selected.name.toLowerCase().endsWith(".xlsx")
    ) {
      toast.error("Chỉ hỗ trợ file .xlsx");
      return;
    }
    setFile(selected);
    setPreview(null);
    setResult(null);
    previewMutation.mutate(selected);
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const headers = getAuthHeaders();
      delete headers["Content-Type"];
      const res = await fetch(
        `${API_URL}${factoryProductsApi.importTemplateUrl}`,
        { headers }
      );
      if (!res.ok) throw new Error("Không tải được file mẫu");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mau-lien-ket-san-pham-nha-may.xlsx";
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

  const canCommit =
    !!file && !!preview && preview.invalid === 0 && preview.valid > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
      onMouseDown={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl h-[92dvh] sm:h-auto sm:max-h-[85vh] sm:m-4 flex flex-col overflow-hidden shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}>
        <div className="border-b px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Import liên kết sản phẩm - nhà máy
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Đối chiếu bằng mã sản phẩm và mã nhà máy
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!result && (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  File cần có cột <b>Mã sản phẩm</b> và <b>Mã nhà máy</b>. Dòng
                  đã tồn tại sẽ được cập nhật.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloading}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50">
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  File mẫu
                </button>
              </div>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-brand hover:bg-brand-soft/20 transition-colors">
                {file ? (
                  <>
                    <FileSpreadsheet className="w-8 h-8 text-brand" />
                    <span className="text-sm font-medium text-gray-800">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      Bấm để chọn file khác
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Bấm để chọn file Excel (.xlsx)
                    </span>
                  </>
                )}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => handleSelect(event.target.files?.[0])}
              />

              {previewMutation.isPending && (
                <div className="py-8 text-center text-sm text-gray-500">
                  <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
                  Đang kiểm tra file...
                </div>
              )}

              {preview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Tổng dòng", value: preview.total, tone: "text-gray-900" },
                      { label: "Tạo mới", value: preview.create, tone: "text-emerald-600" },
                      { label: "Cập nhật", value: preview.update, tone: "text-blue-600" },
                      { label: "Lỗi", value: preview.invalid, tone: "text-red-600" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="border border-gray-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className={`text-lg font-semibold ${item.tone}`}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {preview.invalid > 0 && (
                    <div className="border border-red-200 bg-red-50 rounded-lg px-3 py-2 flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">
                        Còn {preview.invalid} dòng lỗi. Hãy sửa file rồi tải lại
                        — hệ thống không ghi khi vẫn còn lỗi.
                      </p>
                    </div>
                  )}

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Dòng
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Sản phẩm
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Nhà máy
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Kết quả
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(errorRows.length ? errorRows : preview.rows)
                          .slice(0, 100)
                          .map((row) => (
                            <tr key={row.row}>
                              <td className="px-3 py-2 text-gray-500">
                                {row.row}
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-mono text-xs">
                                  {row.productCode || "—"}
                                </span>
                                {row.product && (
                                  <span className="block text-xs text-gray-500 truncate max-w-[180px]">
                                    {row.product.name}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-mono text-xs">
                                  {row.factoryCode || "—"}
                                </span>
                                {row.factory && (
                                  <span className="block text-xs text-gray-500 truncate max-w-[180px]">
                                    {row.factory.name}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {row.errors.length ? (
                                  <span className="text-xs text-red-600">
                                    {row.errors.join("; ")}
                                  </span>
                                ) : (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      row.action === "create"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-blue-50 text-blue-700"
                                    }`}>
                                    {ACTION_LABEL[row.action]}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {(errorRows.length ? errorRows : preview.rows).length >
                    100 && (
                    <p className="text-xs text-gray-500">
                      Chỉ hiển thị 100 dòng đầu.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {result && (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-base font-semibold text-gray-900">
                Import thành công
              </p>
              <p className="text-sm text-gray-600">
                {result.created} dòng tạo mới, {result.updated} dòng cập nhật
                trên tổng {result.total} dòng.
              </p>
            </div>
          )}
        </div>

        <div className="border-t px-5 py-3 flex items-center justify-end gap-2 flex-shrink-0">
          {result ? (
            <>
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Import file khác
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark">
                Đóng
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => file && commitMutation.mutate(file)}
                disabled={!canCommit || commitMutation.isPending}
                className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                {commitMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {commitMutation.isPending
                  ? "Đang import..."
                  : preview
                    ? `Import ${preview.valid} dòng`
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
