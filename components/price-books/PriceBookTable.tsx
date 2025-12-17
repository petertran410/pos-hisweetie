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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

interface TableProduct {
  id: number;
  code: string;
  name: string;
  purchasePrice: number;
  retailPrice: number;
  stockQuantity: number;
  unit?: string;
  prices: Record<number, number>;
}

interface PriceBookTableProps {
  selectedPriceBooks: (PriceBook | { id: number; name: string })[];
  onAddProducts?: () => void;
  onCreateNew: () => void;
  selectedCategoryIds: number[];
}

export function PriceBookTable({
  selectedPriceBooks,
  onAddProducts,
  onCreateNew,
  selectedCategoryIds,
}: PriceBookTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [editingCell, setEditingCell] = useState<{
    productId: number;
    priceBookId: number;
    value: string;
  } | null>(null);

  const queryClient = useQueryClient();

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
  });

  const { data: productsWithPrices, isLoading: isLoadingPrices } =
    useProductsWithPrices({
      priceBookIds,
      search: searchQuery,
      categoryId: categoryIds ? parseInt(categoryIds.split(",")[0]) : undefined,
    });

  const products = useMemo<TableProduct[] | undefined>(() => {
    if (isDefaultOnly) {
      return allProductsData?.data?.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        purchasePrice: Number(p.purchasePrice),
        retailPrice: Number(p.retailPrice),
        stockQuantity: p.stockQuantity,
        unit: p.unit,
        prices: {},
      }));
    } else {
      return productsWithPrices as TableProduct[] | undefined;
    }
  }, [isDefaultOnly, allProductsData, productsWithPrices]);

  const isLoading = isDefaultOnly ? isLoadingAll : isLoadingPrices;

  const handleStartEdit = (
    productId: number,
    priceBookId: number,
    currentValue: number
  ) => {
    setEditingCell({
      productId,
      priceBookId,
      value: String(currentValue),
    });
  };

  const handleSavePrice = async (productId: number, priceBookId: number) => {
    if (!editingCell) return;

    const newPrice = Number(editingCell.value);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Giá không hợp lệ");
      setEditingCell(null);
      return;
    }

    if (!priceBookId || isNaN(priceBookId)) {
      toast.error("ID bảng giá không hợp lệ");
      setEditingCell(null);
      return;
    }

    if (!productId || isNaN(productId)) {
      toast.error("ID sản phẩm không hợp lệ");
      setEditingCell(null);
      return;
    }

    try {
      if (priceBookId === 0) {
        await updateRetailPrice.mutateAsync({
          id: productId,
          retailPrice: newPrice,
        });
      } else {
        await updateProductPrice.mutateAsync({
          priceBookId,
          productId,
          price: newPrice,
        });
      }
      setEditingCell(null);
    } catch (error) {
      console.error("Error saving price:", error);
      toast.error("Không thể cập nhật giá");
    }
  };

  const handleAddProductToPriceBook = async (
    productId: number,
    priceBookId: number,
    defaultPrice: number
  ) => {
    if (!priceBookId || isNaN(priceBookId) || priceBookId <= 0) {
      toast.error("ID bảng giá không hợp lệ");
      return;
    }

    if (!productId || isNaN(productId) || productId <= 0) {
      toast.error("ID sản phẩm không hợp lệ");
      return;
    }

    if (isNaN(defaultPrice) || defaultPrice < 0) {
      toast.error("Giá không hợp lệ");
      return;
    }

    try {
      await addProductsToPriceBook.mutateAsync({
        priceBookId,
        products: [{ productId, price: defaultPrice }],
      });
    } catch (error) {
      console.error("Error adding product to price book:", error);
      toast.error("Không thể thêm sản phẩm vào bảng giá");
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products?.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products?.map((p) => p.id) || []);
    }
  };

  const toggleSelectProduct = (id: number) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter((i) => i !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  if (selectedPriceBooks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Chọn bảng giá để xem sản phẩm
      </div>
    );
  }

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
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Đang tải...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse"
              style={{ minWidth: "max-content" }}>
              <thead className="bg-gray-50 sticky top-0 z-20">
                <tr>
                  <th className="p-3 text-left sticky left-0 bg-gray-50 z-30 ">
                    <input
                      type="checkbox"
                      checked={
                        products &&
                        products.length > 0 &&
                        selectedProductIds.length === products.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-left text-sm font-medium whitespace-nowrap sticky left-[48px] bg-gray-50 z-30 ">
                    Mã hàng
                  </th>
                  <th className="p-3 text-left text-sm font-medium whitespace-nowrap sticky left-[168px] bg-gray-50 z-30  min-w-[200px]">
                    Tên hàng
                  </th>
                  <th className="p-3 text-right text-sm font-medium whitespace-nowrap sticky left-[368px] bg-gray-50 z-30 ">
                    Giá vốn
                  </th>

                  {hasDefaultPriceBook && (
                    <th className="p-3 text-right text-sm font-medium whitespace-nowrap bg-gray-50">
                      Bảng giá chung
                    </th>
                  )}
                  {realPriceBooks.map((pb) => (
                    <th
                      key={pb.id}
                      className="p-3 text-right text-sm font-medium whitespace-nowrap">
                      {pb.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products && products.length > 0 ? (
                  products.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 sticky left-0 bg-white z-10 ">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => toggleSelectProduct(product.id)}
                        />
                      </td>

                      <td className="p-3 text-sm sticky left-[48px] bg-white z-10 ">
                        {product.code}
                      </td>

                      <td className="p-3 text-sm sticky left-[168px] bg-white z-10  min-w-[200px]">
                        {product.name}
                      </td>

                      <td className="p-3 text-sm text-right sticky left-[368px] bg-white z-10 ">
                        {product.purchasePrice.toLocaleString()}
                      </td>

                      {/* Bảng giá chung - EDITABLE */}
                      {hasDefaultPriceBook && (
                        <td className="p-3 text-sm text-right">
                          {editingCell?.productId === product.id &&
                          editingCell?.priceBookId === 0 ? (
                            <input
                              type="number"
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({
                                  ...editingCell,
                                  value: e.target.value,
                                })
                              }
                              onBlur={() => handleSavePrice(product.id, 0)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleSavePrice(product.id, 0);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              className="w-full border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <div
                              onClick={() =>
                                handleStartEdit(
                                  product.id,
                                  0,
                                  product.retailPrice
                                )
                              }
                              className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                              {product.retailPrice.toLocaleString()}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Các bảng giá khác */}
                      {realPriceBooks.map((pb) => {
                        const priceExists = product.prices[pb.id] !== undefined;
                        const price = product.prices[pb.id];

                        return (
                          <td key={pb.id} className="p-3 text-sm text-right">
                            {priceExists ? (
                              editingCell?.productId === product.id &&
                              editingCell?.priceBookId === pb.id ? (
                                <input
                                  type="number"
                                  value={editingCell.value}
                                  onChange={(e) =>
                                    setEditingCell({
                                      ...editingCell,
                                      value: e.target.value,
                                    })
                                  }
                                  onBlur={() =>
                                    handleSavePrice(product.id, pb.id)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleSavePrice(product.id, pb.id);
                                    if (e.key === "Escape") handleCancelEdit();
                                  }}
                                  className="w-full border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onClick={() =>
                                    handleStartEdit(product.id, pb.id, price)
                                  }
                                  className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                                  {Number(price).toLocaleString()}
                                </div>
                              )
                            ) : (
                              <button
                                onClick={() =>
                                  handleAddProductToPriceBook(
                                    product.id,
                                    pb.id,
                                    product.retailPrice
                                  )
                                }
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                title={`Thêm vào ${pb.name}`}>
                                +
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={100} className="p-8 text-center text-gray-500">
                      Không có sản phẩm
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
