"use client";

import { useState, useEffect } from "react";
import { X, Search, Plus, Minus, Trash2 } from "lucide-react";
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

interface TransferFormProps {
  transfer?: Transfer | null;
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

export function TransferForm({ transfer, onClose }: TransferFormProps) {
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
    transfer?.noteByDestination || ""
  );
  const isReceiver = transfer && selectedBranch?.id === transfer.toBranchId;
  const isSender = !transfer || selectedBranch?.id === transfer.fromBranchId;
  const isCancelled = transfer?.status === 4;
  const isDraft = !transfer || transfer.status === 1;
  const isInTransit = transfer?.status === 2;
  const isReceived = transfer?.status === 3;
  const isReadOnly = isCancelled || isReceived;
  const canEditProducts = isSender && isDraft && !isCancelled;

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { data: searchResults } = useProducts({
    search: searchQuery,
    limit: 20,
    branchIds: [fromBranchId, toBranchId].filter((id) => id > 0),
  });

  const handleChangeReceivedQuantity = (index: number, value: string) => {
    const quantity = parseFloat(value) || 0;

    if (quantity < 1) {
      toast.error("Số lượng nhận không được nhỏ hơn 1");
      return;
    }

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
                    ? Number(detail.receivedQuantity || detail.sendQuantity)
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

    if (newQuantity < 1) {
      toast.error("Số lượng nhận không được nhỏ hơn 1");
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

    if (quantity < 1) {
      toast.error("Số lượng chuyển không được nhỏ hơn 1");
      return;
    }

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

  const handleChangePrice = (index: number, value: string) => {
    const price = parseFloat(value) || 0;

    if (price < 0) {
      toast.error("Đơn giá không được nhỏ hơn 0");
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      updated[index].price = price;
      return updated;
    });
  };

  const handleRemoveProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
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

    const productsWithoutDestInventory = products.filter(
      (p) => p.toInventory === undefined || p.toInventory < 0
    );
    if (!isDraft && productsWithoutDestInventory.length > 0) {
      const productCodes = productsWithoutDestInventory
        .map((p) => p.productCode)
        .join(", ");
      const toBranchName =
        branches?.find((b) => b.id === toBranchId)?.name || "chi nhánh đích";
      toast.error(
        `Các sản phẩm sau chưa tồn tại ở ${toBranchName}: ${productCodes}. Vui lòng tạo sản phẩm tại chi nhánh đích trước.`,
        {
          duration: 6000,
        }
      );
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
      if (transfer?.id) {
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
        toast.success("Tạo phiếu chuyển hàng thành công");
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

    const productsWithoutDestInventory = products.filter(
      (p) => p.toInventory === undefined || p.toInventory < 0
    );
    if (statusToKeep >= 2 && productsWithoutDestInventory.length > 0) {
      const productCodes = productsWithoutDestInventory
        .map((p) => p.productCode)
        .join(", ");
      const toBranchName =
        branches?.find((b) => b.id === toBranchId)?.name || "chi nhánh đích";
      toast.error(
        `Các sản phẩm sau chưa tồn tại ở ${toBranchName}: ${productCodes}. Vui lòng tạo sản phẩm tại chi nhánh đích trước.`,
        {
          duration: 6000,
        }
      );
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
      <div className="bg-white w-full max-w-7xl max-h-[95vh] flex flex-col rounded-lg shadow-xl">
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold">
              {transfer
                ? "Chi tiết phiếu chuyển hàng"
                : "Tạo phiếu chuyển hàng"}
            </h2>
            {transfer && (
              <p className="text-sm text-gray-600 mt-1">
                Mã phiếu: {transfer.code}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chuyển từ <span className="text-red-500">*</span>
                </label>
                <select
                  value={fromBranchId}
                  onChange={(e) => setFromBranchId(Number(e.target.value))}
                  disabled={!!transfer || isReadOnly}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600">
                  {transfer ? (
                    <option value={transfer.fromBranchId}>
                      {transfer.fromBranchName}
                    </option>
                  ) : (
                    <>
                      <option value={selectedBranch?.id}>
                        {selectedBranch?.name || "Chọn chi nhánh"}
                      </option>
                      {branches
                        ?.filter((b) => b.id !== toBranchId)
                        .map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chuyển tới <span className="text-red-500">*</span>
                </label>
                <select
                  value={toBranchId}
                  onChange={(e) => setToBranchId(Number(e.target.value))}
                  disabled={!!transfer || isReadOnly}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600">
                  {transfer ? (
                    <option value={transfer.toBranchId}>
                      {transfer.toBranchName}
                    </option>
                  ) : (
                    <>
                      <option value="">Chọn chi nhánh</option>
                      {branches
                        ?.filter((b) => b.id !== fromBranchId)
                        .map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* TỔNG SỐ LƯỢNG */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tổng số lượng
              </label>
              <div className="text-2xl font-bold text-gray-900">
                {products.length}
              </div>
            </div>

            {/* TÌM KIẾM SẢN PHẨM */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tìm hàng hóa theo mã hoặc tên
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={
                    canEditProducts
                      ? "Tìm kiếm sản phẩm..."
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>

              {/* KẾT QUẢ TÌM KIẾM */}
              {showSearchResults && searchQuery && searchResults?.data && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
                  {searchResults.data.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Không tìm thấy sản phẩm
                    </div>
                  ) : (
                    searchResults.data.map((product) => {
                      const fromInventory = product.inventories?.find(
                        (inv: any) => inv.branchId === fromBranchId
                      );
                      const toInventory = product.inventories?.find(
                        (inv: any) => inv.branchId === toBranchId
                      );

                      return (
                        <div
                          key={product.id}
                          onClick={() => handleAddProduct(product)}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {product.code} - {product.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Tồn kho chuyển:{" "}
                                {Number(
                                  fromInventory?.onHand || 0
                                ).toLocaleString()}{" "}
                                - Tồn kho nhận:{" "}
                                {Number(
                                  toInventory?.onHand || 0
                                ).toLocaleString()}{" "}
                                - Đơn giá:{" "}
                                {Number(
                                  fromInventory?.cost || 0
                                ).toLocaleString()}{" "}
                                đ
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {products.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          STT
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          Mã hàng
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          Tên hàng
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          Tồn kho ({transfer?.fromBranchName || "Chuyển từ"})
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          Tồn kho ({transfer?.toBranchName || "Chuyển tới"})
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          SL chuyển
                        </th>

                        {isReceiver && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                            SL nhận
                          </th>
                        )}

                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          {isReceiver ? "Đơn giá chuyển" : "Đơn giá"}
                        </th>

                        {isReceiver && (
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                            Đơn giá nhận
                          </th>
                        )}

                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          {isReceiver ? "Thành tiền chuyển" : "Thành tiền"}
                        </th>

                        {isReceiver && (
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                            Thành tiền nhận
                          </th>
                        )}

                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((item, index) => {
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {item.productCode}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 min-w-[200px]">
                              {item.productName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {item.fromInventory.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {item.toInventory.toLocaleString()}
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              {isSender && !isReadOnly && !isReceived ? (
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
                                      item.sendQuantity <= 1
                                    }
                                    className="w-8 h-8 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
                                    -
                                  </button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min="1"
                                    value={item.sendQuantity}
                                    onChange={(e) =>
                                      handleChangeQuantity(
                                        index,
                                        e.target.value
                                      )
                                    }
                                    disabled={isReadOnly || isReceived}
                                    className="w-20 border rounded px-2 py-1 text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateQuantity(index, 1);
                                    }}
                                    disabled={isReadOnly || isReceived}
                                    className="w-8 h-8 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
                                    +
                                  </button>
                                </div>
                              ) : (
                                <div className="text-center text-sm text-gray-900">
                                  {item.sendQuantity.toLocaleString()}
                                </div>
                              )}
                            </td>

                            {isReceiver && (
                              <td className="px-4 py-3 whitespace-nowrap">
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
                                        item.receivedQuantity <= 1
                                      }
                                      className="w-8 h-8 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
                                      -
                                    </button>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      min="1"
                                      value={item.receivedQuantity}
                                      onChange={(e) =>
                                        handleChangeReceivedQuantity(
                                          index,
                                          e.target.value
                                        )
                                      }
                                      disabled={isReadOnly}
                                      className="w-20 border rounded px-2 py-1 text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateReceivedQuantity(index, 1);
                                      }}
                                      disabled={isReadOnly || isSender}
                                      className="w-8 h-8 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center text-sm text-gray-900">
                                    {item.receivedQuantity.toLocaleString()}
                                  </div>
                                )}
                              </td>
                            )}

                            <td className="px-4 py-3 whitespace-nowrap">
                              {isSender && !transfer ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={item.price}
                                  onChange={(e) =>
                                    handleChangePrice(index, e.target.value)
                                  }
                                  disabled={isReadOnly || !isSender}
                                  className="w-24 border rounded px-2 py-1 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              ) : (
                                <div className="text-right text-sm text-gray-900">
                                  {item.price.toLocaleString()} đ
                                </div>
                              )}
                            </td>

                            {isReceiver && (
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                                {item.price.toLocaleString()} đ
                              </td>
                            )}

                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                              {(
                                item.sendQuantity * item.price
                              ).toLocaleString()}{" "}
                              đ
                            </td>

                            {isReceiver && (
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">
                                {(
                                  item.receivedQuantity * item.price
                                ).toLocaleString()}{" "}
                                đ
                              </td>
                            )}

                            {isSender && isDraft && !isCancelled && (
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleRemoveProduct(index)}
                                  className="p-1 hover:bg-red-50 rounded transition text-red-600"
                                  title="Xóa sản phẩm">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isReceiver ? "Ghi chú từ chi nhánh nhận" : "Ghi chú"}
              </label>

              {isReceiver ? (
                <>
                  <textarea
                    value={noteByDestination}
                    onChange={(e) => setNoteByDestination(e.target.value)}
                    disabled={isCancelled}
                    placeholder="Nhập ghi chú từ chi nhánh nhận..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  {transfer?.noteBySource && (
                    <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1 font-medium">
                        Ghi chú từ chi nhánh chuyển:
                      </p>
                      <p className="text-sm text-gray-900">
                        {transfer.noteBySource}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <textarea
                    value={noteBySource}
                    onChange={(e) => setNoteBySource(e.target.value)}
                    disabled={isCancelled}
                    placeholder="Nhập ghi chú cho phiếu chuyển hàng..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  {transfer?.noteByDestination && isInTransit && (
                    <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs text-blue-600 mb-1 font-medium">
                        Ghi chú từ chi nhánh nhận:
                      </p>
                      <p className="text-sm text-gray-900">
                        {transfer.noteByDestination}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-between">
          <div>
            <button
              onClick={onClose}
              disabled={
                createTransfer.isPending ||
                updateTransfer.isPending ||
                cancelTransfer.isPending
              }
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              Đóng
            </button>
          </div>

          <div className="flex gap-3">
            {/* ĐÃ HỦY: KHÔNG HIỂN THỊ BUTTON NÀO */}
            {isCancelled && (
              <div className="px-6 py-2.5 bg-red-50 text-red-700 rounded-lg font-medium border border-red-200">
                Phiếu đã bị hủy
              </div>
            )}

            {/* CHỈ CHI NHÁNH "CHUYỂN TỪ" MỚI THẤY CÁC NÚT (trừ khi đã hủy) */}
            {isSender && !isCancelled && (
              <>
                {/* PHIẾU TẠM (status = 1): "Hủy" + "Lưu tạm" + "Đang chuyển" */}
                {isDraft && (
                  <>
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={cancelTransfer.isPending}
                      className="px-6 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      {cancelTransfer.isPending ? (
                        <>
                          <span className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin"></span>
                          Đang hủy...
                        </>
                      ) : (
                        "Hủy phiếu"
                      )}
                    </button>

                    <button
                      onClick={() => handleSubmit(true)}
                      disabled={
                        createTransfer.isPending ||
                        updateTransfer.isPending ||
                        cancelTransfer.isPending
                      }
                      className="px-6 py-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      {createTransfer.isPending || updateTransfer.isPending ? (
                        <>
                          <span className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></span>
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
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      {createTransfer.isPending || updateTransfer.isPending ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Đang xử lý...
                        </>
                      ) : (
                        "Đang chuyển"
                      )}
                    </button>
                  </>
                )}

                {/* ĐANG CHUYỂN (status = 2) hoặc ĐÃ NHẬN (status = 3): CHỈ "Hủy" */}
                {(isInTransit || isReceived) && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={cancelTransfer.isPending}
                    className="px-6 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {cancelTransfer.isPending ? (
                      <>
                        <span className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin"></span>
                        Đang hủy...
                      </>
                    ) : (
                      "Hủy phiếu"
                    )}
                  </button>
                )}
              </>
            )}

            {/* CHI NHÁNH "CHUYỂN TỚI" - CHỈ HIỂN THỊ BUTTON "NHẬN HÀNG" KHI ĐANG CHUYỂN */}
            {isReceiver && !isCancelled && isInTransit && (
              <button
                onClick={() => handleSubmit(false)}
                disabled={updateTransfer.isPending || cancelTransfer.isPending}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {updateTransfer.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang xử lý...
                  </>
                ) : (
                  "Nhận hàng"
                )}
              </button>
            )}
          </div>
        </div>

        {/* MODAL XÁC NHẬN HỦY */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Xác nhận hủy phiếu</h3>
              <p className="text-sm text-gray-600 mb-4">
                Bạn có chắc chắn muốn hủy phiếu chuyển hàng này? Tồn kho sẽ được
                hoàn trả về ban đầu.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setCancelReason("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  Đóng
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelTransfer.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50">
                  {cancelTransfer.isPending ? "Đang xử lý..." : "Xác nhận hủy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
