"use client";

import { useState, useEffect } from "react";
import { X, Search, Plus, Minus, Trash2 } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useProducts } from "@/lib/hooks/useProducts";
import { useCreateTransfer, useUpdateTransfer } from "@/lib/hooks/useTransfers";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { data: searchResults } = useProducts({
    search: searchQuery,
    limit: 20,
    branchIds: [fromBranchId, toBranchId].filter((id) => id > 0),
  });

  const handleChangeReceivedQuantity = (index: number, value: string) => {
    const quantity = parseFloat(value) || 0;

    if (quantity < 0) {
      toast.error("Số lượng nhận không được nhỏ hơn 0");
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
                price: Number(
                  fromInventory?.cost || product.basePrice || item.price || 0
                ),
                fromInventory: Number(fromInventory?.onHand || 0),
                toInventory: Number(toInventory?.onHand || 0),
              };
            } catch (error: any) {
              if (error.name === "AbortError") {
                return item;
              }

              console.error(`Error fetching product ${item.productId}:`, error);
              return item;
            }
          })
        );

        if (isLatestRequest && !abortController.signal.aborted) {
          setProducts(updatedProducts);
        }
      } catch (error) {
        console.error("Error updating products inventory:", error);
      }
    };

    updateProductsInventory();

    return () => {
      isLatestRequest = false;
      abortController.abort();
    };
  }, [fromBranchId, toBranchId]);

  const handleAddProduct = (product: Product) => {
    const existingIndex = products.findIndex((p) => p.productId === product.id);

    if (existingIndex >= 0) {
      toast.error("Sản phẩm đã có trong danh sách");
      return;
    }

    const fromInventory = product.inventories?.find(
      (inv) => inv.branchId === fromBranchId
    );
    const toInventory = product.inventories?.find(
      (inv) => inv.branchId === toBranchId
    );

    const newProduct: ProductItem = {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      unit: product.unit,
      sendQuantity: 1,
      price: Number(fromInventory?.cost || product.basePrice || 0),
      fromInventory: Number(fromInventory?.onHand || 0),
      toInventory: Number(toInventory?.onHand || 0),
      receivedQuantity: 0,
    };

    setProducts((prev) => [...prev, newProduct]);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    setProducts((prev) => {
      const updated = [...prev];
      const newQuantity = updated[index].sendQuantity + delta;

      if (newQuantity < 0) {
        toast.error("Số lượng không được nhỏ hơn 0");
        return prev;
      }

      if (newQuantity > updated[index].fromInventory) {
        toast.error(
          `Số lượng chuyển vượt quá tồn kho (${updated[index].fromInventory})`
        );
        return prev;
      }

      updated[index].sendQuantity = newQuantity;
      return updated;
    });
  };

  const handleChangeQuantity = (index: number, value: string) => {
    const quantity = parseFloat(value) || 0;

    if (quantity < 0) {
      toast.error("Số lượng không được nhỏ hơn 0");
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

  const calculateTotal = () => {
    return products.reduce(
      (sum, item) => sum + item.sendQuantity * item.price,
      0
    );
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
      isDraft: false, // Luôn là false vì đã xử lý bằng status
      description: isReceiver ? noteByDestination : noteBySource,
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
      toast.error(error?.message || "Có lỗi xảy ra khi lưu phiếu chuyển hàng");
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
                  disabled={!!isReceiver}
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
                  disabled={!!isReceiver}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tổng số lượng
              </label>
              <div className="text-2xl font-bold text-gray-900">
                {products.length}
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tìm hàng hóa theo mã hoặc tên (F3)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="test"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  onBlur={() =>
                    setTimeout(() => setShowSearchResults(false), 200)
                  }
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>

              {showSearchResults && searchQuery && searchResults?.data && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
                  {searchResults.data.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Không tìm thấy sản phẩm
                    </div>
                  ) : (
                    searchResults.data.map((product: Product) => {
                      const inventory = product.inventories?.find(
                        (inv) => inv.branchId === fromBranchId
                      );

                      return (
                        <div
                          key={product.id}
                          onClick={() => handleAddProduct(product)}
                          className="p-4 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition">
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0].image}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-400">
                                  N/A
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {product.code} - Giá:{" "}
                                {Number(product.basePrice).toLocaleString()} đ
                              </div>
                              <div className="text-sm text-gray-500">
                                Tồn:{" "}
                                {Number(
                                  inventory?.onHand || 0
                                ).toLocaleString()}{" "}
                                - Đặt NCC:{" "}
                                {Number(
                                  inventory?.onOrder || 0
                                ).toLocaleString()}{" "}
                                - Khách đặt:{" "}
                                {Number(
                                  inventory?.reserved || 0
                                ).toLocaleString()}
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
                          Tồn kho ({transfer?.fromBranchName})
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          Tồn kho nhận ({transfer?.toBranchName})
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
                              {isSender && !transfer ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() =>
                                      handleUpdateQuantity(index, -1)
                                    }
                                    className="p-1 hover:bg-gray-200 rounded transition">
                                    <Minus className="w-4 h-4 text-gray-600" />
                                  </button>
                                  <input
                                    type="number"
                                    value={item.sendQuantity}
                                    onChange={(e) =>
                                      handleChangeQuantity(
                                        index,
                                        e.target.value
                                      )
                                    }
                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min="0"
                                    step="1"
                                  />
                                  <button
                                    onClick={() =>
                                      handleUpdateQuantity(index, 1)
                                    }
                                    className="p-1 hover:bg-gray-200 rounded transition">
                                    <Plus className="w-4 h-4 text-gray-600" />
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
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      const newQty = Math.max(
                                        0,
                                        item.receivedQuantity - 1
                                      );
                                      handleChangeReceivedQuantity(
                                        index,
                                        newQty.toString()
                                      );
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded transition">
                                    <Minus className="w-4 h-4 text-gray-600" />
                                  </button>
                                  <input
                                    type="number"
                                    value={item.receivedQuantity}
                                    onChange={(e) =>
                                      handleChangeReceivedQuantity(
                                        index,
                                        e.target.value
                                      )
                                    }
                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min="0"
                                    max={item.sendQuantity}
                                    step="1"
                                  />
                                  <button
                                    onClick={() => {
                                      const newQty = Math.min(
                                        item.sendQuantity,
                                        item.receivedQuantity + 1
                                      );
                                      handleChangeReceivedQuantity(
                                        index,
                                        newQty.toString()
                                      );
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded transition">
                                    <Plus className="w-4 h-4 text-gray-600" />
                                  </button>
                                </div>
                              </td>
                            )}

                            <td className="px-4 py-3 whitespace-nowrap">
                              {isSender && !transfer ? (
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) =>
                                    handleChangePrice(index, e.target.value)
                                  }
                                  className="w-28 border border-gray-300 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  min="0"
                                  step="1000"
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

                            {isSender && !transfer && (
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleRemoveProduct(index)}
                                  className="p-1 hover:bg-red-50 rounded transition text-red-600">
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
                Ghi chú {isReceiver && "(Chi nhánh nhận)"}
              </label>
              <textarea
                value={isReceiver ? noteByDestination : noteBySource}
                onChange={(e) =>
                  isReceiver
                    ? setNoteByDestination(e.target.value)
                    : setNoteBySource(e.target.value)
                }
                placeholder={
                  isReceiver
                    ? "Nhập ghi chú từ chi nhánh nhận..."
                    : "Nhập ghi chú cho phiếu chuyển hàng..."
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {isReceiver && transfer?.noteBySource && (
                <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">
                    Ghi chú từ chi nhánh chuyển:
                  </p>
                  <p className="text-sm text-gray-900">
                    {transfer.noteBySource}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-between">
          <div>
            <button
              onClick={onClose}
              disabled={createTransfer.isPending || updateTransfer.isPending}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              Đóng
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={createTransfer.isPending || updateTransfer.isPending}
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
              disabled={createTransfer.isPending || updateTransfer.isPending}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {createTransfer.isPending || updateTransfer.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Đang xử lý...
                </>
              ) : isReceiver ? (
                "Nhận hàng"
              ) : (
                "Đang chuyển"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
