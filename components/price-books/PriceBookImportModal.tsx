"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/auth";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PriceBookImportModalProps {
  onClose: () => void;
}

interface PreviewRow {
  code: string;
  name: string;
  prices: Record<string, number>; // key = tên bảng giá, value = giá
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  priceBookColumns: string[];
  errors: { row?: number; code?: string; error: string }[];
}

const FIXED_HEADERS = ["mã hàng", "ma hang", "tên hàng", "ten hang"];

function parseExcelPreview(
  file: File
): Promise<{ rows: PreviewRow[]; priceBookNames: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) return reject(new Error("File Excel trống"));

        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
          defval: "",
        });
        if (jsonRows.length === 0) return reject(new Error("Không có dữ liệu"));

        const rawHeaders = Object.keys(jsonRows[0]);

        // Tách header: cột cố định vs cột bảng giá (dynamic)
        let codeKey = "";
        let nameKey = "";
        const priceBookNames: string[] = [];

        for (const h of rawHeaders) {
          const lower = h.trim().toLowerCase();
          if (lower === "mã hàng" || lower === "ma hang") {
            codeKey = h;
          } else if (lower === "tên hàng" || lower === "ten hang") {
            nameKey = h;
          } else {
            priceBookNames.push(h.trim());
          }
        }

        if (!codeKey) {
          return reject(new Error("Không tìm thấy cột 'Mã hàng' trong file"));
        }

        const rows: PreviewRow[] = jsonRows.map((raw) => {
          const prices: Record<string, number> = {};
          for (const pbName of priceBookNames) {
            // Tìm key gốc trong rawHeaders (giữ nguyên tên)
            const rawKey =
              rawHeaders.find((h) => h.trim() === pbName) || pbName;
            const val = raw[rawKey];
            const num = Number(String(val ?? "0").replace(/,/g, ""));
            prices[pbName] = isNaN(num) ? 0 : num;
          }

          return {
            code: String(raw[codeKey] ?? "").trim(),
            name: nameKey ? String(raw[nameKey] ?? "").trim() : "",
            prices,
          };
        });

        const filtered = rows.filter((r) => r.code.trim() !== "");
        resolve({ rows: filtered, priceBookNames });
      } catch (err: any) {
        reject(new Error(err.message || "Không thể đọc file Excel"));
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsArrayBuffer(file);
  });
}

export function PriceBookImportModal({ onClose }: PriceBookImportModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [priceBookNames, setPriceBookNames] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  // Validation
  const validation = useMemo(() => {
    const errors: Record<number, string> = {};
    previewRows.forEach((r, i) => {
      if (!r.code?.trim()) errors[i] = "Thiếu mã hàng";
    });
    return errors;
  }, [previewRows]);

  const validCount = previewRows.length - Object.keys(validation).length;

  // File handling
  const handleFile = useCallback(async (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "xls"].includes(ext)) {
      setParseError("Chỉ hỗ trợ file .xlsx hoặc .xls");
      return;
    }

    setParseError("");
    setFileName(f.name);
    setFile(f);
    setResult(null);

    try {
      const parsed = await parseExcelPreview(f);
      setPreviewRows(parsed.rows);
      setPriceBookNames(parsed.priceBookNames);
      if (parsed.rows.length === 0) {
        setParseError("File không có dữ liệu hợp lệ (cần có cột 'Mã hàng')");
      }
    } catch (err: any) {
      setParseError(err.message);
      setPreviewRows([]);
      setPriceBookNames([]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  // Download template
  const downloadTemplate = async () => {
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${API_URL}/import/templates/price-books`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Mau_Import_BangGia.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Không thể tải file mẫu");
    }
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file");
      const token = useAuthStore.getState().token;

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/import/price-books`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `Import thất bại (${res.status})`);
      }
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["products-with-prices"] });
      queryClient.invalidateQueries({ queryKey: ["price-books"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (data.failed === 0) {
        toast.success(
          `Import hoàn tất: ${data.created} tạo mới, ${data.updated} cập nhật`
        );
      } else {
        toast.warning(`Import hoàn tất với ${data.failed} lỗi`);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Import thất bại");
    },
  });

  const handleImport = () => {
    if (!file || validCount === 0) return;
    importMutation.mutate();
  };

  const handleReset = () => {
    setFile(null);
    setPreviewRows([]);
    setPriceBookNames([]);
    setFileName("");
    setParseError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isImporting = importMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">Import bảng giá từ Excel</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Upload area */}
          {previewRows.length === 0 && !result && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  Kéo thả file Excel vào đây hoặc{" "}
                  <span className="text-blue-600 font-medium">
                    nhấn để chọn file
                  </span>
                </p>
                <p className="text-xs text-gray-400">Hỗ trợ .xlsx, .xls</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Download className="w-4 h-4" />
                Tải file mẫu Import bảng giá
              </button>
            </>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <XCircle className="w-4 h-4 shrink-0" />
              {parseError}
            </div>
          )}

          {/* Preview */}
          {previewRows.length > 0 && !result && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-gray-500">
                    {previewRows.length} dòng
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-red-600">
                  Chọn file khác
                </button>
              </div>

              {/* Detected price books */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <span className="font-medium">
                  Bảng giá phát hiện ({priceBookNames.length}):
                </span>{" "}
                {priceBookNames.join(", ")}
              </div>

              {Object.keys(validation).length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {Object.keys(validation).length} dòng có lỗi sẽ bị bỏ qua
                </div>
              )}

              {/* Preview table */}
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
                        #
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700 whitespace-nowrap min-w-[120px]">
                        Mã hàng
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700 whitespace-nowrap min-w-[200px]">
                        Tên hàng
                      </th>
                      {priceBookNames.map((name) => (
                        <th
                          key={name}
                          className="px-4 py-2 text-right font-medium text-gray-700 whitespace-nowrap min-w-[130px]">
                          {name}
                        </th>
                      ))}
                      <th className="px-4 py-2 text-left font-medium text-gray-700 w-[100px]">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => {
                      const err = validation[i];
                      return (
                        <tr
                          key={i}
                          className={
                            err ? "bg-red-50" : i % 2 ? "bg-gray-50" : ""
                          }>
                          <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                          <td className="px-4 py-2">{row.code}</td>
                          <td className="px-4 py-2">{row.name}</td>
                          {priceBookNames.map((name) => (
                            <td key={name} className="px-4 py-2 text-right">
                              {(row.prices[name] ?? 0).toLocaleString()}
                            </td>
                          ))}
                          <td className="px-4 py-2">
                            {err ? (
                              <span className="text-red-600 text-xs">
                                {err}
                              </span>
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg border ${
                  result.failed === 0
                    ? "bg-green-50 border-green-200"
                    : "bg-yellow-50 border-yellow-200"
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.failed === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                  <span className="font-medium">Kết quả Import</span>
                </div>
                <div className="text-sm space-y-1">
                  <p>Tổng số dòng: {result.total}</p>
                  <p>Tạo mới: {result.created}</p>
                  <p>Cập nhật: {result.updated}</p>
                  {result.failed > 0 && (
                    <p className="text-red-600">Lỗi: {result.failed}</p>
                  )}
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="border rounded-lg overflow-auto max-h-[300px]">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Dòng</th>
                        <th className="px-4 py-2 text-left">Mã hàng</th>
                        <th className="px-4 py-2 text-left">Lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-4 py-2">{err.row ?? "-"}</td>
                          <td className="px-4 py-2">{err.code ?? "-"}</td>
                          <td className="px-4 py-2 text-red-600">
                            {err.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0">
          {result ? (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                Import thêm
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                Đóng
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                Hủy
              </button>
              {previewRows.length > 0 && (
                <button
                  onClick={handleImport}
                  disabled={isImporting || validCount === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                  {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isImporting
                    ? "Đang import..."
                    : `Import ${validCount} sản phẩm`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
