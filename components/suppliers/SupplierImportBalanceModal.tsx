"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { X, Upload, Download, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useImportSupplierBalanceAdjustments } from "@/lib/hooks/useSuppliers";
import { toast } from "sonner";

interface CBRow {
  supplierCode?: string;
  supplierName?: string;
  code?: string;
  transDate?: string;
  type?: string;
  amount?: number;
}

interface ImportResult {
  message: string;
  created: number;
  skipped: number;
  errors: { row: number; code: string; message: string }[];
}

const HEADER_MAP: Record<string, keyof CBRow> = {
  "mã nhà cung cấp": "supplierCode",
  "ma nha cung cap": "supplierCode",
  "mã ncc": "supplierCode",
  "ma ncc": "supplierCode",
  "tên nhà cung cấp": "supplierName",
  "ten nha cung cap": "supplierName",
  "tên ncc": "supplierName",
  "ten ncc": "supplierName",
  "mã giao dịch": "code",
  "ma giao dich": "code",
  "thời gian": "transDate",
  "thoi gian": "transDate",
  "loại giao dịch": "type",
  "loai giao dich": "type",
  "giá trị": "amount",
  "gia tri": "amount",
};

function normalizeHeader(raw: string): keyof CBRow | null {
  return HEADER_MAP[raw.trim().toLowerCase().replace(/\s+/g, " ")] ?? null;
}

function parseExcel(file: File): Promise<CBRow[]> {
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
        if (!jsonRows.length) return reject(new Error("Không có dữ liệu"));

        const fieldMap: Record<string, keyof CBRow> = {};
        for (const h of Object.keys(jsonRows[0])) {
          const mapped = normalizeHeader(h);
          if (mapped) fieldMap[h] = mapped;
        }

        const rows: CBRow[] = jsonRows.map((raw) => {
          const row: any = {};
          for (const [rawKey, field] of Object.entries(fieldMap)) {
            let val = raw[rawKey];
            if (val === undefined || val === null || val === "") continue;
            if (field === "amount") {
              const num = Number(String(val).replace(/,/g, ""));
              if (!isNaN(num)) row[field] = num;
            } else if (field === "transDate") {
              if (val instanceof Date) {
                row[field] =
                  `${String(val.getUTCDate()).padStart(2, "0")}/${String(val.getUTCMonth() + 1).padStart(2, "0")}/${val.getUTCFullYear()} ${String(val.getUTCHours()).padStart(2, "0")}:${String(val.getUTCMinutes()).padStart(2, "0")}`;
              } else if (
                typeof val === "number" &&
                val > 30000 &&
                val < 60000
              ) {
                const d = new Date(Math.round((val - 25569) * 86400 * 1000));
                row[field] =
                  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
              } else {
                row[field] = String(val).trim();
              }
            } else {
              row[field] = String(val).trim(); // ← supplierCode, supplierName, code, type
            }
          }
          return row;
        });

        resolve(rows.filter((r) => r.supplierCode?.trim() || r.code?.trim()));
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
    "Mã nhà cung cấp",
    "Tên nhà cung cấp",
    "Mã giao dịch",
    "Thời gian",
    "Loại giao dịch",
    "Giá trị",
  ];
  const sample = [
    [
      "NCC000094",
      "HONGHE 2",
      "CBNCC000001",
      "16/06/2025 00:00",
      "Điều chỉnh",
      2592314964,
    ],
    [
      "NCC000095",
      "Test",
      "CBNCC000002",
      "16/06/2025 00:00",
      "Điều chỉnh",
      -500000,
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 15) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cân bằng nợ NCC");
  XLSX.writeFile(wb, "Mau_CanBangNo_NCC.xlsx");
}

interface Props {
  onClose: () => void;
}

export function SupplierImportBalanceModal({ onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CBRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useImportSupplierBalanceAdjustments();

  const validation = useMemo(() => {
    const errors: Record<number, string> = {};
    rows.forEach((r, i) => {
      if (!r.supplierCode?.trim()) errors[i] = "Thiếu mã NCC";
      else if (!r.code?.trim()) errors[i] = "Thiếu mã giao dịch";
      else if (r.amount === undefined || r.amount === 0)
        errors[i] = "Giá trị không hợp lệ";
    });
    return errors;
  }, [rows]);

  const validCount = rows.length - Object.keys(validation).length;

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(ext || "")) {
      setParseError("Chỉ hỗ trợ file .xlsx, .xls");
      return;
    }
    setParseError("");
    setFileName(file.name);
    try {
      const parsed = await parseExcel(file);
      setRows(parsed);
    } catch (err: any) {
      setParseError(err.message);
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

  const handleReset = () => {
    setRows([]);
    setFileName("");
    setParseError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    const validRows = rows
      .filter((_, i) => !validation[i])
      .map((r) => ({
        supplierCode: r.supplierCode!,
        supplierName: r.supplierName,
        code: r.code!,
        transDate: r.transDate,
        type: r.type,
        amount: r.amount!,
      }));

    try {
      const res = await importMutation.mutateAsync({ rows: validRows });
      setResult(res as ImportResult);
      toast.success(`Import thành công ${(res as ImportResult).created} phiếu`);
    } catch (err: any) {
      toast.error(err.message || "Import thất bại");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Import cân bằng nợ NCC</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-1">
              <p className="font-medium text-green-800">{result.message}</p>
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-sm text-red-600">
                      Dòng {e.row} [{e.code}]: {e.message}
                    </p>
                  ))}
                </div>
              )}
              <button
                onClick={handleReset}
                className="mt-2 text-sm text-brand hover:underline">
                Import thêm
              </button>
            </div>
          )}

          {/* Upload */}
          {!result && rows.length === 0 && (
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
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  className="hidden"
                />
              </div>
              {parseError && (
                <p className="text-sm text-red-600">{parseError}</p>
              )}
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-brand hover:text-brand-dark font-medium">
                <Download className="w-4 h-4" />
                Tải file mẫu Excel
              </button>
            </>
          )}

          {/* Preview */}
          {!result && rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  File: <span className="font-medium">{fileName}</span> —{" "}
                  {rows.length} dòng ({validCount} hợp lệ,{" "}
                  {Object.keys(validation).length} lỗi)
                </p>
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700">
                  Đổi file
                </button>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        #
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Mã NCC
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Tên NCC
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Mã giao dịch
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Thời gian
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">
                        Giá trị
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Lỗi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={i}
                        className={`border-b ${validation[i] ? "bg-red-50" : ""}`}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2">{r.supplierCode || "-"}</td>
                        <td className="px-3 py-2">{r.supplierName || "-"}</td>
                        <td className="px-3 py-2">{r.code || "-"}</td>
                        <td className="px-3 py-2">{r.transDate || "-"}</td>
                        <td
                          className={`px-3 py-2 text-right font-medium ${
                            (r.amount ?? 0) >= 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}>
                          {r.amount !== undefined
                            ? formatCurrency(r.amount)
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-red-600 text-xs">
                          {validation[i] || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!result && rows.length > 0 && (
          <div className="flex gap-3 px-6 py-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={validCount === 0 || importMutation.isPending}
              className="flex-1 py-2.5 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2">
              {importMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Import {validCount} phiếu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
