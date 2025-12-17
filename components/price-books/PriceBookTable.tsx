"use client";

import { useState, useMemo } from "react";
import { useProductsWithPrices } from "@/lib/hooks/usePriceBooks";
import { useProducts } from "@/lib/hooks/useProducts";
import type { PriceBook } from "@/lib/api/price-books";

// Define unified interface for products in this table
interface TableProduct {
  id: number;
  code: string;
  name: string;
  purchasePrice: number;
  retailPrice: number;
  stockQuantity: number;
  unit?: string;
  prices: Record<number, number>; // Always Record, even if empty
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

  // Separate real price books from virtual "Bảng giá chung"
  const hasDefaultPriceBook = selectedPriceBooks.some((pb) => pb.id === 0);
  const realPriceBooks = selectedPriceBooks.filter(
    (pb) => pb.id !== 0 && "isActive" in pb
  ) as PriceBook[];

  const priceBookIds = useMemo(
    () => realPriceBooks.map((pb) => pb.id),
    [realPriceBooks]
  );

  const categoryIds =
    selectedCategoryIds.length > 0 ? selectedCategoryIds.join(",") : undefined;

  // Use different hooks based on selection
  const isDefaultOnly = hasDefaultPriceBook && realPriceBooks.length === 0;

  // Fetch all products when only "Bảng giá chung" is selected
  const { data: allProductsData, isLoading: isLoadingAll } = useProducts({
    search: searchQuery,
    categoryIds,
    limit: 1000,
  });

  // Fetch products with multiple price books
  const { data: productsWithPrices, isLoading: isLoadingPrices } =
    useProductsWithPrices({
      priceBookIds,
      search: searchQuery,
      categoryId: categoryIds ? parseInt(categoryIds.split(",")[0]) : undefined,
    });

  // Transform data based on selection
  const products = useMemo<TableProduct[] | undefined>(() => {
    if (isDefaultOnly) {
      // Only "Bảng giá chung" selected - use all products
      return allProductsData?.data?.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        purchasePrice: Number(p.purchasePrice),
        retailPrice: Number(p.retailPrice),
        stockQuantity: p.stockQuantity,
        unit: p.unit,
        prices: {} as Record<number, number>, // Type assertion to Record
      }));
    } else {
      // Has real price books selected
      return productsWithPrices as TableProduct[] | undefined;
    }
  }, [isDefaultOnly, allProductsData, productsWithPrices]);

  const isLoading = isDefaultOnly ? isLoadingAll : isLoadingPrices;

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products?.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products?.map((p) => p.id) || []);
    }
  };

  const toggleSelect = (id: number) => {
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
      {/* Toolbar */}
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

      {/* Selection Bar */}
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

      {/* Table with Horizontal Scroll */}
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
                  {/* Sticky columns */}
                  <th className="p-3 text-left sticky left-0 bg-gray-50 z-30 border-r">
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
                  <th className="p-3 text-left text-sm font-medium whitespace-nowrap sticky left-[48px] bg-gray-50 z-30 border-r">
                    Mã hàng
                  </th>
                  <th className="p-3 text-left text-sm font-medium whitespace-nowrap sticky left-[168px] bg-gray-50 z-30 border-r min-w-[200px]">
                    Tên hàng
                  </th>
                  <th className="p-3 text-right text-sm font-medium whitespace-nowrap sticky left-[368px] bg-gray-50 z-30 border-r">
                    Giá vốn
                  </th>

                  {/* Dynamic price book columns */}
                  {hasDefaultPriceBook && (
                    <th className="p-3 text-right text-sm font-medium whitespace-nowrap bg-blue-50">
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
                      {/* Sticky columns */}
                      <td className="p-3 sticky left-0 bg-white z-10 border-r">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => toggleSelect(product.id)}
                        />
                      </td>
                      <td className="p-3 text-sm sticky left-[48px] bg-white z-10 border-r">
                        {product.code}
                      </td>
                      <td className="p-3 text-sm sticky left-[168px] bg-white z-10 border-r min-w-[200px]">
                        {product.name}
                      </td>
                      <td className="p-3 text-sm text-right sticky left-[368px] bg-white z-10 border-r">
                        {product.purchasePrice.toLocaleString()}
                      </td>

                      {/* Dynamic price columns */}
                      {hasDefaultPriceBook && (
                        <td className="p-3 text-sm text-right bg-blue-50">
                          {product.retailPrice.toLocaleString()}
                        </td>
                      )}
                      {realPriceBooks.map((pb) => {
                        const price = product.prices[pb.id];
                        return (
                          <td key={pb.id} className="p-3 text-sm text-right">
                            {price !== undefined ? (
                              <button className="hover:text-blue-600 w-full text-right">
                                {price.toLocaleString()}
                              </button>
                            ) : (
                              <button className="hover:text-blue-600 text-blue-600">
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
                    <td
                      colSpan={
                        4 +
                        (hasDefaultPriceBook ? 1 : 0) +
                        realPriceBooks.length
                      }
                      className="p-8 text-center text-gray-500">
                      Chưa có sản phẩm
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
