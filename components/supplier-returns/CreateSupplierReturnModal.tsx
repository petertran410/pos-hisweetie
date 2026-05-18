"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { X, Search, Plus, Trash2 } from "lucide-react";
import { useBranchStore } from "@/lib/store/branch";
import { useBranches } from "@/lib/hooks/useBranches";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { apiClient } from "@/lib/config/api";
import { formatCurrency } from "@/lib/utils";

interface Props {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface ReturnItem {
  productId: number;
  productCode: string;
  productName: string;
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseOrderId: number | null;
  purchaseOrderCode: string | null;
  requestQuantity: number;
  returnPrice: number;
  onHand?: number; // chỉ dùng cho by_product để hiển thị
}

type Mode = "by_purchase_order" | "by_product";

export function CreateSupplierReturnModal({ onClose, onSubmit }: Props) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const { data: suppliersData } = useSuppliers({
    isActive: true,
    pageSize: 200,
  });

  const [mode, setMode] = useState<Mode>("by_purchase_order");
  const [branchId, setBranchId] = useState<number | null>(
    selectedBranch?.id ?? null
  );

  // ── by_purchase_order state ───────────────────────────────────────────────
  const [poSearch, setPoSearch] = useState("");
  const [poResults, setPoResults] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [showPoDropdown, setShowPoDropdown] = useState(false);
  const [poLoading, setPoLoading] = useState(false);
  const poDropdownRef = useRef<HTMLDivElement>(null);

  // ── by_product state ──────────────────────────────────────────────────────
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // ── shared state ──────────────────────────────────────────────────────────
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [note, setNote] = useState("");
  const [displays, setDisplays] = useState<Record<string, string>>({});

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        poDropdownRef.current &&
        !poDropdownRef.current.contains(e.target as Node)
      )
        setShowPoDropdown(false);
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(e.target as Node)
      )
        setShowProductDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Sync branchId từ store ────────────────────────────────────────────────
  useEffect(() => {
    if (selectedBranch) setBranchId(selectedBranch.id);
  }, [selectedBranch]);

  // ── Reset khi đổi mode ───────────────────────────────────────────────────
  useEffect(() => {
    setReturnItems([]);
    setSelectedPO(null);
    setPoSearch("");
    setPoResults([]);
    setSupplierId(null);
    setProductSearch("");
    setProductResults([]);
    setDisplays({});
  }, [mode]);

  // ── Search PO (debounce 400ms) ────────────────────────────────────────────
  useEffect(() => {
    if (!poSearch.trim()) {
      setPoResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setPoLoading(true);
      try {
        const res = await apiClient.get("/purchase-orders", {
          search: poSearch,
          status: 1, // chỉ lấy PO đã hoàn thành
          pageSize: 10,
          currentItem: 0,
        });
        setPoResults(res.data || []);
        setShowPoDropdown(true);
      } catch {
        setPoResults([]);
      } finally {
        setPoLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [poSearch]);

  // ── Search product (debounce 400ms) ───────────────────────────────────────
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setProductLoading(true);
      try {
        const params: any = {
          search: productSearch,
          limit: 10,
          isActive: true,
        };
        if (branchId) params.branchId = branchId;
        const res = await apiClient.get("/products", params);
        setProductResults(res.data || []);
        setShowProductDropdown(true);
      } catch {
        setProductResults([]);
      } finally {
        setProductLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [productSearch, branchId]);

  // ── Chọn PO → load items ─────────────────────────────────────────────────
  const handleSelectPO = async (po: any) => {
    setSelectedPO(po);
    setPoSearch(po.code);
    setShowPoDropdown(false);

    // Load full PO detail để có items
    try {
      const detail = await apiClient.get(`/purchase-orders/${po.id}`);
      const items: ReturnItem[] = (detail.items || []).map((item: any) => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        purchaseQuantity: Number(item.quantity),
        purchasePrice: Number(item.price),
        purchaseOrderId: po.id,
        purchaseOrderCode: po.code,
        requestQuantity: 0,
        returnPrice: Number(item.price),
      }));
      setReturnItems(items);
      setDisplays({});
    } catch {
      setReturnItems([]);
    }
  };

  // ── Thêm sản phẩm (by_product) ───────────────────────────────────────────
  const handleAddProduct = (product: any) => {
    const alreadyAdded = returnItems.some((i) => i.productId === product.id);
    if (alreadyAdded) {
      setShowProductDropdown(false);
      return;
    }

    const inventory = product.inventories?.find(
      (inv: any) => inv.branchId === branchId
    );
    const onHand = Number(inventory?.onHand || 0);

    setReturnItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        purchaseQuantity: 0,
        purchasePrice: Number(product.basePrice || 0),
        purchaseOrderId: null,
        purchaseOrderCode: null,
        requestQuantity: 0,
        returnPrice: Number(product.basePrice || 0),
        onHand,
      },
    ]);
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Display helpers (tương tự CreateReturnOrderModal) ────────────────────
  const getDisplay = (idx: number, field: string, value: number) => {
    const key = `${idx}_${field}`;
    return displays[key] !== undefined
      ? displays[key]
      : value === 0
        ? ""
        : String(value);
  };

  const handleFieldChange = (
    idx: number,
    field: "requestQuantity" | "returnPrice",
    raw: string
  ) => {
    const key = `${idx}_${field}`;
    const onlyNums = raw.replace(/[^\d]/g, "");
    setDisplays((prev) => ({ ...prev, [key]: onlyNums }));
    const parsed = onlyNums === "" ? 0 : parseInt(onlyNums, 10);
    setReturnItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: parsed } : item))
    );
  };

  const handleFieldBlur = (idx: number, field: string) => {
    const key = `${idx}_${field}`;
    setDisplays((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // ── Tính tổng ─────────────────────────────────────────────────────────────
  const totalReturnAmount = useMemo(
    () =>
      returnItems.reduce(
        (sum, i) => sum + i.requestQuantity * i.returnPrice,
        0
      ),
    [returnItems]
  );

  // ── Validate submit ───────────────────────────────────────────────────────
  const canSubmit = useMemo(() => {
    if (!branchId) return false;
    const validItems = returnItems.filter((i) => i.requestQuantity > 0);
    if (validItems.length === 0) return false;
    if (mode === "by_purchase_order" && !selectedPO) return false;
    if (mode === "by_product" && !supplierId) return false;
    return true;
  }, [branchId, returnItems, mode, selectedPO, supplierId]);

  const buildSubmitData = (isDraft: boolean) => {
    const validItems = returnItems.filter((i) => i.requestQuantity > 0);
    const resolvedSupplierId =
      mode === "by_purchase_order" ? selectedPO?.supplierId : supplierId;

    return {
      mode,
      purchaseOrderId:
        mode === "by_purchase_order" ? selectedPO?.id : undefined,
      supplierId: resolvedSupplierId,
      branchId,
      note,
      isDraft,
      details: validItems.map((i) => ({
        purchaseOrderId: i.purchaseOrderId,
        purchaseOrderCode: i.purchaseOrderCode,
        productId: i.productId,
        productCode: i.productCode,
        productName: i.productName,
        purchaseQuantity: i.purchaseQuantity,
        purchasePrice: i.purchasePrice,
        requestQuantity: i.requestQuantity,
        returnPrice: i.returnPrice,
      })),
    };
  };

  const suppliers = suppliersData?.data || [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Tạo phiếu trả hàng nhập</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Mode toggle ─────────────────────────────────────────────────── */}
        <div className="px-5 pt-4 flex gap-2">
          {(["by_purchase_order", "by_product"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {m === "by_purchase_order" ? "Theo phiếu nhập" : "Sản phẩm lẻ"}
            </button>
          ))}
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Chi nhánh */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Chi nhánh
              </label>
              <select
                value={branchId ?? ""}
                onChange={(e) => setBranchId(Number(e.target.value) || null)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Chọn chi nhánh</option>
                {branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* NCC — chỉ hiện ở by_product */}
            {mode === "by_product" && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Nhà cung cấp
                </label>
                <select
                  value={supplierId ?? ""}
                  onChange={(e) =>
                    setSupplierId(Number(e.target.value) || null)
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Chọn nhà cung cấp</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── Mode by_purchase_order: tìm phiếu nhập ─────────────────── */}
          {mode === "by_purchase_order" && (
            <div ref={poDropdownRef} className="relative">
              <label className="block text-xs text-gray-500 mb-1">
                Tìm phiếu nhập hàng
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={poSearch}
                  onChange={(e) => {
                    setPoSearch(e.target.value);
                    setSelectedPO(null);
                    setReturnItems([]);
                  }}
                  placeholder="Nhập mã phiếu nhập (PN...)..."
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
                />
                {poLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Đang tìm...
                  </span>
                )}
              </div>

              {showPoDropdown && poResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-20 max-h-56 overflow-y-auto">
                  {poResults.map((po) => (
                    <button
                      key={po.id}
                      onClick={() => handleSelectPO(po)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-blue-600">
                          {po.code}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(po.purchaseDate).toLocaleDateString(
                            "vi-VN"
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        NCC: {po.supplier?.name} · Chi nhánh: {po.branch?.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedPO && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-700">
                      {selectedPO.code}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPO(null);
                        setPoSearch("");
                        setReturnItems([]);
                      }}
                      className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-gray-500 mt-0.5">
                    NCC: {selectedPO.supplier?.name} · {selectedPO.branch?.name}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Mode by_product: tìm sản phẩm ──────────────────────────── */}
          {mode === "by_product" && (
            <div ref={productDropdownRef} className="relative">
              <label className="block text-xs text-gray-500 mb-1">
                Thêm sản phẩm
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc mã sản phẩm..."
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
                />
                {productLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Đang tìm...
                  </span>
                )}
              </div>

              {showProductDropdown && productResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-20 max-h-56 overflow-y-auto">
                  {productResults.map((product) => {
                    const inv = product.inventories?.find(
                      (i: any) => i.branchId === branchId
                    );
                    const onHand = Number(inv?.onHand || 0);
                    const added = returnItems.some(
                      (i) => i.productId === product.id
                    );
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        disabled={added}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0 ${added ? "opacity-40 cursor-not-allowed" : ""}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {product.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            Tồn: {onHand}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {product.code}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Bảng sản phẩm ───────────────────────────────────────────── */}
          {returnItems.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">
                      Sản phẩm
                    </th>
                    {mode === "by_purchase_order" && (
                      <th className="text-right px-3 py-2 font-medium text-gray-600">
                        SL nhập
                      </th>
                    )}
                    {mode === "by_product" && (
                      <th className="text-right px-3 py-2 font-medium text-gray-600">
                        Tồn kho
                      </th>
                    )}
                    <th className="text-right px-3 py-2 font-medium text-gray-600">
                      SL trả
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">
                      Giá trả
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">
                      Thành tiền
                    </th>
                    {mode === "by_product" && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {returnItems.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-gray-400">
                          {item.productCode}
                        </div>
                      </td>

                      {/* SL nhập gốc hoặc tồn kho */}
                      {mode === "by_purchase_order" && (
                        <td className="px-3 py-2 text-right text-gray-500">
                          {item.purchaseQuantity}
                        </td>
                      )}
                      {mode === "by_product" && (
                        <td className="px-3 py-2 text-right text-gray-500">
                          {item.onHand ?? "-"}
                        </td>
                      )}

                      {/* SL trả */}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={getDisplay(
                            idx,
                            "requestQuantity",
                            item.requestQuantity
                          )}
                          onChange={(e) =>
                            handleFieldChange(
                              idx,
                              "requestQuantity",
                              e.target.value
                            )
                          }
                          onBlur={() => handleFieldBlur(idx, "requestQuantity")}
                          className={`w-20 border rounded px-2 py-1 text-right text-sm ${
                            mode === "by_purchase_order" &&
                            item.requestQuantity > item.purchaseQuantity
                              ? "border-red-400"
                              : ""
                          }`}
                        />
                      </td>

                      {/* Giá trả */}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={getDisplay(
                            idx,
                            "returnPrice",
                            item.returnPrice
                          )}
                          onChange={(e) =>
                            handleFieldChange(
                              idx,
                              "returnPrice",
                              e.target.value
                            )
                          }
                          onBlur={() => handleFieldBlur(idx, "returnPrice")}
                          className="w-28 border rounded px-2 py-1 text-right text-sm"
                        />
                      </td>

                      {/* Thành tiền */}
                      <td className="px-3 py-2 text-right font-medium">
                        {new Intl.NumberFormat("en-US").format(
                          item.requestQuantity * item.returnPrice
                        )}
                      </td>

                      {/* Xóa — chỉ by_product */}
                      {mode === "by_product" && (
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ghi chú */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ghi chú..."
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="p-5 border-t space-y-3">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Tổng tiền trả</span>
            <span className="text-blue-600">
              {formatCurrency(totalReturnAmount)}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
              Hủy
            </button>
            <button
              disabled={!canSubmit}
              onClick={() => onSubmit(buildSubmitData(true))}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
              Lưu tạm
            </button>
            <button
              disabled={!canSubmit}
              onClick={() => onSubmit(buildSubmitData(false))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40">
              Tạo phiếu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
