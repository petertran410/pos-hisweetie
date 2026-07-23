"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { X, Loader2, Calendar, Clock } from "lucide-react";
import { useExportProducts } from "@/lib/hooks/useProducts";
import { useBranchStore } from "@/lib/store/branch";
import { MiniCalendar } from "@/components/shared/MiniCalendar";

interface ProductExportModalProps {
  /** Bộ lọc hiện tại của bảng để xuất đúng tập dữ liệu đang xem. */
  filters: Record<string, any>;
  onClose: () => void;
}

interface ColumnOption {
  key: string;
  label: string;
  /** Cột bắt buộc — luôn được tick và không thể bỏ chọn. */
  required?: boolean;
}

interface ColumnGroup {
  title: string;
  options: ColumnOption[];
}

// Key phải khớp với ALL_COLUMNS ở backend (products.service.ts).
const COLUMN_GROUPS: ColumnGroup[] = [
  {
    title: "Hàng hóa",
    options: [
      { key: "type", label: "Loại hàng", required: true },
      { key: "categoryPath", label: "Nhóm hàng(3 Cấp)" },
      { key: "code", label: "Mã hàng", required: true },
      { key: "name", label: "Tên hàng", required: true },
      { key: "tradeMark", label: "Thương hiệu" },
      { key: "images", label: "Hình ảnh (url1,url2...)" },
      { key: "isDirectSale", label: "Được bán trực tiếp" },
      { key: "isActive", label: "Đang kinh doanh" },
    ],
  },
  {
    title: "Giá bán & Tồn kho",
    options: [
      { key: "basePrice", label: "Giá bán" },
      { key: "cost", label: "Giá vốn" },
      { key: "stock", label: "Tồn kho" },
      { key: "customerOrder", label: "Khách đặt" },
      { key: "supplierOrder", label: "Đặt NCC" },
      { key: "minStock", label: "Tồn nhỏ nhất" },
      { key: "maxStock", label: "Tồn lớn nhất" },
    ],
  },
  {
    title: "Đơn vị tính",
    options: [{ key: "unit", label: "ĐVT" }],
  },
  {
    title: "Thông tin khác",
    options: [
      { key: "weight", label: "Trọng lượng" },
      { key: "description", label: "Mô tả" },
      { key: "components", label: "Hàng thành phần" },
      { key: "createdAt", label: "Thời gian tạo" },
    ],
  },
];

const REQUIRED_KEYS = COLUMN_GROUPS.flatMap((g) =>
  g.options.filter((o) => o.required).map((o) => o.key)
);

const ALL_KEYS = COLUMN_GROUPS.flatMap((g) => g.options.map((o) => o.key));

// Cột tick sẵn khi mở modal (giống mặc định KiotViet).
const DEFAULT_SELECTED = [
  "type",
  "categoryPath",
  "code",
  "name",
  "basePrice",
  "cost",
  "stock",
  "minStock",
  "maxStock",
  "unit",
  "images",
  "isDirectSale",
  "weight",
  "createdAt",
];

export function ProductExportModal({
  filters,
  onClose,
}: ProductExportModalProps) {
  const { selectedBranch } = useBranchStore();
  const { exportToFile, isExporting } = useExportProducts();

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set([...DEFAULT_SELECTED, ...REQUIRED_KEYS])
  );

  // ── Tồn kho tại thời điểm (tùy chọn) ──────────────────────────────────────
  // Tách 3 phần: datePart (YYYY-MM-DD), hour, minute. Khi đủ datePart → cột
  // "Tồn kho" trong file xuất được tính theo thời điểm này (qua
  // previewStockAtDate backend) thay vì onHand hiện tại. Chỉ áp dụng cho chi
  // nhánh đang chọn (selectedBranch.id).
  // Giờ/phút mặc định = thời gian hiện tại (lazy init, chỉ chạy 1 lần khi mount).
  const [datePart, setDatePart] = useState<string>("");
  const [hour, setHour] = useState<number>(() => new Date().getHours());
  const [minute, setMinute] = useState<number>(() => new Date().getMinutes());
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Đóng popup khi click ngoài (sửa bug calendar native không đóng được).
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  // Chuỗi hiển thị trên nút trigger: DD/MM/YYYY HH:mm.
  const asOfDisplay = useMemo(() => {
    if (!datePart) return "";
    const [y, m, d] = datePart.split("-");
    return `${d}/${m}/${y} ${String(hour).padStart(2, "0")}:${String(
      minute
    ).padStart(2, "0")}`;
  }, [datePart, hour, minute]);

  // ISO datetime đầy đủ gửi backend (giờ phút được tôn trọng). Backend
  // previewStockAtDate dùng new Date(checkDate) + filter transactionDate < date.
  const asOfIso = useMemo(() => {
    if (!datePart) return "";
    return `${datePart}T${String(hour).padStart(2, "0")}:${String(
      minute
    ).padStart(2, "0")}:00`;
  }, [datePart, hour, minute]);

  const clearAsOf = () => {
    setDatePart("");
    // Reset giờ phút về thời gian hiện tại (giống mặc định khi mở modal).
    const now = new Date();
    setHour(now.getHours());
    setMinute(now.getMinutes());
    setShowPicker(false);
  };

  const toggle = (key: string) => {
    if (REQUIRED_KEYS.includes(key)) return; // không cho bỏ cột bắt buộc
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected = useMemo(
    () => ALL_KEYS.every((k) => selected.has(k)),
    [selected]
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set(REQUIRED_KEYS));
    } else {
      setSelected(new Set(ALL_KEYS));
    }
  };

  const handleExport = () => {
    if (selected.size === 0) return;
    // Giữ đúng thứ tự đã khai báo trong các nhóm.
    const orderedKeys = ALL_KEYS.filter((k) => selected.has(k));
    // asOfIso chỉ gửi khi có datePart — backend tự bỏ qua khi thiếu branchId.
    // Spread filters (đã là Record<string, any>) để tránh khai báo type mới.
    const exportFilters = { ...filters };
    if (asOfIso) exportFilters.asOfDate = asOfIso;
    exportToFile(exportFilters, orderedKeys);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Tùy chọn cột hiển thị</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Chọn ít nhất 1 cột để xuất file
              {selectedBranch?.name ? (
                <span className="ml-1">
                  · Chi nhánh:{" "}
                  <span className="font-medium text-gray-700">
                    {selectedBranch.name}
                  </span>
                </span>
              ) : null}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cấu hình tồn kho tại thời điểm */}
        <div className="px-6 py-3 border-b bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-gray-700">
              Tồn kho tại thời điểm
            </label>
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setShowPicker((v) => !v)}
                className="border rounded-lg px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-white focus:outline-none focus:ring-1 focus:ring-brand bg-white">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span
                  className={
                    asOfDisplay ? "text-gray-800" : "text-gray-400"
                  }>
                  {asOfDisplay || "Chọn ngày & giờ"}
                </span>
              </button>

              {showPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-xl p-3 z-50 w-[300px]">
                  {/* Header popup: nút đóng rõ ràng */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600">
                      Chọn thời điểm tính tồn
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPicker(false)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Calendar (dùng MiniCalendar shared, nhất quán style) */}
                  <MiniCalendar
                    value={datePart}
                    onChange={(d) => {
                      // MiniCalendar gửi "" khi bấm "Xóa" → giữ giờ phút.
                      setDatePart(d);
                    }}
                    onClose={() => {
                      /* Không tự đóng ở đây để user tiếp tục chọn giờ phút.
                         Đóng bằng nút X hoặc click ngoài. */
                    }}
                  />

                  {/* Chọn giờ phút */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-600">
                        Giờ phút
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={hour}
                        onChange={(e) => setHour(Number(e.target.value))}
                        className="border rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand">
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {String(i).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-500">:</span>
                      <select
                        value={minute}
                        onChange={(e) => setMinute(Number(e.target.value))}
                        className="border rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand">
                        {Array.from({ length: 60 }, (_, i) => (
                          <option key={i} value={i}>
                            {String(i).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-gray-400 ml-1">
                        (theo giờ địa phương)
                      </span>
                    </div>
                  </div>

                  {/* Footer popup */}
                  <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={clearAsOf}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">
                      Xóa thời điểm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPicker(false)}
                      className="text-xs text-brand hover:text-brand-dark font-medium px-3 py-1 rounded hover:bg-brand-soft">
                      Xong
                    </button>
                  </div>
                </div>
              )}
            </div>
            {asOfDisplay && (
              <button
                type="button"
                onClick={clearAsOf}
                className="text-xs text-gray-500 hover:text-gray-700 underline">
                Xóa
              </button>
            )}
            <p className="text-xs text-gray-500 w-full">
              Khi chọn thời điểm, cột <strong>Tồn kho</strong> sẽ được tính lại
              theo thời điểm này (theo chi nhánh đang chọn). Các cột khác (giá
              vốn, khách đặt, đặt NCC...) vẫn dùng giá trị hiện tại.
              {!selectedBranch?.id && (
                <span className="text-amber-600">
                  {" "}
                  — Cần chọn chi nhánh để áp dụng.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {COLUMN_GROUPS.map((group) => {
            const total = group.options.length;
            const count = group.options.filter((o) =>
              selected.has(o.key)
            ).length;
            return (
              <div key={group.title}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-sm text-gray-800">
                    {group.title}
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                    {count}/{total}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                  {group.options.map((opt) => {
                    const checked = selected.has(opt.key);
                    return (
                      <label
                        key={opt.key}
                        className={`flex items-center gap-2 text-sm ${
                          opt.required
                            ? "cursor-not-allowed text-gray-500"
                            : "cursor-pointer text-gray-700"
                        }`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={opt.required}
                          onChange={() => toggle(opt.key)}
                          className="cursor-pointer disabled:cursor-not-allowed accent-brand w-4 h-4"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          <button
            onClick={toggleSelectAll}
            className="text-sm text-brand hover:text-brand-dark font-medium">
            {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              Bỏ qua
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selected.size === 0}
              className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {isExporting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isExporting ? "Đang xuất..." : "Xuất file"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
