"use client";

import { useState, useEffect } from "react";
import { X, Search, Trash2 } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useProducts } from "@/lib/hooks/useProducts";
import {
  useCreateDestruction,
  useUpdateDestruction,
} from "@/lib/hooks/useDestructions";
import { useBranchStore } from "@/lib/store/branch";
import type { Destruction } from "@/lib/api/destructions";
import { productsApi, type Product } from "@/lib/api/products";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DestructionFormProps {
  destruction?: Destruction | null;
  onClose?: () => void;
}

interface ProductItem {
  productId: number;
  productCode: string;
  productName: string;
  unit?: string;
  quantity: number;
  price: number;
  totalValue: number;
  inventory: number;
  note?: string;
}

export function DestructionForm({
  destruction,
  onClose,
}: DestructionFormProps) {
  const router = useRouter();
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const createDestruction = useCreateDestruction();
  const updateDestruction = useUpdateDestruction();

  const [branchId, setBranchId] = useState<number>(
    destruction?.branchId || selectedBranch?.id || 0
  );
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [note, setNote] = useState(destruction?.note || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const isCompleted = destruction?.status === 2;
  const isCancelled = destruction?.status === 4;
  const isFormDisabled = isCompleted || isCancelled;

  const { data: searchResults } = useProducts({
    search: searchQuery,
    limit: 20,
    branchId: branchId || undefined,
  });

  useEffect(() => {
    if (destruction?.details && branchId) {
      const loadProductsWithInventory = async () => {
        const loadedProducts = await Promise.all(
          destruction.details.map(async (detail) => {
            try {
              const product = await productsApi.getProduct(detail.productId);
              const inventory = product.inventories?.find(
                (inv: any) => inv.branchId === branchId
              );

              return {
                productId: detail.productId,
                productCode: detail.productCode,
                productName: detail.productName,
                unit: product.unit || "",
                quantity: Number(detail.quantity),
                price: Number(detail.price),
                totalValue: Number(detail.totalValue),
                inventory: Number(inventory?.onHand || 0),
                note: detail.note,
              };
            } catch (error) {
              console.error(
                `Error fetching product ${detail.productId}:`,
                error
              );
              return {
                productId: detail.productId,
                productCode: detail.productCode,
                productName: detail.productName,
                unit: "",
                quantity: Number(detail.quantity),
                price: Number(detail.price),
                totalValue: Number(detail.totalValue),
                inventory: 0,
                note: detail.note,
              };
            }
          })
        );
        setProducts(loadedProducts);
      };

      loadProductsWithInventory();
    }
  }, [destruction, branchId]);

  const handleAddProduct = (product: Product) => {
    const existingProduct = products.find((p) => p.productId === product.id);
    if (existingProduct) {
      toast.error("Sản phẩm đã có trong danh sách");
      return;
    }

    const inventory = product.inventories?.find(
      (inv: any) => inv.branchId === branchId
    );

    if (!inventory) {
      toast.error(`Sản phẩm ${product.name} chưa tồn tại ở chi nhánh này`);
      return;
    }

    const newProduct: ProductItem = {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      unit: product.unit || "",
      quantity: 1,
      price: Number(inventory.cost || 0),
      totalValue: Number(inventory.cost || 0),
      inventory: Number(inventory.onHand || 0),
    };

    setProducts((prev) => [...prev, newProduct]);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, value: string) => {
    const quantity = parseFloat(value) || 0;

    if (quantity < 0) {
      toast.error("Số lượng không được nhỏ hơn 0");
      return;
    }

    if (quantity > products[index].inventory) {
      toast.error(
        `Số lượng hủy không được lớn hơn tồn kho (${products[index].inventory})`
      );
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      updated[index].quantity = quantity;
      updated[index].totalValue = quantity * updated[index].price;
      return updated;
    });
  };

  const calculateTotalQuantity = () => {
    return products.reduce((sum, p) => sum + p.quantity, 0);
  };

  const calculateTotalValue = () => {
    return products.reduce((sum, p) => sum + p.totalValue, 0);
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!branchId) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    if (products.length === 0) {
      toast.error("Vui lòng thêm ít nhất một sản phẩm");
      return;
    }

    const hasInvalidQuantity = products.some((p) => p.quantity <= 0);
    if (hasInvalidQuantity) {
      toast.error("Vui lòng nhập số lượng hợp lệ cho tất cả sản phẩm");
      return;
    }

    const destructionData = {
      branchId,
      isDraft,
      note,
      destructionDetails: products.map((p) => ({
        productId: p.productId,
        productCode: p.productCode,
        productName: p.productName,
        quantity: p.quantity,
        price: p.price,
      })),
    };

    try {
      if (destruction?.id) {
        await updateDestruction.mutateAsync({
          id: destruction.id,
          data: { ...destructionData, status: isDraft ? 1 : 2 },
        });
      } else {
        await createDestruction.mutateAsync(destructionData);
      }

      router.push("/san-pham/xuat-huy");
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra");
    }
  };

  return (
    <div className="flex h-full border-t bg-gray-50 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] m-4 border rounded-xl">
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold">
              {destruction ? "Chi tiết phiếu xuất hủy" : "Tạo phiếu xuất hủy"}
            </h2>
            {destruction && (
              <p className="text-sm text-gray-600 mt-1">
                Mã phiếu: {destruction.code}
              </p>
            )}
          </div>
          <button
            onClick={() => (onClose ? onClose() : router.back())}
            className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm hàng hóa theo mã hoặc tên
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={
                  isFormDisabled
                    ? "Không thể thêm sản phẩm ở trạng thái này"
                    : "Tìm kiếm sản phẩm..."
                }
                value={searchQuery}
                onChange={(e) => {
                  if (isFormDisabled) return;
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => !isFormDisabled && setShowSearchResults(true)}
                onBlur={() =>
                  setTimeout(() => setShowSearchResults(false), 200)
                }
                disabled={isFormDisabled}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  searchResults.data.map((product) => {
                    const inventory = product.inventories?.find(
                      (inv: any) => inv.branchId === branchId
                    );

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0">
                            {product.images?.[0] && (
                              <img
                                src={product.images[0].image}
                                alt={product.name}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {product.code}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Giá:{" "}
                              {formatCurrency(Number(inventory?.cost || 0))} •
                              Tồn:{" "}
                              {Number(inventory?.onHand || 0).toLocaleString()}{" "}
                              • Đặt NCC: 0 • Khách đặt: 0
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
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        ĐVT
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        SL hủy
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Giá vốn
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Giá trị hủy
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                          {item.productCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 min-w-[200px]">
                          {item.productName}
                          {item.note && (
                            <div className="text-xs text-gray-500 mt-1">
                              Ghi chú: {item.note}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900">
                          Hộp
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(index, e.target.value)
                            }
                            disabled={isFormDisabled}
                            className="w-20 px-2 py-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            min="0"
                            step="1"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {formatCurrency(item.totalValue)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {!isFormDisabled && (
                            <button
                              onClick={() => handleRemoveProduct(index)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title="Xóa">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-96 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 space-y-6 bg-white shadow-xl">
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Mã xuất hủy
            </label>
            <input
              type="text"
              value={destruction?.code || "Mã phiếu tự động"}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Trạng thái
            </label>
            <div className="px-3 py-2 border rounded bg-gray-50">
              <span className="text-sm text-gray-600">Phiếu tạm</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Tổng giá trị hủy
            </label>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <input
                  type="text"
                  value={calculateTotalQuantity()}
                  disabled
                  className="flex-1 px-3 py-2 border rounded bg-gray-50 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <input
                  type="text"
                  value={formatCurrency(calculateTotalValue())}
                  disabled
                  className="flex-1 px-3 py-2 border rounded bg-blue-50 text-right text-blue-600 font-semibold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Kho <span className="text-red-500">*</span>
            </label>
            <select
              value={branchId}
              onChange={(e) => {
                if (!destruction) {
                  setBranchId(Number(e.target.value));
                  setProducts([]);
                }
              }}
              disabled={!!destruction || isFormDisabled}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
              <option value="">Chọn chi nhánh</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isFormDisabled}
              rows={4}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
              placeholder="Nhập ghi chú..."
            />
          </div>

          {!isFormDisabled && (
            <div className="space-y-2">
              <button
                onClick={() => handleSubmit(true)}
                disabled={
                  createDestruction.isPending || updateDestruction.isPending
                }
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <span>💾</span>
                <span>Lưu tạm</span>
              </button>

              <button
                onClick={() => handleSubmit(false)}
                disabled={
                  createDestruction.isPending || updateDestruction.isPending
                }
                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <span>✓</span>
                <span>Hoàn thành</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
