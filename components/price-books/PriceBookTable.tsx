"use client";

import { useState } from "react";
import {
  usePriceBookProducts,
  useUpdateProductPrice,
  useRemoveProductsFromPriceBook,
} from "@/lib/hooks/usePriceBooks";
import type { PriceBookDetail } from "@/lib/api/price-books";

interface PriceBookTableProps {
  priceBookId: number | null;
  onAddProducts?: () => void;
}

export function PriceBookTable({
  priceBookId,
  onAddProducts,
}: PriceBookTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [editingPrice, setEditingPrice] = useState<{
    id: number;
    price: number;
  } | null>(null);

  const { data: products } = usePriceBookProducts(priceBookId, searchQuery);
  const updatePrice = useUpdateProductPrice();
  const removeProducts = useRemoveProductsFromPriceBook();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products?.map((p) => p.productId) || []);
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    }
  };

  const handleUpdatePrice = async (productId: number, price: number) => {
    if (!priceBookId) return;

    await updatePrice.mutateAsync({
      priceBookId,
      productId,
      price,
    });
    setEditingPrice(null);
  };

  const handleRemoveSelected = async () => {
    if (!priceBookId || selectedProducts.length === 0) return;

    if (confirm(`Xóa ${selectedProducts.length} sản phẩm khỏi bảng giá?`)) {
      await removeProducts.mutateAsync({
        priceBookId,
        productIds: selectedProducts,
      });
      setSelectedProducts([]);
    }
  };

  if (!priceBookId) {
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
          <button className="px-4 py-2 border rounded hover:bg-gray-50">
            Mã hàng
          </button>
          <button className="px-4 py-2 border rounded hover:bg-gray-50">
            Tên hàng
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddProducts}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            + Bảng giá
          </button>
          <button className="px-4 py-2 border rounded hover:bg-gray-50">
            Import
          </button>
          <button className="px-4 py-2 border rounded hover:bg-gray-50">
            Xuất file
          </button>
          <button className="p-2 border rounded hover:bg-gray-50">⚙️</button>
          <button className="p-2 border rounded hover:bg-gray-50">❓</button>
        </div>
      </div>

      {selectedProducts.length > 0 && (
        <div className="border-b p-4 bg-blue-50 flex items-center justify-between">
          <span className="text-sm">
            Đã chọn {selectedProducts.length} sản phẩm
          </span>
          <button
            onClick={handleRemoveSelected}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
            Xóa khỏi bảng giá
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    products &&
                    products.length > 0 &&
                    selectedProducts.length === products.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th className="p-3 text-left text-sm font-medium">Mã hàng</th>
              <th className="p-3 text-left text-sm font-medium">Tên hàng</th>
              <th className="p-3 text-right text-sm font-medium">Giá vốn</th>
              <th className="p-3 text-right text-sm font-medium">
                Giá nhập cuối
              </th>
              <th className="p-3 text-right text-sm font-medium">
                Bảng giá chung
              </th>
              <th className="p-3 text-right text-sm font-medium">Giá vốn</th>
              <th className="p-3 text-right text-sm font-medium">
                Giá nhập cuối
              </th>
              <th className="p-3 text-right text-sm font-medium">
                Bảng giá chung
              </th>
            </tr>
          </thead>
          <tbody>
            {products?.map((detail) => (
              <tr key={detail.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(detail.productId)}
                    onChange={(e) =>
                      handleSelectProduct(detail.productId, e.target.checked)
                    }
                  />
                </td>
                <td className="p-3 text-sm">{detail.product?.code}</td>
                <td className="p-3 text-sm">{detail.product?.name}</td>
                <td className="p-3 text-sm text-right">
                  {editingPrice?.id === detail.id ? (
                    <input
                      type="number"
                      value={editingPrice.price}
                      onChange={(e) =>
                        setEditingPrice({
                          id: detail.id,
                          price: Number(e.target.value),
                        })
                      }
                      onBlur={() =>
                        handleUpdatePrice(detail.productId, editingPrice.price)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdatePrice(
                            detail.productId,
                            editingPrice.price
                          );
                        }
                      }}
                      className="border rounded px-2 py-1 w-32 text-right"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() =>
                        setEditingPrice({
                          id: detail.id,
                          price: Number(detail.price),
                        })
                      }
                      className="hover:text-blue-600">
                      {Number(detail.price).toLocaleString()}
                    </button>
                  )}
                </td>
                <td className="p-3 text-sm text-right">
                  {Number(detail.price).toLocaleString()}
                </td>
                <td className="p-3 text-sm text-right">
                  {Number(detail.product?.retailPrice || 0).toLocaleString()}
                </td>
                <td className="p-3 text-sm text-right">
                  {Number(detail.price).toLocaleString()}
                </td>
                <td className="p-3 text-sm text-right">
                  {Number(detail.price).toLocaleString()}
                </td>
                <td className="p-3 text-sm text-right">
                  {Number(detail.product?.retailPrice || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!products || products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có sản phẩm trong bảng giá này
          </div>
        ) : null}
      </div>
    </div>
  );
}
