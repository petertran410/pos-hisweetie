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
import { useBranchStore } from "@/lib/store/branch";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface InvoiceImportModalProps {
  onClose: () => void;
}

interface PreviewRow {
  invoiceCode: string;
  purchaseDate: string;
  sellerName: string;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  priceBookName: string;
  productCode: string;
  quantity: number;
  price: number;
  discountRatio: number;
  discount: number;
  invoiceDiscount: number;
  cashAmount: number;
  transferAmount: number;
  description: string;
}

interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  failed: number;
  errors: { row?: number; invoiceCode?: string; error: string }[];
}

const PREVIEW_COLUMNS = [
  { key: "invoiceCode", label: "Mã HĐ", width: "120px" },
  { key: "purchaseDate", label: "Thời gian", width: "110px" },
  { key: "sellerName", label: "Người bán", width: "100px" },
  { key: "customerCode", label: "Mã KH", width: "110px" },
  { key: "customerName", label: "Tên KH", width: "130px" },
  { key: "productCode", label: "Mã hàng", width: "110px" },
  { key: "quantity", label: "SL", width: "60px" },
  { key: "price", label: "Đơn giá", width: "100px" },
  { key: "cashAmount", label: "Tiền mặt", width: "100px" },
  { key: "transferAmount", label: "CK", width: "100px" },
] as const;

const HEADER_MAP: Record<string, keyof PreviewRow> = {
  "mã hóa đơn": "invoiceCode",
  "ma hoa don": "invoiceCode",
  "thời gian": "purchaseDate",
  "thoi gian": "purchaseDate",
  "người bán": "sellerName",
  "nguoi ban": "sellerName",
  "mã khách hàng": "customerCode",
  "ma khach hang": "customerCode",
  "tên khách hàng": "customerName",
  "ten khach hang": "customerName",
  "điện thoại": "customerPhone",
  "dien thoai": "customerPhone",
  "bảng giá": "priceBookName",
  "bang gia": "priceBookName",
  "mã hàng": "productCode",
  "ma hang": "productCode",
  "số lượng": "quantity",
  "so luong": "quantity",
  "đơn giá": "price",
  "don gia": "price",
  "giảm giá %": "discountRatio",
  "giam gia %": "discountRatio",
  "giảm giá": "discount",
  "giam gia": "discount",
  "giảm giá hóa đơn": "invoiceDiscount",
  "giam gia hoa don": "invoiceDiscount",
  "tiền mặt": "cashAmount",
  "tien mat": "cashAmount",
  "chuyển khoản": "transferAmount",
  "chuyen khoan": "transferAmount",
  "ghi chú": "description",
  "ghi chu": "description",
};

function normalizeHeader(raw: string): keyof PreviewRow | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return HEADER_MAP[key] || null;
}

function parseExcelPreview(file: File): Promise<PreviewRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });

        // Ưu tiên sheet InvoiceTemplate
        const sheetName =
          wb.SheetNames.find((n) => n.toLowerCase() === "invoicetemplate") ||
          wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        if (!ws) return reject(new Error("File Excel trống"));

        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
          defval: "",
        });
        if (jsonRows.length === 0) return reject(new Error("Không có dữ liệu"));

        const rawHeaders = Object.keys(jsonRows[0]);
        const fieldMap: Record<string, keyof PreviewRow> = {};
        for (const h of rawHeaders) {
          const mapped = normalizeHeader(h);
          if (mapped) fieldMap[h] = mapped;
        }

        // Nếu không map được "productCode", có thể row 1 là merge header → thử row 2
        if (
          !Object.values(fieldMap).includes("productCode") &&
          jsonRows.length > 1
        ) {
          const secondRowHeaders = Object.values(jsonRows[0]).map(String);
          const fieldMap2: Record<string, keyof PreviewRow> = {};
          for (const h of secondRowHeaders) {
            const mapped = normalizeHeader(h);
            if (mapped) fieldMap2[h] = mapped;
          }
          if (Object.values(fieldMap2).includes("productCode")) {
            // Re-parse skipping first row
            const rows2 = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
              defval: "",
              range: 1,
            });
            const rh2 = Object.keys(rows2[0] || {});
            const fm2: Record<string, keyof PreviewRow> = {};
            for (const h of rh2) {
              const mapped = normalizeHeader(h);
              if (mapped) fm2[h] = mapped;
            }
            return resolve(buildPreviewRows(rows2, fm2));
          }
        }

        resolve(buildPreviewRows(jsonRows, fieldMap));
      } catch (err: any) {
        reject(new Error(err.message || "Không thể đọc file Excel"));
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsArrayBuffer(file);
  });
}

function buildPreviewRows(
  jsonRows: Record<string, any>[],
  fieldMap: Record<string, keyof PreviewRow>
): PreviewRow[] {
  const numericFields: (keyof PreviewRow)[] = [
    "quantity",
    "price",
    "discountRatio",
    "discount",
    "invoiceDiscount",
    "cashAmount",
    "transferAmount",
  ];

  const rows: PreviewRow[] = jsonRows.map((raw) => {
    const row: any = {
      invoiceCode: "",
      purchaseDate: "",
      sellerName: "",
      customerCode: "",
      customerName: "",
      customerPhone: "",
      priceBookName: "",
      productCode: "",
      quantity: 0,
      price: 0,
      discountRatio: 0,
      discount: 0,
      invoiceDiscount: 0,
      cashAmount: 0,
      transferAmount: 0,
      description: "",
    };
    for (const [rawKey, field] of Object.entries(fieldMap)) {
      let val = raw[rawKey];
      if (val === undefined || val === null || val === "") continue;
      if (numericFields.includes(field)) {
        const num = Number(String(val).replace(/,/g, ""));
        row[field] = isNaN(num) ? 0 : num;
      } else {
        row[field] = String(val).trim();
      }
    }
    return row;
  });

  // Filter: keep rows that have at least productCode
  return rows.filter((r) => r.productCode?.trim());
}

export function InvoiceImportModal({ onClose }: InvoiceImportModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [recalculateDebt, setRecalculateDebt] = useState(false);

  // Validation preview
  const validation = useMemo(() => {
    const errors: Record<number, string> = {};
    previewRows.forEach((r, i) => {
      if (!r.productCode?.trim()) errors[i] = "Thiếu mã hàng";
    });
    return errors;
  }, [previewRows]);

  const validCount = previewRows.length - Object.keys(validation).length;

  // Thống kê preview
  const invoiceCount = useMemo(() => {
    const codes = new Set<string>();
    let current = "";
    for (const r of previewRows) {
      if (r.invoiceCode) current = r.invoiceCode;
      if (current) codes.add(current);
    }
    return codes.size;
  }, [previewRows]);

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
      setPreviewRows(parsed);
      if (parsed.length === 0) {
        setParseError("File không có dữ liệu hợp lệ (cần có cột 'Mã hàng')");
      }
    } catch (err: any) {
      setParseError(err.message);
      setPreviewRows([]);
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
      const res = await fetch(`${API_URL}/import/templates/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Mau_Import_HoaDon.xlsx";
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
      const branchId = useBranchStore.getState().selectedBranch?.id;

      const formData = new FormData();
      formData.append("file", file);

      const params = new URLSearchParams();
      if (branchId) params.set("branchId", String(branchId));
      if (recalculateDebt) params.set("recalculateCustomerDebt", "true");
      const queryStr = params.toString();

      const url = `${API_URL}/import/invoices${queryStr ? `?${queryStr}` : ""}`;

      const res = await fetch(url, {
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
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (data.failed === 0) {
        toast.success(`Import hoàn tất: ${data.imported} hóa đơn tạo mới`);
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
          <h2 className="text-lg font-semibold">Import hóa đơn từ Excel</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Upload area */}
          {previewRows.length === 0 && !result && (
            <>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={recalculateDebt}
                  onChange={(e) => setRecalculateDebt(e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  Tính lại công nợ khách hàng sau khi import
                </span>
              </label>

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
                Tải file mẫu Import hóa đơn
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
                  <div>
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-gray-500">
                      {invoiceCount} hóa đơn · {previewRows.length} dòng sản
                      phẩm · {validCount} hợp lệ
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
                  {Object.keys(validation).length} dòng có lỗi sẽ bị bỏ qua
                </div>
              )}

              {/* Preview table */}
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left w-8">#</th>
                      {PREVIEW_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="px-2 py-2 text-left whitespace-nowrap"
                          style={{ minWidth: col.width }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => {
                      const err = validation[i];
                      return (
                        <tr
                          key={i}
                          className={
                            err ? "bg-red-50" : i % 2 ? "bg-gray-50/50" : ""
                          }>
                          <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                          {PREVIEW_COLUMNS.map((col) => (
                            <td
                              key={col.key}
                              className="px-2 py-1.5 truncate max-w-[200px]">
                              {(row as any)[col.key] ?? ""}
                            </td>
                          ))}
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
                <div className="border rounded-lg overflow-auto max-h-[300px]">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Dòng/Mã HĐ</th>
                        <th className="px-3 py-2 text-left">Lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5 text-gray-600">
                            {err.row
                              ? `Dòng ${err.row}`
                              : (err as any).invoiceCode || "-"}
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
                className="text-sm text-blue-600 hover:text-blue-700 font-medium">
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
          {previewRows.length > 0 && !result && (
            <button
              onClick={handleImport}
              disabled={isImporting || validCount === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isImporting
                ? "Đang import..."
                : `Import ${invoiceCount} hóa đơn`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
