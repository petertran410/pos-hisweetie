"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, Upload, X } from "lucide-react";
import { productsApi } from "@/lib/api/products";
import { toast } from "sonner";
import type { ConditionBucket, TransferDirection } from "@/lib/api/stock-condition-transfers";

export interface ImportedTransferItem {
  productId: number;
  productCode: string;
  productName: string;
  unit?: string;
  direction: TransferDirection;
  toBucket: ConditionBucket;
  quantity: string;
  expiryDate: string;
  note: string;
}

interface ParsedRow {
  code: string;
  direction?: string;
  bucket?: string;
  quantity?: number;
  /** NSX đã chuẩn hóa về "YYYY-MM-01". */
  expiryDate?: string;
  /** Giá trị NSX gốc trong file — dùng để báo lỗi khi không đọc được. */
  expiryRaw?: string;
  note?: string;
}

interface PreviewRow extends ParsedRow {
  matched?: ImportedTransferItem;
  error?: string;
}

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  "mã hàng": "code",
  "ma hang": "code",
  "mã sản phẩm": "code",
  "ma san pham": "code",
  "chiều": "direction",
  "chieu": "direction",
  "loại tồn": "bucket",
  "loai ton": "bucket",
  "số lượng": "quantity",
  "so luong": "quantity",
  "số lượng điều chỉnh giảm": "quantity",
  "so luong dieu chinh giam": "quantity",
  "nsx": "expiryDate",
  "ngày sản xuất": "expiryDate",
  "ngay san xuat": "expiryDate",
  "ghi chú": "note",
  "ghi chu": "note",
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeHeader(value: string): keyof ParsedRow | null {
  return HEADER_MAP[normalize(value)] ?? null;
}

function parseDirection(value: unknown): TransferDirection | null {
  const key = normalize(value);
  if (["in", "chuyển vào", "chuyen vao"].includes(key)) return "IN";
  if (["out", "điều chỉnh giảm", "dieu chinh giam"].includes(key)) return "OUT";
  return null;
}

function parseBucket(value: unknown): ConditionBucket | null {
  const key = normalize(value);
  if (["damaged", "bục rách", "buc rach"].includes(key)) return "DAMAGED";
  if (["near_expiry", "near expiry", "cận date", "can date"].includes(key)) return "NEAR_EXPIRY";
  if (["promo", "khuyến mãi", "khuyen mai"].includes(key)) return "PROMO";
  return null;
}

/**
 * Chuẩn hóa NSX về "YYYY-MM-01".
 *
 * NSX chỉ có ý nghĩa tới tháng/năm (backend neo về ngày 01), nên mọi định dạng
 * đều được quy về ngày 01 của tháng đó. Hỗ trợ:
 *  - Ô Excel định dạng Date → Date object
 *  - Ô Excel định dạng Date với cellDates=false → số serial (gốc 1899-12-30)
 *  - "2026-08-01", "2026-08", "2026/08"
 *  - "08/2026", "08-2026"
 *  - "01/08/2026", "1/8/2026" (ngày/tháng/năm)
 * Trả về null nếu không nhận dạng được → dòng sẽ bị báo lỗi ở preview.
 */
function parseExpiryDate(value: unknown): string | null {
  const pad = (n: number) => String(n).padStart(2, "0");
  const build = (year: number, month: number): string | null => {
    if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
    if (year < 1900 || year > 2999 || month < 1 || month > 12) return null;
    return `${year}-${pad(month)}-01`;
  };

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return build(value.getFullYear(), value.getMonth() + 1);
  }

  // Số serial của Excel (1900 date system).
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = Date.UTC(1899, 11, 30) + value * 86_400_000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return build(d.getUTCFullYear(), d.getUTCMonth() + 1);
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  // YYYY-MM-DD hoặc YYYY-MM (chấp nhận cả dấu "/").
  const ymd = raw.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/);
  if (ymd) return build(Number(ymd[1]), Number(ymd[2]));

  // MM/YYYY hoặc MM-YYYY.
  const my = raw.match(/^(\d{1,2})[-/](\d{4})$/);
  if (my) return build(Number(my[2]), Number(my[1]));

  // DD/MM/YYYY (ngày bị bỏ qua vì NSX chỉ tính theo tháng).
  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return build(Number(dmy[3]), Number(dmy[2]));

  return null;
}

function parseExcel(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        // cellDates: ô định dạng ngày trả về Date object thay vì số serial.
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) throw new Error("File Excel trống");
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
        });
        if (!rawRows.length) throw new Error("File không có dữ liệu");

        const fieldMap: Record<string, keyof ParsedRow> = {};
        for (const header of Object.keys(rawRows[0])) {
          const field = normalizeHeader(header);
          if (field) fieldMap[header] = field;
        }
        if (!Object.values(fieldMap).includes("code")) {
          throw new Error('Không tìm thấy cột "Mã hàng" trong file Excel');
        }

        resolve(
          rawRows
            .map((raw) => {
              const row: ParsedRow = { code: "" };
              for (const [header, field] of Object.entries(fieldMap)) {
                const value = raw[header];
                if (value === undefined || value === null || value === "") continue;
                if (field === "quantity") {
                  const quantity = Number(String(value).replace(/,/g, ""));
                  if (!Number.isNaN(quantity)) row.quantity = quantity;
                } else if (field === "code") {
                  row.code = String(value).trim();
                } else if (field === "expiryDate") {
                  // Giữ lại giá trị gốc để báo lỗi, đồng thời chuẩn hóa về
                  // "YYYY-MM-01" cho khớp @IsDateString() phía backend.
                  row.expiryRaw =
                    value instanceof Date
                      ? value.toISOString().slice(0, 10)
                      : String(value).trim();
                  const normalized = parseExpiryDate(value);
                  if (normalized) row.expiryDate = normalized;
                } else {
                  row[field] = String(value).trim();
                }
              }
              return row;
            })
            .filter((row) => row.code)
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Không thể đọc file Excel";
        reject(new Error(message));
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsArrayBuffer(file);
  });
}

function downloadTemplate() {
  const headers = ["Mã hàng", "Chiều", "Loại tồn", "Số lượng", "NSX", "Ghi chú"];
  const sample = [
    ["SP007485", "Điều chỉnh giảm", "Khuyến mãi", 9, "", "Giảm tồn KM — NSX để trống"],
    ["SP007486", "Chuyển vào", "Bục rách", 2, "", "NSX để trống"],
    ["SP007487", "Điều chỉnh giảm", "Cận date", 3, "2026-08-01", "OUT cận date: NSX phải trùng đúng lô"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  sheet["!cols"] = headers.map((header) => ({ wch: Math.max(header.length + 4, 18) }));
  // Cột NSX dùng text để Excel giữ nguyên định dạng YYYY-MM-DD.
  for (let row = 2; row <= sample.length + 1; row++) {
    const cell = sheet[`E${row}`];
    if (cell) cell.t = "s";
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Chuyển loại tồn");

  // Sheet hướng dẫn: nêu rõ giá trị hợp lệ và quy tắc cột NSX.
  const guideRows = [
    ["Cột", "Bắt buộc", "Giá trị hợp lệ / Cách điền"],
    ["Mã hàng", "Có", "Mã sản phẩm, ví dụ SP007485"],
    ["Chiều", "Có", "Chuyển vào (hoặc IN) / Điều chỉnh giảm (hoặc OUT)"],
    ["Loại tồn", "Có", "Bục rách / Cận date / Khuyến mãi"],
    ["Số lượng", "Có", "Số nguyên lớn hơn 0"],
    [
      "NSX",
      "Chỉ khi Cận date",
      'Định dạng YYYY-MM-DD, luôn dùng ngày 01, ví dụ 2026-08-01. NSX chỉ tính theo tháng/năm.',
    ],
    [
      "NSX",
      "-",
      "Điều chỉnh giảm + Cận date: BẮT BUỘC và phải trùng đúng lô đang có tồn.",
    ],
    ["NSX", "-", "Chuyển vào + Cận date: có thể để trống (vào lô chưa xác định NSX)."],
    ["NSX", "-", "Bục rách / Khuyến mãi: LUÔN để trống."],
    ["NSX", "-", "Nên định dạng ô thành Text để Excel không tự đổi thành 08/2026."],
    ["Ghi chú", "Không", "Ghi chú cho từng dòng"],
  ];
  const guide = XLSX.utils.aoa_to_sheet(guideRows);
  guide["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(workbook, guide, "Hướng dẫn");

  XLSX.writeFile(workbook, "Mau_ChuyenLoaiTon.xlsx");
}

interface ParsedProduct {
  id: number;
  code: string;
  name: string;
  unit?: string;
}

interface Props {
  branchId?: number;
  onClose: () => void;
  onConfirm: (items: ImportedTransferItem[]) => void;
}

export function StockConditionTransferImportModal({ branchId, onClose, onConfirm }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!["xlsx", "xls"].includes(file.name.split(".").pop()?.toLowerCase() || "")) {
      setError("Chỉ hỗ trợ file .xlsx, .xls");
      return;
    }
    setLoading(true);
    setError("");
    setFileName(file.name);
    try {
      const parsed = await parseExcel(file);
      const response = await productsApi.getAll({ branchId, limit: 100000, isActive: true });
      const products = (response?.data || []) as ParsedProduct[];
      const byCode = new Map<string, ParsedProduct>(
        products.map((product) => [normalize(product.code), product])
      );
      const seen = new Set<string>();
      const previews: PreviewRow[] = [];

      for (let index = parsed.length - 1; index >= 0; index--) {
        const row = parsed[index];
        const code = normalize(row.code);
        if (seen.has(code)) {
          previews.unshift({ ...row, error: "Mã hàng trùng trong file" });
          continue;
        }
        seen.add(code);
        const product = byCode.get(code);
        const direction = parseDirection(row.direction);
        const bucket = parseBucket(row.bucket);
        if (!product) {
          previews.unshift({ ...row, error: "Mã hàng không tồn tại / không thuộc chi nhánh" });
          continue;
        }
        if (!direction) {
          previews.unshift({ ...row, error: "Chiều không hợp lệ (IN/OUT)" });
          continue;
        }
        if (!bucket) {
          previews.unshift({ ...row, error: "Loại tồn không hợp lệ" });
          continue;
        }
        if (row.quantity === undefined || !Number.isInteger(row.quantity) || row.quantity <= 0) {
          previews.unshift({ ...row, error: "Số lượng phải là số nguyên lớn hơn 0" });
          continue;
        }
        // NSX có nội dung nhưng không nhận dạng được định dạng.
        if (row.expiryRaw && !row.expiryDate) {
          previews.unshift({
            ...row,
            error: `NSX "${row.expiryRaw}" không hợp lệ. Dùng định dạng YYYY-MM-DD, ví dụ 2026-08-01`,
          });
          continue;
        }
        // OUT + Cận date buộc phải trừ vào đúng lô → NSX bắt buộc.
        if (bucket === "NEAR_EXPIRY" && direction === "OUT" && !row.expiryDate) {
          previews.unshift({
            ...row,
            error: "Điều chỉnh giảm cận date phải điền NSX của đúng lô đang có tồn",
          });
          continue;
        }
        // NSX chỉ có nghĩa với cận date; các loại khác bỏ qua để tránh gửi sai.
        const expiryDate = bucket === "NEAR_EXPIRY" ? row.expiryDate || "" : "";
        previews.unshift({
          ...row,
          matched: {
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            unit: product.unit,
            direction,
            toBucket: bucket,
            quantity: String(row.quantity),
            expiryDate,
            note: row.note || "",
          },
        });
      }
      setRows(previews);
    } catch (err: unknown) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Không thể đọc file");
    } finally {
      setLoading(false);
    }
  };

  const validRows = rows.filter((row) => row.matched).map((row) => row.matched!);
  const reset = () => {
    setRows([]);
    setFileName("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Import sản phẩm chuyển loại tồn</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1">
            <p>
              Cột bắt buộc: <strong>Mã hàng, Chiều, Loại tồn, Số lượng</strong>.
            </p>
            <p>
              Cột <strong>NSX</strong> chỉ dùng cho loại tồn <strong>Cận date</strong>,
              định dạng <code>YYYY-MM-DD</code> và luôn lấy ngày 01, ví dụ{" "}
              <code>2026-08-01</code>. Với <strong>Điều chỉnh giảm + Cận date</strong>{" "}
              là bắt buộc và phải trùng đúng lô đang có tồn.
            </p>
            <p>
              Loại tồn <strong>Bục rách</strong> và <strong>Khuyến mãi</strong> để trống
              cột NSX. File mẫu có sẵn sheet “Hướng dẫn”.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Chọn file Excel
            </button>
            <button type="button" onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" /> Tải file mẫu
            </button>
            {fileName && <span className="text-sm text-gray-500 truncate">{fileName}</span>}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {rows.length > 0 && (
            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="p-2 text-left">Mã hàng</th><th className="p-2 text-left">Chiều</th><th className="p-2 text-left">Loại tồn</th><th className="p-2 text-right">SL</th><th className="p-2 text-left">NSX</th><th className="p-2 text-left">Trạng thái</th></tr></thead>
                <tbody>{rows.map((row, index) => <tr key={`${row.code}-${index}`} className="border-t"><td className="p-2">{row.code}</td><td className="p-2">{row.direction || "-"}</td><td className="p-2">{row.bucket || "-"}</td><td className="p-2 text-right">{row.quantity ?? "-"}</td><td className="p-2">{row.expiryDate || "-"}</td><td className={`p-2 ${row.error ? "text-red-600" : "text-green-600"}`}>{row.error || "Hợp lệ"}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button type="button" onClick={reset} className="px-3 py-2 text-sm border rounded-lg hover:bg-white">Đặt lại</button>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-white">Hủy</button><button type="button" disabled={!validRows.length || loading} onClick={() => { onConfirm(validRows); toast.success(`Đã thêm ${validRows.length} sản phẩm từ file`); onClose(); }} className="px-4 py-2 text-sm bg-brand text-white rounded-lg disabled:opacity-50">Thêm vào phiếu</button></div>
        </div>
      </div>
    </div>
  );
}
