"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supplierReturnsApi } from "@/lib/api/supplier-returns";
import type { ImportResult } from "@/lib/api/supplier-returns";
import * as XLSX from "xlsx";

interface ImportItem {
  code: string;
  branchName: string;
  supplierCode: string;
  supplierName: string;
  returnedAt?: string;
  exportedByName?: string;
  createdByName?: string;
  totalReturnAmount: number;
  statusText?: string;
  note?: string;
  details: {
    productCode: string;
    productName: string;
    note?: string;
    returnPrice: number;
    quantity: number;
    totalAmount: number;
  }[];
}

interface SupplierReturnImportModalProps {
  onClose: () => void;
}

function parseExcelDate(val: any): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString();
  if (typeof val === "number") {
    const d = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  if (typeof val === "string" && val.trim()) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}

function parseExcelFile(file: File): Promise<ImportItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) return reject(new Error("File Excel trống"));

        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
          defval: "",
        });
        if (jsonRows.length === 0) return reject(new Error("Không có dữ liệu"));

        const groups = new Map<string, ImportItem>();

        for (const raw of jsonRows) {
          const code = String(raw["Mã trả hàng nhập"] ?? "").trim();
          if (!code) continue;

          if (!groups.has(code)) {
            groups.set(code, {
              code,
              branchName: String(raw["Chi nhánh"] ?? "").trim(),
              supplierCode: String(raw["Mã nhà cung cấp"] ?? "").trim(),
              supplierName: String(raw["Tên nhà cung cấp"] ?? "").trim(),
              returnedAt: parseExcelDate(raw["Thời gian"]),
              exportedByName:
                String(raw["Người trả"] ?? "").trim() || undefined,
              createdByName: String(raw["Người tạo"] ?? "").trim() || undefined,
              totalReturnAmount: Number(raw["Tổng tiền hàng trả"]) || 0,
              statusText: String(raw["Trạng thái"] ?? "").trim(),
              note: String(raw["Ghi chú"] ?? "").trim() || undefined,
              details: [],
            });
          }

          const productCode = String(raw["Mã hàng"] ?? "").trim();
          if (productCode) {
            groups.get(code)!.details.push({
              productCode,
              productName: String(raw["Tên hàng"] ?? "").trim(),
              note: String(raw["Ghi chú hàng hóa"] ?? "").trim() || undefined,
              returnPrice: Number(raw["Giá trả lại"]) || 0,
              quantity: Number(raw["Số lượng"]) || 0,
              totalAmount: Number(raw["Thành tiền"]) || 0,
            });
          }
        }

        const items = Array.from(groups.values());
        if (items.length === 0)
          return reject(new Error("Không tìm thấy dữ liệu hợp lệ"));
        resolve(items);
      } catch (err: any) {
        reject(new Error(err.message || "Không thể đọc file Excel"));
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsArrayBuffer(file);
  });
}

export function SupplierReturnImportModal({
  onClose,
}: SupplierReturnImportModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<ImportItem[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const validation = useMemo(() => {
    const errors: Record<number, string> = {};
    items.forEach((item, i) => {
      if (!item.code) errors[i] = "Thiếu mã phiếu";
      else if (!item.supplierCode && !item.supplierName)
        errors[i] = "Thiếu thông tin NCC";
      else if (!item.branchName) errors[i] = "Thiếu chi nhánh";
      else if (item.details.length === 0) errors[i] = "Không có sản phẩm";
    });
    return errors;
  }, [items]);

  const validCount = items.length - Object.keys(validation).length;

  const handleFile = useCallback(async (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "xls"].includes(ext)) {
      setParseError("Chỉ hỗ trợ file .xlsx hoặc .xls");
      return;
    }
    setParseError("");
    setFileName(f.name);
    setResult(null);
    try {
      const parsed = await parseExcelFile(f);
      setItems(parsed);
      if (parsed.length === 0) setParseError("File không có dữ liệu hợp lệ");
    } catch (err: any) {
      setParseError(err.message);
      setItems([]);
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

  const importMutation = useMutation({
    mutationFn: () => {
      const validItems = items.filter((_, i) => !validation[i]);
      return supplierReturnsApi.importFromExcel({ items: validItems });
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      if (data.failed === 0) {
        toast.success(`Import ${data.imported} phiếu thành công`);
      } else {
        toast.warning(
          `Import hoàn tất: ${data.imported} thành công, ${data.failed} lỗi`
        );
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Import thất bại");
    },
  });

  const handleReset = () => {
    setItems([]);
    setFileName("");
    setParseError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatMoney = (v: number) => new Intl.NumberFormat("vi-VN").format(v);
  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString("vi-VN") : "-";

  const isImporting = importMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">
            Import trả hàng nhập từ Excel (KiotViet)
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Upload area */}
          {items.length === 0 && !result && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-brand hover:bg-brand-soft transition-colors">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                Kéo thả file Excel KiotViet vào đây hoặc{" "}
                <span className="text-brand font-medium">
                  nhấn để chọn file
                </span>
              </p>
              <p className="text-xs text-gray-400">
                Hỗ trợ .xlsx, .xls — file xuất từ KiotViet &quot;Danh sách chi
                tiết trả hàng nhập&quot;
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <XCircle className="w-4 h-4 shrink-0" />
              {parseError}
            </div>
          )}

          {/* Preview */}
          {items.length > 0 && !result && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-gray-500">
                      {items.length} phiếu · {validCount} hợp lệ
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700">
                  Chọn file khác
                </button>
              </div>

              {Object.keys(validation).length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {Object.keys(validation).length} phiếu có lỗi sẽ bị bỏ qua
                </div>
              )}

              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left w-6">#</th>
                      <th className="px-2 py-2 text-left min-w-[110px]">
                        Mã phiếu
                      </th>
                      <th className="px-2 py-2 text-left min-w-[150px]">
                        Nhà cung cấp
                      </th>
                      <th className="px-2 py-2 text-left min-w-[100px]">
                        Chi nhánh
                      </th>
                      <th className="px-2 py-2 text-left min-w-[130px]">
                        Thời gian
                      </th>
                      <th className="px-2 py-2 text-center w-16">Số SP</th>
                      <th className="px-2 py-2 text-right min-w-[110px]">
                        Tổng tiền
                      </th>
                      <th className="px-2 py-2 text-left min-w-[90px]">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const err = validation[i];
                      return (
                        <tr
                          key={i}
                          className={
                            err ? "bg-red-50" : i % 2 ? "bg-gray-50/50" : ""
                          }>
                          <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                          <td className="px-2 py-1.5 font-medium text-brand">
                            {item.code}
                          </td>
                          <td className="px-2 py-1.5">
                            {item.supplierName || item.supplierCode}
                          </td>
                          <td className="px-2 py-1.5">{item.branchName}</td>
                          <td className="px-2 py-1.5">
                            {formatDate(item.returnedAt)}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {item.details.length}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {formatMoney(item.totalReturnAmount)}
                          </td>
                          <td className="px-2 py-1.5">
                            {err ? (
                              <span className="text-red-600">{err}</span>
                            ) : (
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs ${
                                  item.statusText === "Đã hủy"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-green-100 text-green-700"
                                }`}>
                                {item.statusText || "Đã trả hàng"}
                              </span>
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
                className={`flex items-center gap-3 p-4 rounded-lg ${
                  result.failed === 0
                    ? "bg-green-50 border border-green-200"
                    : "bg-yellow-50 border border-yellow-200"
                }`}>
                {result.failed === 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {result.failed === 0
                      ? "Import hoàn tất!"
                      : "Import hoàn tất với lỗi"}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Tổng: {result.total} · Tạo mới: {result.imported}
                    {result.updated > 0 && ` · Cập nhật: ${result.updated}`}
                    {result.failed > 0 && ` · Lỗi: ${result.failed}`}
                  </p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="border rounded-lg overflow-auto max-h-[250px]">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Mã phiếu</th>
                        <th className="px-3 py-2 text-left">Lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5 text-gray-600">
                            {err.code || "-"}
                          </td>
                          <td className="px-3 py-1.5 text-red-600">
                            {err.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={handleReset}
                className="text-sm text-brand hover:text-brand-dark font-medium">
                Import file khác
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Đóng
          </button>
          {items.length > 0 && !result && (
            <button
              onClick={() => importMutation.mutate()}
              disabled={isImporting || validCount === 0}
              className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isImporting ? "Đang import..." : `Import ${validCount} phiếu`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
