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
import { apiClient } from "@/lib/config/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface CustomerImportModalProps {
  onClose: () => void;
}

interface ImportRow {
  code?: string;
  name?: string;
  contactNumber?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  locationName?: string;
  wardName?: string;
  organization?: string;
  taxCode?: string;
  groups?: string;
  comments?: string;
  totalDebt?: number;
  branchName?: string;
  cccd?: string;
  totalPurchased?: number;
  totalRevenue?: number;
  createdAt?: string;
}

interface ImportResult {
  message: string;
  created: number;
  updated: number;
  errors: { row: number; name: string; message: string }[];
}

// ── Mapping header tiếng Việt → field name ──
const HEADER_MAP: Record<string, keyof ImportRow> = {
  "mã khách hàng": "code",
  "ma khach hang": "code",
  "tên khách hàng": "name",
  "ten khach hang": "name",
  "điện thoại": "contactNumber",
  "dien thoai": "contactNumber",
  "điện thoại 2": "phone",
  "dien thoai 2": "phone",
  email: "email",
  "ngày sinh": "birthDate",
  "ngay sinh": "birthDate",
  "giới tính": "gender",
  "gioi tinh": "gender",
  "địa chỉ": "address",
  "dia chi": "address",
  "khu vực": "locationName",
  "khu vuc": "locationName",
  "phường/xã": "wardName",
  "phuong/xa": "wardName",
  "phường xã": "wardName",
  "công ty": "organization",
  "cong ty": "organization",
  "mã số thuế": "taxCode",
  "ma so thue": "taxCode",
  "nhóm khách hàng": "groups",
  "nhom khach hang": "groups",
  "ghi chú": "comments",
  "ghi chu": "comments",
  "dư nợ cuối": "totalDebt",
  "du no cuoi": "totalDebt",
  "chi nhánh": "branchName",
  "chi nhanh": "branchName",
  cccd: "cccd",
  "căn cước công dân": "cccd",
  "can cuoc cong dan": "cccd",
  "nợ cần thu hiện tại": "totalDebt",
  "no can thu hien tai": "totalDebt",
  "tổng bán": "totalPurchased",
  "tong ban": "totalPurchased",
  "tổng bán trừ trả hàng": "totalRevenue",
  "tong ban tru tra hang": "totalRevenue",
  "ngày tạo": "createdAt",
  "ngay tao": "createdAt",
};

const PREVIEW_COLUMNS = [
  { key: "code", label: "Mã KH", width: "100px" },
  { key: "name", label: "Tên KH", width: "180px" },
  { key: "contactNumber", label: "Điện thoại", width: "120px" },
  { key: "phone", label: "ĐT 2", width: "120px" },
  { key: "email", label: "Email", width: "160px" },
  { key: "birthDate", label: "Ngày sinh", width: "100px" },
  { key: "gender", label: "Giới tính", width: "80px" },
  { key: "address", label: "Địa chỉ", width: "200px" },
  { key: "locationName", label: "Khu vực", width: "130px" },
  { key: "wardName", label: "Phường/Xã", width: "130px" },
  { key: "organization", label: "Công ty", width: "150px" },
  { key: "taxCode", label: "MST", width: "120px" },
  { key: "groups", label: "Nhóm KH", width: "150px" },
  { key: "comments", label: "Ghi chú", width: "150px" },
  { key: "cccd", label: "CCCD", width: "130px" },
  { key: "totalDebt", label: "Nợ cần thu hiện tại", width: "150px" },
  { key: "totalPurchased", label: "Tổng bán", width: "130px" },
  { key: "totalRevenue", label: "Tổng bán trừ trả hàng", width: "180px" },
  { key: "createdAt", label: "Ngày tạo", width: "160px" },
  { key: "branchName", label: "Chi nhánh", width: "150px" },
] as const;

function normalizeHeader(raw: string): keyof ImportRow | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return HEADER_MAP[key] ?? null;
}

function parseExcelFile(file: File): Promise<ImportRow[]> {
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

        // Lấy header gốc từ row đầu tiên
        const rawHeaders = Object.keys(jsonRows[0]);
        const fieldMap: Record<string, keyof ImportRow> = {};
        for (const h of rawHeaders) {
          const mapped = normalizeHeader(h);
          if (mapped) fieldMap[h] = mapped;
        }

        const rows: ImportRow[] = jsonRows.map((raw) => {
          const row: any = {};
          for (const [rawKey, field] of Object.entries(fieldMap)) {
            let val = raw[rawKey];
            if (val === undefined || val === null || val === "") continue;

            if (
              field === "totalDebt" ||
              field === "totalPurchased" ||
              field === "totalRevenue"
            ) {
              const num = Number(String(val).replace(/[,.\s]/g, ""));
              if (!isNaN(num)) row[field] = num;
            } else if (
              (field === "birthDate" || field === "createdAt") &&
              val instanceof Date
            ) {
              const d = val as Date;
              if (field === "createdAt") {
                row[field] =
                  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}  ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
              } else {
                row[field] =
                  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
              }
            } else {
              row[field] = String(val).trim();
            }
          }
          return row;
        });

        // Lọc bỏ row trống hoàn toàn
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

function downloadTemplate() {
  const headers = [
    "Mã khách hàng",
    "Tên khách hàng",
    "Điện thoại",
    "Điện thoại 2",
    "Email",
    "Ngày sinh",
    "Giới tính",
    "Địa chỉ",
    "Khu vực",
    "Phường/Xã",
    "Công ty",
    "Mã số thuế",
    "Nhóm khách hàng",
    "Ghi chú",
    "CCCD",
    "Nợ cần thu hiện tại",
    "Tổng bán",
    "Tổng bán trừ trả hàng",
    "Ngày tạo",
    "Chi nhánh",
  ];

  const sampleData = [
    [
      "KH000001",
      "Nguyễn Văn A",
      "0901234567",
      "0909876543",
      "a@email.com",
      "15/06/1990",
      "Nam",
      "123 Nguyễn Huệ",
      "TP. Hồ Chí Minh",
      "Phường Bến Nghé",
      "Công ty ABC",
      "0312345678",
      "VIP|Đại lý",
      "Khách quen",
      "079123456789",
      500000,
      15000000,
      12000000,
      "23/04/2026  11:53:56",
      "Chi nhánh HCM",
    ],
    [
      "",
      "Trần Thị B",
      "0912345678",
      "",
      "",
      "20/03/1985",
      "Nữ",
      "456 Lê Lợi",
      "Hà Nội",
      "Phường Hoàn Kiếm",
      "",
      "",
      "VIP",
      "",
      "",
      0,
      0,
      0,
      "01/01/2025  08:00:00",
      "Chi nhánh HN",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 15) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Khách hàng");
  XLSX.writeFile(wb, "Mau_Import_KhachHang.xlsx");
}

export function CustomerImportModal({ onClose }: CustomerImportModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [updateDebt, setUpdateDebt] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // ── Validate preview ──
  const validation = useMemo(() => {
    const errors: Record<number, string> = {};
    rows.forEach((r, i) => {
      if (!r.name?.trim()) {
        errors[i] = "Thiếu tên khách hàng";
      } else if (!r.contactNumber?.trim()) {
        errors[i] = "Thiếu số điện thoại";
      }
    });
    return errors;
  }, [rows]);

  const validCount = rows.length - Object.keys(validation).length;

  // ── File handling ──
  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "xls"].includes(ext)) {
      setParseError("Chỉ hỗ trợ file .xlsx hoặc .xls");
      return;
    }

    setParseError("");
    setFileName(file.name);
    setResult(null);

    try {
      const parsed = await parseExcelFile(file);
      setRows(parsed);
      if (parsed.length === 0) {
        setParseError(
          "File không có dữ liệu hợp lệ (cần có cột 'Tên khách hàng')"
        );
      }
    } catch (err: any) {
      setParseError(err.message);
      setRows([]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Import mutation ──
  const importMutation = useMutation({
    mutationFn: (data: { rows: ImportRow[]; updateDebt: boolean }) =>
      apiClient.post<ImportResult>("/customers/import", data),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-search"] });
      if (data.errors.length === 0) {
        toast.success(data.message);
      } else {
        toast.warning(`Import hoàn tất với ${data.errors.length} lỗi`);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Import thất bại");
    },
  });

  const handleImport = () => {
    if (validCount === 0) return;

    // Chỉ gửi rows hợp lệ
    const validRows = rows.filter((_, i) => !validation[i]);
    importMutation.mutate({ rows: validRows, updateDebt });
  };

  const handleReset = () => {
    setRows([]);
    setFileName("");
    setParseError("");
    setResult(null);
    setUpdateDebt(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isImporting = importMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col m-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">Import khách hàng từ Excel</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Upload area + Template download */}
          {rows.length === 0 && !result && (
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
                Tải file mẫu Import
              </button>
            </>
          )}

          {parseError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <XCircle className="w-4 h-4 shrink-0" />
              {parseError}
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && !result && (
            <>
              {/* File info + controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-gray-500">
                      {rows.length} dòng dữ liệu — {validCount} hợp lệ
                      {Object.keys(validation).length > 0 && (
                        <span className="text-orange-600">
                          , {Object.keys(validation).length} lỗi
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

              {/* Debt checkbox */}
              <div className="border rounded-lg p-4 bg-amber-50/50 border-amber-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateDebt}
                    onChange={(e) => setUpdateDebt(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Cập nhật dữ liệu tài chính (Nợ cần thu, Tổng bán, Tổng bán
                      trừ trả hàng)
                    </span>
                    <div className="flex items-start gap-1.5 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">
                        Khi điều chỉnh công nợ khách hàng, công nợ chi tiết của
                        từng hóa đơn hoặc phiếu trả gắn với khách hàng nếu có sẽ
                        không được thay đổi theo. Xin vui lòng kiểm tra kỹ trước
                        khi thực hiện tính năng này.
                      </p>
                    </div>
                  </div>
                </label>
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
                      {rows.map((row, i) => {
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
                              const isErrorField =
                                hasError &&
                                ((col.key === "name" && !row.name?.trim()) ||
                                  (col.key === "contactNumber" &&
                                    !row.contactNumber?.trim()));

                              return (
                                <td
                                  key={col.key}
                                  className="px-3 py-2 whitespace-nowrap">
                                  {isErrorField ? (
                                    <span className="text-red-600 italic">
                                      {(row as any)[col.key] || "(trống)"}
                                    </span>
                                  ) : (col.key === "totalDebt" ||
                                      col.key === "totalPurchased" ||
                                      col.key === "totalRevenue") &&
                                    (row as any)[col.key] != null ? (
                                    Number(
                                      (row as any)[col.key]
                                    ).toLocaleString("vi-VN")
                                  ) : (
                                    (row as any)[col.key] || ""
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
                    {result.created}
                  </p>
                  <p className="text-xs text-gray-500">Tạo mới</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-700">
                    {result.updated}
                  </p>
                  <p className="text-xs text-gray-500">Cập nhật</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">
                    {result.errors.length}
                  </p>
                  <p className="text-xs text-gray-500">Lỗi</p>
                </div>
              </div>

              {/* Error details */}
              {result.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                    <p className="text-sm font-medium text-red-800">
                      Chi tiết lỗi
                    </p>
                  </div>
                  <div className="max-h-[200px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50/50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-red-700 font-medium w-16">
                            Dòng
                          </th>
                          <th className="px-4 py-2 text-left text-red-700 font-medium w-40">
                            Tên KH
                          </th>
                          <th className="px-4 py-2 text-left text-red-700 font-medium">
                            Lỗi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((err, i) => (
                          <tr key={i} className="border-t border-red-100">
                            <td className="px-4 py-2">{err.row}</td>
                            <td className="px-4 py-2">{err.name || "-"}</td>
                            <td className="px-4 py-2 text-red-600">
                              {err.message}
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

        {/* ── Footer ── */}
        <div className="border-t px-6 py-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-400">
            {rows.length > 0 && !result && (
              <>Mã KH trùng trong hệ thống sẽ được tự động cập nhật</>
            )}
          </div>
          <div className="flex items-center gap-3">
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
                {rows.length > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={isImporting || validCount === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {isImporting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isImporting
                      ? "Đang import..."
                      : `Import ${validCount} khách hàng`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
