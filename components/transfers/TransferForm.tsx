"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Building2,
  Check,
  ChevronDown,
} from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useProducts } from "@/lib/hooks/useProducts";
import {
  useCancelTransfer,
  useCreateTransfer,
  useUpdateTransfer,
} from "@/lib/hooks/useTransfers";
import { useBranchStore } from "@/lib/store/branch";
import type { Transfer } from "@/lib/api/transfers";
import { productsApi, type Product } from "@/lib/api/products";
import { toast } from "sonner";
import {
  formatCurrency,
  formatNumberInput,
  parseNumberInput,
} from "@/lib/utils";

interface TransferFormProps {
  transfer?: Transfer | null;
  copyMode?: boolean;
  onClose: () => void;
}

interface ProductItem {
  productId: number;
  productCode: string;
  productName: string;
  unit?: string;
  sendQuantity: number;
  receivedQuantity: number;
  price: number;
  fromInventory: number;
  toInventory: number;
  note?: string;
}

// ─── BranchDropdown ───────────────────────────────────────────────────────────
interface BranchOption {
  id: number;
  name: string;
}

function BranchDropdown({
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  value: number;
  options: BranchOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find((o) => o.id === value);

  if (disabled) {
    return (
      <div className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 text-gray-600 text-sm cursor-not-allowed">
        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="truncate">{selected?.name ?? placeholder}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm transition-all bg-white ${
          open
            ? "border-blue-500 ring-2 ring-blue-100"
            : "border-gray-300 hover:border-gray-400"
        }`}>
        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span
          className={`flex-1 text-left truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>
          {selected?.name ?? placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange(0);
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
              value === 0
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-500 hover:bg-gray-50"
            }`}>
            <span className="flex-1">{placeholder}</span>
            {value === 0 && <Check className="w-3.5 h-3.5 text-blue-500" />}
          </button>
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors border-t border-gray-50 ${
                value === opt.id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}>
              <span className="flex-1 truncate">{opt.name}</span>
              {value === opt.id && (
                <Check className="w-3.5 h-3.5 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TransferForm({ transfer, copyMode, onClose }: TransferFormProps) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();
  const cancelTransfer = useCancelTransfer();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [fromBranchId, setFromBranchId] = useState<number>(
    transfer?.fromBranchId || selectedBranch?.id || 0
  );
  const [toBranchId, setToBranchId] = useState<number>(
    transfer?.toBranchId || 0
  );
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [noteBySource, setNoteBySource] = useState(
    transfer?.noteBySource || ""
  );
  const [noteByDestination, setNoteByDestination] = useState(
    copyMode ? "" : transfer?.noteByDestination || ""
  );
  const isReceiver =
    !copyMode && !!transfer && selectedBranch?.id === transfer.toBranchId;
  const isSender =
    copyMode || !transfer || selectedBranch?.id === transfer.fromBranchId;
  const isCancelled = !copyMode && transfer?.status === 4;
  const isDraft = copyMode || !transfer || transfer.status === 1;
  const isInTransit = !copyMode && transfer?.status === 2;
  const isReceived = !copyMode && transfer?.status === 3;
  const isReadOnly = isCancelled || isReceived;
  const canEditProducts = isSender && isDraft && !isCancelled;

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { data: searchResults } = useProducts({
    search: searchQuery,
    branchIds: [fromBranchId, toBranchId].filter((id) => id > 0),
  });

  const handleChangeReceivedQuantity = (index: number, value: string) => {
    // Cho phép input rỗng (đang gõ) — coi như 0
    const sanitized = value.replace(/[^\d.]/g, "");
    const quantity = sanitized === "" ? 0 : parseFloat(sanitized) || 0;

    if (quantity < 0) return;

    if (quantity > products[index].sendQuantity) {
      toast.error(
        `Số lượng nhận không được lớn hơn số lượng chuyển (${products[index].sendQuantity})`
      );
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      updated[index].receivedQuantity = quantity;
      return updated;
    });
  };

  const handleCancel = async () => {
    if (!transfer?.id) return;

    try {
      await cancelTransfer.mutateAsync({
        id: transfer.id,
        data: { cancelReason },
      });
      toast.success("Hủy phiếu chuyển hàng thành công");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra khi hủy phiếu");
    }
  };

  const activeBranches = branches?.filter((b) => b.isActive) ?? [];
  const fromBranchOptions = activeBranches.filter((b) => b.id !== toBranchId);
  const toBranchOptions = activeBranches.filter((b) => b.id !== fromBranchId);

  useEffect(() => {
    if (transfer?.details && fromBranchId && toBranchId) {
      const abortController = new AbortController();
      let isActive = true;

      const loadProductsWithInventory = async () => {
        try {
          const productsWithInventory = await Promise.all(
            transfer.details.map(async (detail) => {
              try {
                const product = await productsApi.getProduct(detail.productId);

                const fromInventory = product.inventories?.find(
                  (inv: any) => inv.branchId === fromBranchId
                );
                const toInventory = product.inventories?.find(
                  (inv: any) => inv.branchId === toBranchId
                );

                return {
                  productId: detail.productId,
                  productCode: detail.productCode,
                  productName: detail.productName,
                  unit: product.unit,
                  sendQuantity: Number(detail.sendQuantity),
                  receivedQuantity: isReceiver
                    ? Number(detail.receivedQuantity) ||
                      Number(detail.sendQuantity)
                    : Number(detail.sendQuantity),
                  price: Number(detail.sendPrice),
                  fromInventory: Number(fromInventory?.onHand || 0),
                  toInventory: Number(toInventory?.onHand || 0),
                };
              } catch (error: any) {
                if (error.name === "AbortError") {
                  return error;
                }
                return error;
              }
            })
          );

          if (isActive && !abortController.signal.aborted) {
            setProducts(productsWithInventory);
          }
        } catch (error) {
          console.error("Error updating products inventory:", error);
        }
      };

      loadProductsWithInventory();

      return () => {
        isActive = false;
        abortController.abort();
      };
    }
  }, [fromBranchId, toBranchId, transfer, isReceiver]);

  useEffect(() => {
    if (!fromBranchId || !toBranchId || products.length === 0) return;

    const abortController = new AbortController();
    let isLatestRequest = true;

    const updateProductsInventory = async () => {
      try {
        const updatedProducts = await Promise.all(
          products.map(async (item) => {
            try {
              const product = await productsApi.getProduct(item.productId);

              const fromInventory = product.inventories?.find(
                (inv: any) => inv.branchId === fromBranchId
              );
              const toInventory = product.inventories?.find(
                (inv: any) => inv.branchId === toBranchId
              );

              return {
                ...item,
                fromInventory: Number(fromInventory?.onHand || 0),
                toInventory: Number(toInventory?.onHand || 0),
              };
            } catch (error) {
              return item;
            }
          })
        );

        if (isLatestRequest && !abortController.signal.aborted) {
          setProducts(updatedProducts);
        }
      } catch (error) {
        console.error("Error updating inventory:", error);
      }
    };

    updateProductsInventory();

    return () => {
      isLatestRequest = false;
      abortController.abort();
    };
  }, [fromBranchId, toBranchId]);

  const handleAddProduct = async (product: Product) => {
    if (products.some((p) => p.productId === product.id)) {
      toast.error("Sản phẩm đã có trong danh sách");
      return;
    }

    const fromInventory = product.inventories?.find(
      (inv: any) => inv.branchId === fromBranchId
    );
    const toInventory = product.inventories?.find(
      (inv: any) => inv.branchId === toBranchId
    );

    if (!toInventory && toBranchId) {
      const toBranchName =
        branches?.find((b) => b.id === toBranchId)?.name || "chi nhánh đích";
      toast.error(
        `Sản phẩm "${product.code}" chưa tồn tại ở ${toBranchName}. Vui lòng tạo sản phẩm tại chi nhánh đích trước khi chuyển hàng.`,
        {
          duration: 5000,
        }
      );
      return;
    }

    if (!fromInventory) {
      const fromBranchName =
        branches?.find((b) => b.id === fromBranchId)?.name || "chi nhánh nguồn";
      toast.error(
        `Sản phẩm "${product.code}" chưa tồn tại ở ${fromBranchName}.`,
        {
          duration: 5000,
        }
      );
      return;
    }

    const newProduct: ProductItem = {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      unit: product.unit,
      sendQuantity: 1,
      price: Number(fromInventory?.cost || 0),
      fromInventory: Number(fromInventory?.onHand || 0),
      toInventory: Number(toInventory?.onHand || 0),
      receivedQuantity: 0,
    };

    setProducts((prev) => [...prev, newProduct]);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    const currentProduct = products[index];
    if (!currentProduct) return;

    const newQuantity = currentProduct.sendQuantity + delta;

    if (newQuantity < 1) {
      toast.error("Số lượng chuyển không được nhỏ hơn 1");
      return;
    }

    if (newQuantity > currentProduct.fromInventory) {
      toast.error(
        `Số lượng chuyển vượt quá tồn kho (${currentProduct.fromInventory})`
      );
      return;
    }

    const updatedProducts = [...products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      sendQuantity: newQuantity,
    };

    setProducts(updatedProducts);
  };

  const handleUpdateReceivedQuantity = (index: number, delta: number) => {
    const currentProduct = products[index];
    if (!currentProduct) return;

    const newQuantity = currentProduct.receivedQuantity + delta;

    if (newQuantity < 0) {
      toast.error("Số lượng nhận không được nhỏ hơn 0");
      return;
    }

    if (newQuantity > currentProduct.sendQuantity) {
      toast.error(
        `Số lượng nhận không được lớn hơn số lượng chuyển (${currentProduct.sendQuantity})`
      );
      return;
    }

    const updatedProducts = [...products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      receivedQuantity: newQuantity,
    };

    setProducts(updatedProducts);
  };

  const handleChangeQuantity = (index: number, value: string) => {
    const quantity = parseFloat(value) || 0;

    if (quantity < 0) return;

    if (quantity > products[index].fromInventory) {
      toast.error(
        `Số lượng chuyển vượt quá tồn kho (${products[index].fromInventory})`
      );
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      updated[index].sendQuantity = quantity;
      return updated;
    });
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!fromBranchId) {
      toast.error("Vui lòng chọn chi nhánh chuyển");
      return;
    }

    if (!toBranchId) {
      toast.error("Vui lòng chọn chi nhánh nhận");
      return;
    }

    if (fromBranchId === toBranchId) {
      toast.error("Chi nhánh chuyển và nhận không được trùng nhau");
      return;
    }

    if (products.length === 0) {
      toast.error("Vui lòng thêm ít nhất một sản phẩm");
      return;
    }

    const hasInvalidQuantity = products.some((p) => p.sendQuantity <= 0);
    if (hasInvalidQuantity) {
      toast.error("Số lượng chuyển phải lớn hơn 0");
      return;
    }

    let newStatus: number;
    if (isReceiver) {
      newStatus = isDraft ? 2 : 3;
    } else {
      newStatus = isDraft ? 1 : 2;
    }

    const transferData = {
      fromBranchId,
      toBranchId,
      isDraft: false,
      description: noteBySource,
      destination_description: noteByDestination,
      status: newStatus,
      transferDetails: products.map((p) => ({
        productCode: p.productCode,
        productId: p.productId,
        sendQuantity: p.sendQuantity,
        receivedQuantity: isReceiver ? p.receivedQuantity : p.sendQuantity,
        price: p.price,
      })),
    };

    try {
      if (transfer?.id && !copyMode) {
        await updateTransfer.mutateAsync({
          id: transfer.id,
          data: transferData,
        });
        toast.success(
          isReceiver && !isDraft
            ? "Nhận hàng thành công"
            : "Cập nhật phiếu chuyển hàng thành công"
        );
      } else {
        await createTransfer.mutateAsync(transferData);
        toast.success(
          copyMode
            ? "Sao chép phiếu chuyển hàng thành công"
            : "Tạo phiếu chuyển hàng thành công"
        );
      }
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra khi lưu phiếu chuyển hàng", {
        duration: 5000,
      });
    }
  };

  const handleSubmitWithStatus = async (statusToKeep: number) => {
    if (!fromBranchId || !toBranchId || !transfer?.id) return;

    if (products.length === 0) {
      toast.error("Vui lòng thêm ít nhất một sản phẩm");
      return;
    }

    const transferData = {
      fromBranchId,
      toBranchId,
      isDraft: false,
      description: noteBySource,
      destination_description: noteByDestination,
      status: statusToKeep,
      transferDetails: products.map((p) => ({
        productCode: p.productCode,
        productId: p.productId,
        sendQuantity: p.sendQuantity,
        receivedQuantity: isReceiver ? p.receivedQuantity : p.sendQuantity,
        price: p.price,
      })),
    };

    try {
      await updateTransfer.mutateAsync({
        id: transfer.id,
        data: transferData,
      });
      toast.success("Lưu thông tin phiếu chuyển hàng thành công");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra khi lưu phiếu chuyển hàng", {
        duration: 5000,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[1280px] max-h-[calc(100vh-2rem)] bg-white flex flex-col shadow-2xl rounded-lg">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {transfer && !copyMode
                ? isReceiver
                  ? "Xác nhận nhận hàng"
                  : "Chi tiết phiếu chuyển hàng"
                : "Tạo phiếu chuyển hàng"}
            </h2>
            {transfer && !copyMode && (
              <p className="text-sm text-blue-600 font-medium mt-0.5">
                {transfer.code}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* ── Section: Chi nhánh ── */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Thông tin chuyển hàng
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Chuyển từ <span className="text-red-500">*</span>
                  </label>
                  <BranchDropdown
                    value={fromBranchId}
                    options={fromBranchOptions}
                    placeholder="Chọn chi nhánh"
                    disabled={(!!transfer && !copyMode) || isReadOnly}
                    onChange={setFromBranchId}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Chuyển tới <span className="text-red-500">*</span>
                  </label>
                  <BranchDropdown
                    value={toBranchId}
                    options={toBranchOptions}
                    placeholder="Chọn chi nhánh"
                    disabled={(!!transfer && !copyMode) || isReadOnly}
                    onChange={setToBranchId}
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Tìm sản phẩm ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hàng hóa
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    canEditProducts
                      ? "Tìm theo mã hoặc tên sản phẩm..."
                      : "Không thể thêm sản phẩm ở trạng thái này"
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    if (!canEditProducts) return;
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => canEditProducts && setShowSearchResults(true)}
                  onBlur={() =>
                    setTimeout(() => setShowSearchResults(false), 200)
                  }
                  disabled={!canEditProducts}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />

                {showSearchResults && searchQuery && searchResults?.data && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto z-50">
                    {searchResults.data.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Không tìm thấy sản phẩm
                      </div>
                    ) : (
                      searchResults.data.map((product) => {
                        const fromInv = product.inventories?.find(
                          (inv: any) => inv.branchId === fromBranchId
                        );
                        const toInv = product.inventories?.find(
                          (inv: any) => inv.branchId === toBranchId
                        );
                        return (
                          <div
                            key={product.id}
                            onClick={() => handleAddProduct(product)}
                            className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {product.code} — {product.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                                <span>
                                  Tồn chuyển:{" "}
                                  <span className="font-medium text-gray-700">
                                    {Number(
                                      fromInv?.onHand ?? 0
                                    ).toLocaleString()}
                                  </span>
                                </span>
                                <span>
                                  Tồn nhận:{" "}
                                  <span className="font-medium text-gray-700">
                                    {Number(
                                      toInv?.onHand ?? 0
                                    ).toLocaleString()}
                                  </span>
                                </span>
                                <span>
                                  Giá:{" "}
                                  <span className="font-medium text-blue-600">
                                    {Number(
                                      fromInv?.cost ?? 0
                                    ).toLocaleString()}{" "}
                                    đ
                                  </span>
                                </span>
                              </div>
                            </div>
                            <Plus className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Bảng sản phẩm ── */}
            {products.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                          STT
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Mã hàng
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Tên hàng
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Tồn ({transfer?.fromBranchName ?? "Chuyển từ"})
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Tồn ({transfer?.toBranchName ?? "Chuyển tới"})
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          SL chuyển
                        </th>
                        {isReceiver && (
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            SL nhận
                          </th>
                        )}
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {isReceiver ? "Đơn giá chuyển" : "Đơn giá"}
                        </th>
                        {isReceiver && (
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Đơn giá nhận
                          </th>
                        )}
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {isReceiver ? "Thành tiền chuyển" : "Thành tiền"}
                        </th>
                        {canEditProducts && <th className="px-4 py-3 w-10" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.map((item, index) => (
                        <tr
                          key={item.productId}
                          className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 text-center">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {item.productCode}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                            <div className="truncate">{item.productName}</div>
                            {item.unit && (
                              <div className="text-xs text-gray-400">
                                {item.unit}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {Number(item.fromInventory).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {Number(item.toInventory).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {isSender && (!transfer || copyMode) ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateQuantity(index, -1);
                                  }}
                                  disabled={
                                    isReadOnly ||
                                    isReceived ||
                                    item.sendQuantity <= 0
                                  }
                                  className="w-7 h-7 border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 flex items-center justify-center">
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={
                                    item.sendQuantity === 0
                                      ? ""
                                      : item.sendQuantity
                                  }
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleChangeQuantity(index, e.target.value)
                                  }
                                  disabled={isReadOnly || isReceived}
                                  className="w-16 border rounded-lg px-2 py-1 text-center text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateQuantity(index, 1);
                                  }}
                                  disabled={isReadOnly || isReceived}
                                  className="w-7 h-7 border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 flex items-center justify-center">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-center text-sm text-gray-900 font-medium">
                                {item.sendQuantity.toLocaleString()}
                              </div>
                            )}
                          </td>

                          {isReceiver && (
                            <td className="px-4 py-3">
                              {isInTransit && !isCancelled ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateReceivedQuantity(index, -1);
                                    }}
                                    disabled={
                                      isReadOnly ||
                                      isSender ||
                                      item.receivedQuantity <= 0
                                    }
                                    className="w-7 h-7 border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 flex items-center justify-center">
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={item.receivedQuantity}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleChangeReceivedQuantity(
                                        index,
                                        e.target.value
                                      )
                                    }
                                    onFocus={(e) => e.target.select()}
                                    disabled={isReadOnly}
                                    className="w-16 border rounded-lg px-2 py-1 text-center text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateReceivedQuantity(index, 1);
                                    }}
                                    disabled={isReadOnly || isSender}
                                    className="w-7 h-7 border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 flex items-center justify-center">
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-center text-sm text-gray-900 font-medium">
                                  {item.receivedQuantity.toLocaleString()}
                                </div>
                              )}
                            </td>
                          )}

                          <td className="px-4 py-3 text-right text-sm text-gray-700">
                            {isSender && (!transfer || copyMode) ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatCurrency(item.price)}
                                placeholder="0"
                                onChange={(e) => {
                                  const price = parseNumberInput(
                                    e.target.value
                                  );
                                  setProducts((prev) => {
                                    const updated = [...prev];
                                    updated[index].price = price;
                                    return updated;
                                  });
                                }}
                                disabled={isReadOnly}
                                className="w-28 border rounded-lg px-2 py-1 text-right text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            ) : (
                              <span>{formatCurrency(item.price)} đ</span>
                            )}
                          </td>

                          {isReceiver && (
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {formatCurrency(item.price)} đ
                            </td>
                          )}

                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(item.sendQuantity * item.price)} đ
                          </td>

                          {canEditProducts && (
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setProducts((prev) =>
                                    prev.filter((_, i) => i !== index)
                                  )
                                }
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Ghi chú ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isReceiver ? "Ghi chú từ chi nhánh nhận" : "Ghi chú"}
              </label>
              {isReceiver ? (
                <>
                  <textarea
                    value={noteByDestination}
                    onChange={(e) =>
                      setNoteByDestination(e.target.value.slice(0, 1000))
                    }
                    maxLength={1000}
                    disabled={isCancelled}
                    placeholder="Nhập ghi chú từ chi nhánh nhận..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                  {transfer?.noteBySource && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1 font-medium">
                        Ghi chú từ chi nhánh chuyển:
                      </p>
                      <p className="text-sm text-gray-800">
                        {transfer.noteBySource}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <textarea
                    value={noteBySource}
                    onChange={(e) =>
                      setNoteBySource(e.target.value.slice(0, 1000))
                    }
                    maxLength={1000}
                    disabled={isCancelled}
                    placeholder="Nhập ghi chú cho phiếu chuyển hàng..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                  {transfer?.noteByDestination && isInTransit && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 mb-1 font-medium">
                        Ghi chú từ chi nhánh nhận:
                      </p>
                      <p className="text-sm text-gray-800">
                        {transfer.noteByDestination}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t px-6 py-4 bg-white shrink-0 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={
              createTransfer.isPending ||
              updateTransfer.isPending ||
              cancelTransfer.isPending
            }
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed">
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {/* CHỦ YẾU CHI NHÁNH CHUYỂN ĐI */}
            {isSender && !isCancelled && (
              <>
                {isDraft && (
                  <>
                    {!copyMode && (
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        disabled={cancelTransfer.isPending}
                        className="px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {cancelTransfer.isPending ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            Đang hủy...
                          </>
                        ) : (
                          "Hủy phiếu"
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleSubmit(true)}
                      disabled={
                        createTransfer.isPending ||
                        updateTransfer.isPending ||
                        cancelTransfer.isPending
                      }
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      {createTransfer.isPending || updateTransfer.isPending ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        "Lưu tạm"
                      )}
                    </button>
                    <button
                      onClick={() => handleSubmit(false)}
                      disabled={
                        createTransfer.isPending ||
                        updateTransfer.isPending ||
                        cancelTransfer.isPending
                      }
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      {createTransfer.isPending || updateTransfer.isPending ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        "Đang chuyển"
                      )}
                    </button>
                  </>
                )}
                {(isInTransit || isReceived) && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={cancelTransfer.isPending}
                    className="px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {cancelTransfer.isPending ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        Đang hủy...
                      </>
                    ) : (
                      "Hủy phiếu"
                    )}
                  </button>
                )}
              </>
            )}

            {/* CHI NHÁNH NHẬN */}
            {isReceiver && !isCancelled && (isInTransit || isReceived) && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={cancelTransfer.isPending}
                className="px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {cancelTransfer.isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    Đang hủy...
                  </>
                ) : (
                  "Hủy phiếu"
                )}
              </button>
            )}
            {isReceiver && !isCancelled && isInTransit && (
              <button
                onClick={() => handleSubmit(false)}
                disabled={updateTransfer.isPending || cancelTransfer.isPending}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {updateTransfer.isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Nhận hàng"
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Modal xác nhận hủy ── */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Xác nhận hủy phiếu
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Bạn có chắc chắn muốn hủy phiếu chuyển hàng này?
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Lý do hủy (tùy chọn)..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setCancelReason("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-medium">
                  Đóng
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelTransfer.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 font-medium disabled:opacity-50">
                  {cancelTransfer.isPending ? "Đang hủy..." : "Xác nhận hủy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
