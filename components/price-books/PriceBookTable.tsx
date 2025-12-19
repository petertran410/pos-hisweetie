"use client";

import { useState, useMemo } from "react";
import {
  useAddProductsToPriceBook,
  useProductsWithPrices,
  useUpdateProductPrice,
} from "@/lib/hooks/usePriceBooks";
import {
  useProducts,
  useUpdateProductRetailPrice,
} from "@/lib/hooks/useProducts";
import type { PriceBook } from "@/lib/api/price-books";
import type { Inventory, Product } from "@/lib/api/products";
import { toast } from "react-hot-toast";
import { useBranchStore } from "@/lib/store/branch";
import { Book } from "lucide-react";

interface TableProduct {
  id: number;
  code: string;
  name: string;
  basePrice: number;
  unit?: string;
  prices: Record<number, number>;
  stockQuantity: number;
  inventories?: Inventory[];
}

interface PriceBookTableProps {
  selectedPriceBooks: (PriceBook | { id: number; name: string })[];
  onAddProducts?: () => void;
  onCreateNew: () => void;
  selectedCategoryIds: number[];
  branchId?: number;
}

export function PriceBookTable({
  selectedPriceBooks,
  onAddProducts,
  onCreateNew,
  selectedCategoryIds,
  branchId,
}: PriceBookTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [editingCell, setEditingCell] = useState<{
    productId: number;
    priceBookId: number;
    value: string;
  } | null>(null);

  const updateRetailPrice = useUpdateProductRetailPrice();
  const updateProductPrice = useUpdateProductPrice();
  const addProductsToPriceBook = useAddProductsToPriceBook();

  const hasDefaultPriceBook = selectedPriceBooks.some((pb) => pb.id === 0);
  const realPriceBooks = selectedPriceBooks.filter(
    (pb) => pb.id !== 0
  ) as PriceBook[];

  const priceBookIds = useMemo(
    () => realPriceBooks.map((pb) => pb.id),
    [realPriceBooks]
  );

  const categoryIds =
    selectedCategoryIds.length > 0 ? selectedCategoryIds.join(",") : undefined;

  const isDefaultOnly = hasDefaultPriceBook && realPriceBooks.length === 0;

  const { data: allProductsData, isLoading: isLoadingAll } = useProducts({
    search: searchQuery,
    categoryIds,
    limit: 1000,
    branchId,
  });

  const { data: productsWithPrices, isLoading: isLoadingPrices } =
    useProductsWithPrices({
      priceBookIds,
      search: searchQuery,
      categoryIds: categoryIds,
      branchId,
    });

  const products = useMemo<TableProduct[] | undefined>(() => {
    if (isDefaultOnly) {
      return allProductsData?.data?.map((p: Product) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        basePrice: Number(p.basePrice),
        unit: p.unit,
        prices: {},
        stockQuantity:
          p.inventories?.reduce((sum, inv) => sum + Number(inv.onHand), 0) || 0,
        inventories: p.inventories,
      }));
    } else {
      return productsWithPrices as TableProduct[] | undefined;
    }
  }, [isDefaultOnly, allProductsData, productsWithPrices]);

  const isLoading = isDefaultOnly ? isLoadingAll : isLoadingPrices;

  const handleCellClick = (productId: number, priceBookId: number) => {
    const product = products?.find((p) => p.id === productId);
    if (!product) return;

    const currentPrice =
      priceBookId === 0
        ? product.basePrice
        : product.prices[priceBookId] || product.basePrice;

    setEditingCell({
      productId,
      priceBookId,
      value: currentPrice.toString(),
    });
  };

  const handlePriceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    productId: number,
    priceBookId: number
  ) => {
    setEditingCell({
      productId,
      priceBookId,
      value: e.target.value,
    });
  };

  const handleBlur = async () => {
    if (!editingCell) return;

    const newPrice = Number(editingCell.value);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Giá không hợp lệ");
      setEditingCell(null);
      return;
    }

    try {
      if (editingCell.priceBookId === 0) {
        // Cập nhật giá bán cơ bản
        await updateRetailPrice.mutateAsync({
          id: editingCell.productId,
          basePrice: newPrice,
        });
        toast.success("Cập nhật giá bán cơ bản thành công");
      } else {
        // Cập nhật giá trong bảng giá
        await updateProductPrice.mutateAsync({
          priceBookId: editingCell.priceBookId,
          productId: editingCell.productId,
          price: newPrice,
        });
        toast.success("Cập nhật giá thành công");
      }
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products?.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products?.map((p) => p.id) || []);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (selectedPriceBooks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Chưa chọn bảng giá nào</p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Tạo bảng giá mới
          </button>
        </div>
      </div>
    );
  }

  const handleAddProductToPriceBook = async (
    productId: number,
    priceBookId: number,
    initialPrice: number
  ) => {
    try {
      await addProductsToPriceBook.mutateAsync({
        priceBookId,
        products: [{ productId, price: initialPrice }],
      });

      setEditingCell({
        productId,
        priceBookId,
        value: initialPrice.toString(),
      });
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Theo mã, tên hàng"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded px-3 py-2 w-80"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            + Bảng giá
          </button>
          <button className="px-4 py-2 border rounded hover:bg-gray-50">
            Import
          </button>
          <button className="px-4 py-2 border rounded hover:bg-gray-50">
            Xuất file
          </button>
        </div>
      </div>

      {selectedProductIds.length > 0 && (
        <div className="border-b p-4 bg-blue-50 flex items-center justify-between">
          <span className="text-sm">
            Đã chọn {selectedProductIds.length} sản phẩm
          </span>
          <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
            Xóa khỏi bảng giá
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Đang tải...</div>
          </div>
        ) : !products || products.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 mb-2">Không có sản phẩm nào</p>
              {!isDefaultOnly && onAddProducts && (
                <button
                  onClick={onAddProducts}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Thêm sản phẩm
                </button>
              )}
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      products.length > 0 &&
                      selectedProductIds.length === products.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-3 text-left text-sm font-medium">Mã hàng</th>
                <th className="p-3 text-left text-sm font-medium">Tên hàng</th>
                <th className="p-3 text-right text-sm font-medium">Giá vốn</th>
                {selectedPriceBooks.map((pb) => (
                  <th
                    key={pb.id}
                    className="p-3 text-right text-sm font-medium">
                    {pb.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const selectedBranchId =
                  useBranchStore.getState().selectedBranch?.id;
                const inventory = product.inventories?.find(
                  (inv) => inv.branchId === selectedBranchId
                );
                const cost = inventory ? Number(inventory.cost) : 0;
                return (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                      />
                    </td>
                    <td className="p-3 text-sm">{product.code}</td>
                    <td className="p-3 text-sm">{product.name}</td>
                    <td className="p-3 text-sm text-right">
                      {cost.toLocaleString()}
                    </td>
                    {selectedPriceBooks.map((pb) => {
                      const isEditing =
                        editingCell?.productId === product.id &&
                        editingCell?.priceBookId === pb.id;

                      // Kiểm tra xem sản phẩm có trong bảng giá hay chưa
                      const priceExists =
                        pb.id === 0 || product.prices[pb.id] !== undefined;
                      const displayPrice =
                        pb.id === 0 ? product.basePrice : product.prices[pb.id];

                      return (
                        <td
                          key={pb.id}
                          className="p-3 text-sm text-right cursor-pointer hover:bg-blue-50"
                          onClick={() => {
                            if (pb.id !== 0 && !priceExists) {
                              handleAddProductToPriceBook(
                                product.id,
                                pb.id,
                                product.basePrice
                              );
                            } else {
                              handleCellClick(product.id, pb.id);
                            }
                          }}>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingCell.value}
                              onChange={(e) =>
                                handlePriceChange(e, product.id, pb.id)
                              }
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              className="w-full border rounded px-2 py-1 text-right"
                            />
                          ) : pb.id !== 0 && !priceExists ? (
                            <button className="text-blue-600 hover:text-blue-800 text-xl font-bold">
                              +
                            </button>
                          ) : (
                            <span>{displayPrice.toLocaleString()}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
