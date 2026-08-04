"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Trash2, Loader2, Upload } from "lucide-react";
import { useBranchStore } from "@/lib/store/branch";
import { useProducts } from "@/lib/hooks/useProducts";
import { useCreateStockConditionTransfer } from "@/lib/hooks/useStockConditionTransfers";
import { productsApi, type NearExpiryLot } from "@/lib/api/products";
import {
  DatePickerInput,
  formatMonthYear,
} from "@/components/ui/DatePickerInput";
import type {
  ConditionBucket,
  TransferDirection,
} from "@/lib/api/stock-condition-transfers";
import {
  StockConditionTransferImportModal,
  type ImportedTransferItem,
} from "./StockConditionTransferImportModal";

interface TransferItem {
  productId: number;
  productCode: string;
  productName: string;
  unit?: string;
  // Tồn từng loại lấy TRỰC TIẾP từ sổ cái (condition-summary) để luôn khớp tab
  // Thẻ kho loại tồn, tránh lệ thuộc cột cache có thể bị stale.
  good: number;
  damaged: number;
  nearExpiry: number;
  promo: number;
  // Các lô cận date hiện có (dùng khi điều chỉnh giảm cận date).
  nearExpiryLots: NearExpiryLot[];
  direction: TransferDirection; // IN = hàng tốt→loại; OUT = loại→hàng tốt
  toBucket: ConditionBucket;
  quantity: string;
  expiryDate: string;
  note: string;
}

interface Props {
  onClose: () => void;
}

// ISO → giá trị cho <input type="datetime-local"> theo giờ local.
function toDatetimeLocal(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Số lượng tối đa cho phép của một dòng, tùy chiều + loại.
function maxAllowed(i: TransferItem): number {
  if (i.direction === "IN") return i.good;
  // OUT: giới hạn theo tồn hiện có của loại.
  if (i.toBucket === "DAMAGED") return i.damaged;
  if (i.toBucket === "PROMO") return i.promo;
  // NEAR_EXPIRY OUT: theo tồn của đúng lô đã chọn.
  const lot = i.nearExpiryLots.find(
    (l) => (l.expiryDate || "") === (i.expiryDate || "")
  );
  return lot ? lot.quantity : 0;
}

export function StockConditionTransferForm({ onClose }: Props) {
  const { selectedBranch } = useBranchStore();
  const createTransfer = useCreateStockConditionTransfer();

  const [items, setItems] = useState<TransferItem[]>([]);
  const [note, setNote] = useState("");
  // Thời điểm điều chỉnh — cho phép lùi ngày (backdated) giống phiếu kiểm kho.
  const [transferDate, setTransferDate] = useState<string>(() =>
    toDatetimeLocal()
  );
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: productsData } = useProducts({
    search: searchDebounced,
    limit: 10,
    branchId: selectedBranch?.id,
  });

  const products = productsData?.data || [];

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      if (search) setShowDropdown(true);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addProduct = async (product: {
    id: number;
    code: string;
    name: string;
    unit?: string;
    inventories?: Array<{
      branchId: number;
      onHand?: number;
      damagedQuantity?: number;
      nearExpiryQuantity?: number;
      promoQuantity?: number;
    }>;
  }) => {
    if (items.some((i) => i.productId === product.id)) {
      setSearch("");
      setShowDropdown(false);
      return;
    }
    if (!selectedBranch?.id) return;

    setSearch("");
    setShowDropdown(false);

    // Lấy tồn từng loại + lô cận date từ các API độc lập. Không để lỗi API lô
    // cận date làm mất dữ liệu condition-summary (đặc biệt promo).
    let good = 0;
    let damaged = 0;
    let nearExpiry = 0;
    let promo = 0;
    let nearExpiryLots: NearExpiryLot[] = [];
    const inv = product.inventories?.find(
      (i: { branchId: number }) => i.branchId === selectedBranch?.id
    );

    try {
      const summary = await productsApi.getConditionSummary(
        product.id,
        selectedBranch.id
      );
      good = Number(summary.good) || 0;
      damaged = Number(summary.damaged) || 0;
      nearExpiry = Number(summary.nearExpiry) || 0;
      promo = Number(summary.promo) || 0;
    } catch {
      // Chỉ fallback khi chính condition-summary lỗi; không để lỗi API lô
      // cận date ghi đè promo lấy được từ sổ cái.
      if (inv) {
        damaged = Number(inv.damagedQuantity || 0);
        nearExpiry = Number(inv.nearExpiryQuantity || 0);
        promo = Number(inv.promoQuantity || 0);
        good = Number(inv.onHand) - damaged - nearExpiry - promo;
      }
    }

    try {
      const lotsResp = await productsApi.getNearExpiryLots(
        product.id,
        selectedBranch.id
      );
      nearExpiryLots = lotsResp.data || [];
    } catch {
      // Lô cận date chỉ cần cho OUT + NEAR_EXPIRY, không ảnh hưởng các bucket khác.
    }

    setItems((prev) => [
      {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        unit: product.unit,
        good,
        damaged,
        nearExpiry,
        promo,
        nearExpiryLots,
        direction: "IN",
        toBucket: "DAMAGED",
        quantity: "",
        expiryDate: "",
        note: "",
      },
      ...prev,
    ]);
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleImported = async (imported: ImportedTransferItem[]) => {
    const enriched = await Promise.all(
      imported.map(async (item) => {
        try {
          const [summary, lots] = await Promise.all([
            productsApi.getConditionSummary(item.productId, selectedBranch!.id),
            productsApi.getNearExpiryLots(item.productId, selectedBranch!.id),
          ]);
          return {
            ...item,
            good: Number(summary.good) || 0,
            damaged: Number(summary.damaged) || 0,
            nearExpiry: Number(summary.nearExpiry) || 0,
            promo: Number(summary.promo) || 0,
            nearExpiryLots: lots.data || [],
          };
        } catch {
          return { ...item, good: 0, damaged: 0, nearExpiry: 0, promo: 0, nearExpiryLots: [] };
        }
      })
    );
    setItems((prev) => {
      const map = new Map<number, TransferItem>();
      for (const item of prev) map.set(item.productId, item);
      for (const item of enriched) {
        const existing = map.get(item.productId);
        map.set(item.productId, {
          ...item,
          good: item.good,
          damaged: item.damaged,
          nearExpiry: item.nearExpiry,
          promo: item.promo,
          nearExpiryLots: item.nearExpiryLots,
          unit: item.unit,
          direction: item.direction,
          toBucket: item.toBucket,
          quantity: item.quantity,
          expiryDate: item.expiryDate,
          note: item.note,
          ...(existing ? {} : {}),
        });
      }
      return Array.from(map.values());
    });
  };

  const updateItem = (
    productId: number,
    field: keyof TransferItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, [field]: value } : i
      )
    );
  };

  const handleSubmit = () => {
    if (!selectedBranch) return;
    if (items.length === 0) return;

    // Validate từng dòng.
    for (const item of items) {
      const qty = parseInt(item.quantity) || 0;
      if (qty <= 0) {
        alert(`${item.productName}: Số lượng phải lớn hơn 0`);
        return;
      }
      // NSX chỉ BẮT BUỘC với chiều OUT (phải trừ vào đúng lô đang có tồn).
      // Chiều IN để trống được → vào "lô chưa xác định NSX", sau đó dùng chức
      // năng sửa phiếu để điền NSX khi biết. Khớp ràng buộc phía backend.
      if (
        item.toBucket === "NEAR_EXPIRY" &&
        item.direction === "OUT" &&
        !item.expiryDate
      ) {
        alert(`${item.productName}: Điều chỉnh giảm cận date phải chọn đúng lô`);
        return;
      }
      const max = maxAllowed(item);
      if (qty > max) {
        const what =
          item.direction === "IN"
            ? `hàng tốt khả dụng (${max})`
            : `tồn loại này hiện có (${max})`;
        alert(`${item.productName}: Số lượng (${qty}) vượt quá ${what}`);
        return;
      }
    }

    createTransfer.mutate(
      {
        branchId: selectedBranch.id,
        transferDate: transferDate
          ? new Date(transferDate).toISOString()
          : undefined,
        note: note || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          toBucket: i.toBucket,
          direction: i.direction,
          quantity: parseInt(i.quantity) || 0,
          expiryDate:
            i.toBucket === "NEAR_EXPIRY" && i.expiryDate
              ? i.expiryDate
              : undefined,
          note: i.note || undefined,
        })),
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-base font-semibold">
              Tạo phiếu chuyển loại tồn
            </h2>
            <span className="text-sm text-gray-500">
              Chi nhánh: <span className="font-medium text-gray-700">{selectedBranch?.name}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thời điểm điều chỉnh — cho phép lùi ngày */}
        <div className="px-6 py-3 border-b flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Thời điểm điều chỉnh
          </label>
          <input
            type="datetime-local"
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <span className="text-xs text-gray-400">
            Phiếu sẽ ghi nhận theo đúng thời điểm này
          </span>
        </div>

        {/* Search + import */}
        <div className="px-6 py-3 border-b" ref={dropdownRef}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => search && setShowDropdown(true)}
                placeholder="Tìm sản phẩm theo mã hoặc tên..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 whitespace-nowrap">
              <Upload className="w-4 h-4" />
              Import Excel
            </button>
          </div>
            {showDropdown && products.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-b shadow-lg z-10 max-h-60 overflow-auto">
                {products.map((p) => {
                  const already = items.some((i) => i.productId === p.id);
                  const inv = p.inventories?.find(
                    (i: { branchId: number }) => i.branchId === selectedBranch?.id
                  );
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      disabled={already}
                      className={`w-full text-left px-3 py-2 border-b last:border-b-0 flex items-center justify-between ${
                        already
                          ? "opacity-50 cursor-not-allowed bg-gray-50"
                          : "hover:bg-gray-50"
                      }`}>
                      <div>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {p.code}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Tồn: {inv ? Number(inv.onHand).toLocaleString() : 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {/* Items table */}
            {items.length > 0 && (
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Mã hàng</th>
                    <th className="px-3 py-2 text-left">Tên hàng</th>
                    <th className="px-3 py-2 text-center">Chiều</th>
                    <th className="px-3 py-2 text-center">Loại tồn</th>
                    <th className="px-3 py-2 text-right">Khả dụng</th>
                    <th className="px-3 py-2 text-center">Số lượng</th>
                    <th className="px-3 py-2 text-center">
                      NSX (tháng/năm)
                    </th>
                    <th className="px-3 py-2 text-left">Ghi chú</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const qty = parseInt(item.quantity) || 0;
                    const max = maxAllowed(item);
                    const isOverflow = qty > max;
                    const needExpiry = item.toBucket === "NEAR_EXPIRY";
                    const isOut = item.direction === "OUT";
                    return (
                      <tr key={item.productId} className="border-t">
                        <td className="px-3 py-2 text-xs">
                          {item.productCode}
                        </td>
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-center">
                          <select
                            value={item.direction}
                            onChange={(e) =>
                              // Đổi chiều → reset lô/số lượng để tránh lệch giới hạn.
                              setItems((prev) =>
                                prev.map((x) =>
                                  x.productId === item.productId
                                    ? {
                                        ...x,
                                        direction: e.target
                                          .value as TransferDirection,
                                        expiryDate: "",
                                        quantity: "",
                                      }
                                    : x
                                )
                              )
                            }
                            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-white">
                            <option value="IN">Chuyển vào</option>
                            <option value="OUT">Điều chỉnh giảm</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <select
                            value={item.toBucket}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((x) =>
                                  x.productId === item.productId
                                    ? {
                                        ...x,
                                        toBucket: e.target
                                          .value as ConditionBucket,
                                        expiryDate: "",
                                        quantity: "",
                                      }
                                    : x
                                )
                              )
                            }
                            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-white">
                            <option value="DAMAGED">Bục rách</option>
                            <option value="NEAR_EXPIRY">Cận date</option>
                            <option value="PROMO">Khuyến mãi</option>
                          </select>
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium ${isOut ? "text-amber-600" : "text-green-600"}`}>
                          {max.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                item.productId,
                                "quantity",
                                e.target.value.replace(/[^\d]/g, "")
                              )
                            }
                            placeholder="0"
                            className={`w-20 border rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 ${
                              isOverflow
                                ? "border-red-400 focus:ring-red-300"
                                : "focus:ring-brand"
                            }`}
                          />
                          {isOverflow && (
                            <div className="text-[10px] text-red-500 mt-0.5">
                              Vượt quá!
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {!needExpiry ? (
                            <span className="text-gray-300 text-xs">—</span>
                          ) : isOut ? (
                            // OUT cận date: chọn ĐÚNG lô đang có tồn.
                            <select
                              value={item.expiryDate}
                              onChange={(e) =>
                                updateItem(
                                  item.productId,
                                  "expiryDate",
                                  e.target.value
                                )
                              }
                              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-white">
                              <option value="">-- Chọn lô --</option>
                              {item.nearExpiryLots.map((l) => (
                                <option
                                  key={l.expiryDate || "null"}
                                  value={l.expiryDate || ""}>
                                  {l.expiryDate
                                    ? formatMonthYear(l.expiryDate)
                                    : "Chưa xác định"}{" "}
                                  ({l.quantity})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <DatePickerInput
                              monthOnly
                              value={item.expiryDate}
                              onChange={(v) =>
                                updateItem(item.productId, "expiryDate", v)
                              }
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.note}
                            onChange={(e) =>
                              updateItem(item.productId, "note", e.target.value)
                            }
                            placeholder="..."
                            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Tìm và thêm sản phẩm cần chuyển loại tồn ở trên
            </div>
          )}
        </div>

        <div className="px-6 pb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ghi chú
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú cho phiếu chuyển loại tồn..."
            maxLength={1000}
            rows={3}
            className="w-full border rounded px-3 py-2 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50 rounded-b-lg">
          <span className="text-sm text-gray-500">{items.length} sản phẩm</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-100">
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={items.length === 0 || createTransfer.isPending}
              className="px-4 py-2 text-sm bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {createTransfer.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Tạo phiếu
            </button>
          </div>
        </div>
      </div>
      {showImport && (
        <StockConditionTransferImportModal
          branchId={selectedBranch?.id}
          onClose={() => setShowImport(false)}
          onConfirm={handleImported}
        />
      )}
    </div>
  );
}
