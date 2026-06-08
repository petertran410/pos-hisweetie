"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { X, Upload, Download, Loader2 } from "lucide-react";
import { productsApi } from "@/lib/api/products";
import { toast } from "sonner";

// 1 dòng đọc từ Excel
interface ExcelRow {
  code?: string;
  actualQuantity?: number;
  note?: string;
}

// Item đã khớp sản phẩm — trả về cho form cha
export interface ImportedAuditItem {
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  onHand: number;
  cost: number;
  actualQuantity: string;
  note: string;
}

const HEADER_MAP: Record<string, keyof ExcelRow> = {
  "mã hàng": "code",
  "ma hang": "code",
  "mã sản phẩm": "code",
  "ma san pham": "code",
  "mã sp": "code",
  "ma sp": "code",
  "số lượng thực tế": "actualQuantity",
  "so luong thuc te": "actualQuantity",
  "thực tế": "actualQuantity",
  "thuc te": "actualQuantity",
  "số lượng": "actualQuantity",
  "so luong": "actualQuantity",
  "ghi chú": "note",
  "ghi chu": "note",
};

function normalizeHeader(raw: string): keyof ExcelRow | null {
  return HEADER_MAP[raw.trim().toLowerCase().replace(/\s+/g, " ")] ?? null;
}

function parseExcel(file: File): Promise<ExcelRow[]> {
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
        if (!jsonRows.length) return reject(new Error("Không có dữ liệu"));

        const fieldMap: Record<string, keyof ExcelRow> = {};
        for (const h of Object.keys(jsonRows[0])) {
          const mapped = normalizeHeader(h);
          if (mapped) fieldMap[h] = mapped;
        }

        if (!Object.values(fieldMap).includes("code")) {
          return reject(
            new Error('Không tìm thấy cột "Mã hàng" trong file Excel')
          );
        }

        const rows: ExcelRow[] = jsonRows.map((raw) => {
          const row: ExcelRow = {};
          for (const [rawKey, field] of Object.entries(fieldMap)) {
            const val = raw[rawKey];
            if (val === undefined || val === null || val === "") continue;
            if (field === "actualQuantity") {
              const num = Number(String(val).replace(/,/g, ""));
              if (!isNaN(num)) row.actualQuantity = num;
            } else {
              row[field] = String(val).trim() as any;
            }
          }
          return row;
        });

        resolve(rows.filter((r) => r.code?.trim()));
      } catch (err: any) {
        reject(new Error(err.message || "Không thể đọc file Excel"));
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsArrayBuffer(file);
  });
}

function downloadTemplate() {
  const headers = ["Mã hàng", "Số lượng thực tế", "Ghi chú"];
  const sample = [
    ["SP007485", 90, ""],
    ["testcombo1", 100, "Kiểm định kỳ"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kiểm kho");
  XLSX.writeFile(wb, "Mau_KiemKho.xlsx");
}

interface Props {
  branchId?: number;
  onClose: () => void;
  onConfirm: (items: ImportedAuditItem[]) => void;
}

// dòng preview sau khi khớp sản phẩm
interface PreviewRow extends ExcelRow {
  matched?: ImportedAuditItem;
  error?: string;
}

export function StockAuditImportModal({ branchId, onClose, onConfirm }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);

  const validRows = useMemo(() => rows.filter((r) => r.matched), [rows]);
  const errorCount = rows.length - validRows.length;

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls"].includes(ext || "")) {
        setParseError("Chỉ hỗ trợ file .xlsx, .xls");
        return;
      }
      setParseError("");
      setFileName(file.name);
      setLoading(true);
      try {
        const parsed = await parseExcel(file);
        if (parsed.length === 0) {
          setParseError("File không có dòng hợp lệ (thiếu Mã hàng)");
          setRows([]);
          return;
        }

        // Khớp mã → sản phẩm theo chi nhánh. Lấy danh sách sản phẩm 1 lần.
        const res = await productsApi.getAll({
          branchId,
          limit: 100000,
          isActive: true,
        });
        const productList = res?.data || [];
        const byCode = new Map<string, any>();
        for (const p of productList) {
          if (p.code) byCode.set(p.code.trim().toLowerCase(), p);
        }

        // Ghi đè mã trùng trong file: dòng sau thắng (giữ index cuối)
        const seen = new Set<string>();
        const previews: PreviewRow[] = [];
        // duyệt ngược để dòng cuối thắng, rồi đảo lại
        for (let i = parsed.length - 1; i >= 0; i--) {
          const r = parsed[i];
          const codeKey = (r.code || "").trim().toLowerCase();
          if (seen.has(codeKey)) {
            previews.unshift({ ...r, error: "Mã trùng trong file (đã bỏ qua)" });
            continue;
          }
          seen.add(codeKey);

          const p = byCode.get(codeKey);
          if (!p) {
            previews.unshift({
              ...r,
              error: "Mã hàng không tồn tại / không thuộc chi nhánh",
            });
            continue;
          }
          if (r.actualQuantity === undefined || isNaN(r.actualQuantity)) {
            previews.unshift({ ...r, error: "Số lượng thực tế không hợp lệ" });
            continue;
          }

          const inv = p.inventories?.find(
            (iv: any) => iv.branchId === branchId
          );
          previews.unshift({
            ...r,
            matched: {
              productId: p.id,
              productCode: p.code,
              productName: p.name,
              unit: p.unit || "",
              onHand: inv ? Number(inv.onHand) : 0,
              cost: inv ? Number(inv.cost) : 0,
              actualQuantity: String(r.actualQuantity),
              note: r.note || "",
            },
          });
        }
        setRows(previews);
      } catch (err: any) {
        setParseError(err.message || "Không thể đọc file");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [branchId]
  );

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirm = () => {
    if (validRows.length === 0) return;
    onConfirm(validRows.map((r) => r.matched!));
    toast.success(`Đã thêm ${validRows.length} sản phẩm từ file`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Import sản phẩm kiểm kho</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {rows.length === 0 && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                {loading ? (
                  <Loader2 className="w-10 h-10 text-blue-400 mx-auto mb-3 animate-spin" />
                ) : (
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                )}
                <p className="text-sm text-gray-600 mb-1">
                  Kéo thả file Excel vào đây hoặc{" "}
                  <span className="text-blue-600 font-medium">
                    nhấn để chọn file
                  </span>
                </p>
                <p className="text-xs text-gray-400">
                  Cột: Mã hàng, Số lượng thực tế, Ghi chú — hỗ trợ .xlsx, .xls
                </p>
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
              {parseError && <p className="text-sm text-red-600">{parseError}</p>}
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Download className="w-4 h-4" />
                Tải file mẫu Excel
              </button>
            </>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  File: <span className="font-medium">{fileName}</span> —{" "}
                  {rows.length} dòng ({validRows.length} hợp lệ, {errorCount} lỗi)
                </p>
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700">
                  Đổi file
                </button>
              </div>

              <div className="overflow-x-auto border rounded-lg max-h-[50vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        #
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Mã hàng
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Tên hàng
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">
                        Thực tế
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Ghi chú
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={i}
                        className={`border-b ${r.error ? "bg-red-50" : ""}`}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2">{r.code || "-"}</td>
                        <td className="px-3 py-2">
                          {r.matched?.productName || "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {r.actualQuantity ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {r.note || "-"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {r.error ? (
                            <span className="text-red-600">{r.error}</span>
                          ) : (
                            <span className="text-green-600">Hợp lệ</span>
                          )}
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
        {rows.length > 0 && (
          <div className="flex gap-3 px-6 py-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={validRows.length === 0}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
              Thêm {validRows.length} sản phẩm vào phiếu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
