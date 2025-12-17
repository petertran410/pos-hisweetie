"use client";

import { useState } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useAddProductsToPriceBook } from "@/lib/hooks/usePriceBooks";
import type { Product } from "@/lib/api/products";

interface PriceBookProductSelectorProps {
  priceBookId: number;
  onClose: () => void;
}

export function PriceBookProductSelector({
  priceBookId,
  onClose,
}: PriceBookProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<
    Map<number, { product: Product; price: number }>
  >(new Map());

  const { data: productsData } = useProducts({
    search: searchQuery,
    limit: 50,
  });
  const addProducts = useAddProductsToPriceBook();

  const handleToggleProduct = (product: Product) => {
    const newSelected = new Map(selectedProducts);
    if (newSelected.has(product.id)) {
      newSelected.delete(product.id);
    } else {
      newSelected.set(product.id, {
        product,
        price: Number(product.retailPrice),
      });
    }
    setSelectedProducts(newSelected);
  };

  const handleUpdatePrice = (productId: number, price: number) => {
    const newSelected = new Map(selectedProducts);
    const item = newSelected.get(productId);
    if (item) {
      newSelected.set(productId, { ...item, price });
      setSelectedProducts(newSelected);
    }
  };

  const handleSubmit = async () => {
    const products = Array.from(selectedProducts.values()).map((item) => ({
      productId: item.product.id,
      price: item.price,
    }));

    await addProducts.mutateAsync({ priceBookId, products });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] flex flex-col rounded-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Thêm sản phẩm vào bảng giá</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm theo mã, tên"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="p-3 text-left"></th>
                <th className="p-3 text-left text-sm font-medium">Mã hàng</th>
                <th className="p-3 text-left text-sm font-medium">Tên hàng</th>
                <th className="p-3 text-right text-sm font-medium">
                  Giá bán lẻ
                </th>
                <th className="p-3 text-right text-sm font-medium">
                  Giá bảng giá
                </th>
              </tr>
            </thead>
            <tbody>
              {productsData?.data?.map((product) => {
                const isSelected = selectedProducts.has(product.id);
                const selectedItem = selectedProducts.get(product.id);

                return (
                  <tr
                    key={product.id}
                    className={`border-b hover:bg-gray-50 ${
                      isSelected ? "bg-blue-50" : ""
                    }`}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleProduct(product)}
                      />
                    </td>
                    <td className="p-3 text-sm">{product.code}</td>
                    <td className="p-3 text-sm">{product.name}</td>
                    <td className="p-3 text-sm text-right">
                      {Number(product.retailPrice).toLocaleString()}
                    </td>
                    <td className="p-3 text-sm text-right">
                      {isSelected ? (
                        <input
                          type="number"
                          value={selectedItem?.price || 0}
                          onChange={(e) =>
                            handleUpdatePrice(
                              product.id,
                              Number(e.target.value)
                            )
                          }
                          className="border rounded px-2 py-1 w-32 text-right"
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!productsData?.data || productsData.data.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Không tìm thấy sản phẩm
            </div>
          ) : null}
        </div>

        <div className="border-t p-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Đã chọn {selectedProducts.size} sản phẩm
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50">
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedProducts.size === 0 || addProducts.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {addProducts.isPending
                ? "Đang thêm..."
                : `Thêm ${selectedProducts.size} sản phẩm`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
