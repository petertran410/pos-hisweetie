"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, Upload, X } from "lucide-react";
import { productsApi, type Product } from "@/lib/api/products";
import { priceBooksApi } from "@/lib/api/price-books";
import {
  getBaseUnitLabel,
  supportsCartonUnit,
  toBaseQuantity,
  type CartQuantityUnit,
} from "@/components/pos/quantity-utils";

/** Một dòng hợp lệ từ file, sẵn sàng để thêm vào giỏ. */
export interface ImportedCartLine {
  product: Product;
  /** Số lượng theo đơn vị cơ bản (giống CartItem.quantity). */
  quantity: number;
  quantityUnit: CartQuantityUnit;
  price: number;
  discount: number;
  note: string;
}

interface ParsedRow {
  /** Số dòng trong file Excel (tính cả dòng tiêu đề) để người dùng dễ dò. */
  rowNumber: number;
  code: string;
  /** Tên trong file: để dễ đọc; chỉ dùng tìm SP khi dòng không có mã. */
  name: string;
  quantityRaw: string;
  unitRaw: string;
  priceRaw: string;
  note: string;
}

interface PreviewRow extends ParsedRow {
  productCode?: string;
  productName?: string;
  unitLabel?: string;
  displayQuantity?: number;
  appliedPrice?: number;
  line?: ImportedCartLine;
  error?: string;
  warnings: string[];
}

type ParsedField = "code" | "name" | "quantity" | "unit" | "price" | "note";

// Key đã bỏ dấu + chữ thường (xem `toKey`).
const HEADER_MAP: Record<string, ParsedField> = {
  "ma hang": "code",
  "ma san pham": "code",
  "ma sp": "code",
  "ten san pham": "name",
  "ten hang": "name",
  "ten hang hoa": "name",
  "ten sp": "name",
  "so luong": "quantity",
  sl: "quantity",
  "don vi": "unit",
  "don vi tinh": "unit",
  dvt: "unit",
  "don gia": "price",
  "gia ban": "price",
  "ghi chu": "note",
};

const CARTON_ALIASES = new Set(["thung", "carton", "ctn"]);
const BASE_ALIASES = new Set(["", "goi", "don vi co ban"]);

/** Chữ thường, bỏ dấu tiếng Việt, gộp khoảng trắng — dùng để so khớp. */
function toKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cellText(value: unknown): string {
  return String(value ?? "").trim();
}

/** "1,5" → 1.5; "1.000,5" → 1000.5; ô số giữ nguyên. Làm tròn 2 chữ số. */
function parseQuantity(raw: string): number | null {
  let text = raw.replace(/\s/g, "");
  if (!text) return null;
  if (text.includes(",")) {
    text = text.includes(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(",", ".");
  }
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

/** Giá VNĐ: bỏ mọi ký tự không phải số ("45.000đ" → 45000). */
function parsePrice(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return value > 0 ? value : null;
}

function parseUnit(raw: string, product: Product): CartQuantityUnit | null {
  const key = toKey(raw);
  if (CARTON_ALIASES.has(key)) {
    return supportsCartonUnit(product) ? "carton" : null;
  }
  if (BASE_ALIASES.has(key) || key === toKey(product.unit)) return "base";
  return null;
}

function parseExcel(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) throw new Error("File Excel trống");
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          sheet,
          { defval: "", raw: true },
        );
        if (!rawRows.length) throw new Error("File không có dữ liệu");

        const fieldMap: Partial<Record<ParsedField, string>> = {};
        for (const header of Object.keys(rawRows[0])) {
          const field = HEADER_MAP[toKey(header)];
          if (field && !fieldMap[field]) fieldMap[field] = header;
        }
        if (!fieldMap.code && !fieldMap.name) {
          throw new Error(
            'Không tìm thấy cột "Mã hàng" hoặc "Tên sản phẩm" trong file Excel',
          );
        }
        if (!fieldMap.quantity) {
          throw new Error('Không tìm thấy cột "Số lượng" trong file Excel');
        }

        const read = (raw: Record<string, unknown>, field: ParsedField) =>
          fieldMap[field] ? cellText(raw[fieldMap[field]!]) : "";

        resolve(
          rawRows
            .map((raw, index) => ({
              rowNumber: index + 2,
              code: read(raw, "code"),
              name: read(raw, "name"),
              quantityRaw: read(raw, "quantity"),
              unitRaw: read(raw, "unit"),
              priceRaw: read(raw, "price"),
              note: read(raw, "note"),
            }))
            .filter((row) => row.code || row.name),
        );
      } catch (error: unknown) {
        reject(
          new Error(
            error instanceof Error ? error.message : "Không thể đọc file Excel",
          ),
        );
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsArrayBuffer(file);
  });
}

function downloadTemplate() {
  const headers = [
    "Mã hàng",
    "Tên sản phẩm",
    "Số lượng",
    "Đơn vị",
    "Đơn giá",
    "Ghi chú",
  ];
  const sample = [
    [
      "SP000001",
      "Sản phẩm A",
      10,
      "",
      "",
      "Đơn giá để trống: lấy theo bảng giá",
    ],
    ["SP000002", "Sản phẩm B", 2, "Thùng", "", "2 thùng, tự quy đổi ra gói"],
    ["SP000003", "Sản phẩm C", 5, "Gói", 45000, "Giá bán riêng cho đơn này"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  sheet["!cols"] = [
    { wch: 16 },
    { wch: 40 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 40 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sản phẩm");

  const guideRows = [
    ["Cột", "Bắt buộc", "Cách điền"],
    [
      "Mã hàng",
      "Có (*)",
      "Mã sản phẩm, ví dụ SP000001. Có mã thì luôn tìm sản phẩm theo mã.",
    ],
    [
      "Tên sản phẩm",
      "Không (*)",
      "Để dễ đọc file. (*) Dòng để trống Mã hàng thì tìm theo ĐÚNG tên sản phẩm trên hệ thống (không phân biệt hoa thường, dấu); nhiều sản phẩm trùng tên thì phải điền Mã hàng.",
    ],
    ["Số lượng", "Có", "Số lớn hơn 0, cho phép số lẻ (ví dụ 1,5)"],
    [
      "Đơn vị",
      "Không",
      'Để trống hoặc ghi đơn vị cơ bản (Gói...) = tính theo đơn vị cơ bản. Ghi "Thùng" = số lượng tính theo thùng (chỉ với sản phẩm có quy đổi thùng).',
    ],
    [
      "Đơn giá",
      "Không",
      "Giá bán cho 1 đơn vị cơ bản (gói), KHÔNG phải giá thùng. Để trống = lấy theo bảng giá đang chọn. Cần quyền sửa giá, không có quyền thì dùng giá bảng giá.",
    ],
    ["Ghi chú", "Không", "Ghi chú riêng cho từng dòng"],
    [
      "Lưu ý",
      "-",
      "Mỗi dòng trong file thành 1 dòng trong giỏ (mã trùng vẫn giữ nhiều dòng). Hàng đã có trong giỏ được giữ nguyên.",
    ],
  ];
  const guide = XLSX.utils.aoa_to_sheet(guideRows);
  guide["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, guide, "Hướng dẫn");

  XLSX.writeFile(workbook, "Mau_NhapSanPham_BanHang.xlsx");
}

interface Props {
  branchId?: number;
  priceBookId?: number | null;
  canEditPrice: boolean;
  onClose: () => void;
  onConfirm: (lines: ImportedCartLine[]) => void;
}

export function PosProductImportModal({
  branchId,
  priceBookId,
  canEditPrice,
  onClose,
  onConfirm,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const activePriceBookId = priceBookId && priceBookId > 0 ? priceBookId : null;

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["xlsx", "xls"].includes(ext)) {
      setError("Chỉ hỗ trợ file .xlsx, .xls");
      return;
    }
    setLoading(true);
    setError("");
    setFileName(file.name);
    try {
      const parsed = await parseExcel(file);
      if (!parsed.length) {
        throw new Error("File không có dòng nào có Mã hàng hoặc Tên sản phẩm");
      }

      // Cùng bộ lọc với ô tìm kiếm sản phẩm của trang bán hàng.
      const [productRes, priceBook] = await Promise.all([
        productsApi.getAll({
          branchId,
          limit: 100000,
          isActive: true,
          isDirectSale: true,
        }),
        activePriceBookId
          ? priceBooksApi.getPriceBook(activePriceBookId).catch(() => {
              throw new Error("Không tải được bảng giá đang chọn");
            })
          : Promise.resolve(null),
      ]);

      const byCode = new Map<string, Product>();
      const byName = new Map<string, Product[]>();
      for (const product of productRes?.data || []) {
        if (product.code) byCode.set(toKey(product.code), product);
        const nameKey = toKey(product.name);
        if (nameKey)
          byName.set(nameKey, [...(byName.get(nameKey) || []), product]);
      }
      const bookPrices = new Map<number, number>();
      for (const detail of priceBook?.priceBookDetails || []) {
        if (detail.isActive) {
          bookPrices.set(detail.productId, Number(detail.price));
        }
      }
      const isStrictPriceBook =
        !!priceBook && !priceBook.allowNonListedProducts;
      const warnNonListed =
        !!priceBook &&
        priceBook.allowNonListedProducts &&
        priceBook.warnNonListedProducts;

      const previews: PreviewRow[] = parsed.map((row) => {
        const preview: PreviewRow = { ...row, warnings: [] };
        // Có mã → luôn tìm theo mã. Không có mã → tìm theo đúng tên.
        let product: Product | undefined;
        if (row.code) {
          product = byCode.get(toKey(row.code));
          if (!product) {
            preview.error =
              "Mã hàng không tồn tại hoặc không được bán trực tiếp";
            return preview;
          }
        } else {
          const matches = byName.get(toKey(row.name)) || [];
          if (matches.length > 1) {
            preview.error = `Có ${matches.length} sản phẩm trùng tên — vui lòng điền Mã hàng`;
            return preview;
          }
          product = matches[0];
          if (!product) {
            preview.error =
              "Không tìm thấy sản phẩm theo tên (hoặc không được bán trực tiếp)";
            return preview;
          }
        }
        preview.productCode = product.code;
        preview.productName = product.name;

        const inPriceBook = bookPrices.has(product.id);
        if (priceBook && !inPriceBook) {
          if (isStrictPriceBook) {
            preview.error = "Không có trong bảng giá đang chọn";
            return preview;
          }
          if (warnNonListed) {
            preview.warnings.push("Không có trong bảng giá — dùng giá gốc");
          }
        }

        const quantity = parseQuantity(row.quantityRaw);
        if (quantity == null) {
          preview.error = "Số lượng phải lớn hơn 0";
          return preview;
        }

        const quantityUnit = parseUnit(row.unitRaw, product);
        if (!quantityUnit) {
          preview.error = CARTON_ALIASES.has(toKey(row.unitRaw))
            ? "Sản phẩm không có quy đổi thùng"
            : `Đơn vị "${row.unitRaw}" không hợp lệ (để trống, ${getBaseUnitLabel(product)} hoặc Thùng)`;
          return preview;
        }
        preview.unitLabel =
          quantityUnit === "carton" ? "Thùng" : getBaseUnitLabel(product);
        preview.displayQuantity = quantity;

        const listPrice = inPriceBook
          ? bookPrices.get(product.id)!
          : Number(product.basePrice) || 0;
        let price = listPrice;
        let discount = 0;
        if (row.priceRaw) {
          const filePrice = parsePrice(row.priceRaw);
          if (filePrice == null) {
            preview.error = `Đơn giá "${row.priceRaw}" không hợp lệ`;
            return preview;
          }
          if (!canEditPrice) {
            preview.warnings.push("Không có quyền sửa giá — dùng giá bảng giá");
          } else if (filePrice < listPrice) {
            // Giống ô sửa giá trong giỏ: giá thấp hơn → ghi nhận là giảm giá.
            discount = listPrice - filePrice;
          } else {
            price = filePrice;
          }
        }
        preview.appliedPrice = price - discount;

        preview.line = {
          product,
          quantity: toBaseQuantity(quantity, quantityUnit, product),
          quantityUnit,
          price,
          discount,
          note: row.note,
        };
        return preview;
      });

      setRows(previews);
    } catch (err: unknown) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Không thể đọc file");
    } finally {
      setLoading(false);
      // Cho phép chọn lại cùng file sau khi sửa.
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const validLines = rows.filter((row) => row.line).map((row) => row.line!);
  const errorCount = rows.filter((row) => row.error).length;

  const reset = () => {
    setRows([]);
    setFileName("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-2 lg:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Import sản phẩm từ Excel</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          <div className="rounded border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1">
            <p>
              Cột bắt buộc: <strong>Mã hàng</strong> (hoặc{" "}
              <strong>Tên sản phẩm</strong> đúng như trên hệ thống),{" "}
              <strong>Số lượng</strong>. Cột tùy chọn: <strong>Đơn vị</strong>{" "}
              (để trống hoặc Thùng), <strong>Đơn giá</strong>,{" "}
              <strong>Ghi chú</strong>.
            </p>
            <p>
              <strong>Đơn giá</strong> tính cho 1 đơn vị cơ bản (gói), để trống
              thì lấy theo bảng giá đang chọn
              {canEditPrice
                ? ""
                : " (bạn không có quyền sửa giá nên cột này sẽ được bỏ qua)"}
              . Sản phẩm được thêm vào giỏ hiện tại, hàng đã có được giữ nguyên.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Chọn file Excel
            </button>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" /> Tải file mẫu
            </button>
            {fileName && (
              <span className="text-sm text-gray-500 truncate max-w-full">
                {fileName}
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && handleFile(e.target.files[0])
              }
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          {rows.length > 0 && (
            <>
              <div className="text-sm text-gray-600">
                <span className="text-green-600 font-medium">
                  {validLines.length} dòng hợp lệ
                </span>
                {errorCount > 0 && (
                  <span className="text-red-600 font-medium">
                    {" "}
                    · {errorCount} dòng lỗi (sẽ bỏ qua)
                  </span>
                )}
              </div>
              <div className="border rounded-lg overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 whitespace-nowrap">
                    <tr>
                      <th className="p-2 text-left">Dòng</th>
                      <th className="p-2 text-left">Mã hàng</th>
                      <th className="p-2 text-left">Tên sản phẩm</th>
                      <th className="p-2 text-right">SL</th>
                      <th className="p-2 text-left">Đơn vị</th>
                      <th className="p-2 text-right">Đơn giá</th>
                      <th className="p-2 text-left">Ghi chú</th>
                      <th className="p-2 text-left">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={`border-t ${row.error ? "bg-red-50/50" : ""}`}>
                        <td className="p-2 text-gray-400">{row.rowNumber}</td>
                        <td className="p-2 whitespace-nowrap">
                          {row.productCode || row.code || "-"}
                        </td>
                        <td className="p-2 min-w-[160px]">
                          {row.productName || row.name || "-"}
                        </td>
                        <td className="p-2 text-right">
                          {row.displayQuantity ?? (row.quantityRaw || "-")}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {row.unitLabel || row.unitRaw || "-"}
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          {row.appliedPrice != null
                            ? row.appliedPrice.toLocaleString()
                            : row.priceRaw || "-"}
                        </td>
                        <td className="p-2 min-w-[120px] text-gray-600">
                          {row.note || "-"}
                        </td>
                        <td className="p-2 min-w-[160px]">
                          {row.error ? (
                            <span className="text-red-600">{row.error}</span>
                          ) : row.warnings.length > 0 ? (
                            <span className="text-amber-600">
                              {row.warnings.join("; ")}
                            </span>
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

        <div className="flex justify-between items-center gap-2 px-4 lg:px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={reset}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-white">
            Đặt lại
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-white">
              Hủy
            </button>
            <button
              type="button"
              disabled={!validLines.length || loading}
              onClick={() => {
                onConfirm(validLines);
                onClose();
              }}
              className="px-4 py-2 text-sm bg-brand text-white rounded-lg disabled:opacity-50">
              {validLines.length
                ? `Thêm ${validLines.length} sản phẩm vào giỏ`
                : "Thêm vào giỏ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
