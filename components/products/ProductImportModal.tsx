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

interface ProductImportModalProps {
  onClose: () => void;
}

interface PreviewRow {
  typeText: string;
  categoryText: string;
  code: string;
  name: string;
  tradeMarkName: string;
  basePrice: number;
  cost: number;
  onHand: number;
  minQuality: number;
  maxQuality: number;
  unit: string;
  attributesText: string;
  relatedCode: string;
  imageUrls: string;
  weight: number;
  isDirectSale: string;
  description: string;
  componentsText: string;
}

interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  failed: number;
  errors: { row?: number; code?: string; error: string }[];
}

const PREVIEW_COLUMNS = [
  { key: "typeText", label: "Loại hàng", width: "100px" },
  { key: "categoryText", label: "Nhóm hàng", width: "160px" },
  { key: "code", label: "Mã hàng", width: "110px" },
  { key: "name", label: "Tên hàng", width: "200px" },
  { key: "tradeMarkName", label: "Thương hiệu", width: "120px" },
  { key: "basePrice", label: "Giá bán", width: "100px" },
  { key: "cost", label: "Giá vốn", width: "100px" },
  { key: "onHand", label: "Tồn kho", width: "80px" },
  { key: "unit", label: "ĐVT", width: "70px" },
  { key: "isDirectSale", label: "Bán TT", width: "60px" },
  { key: "componentsText", label: "Thành phần", width: "150px" },
] as const;

// Map header tiếng Việt → field key (hỗ trợ cả có dấu và không dấu)
const HEADER_MAP: Record<string, keyof PreviewRow> = {
  "loại hàng": "typeText",
  "loai hang": "typeText",
  "nhóm hàng": "categoryText",
  "nhom hang": "categoryText",
  "nhóm hàng(3 cấp)": "categoryText",
  "nhom hang(3 cap)": "categoryText",
  "nhóm hàng (cha >> giữa >> con)": "categoryText",
  "mã hàng": "code",
  "ma hang": "code",
  "tên hàng": "name",
  "ten hang": "name",
  "thương hiệu": "tradeMarkName",
  "thuong hieu": "tradeMarkName",
  "giá bán": "basePrice",
  "gia ban": "basePrice",
  "giá vốn": "cost",
  "gia von": "cost",
  "tồn kho": "onHand",
  "ton kho": "onHand",
  "tồn nhỏ nhất": "minQuality",
  "ton nho nhat": "minQuality",
  "tồn ít nhất": "minQuality",
  "ton it nhat": "minQuality",
  "tồn lớn nhất": "maxQuality",
  "ton lon nhat": "maxQuality",
  "tồn nhiều nhất": "maxQuality",
  "ton nhieu nhat": "maxQuality",
  "đơn vị tính": "unit",
  "don vi tinh": "unit",
  đvt: "unit",
  dvt: "unit",
  "thuộc tính": "attributesText",
  "thuoc tinh": "attributesText",
  "mã hh liên quan": "relatedCode",
  "ma hh lien quan": "relatedCode",
  "mã hàng cha (đơn vị)": "relatedCode",
  "ma hang cha (don vi)": "relatedCode",
  "hình ảnh (url1,url2...)": "imageUrls",
  "hinh anh": "imageUrls",
  "ảnh (url1,url2,...)": "imageUrls",
  "trọng lượng": "weight",
  "trong luong": "weight",
  "được bán trực tiếp": "isDirectSale",
  "duoc ban truc tiep": "isDirectSale",
  "bán trực tiếp (0/1)": "isDirectSale",
  "ban truc tiep (0/1)": "isDirectSale",
  "mô tả": "description",
  "mo ta": "description",
  "hàng thành phần": "componentsText",
  "hang thanh phan": "componentsText",
  "thành phần (mã:sl:mode,...)": "componentsText",
  "thanh phan (ma:sl:mode,...)": "componentsText",
};

function normalizeHeader(raw: string): keyof PreviewRow | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");

  // Exact match từ HEADER_MAP
  const exact = HEADER_MAP[key];
  if (exact) return exact;

  // Dynamic branch columns: "tồn kho - {branchName}" → onHand
  if (key.startsWith("tồn kho -") || key.startsWith("ton kho -"))
    return "onHand";
  // Dynamic branch columns: "giá vốn - {branchName}" → cost
  if (key.startsWith("giá vốn -") || key.startsWith("gia von -")) return "cost";

  return null;
}

function parseExcelPreview(file: File): Promise<PreviewRow[]> {
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
        const fieldMap: Record<string, keyof PreviewRow> = {};
        for (const h of rawHeaders) {
          const mapped = normalizeHeader(h);
          if (mapped) fieldMap[h] = mapped;
        }

        const rows: PreviewRow[] = jsonRows.map((raw) => {
          const row: any = {
            typeText: "",
            categoryText: "",
            code: "",
            name: "",
            tradeMarkName: "",
            basePrice: 0,
            cost: 0,
            onHand: 0,
            minQuality: 0,
            maxQuality: 0,
            unit: "",
            attributesText: "",
            relatedCode: "",
            imageUrls: "",
            weight: 0,
            isDirectSale: "",
            description: "",
            componentsText: "",
          };
          for (const [rawKey, field] of Object.entries(fieldMap)) {
            let val = raw[rawKey];
            if (val === undefined || val === null || val === "") continue;
            if (
              [
                "basePrice",
                "cost",
                "onHand",
                "minQuality",
                "maxQuality",
                "weight",
              ].includes(field)
            ) {
              const num = Number(String(val).replace(/,/g, ""));
              row[field] = isNaN(num) ? 0 : num;
            } else {
              row[field] = String(val).trim();
            }
          }
          return row;
        });

        // BE đã xử lý: nếu `code` trống → tự sinh mã mới; nếu `code` có giá trị
        // mà không tồn tại trong DB → BE throw BadRequestException (toast lỗi).
        // Ở FE chỉ cần đảm bảo `name` không trống.
        const filtered = rows.filter((r) => r.name?.trim());
        resolve(filtered);
      } catch (err: any) {
        reject(new Error(err.message || "Không thể đọc file Excel"));
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsArrayBuffer(file);
  });
}

export function ProductImportModal({ onClose }: ProductImportModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  // Options
  const [updateStock, setUpdateStock] = useState(false);
  const [updateCost, setUpdateCost] = useState(false);
  const [updateDescription, setUpdateDescription] = useState(false);

  // Validation preview
  // Bỏ check "Thiếu mã hàng" — dòng trống mã giờ được BE tự sinh mã mới.
  // Validate mã-tồn-tại (nếu user nhập mà DB không có) sẽ do BE xử lý khi import.
  const validation = useMemo(() => {
    const errors: Record<number, string> = {};
    previewRows.forEach((r, i) => {
      if (!r.name?.trim()) errors[i] = "Thiếu tên hàng";
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
      setPreviewRows(parsed);
      if (parsed.length === 0) {
        setParseError(
          "File không có dữ liệu hợp lệ (cần có cột 'Mã hàng' và 'Tên hàng')"
        );
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

  // Download template từ backend
  const downloadTemplate = async () => {
    try {
      const token = useAuthStore.getState().token;
      const branchId = useBranchStore.getState().selectedBranch?.id;

      const params = new URLSearchParams();
      if (branchId) params.set("branchId", String(branchId));
      const queryStr = params.toString();

      const res = await fetch(
        `${API_URL}/import/templates/products${queryStr ? `?${queryStr}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Mau_Import_SanPham.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Không thể tải file mẫu");
    }
  };

  // Import mutation — upload file via FormData
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file");
      const token = useAuthStore.getState().token;
      const branchId = useBranchStore.getState().selectedBranch?.id;

      const formData = new FormData();
      formData.append("file", file);

      const params = new URLSearchParams();
      if (updateStock) params.set("updateStock", "true");
      if (updateCost) params.set("updateCost", "true");
      if (updateDescription) params.set("updateDescription", "true");
      if (branchId) params.set("branchId", String(branchId));

      const queryStr = params.toString();
      const url = `${API_URL}/import/products${queryStr ? `?${queryStr}` : ""}`;

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
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (data.failed === 0) {
        toast.success(
          `Import hoàn tất: ${data.imported} tạo mới, ${data.updated} cập nhật`
        );
      } else {
        toast.warning(`Import hoàn tất với ${data.failed} lỗi`);
      }
    },
    onError: (err: Error) => {
      // BE trả message tiếng Việt, vd:
      // "Có 2 dòng có mã không tồn tại trong hệ thống (dòng 3, dòng 7). Vui lòng sửa file rồi import lại."
      // Hoặc lỗi Prisma / runtime → set.onError từ Nest sẽ trả về message rõ ràng.
      // User chỉ cần sửa file rồi import lại (yêu cầu đã chốt ở plan).
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
    setUpdateStock(false);
    setUpdateCost(false);
    setUpdateDescription(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isImporting = importMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">Import sản phẩm từ Excel</h2>
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
                className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-brand hover:bg-brand-soft transition-colors">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  Kéo thả file Excel vào đây hoặc{" "}
                  <span className="text-brand font-medium">
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
                className="flex items-center gap-2 text-sm text-brand hover:text-brand-dark font-medium">
                <Download className="w-4 h-4" />
                Tải file mẫu Import sản phẩm
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
              {/* File info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-gray-500">
                      {previewRows.length} sản phẩm
                      {Object.keys(validation).length > 0 && (
                        <span className="text-red-500 ml-2">
                          ({Object.keys(validation).length} lỗi)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700">
                  Chọn file khác
                </button>
              </div>

              {/* Options cho sản phẩm đã tồn tại */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <AlertTriangle className="w-4 h-4" />
                  Tùy chọn khi sản phẩm đã tồn tại (trùng mã hàng)
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateStock}
                      onChange={(e) => setUpdateStock(e.target.checked)}
                      className="rounded"
                    />
                    <span>Cập nhật tồn kho</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateCost}
                      onChange={(e) => setUpdateCost(e.target.checked)}
                      className="rounded"
                    />
                    <span>Cập nhật giá vốn</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateDescription}
                      onChange={(e) => setUpdateDescription(e.target.checked)}
                      className="rounded"
                    />
                    <span>Cập nhật mô tả</span>
                  </label>
                </div>
              </div>

              {/* Preview table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-auto max-h-[380px]">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium w-10">
                          #
                        </th>
                        {PREVIEW_COLUMNS.map((col) => (
                          <th
                            key={col.key}
                            className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap"
                            style={{ minWidth: col.width }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => {
                        const hasError = !!validation[i];
                        return (
                          <tr
                            key={i}
                            className={
                              hasError
                                ? "bg-red-50"
                                : i % 2 === 0
                                  ? "bg-white"
                                  : "bg-gray-50/50"
                            }>
                            <td className="px-3 py-2 text-gray-400">{i + 2}</td>
                            {PREVIEW_COLUMNS.map((col) => {
                              const val = (row as any)[col.key];
                              const isErrorField =
                                hasError &&
                                ((col.key === "name" && !row.name?.trim()) ||
                                  (col.key === "code" && !row.code?.trim()));

                              return (
                                <td
                                  key={col.key}
                                  className="px-3 py-2 whitespace-nowrap">
                                  {isErrorField ? (
                                    <span className="text-red-600 italic">
                                      {val || "(trống)"}
                                    </span>
                                  ) : (col.key === "basePrice" ||
                                      col.key === "cost") &&
                                    val != null ? (
                                    Number(val).toLocaleString("vi-VN")
                                  ) : (
                                    (val ?? "")
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">
                    {result.imported}
                  </p>
                  <p className="text-xs text-gray-500">Tạo mới</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-6 h-6 text-brand mx-auto mb-1" />
                  <p className="text-2xl font-bold text-brand-dark">
                    {result.updated}
                  </p>
                  <p className="text-xs text-gray-500">Cập nhật</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  {result.failed > 0 ? (
                    <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                  )}
                  <p
                    className={`text-2xl font-bold ${result.failed > 0 ? "text-red-700" : "text-gray-400"}`}>
                    {result.failed}
                  </p>
                  <p className="text-xs text-gray-500">Lỗi</p>
                </div>
              </div>

              {/* Error details */}
              {result.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">
                      Chi tiết lỗi ({result.errors.length})
                    </span>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left w-16">Dòng</th>
                          <th className="px-4 py-2 text-left w-24">Mã hàng</th>
                          <th className="px-4 py-2 text-left">Lỗi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((err, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-4 py-2 text-gray-500">
                              {err.row ?? "-"}
                            </td>
                            <td className="px-4 py-2 font-medium">
                              {err.code ?? "-"}
                            </td>
                            <td className="px-4 py-2 text-red-600">
                              {err.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium">
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
                  className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50 flex items-center gap-2">
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
