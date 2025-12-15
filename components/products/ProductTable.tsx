"use client";

import { useState } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { ProductDetail } from "./ProductDetail";
import { ProductForm } from "./ProductForm";
import type { Product } from "@/lib/api/products";

export function ProductTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data, isLoading, error } = useProducts({ page, limit, search });

  const toggleSelectAll = () => {
    if (selectedIds.length === data?.data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data?.data.map((p) => p.id) || []);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Lỗi tải dữ liệu sản phẩm</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            + Tạo mới
          </button>
          <input
            type="text"
            placeholder="Theo mã, tên hàng"
            className="border rounded px-3 py-2 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 border rounded hover:bg-gray-50">
            Import file
          </button>
          <button className="px-3 py-2 border rounded hover:bg-gray-50">
            Cột hiển thị
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Đang tải...</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === data?.data.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-3 text-left">Mã hàng</th>
                <th className="p-3 text-left">Tên hàng</th>
                <th className="p-3 text-left">Nhóm hàng</th>
                <th className="p-3 text-left">Loại hàng</th>
                <th className="p-3 text-left">Giá bán</th>
                <th className="p-3 text-left">Tồn kho</th>
              </tr>
            </thead>
            <tbody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedProduct(product)}>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                      />
                    </td>
                    <td className="p-3">{product.code}</td>
                    <td className="p-3">{product.name}</td>
                    <td className="p-3">{product.category?.name || "-"}</td>
                    <td className="p-3">Hàng hóa</td>
                    <td className="p-3">
                      {Number(product.retailPrice).toLocaleString()}
                    </td>
                    <td className="p-3">{product.stockQuantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Không có sản phẩm nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Hiển thị</span>
          <select
            className="border rounded px-2 py-1"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>trên tổng {data?.total || 0} sản phẩm</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}>
            Trước
          </button>
          <span>
            Trang {page} / {Math.ceil((data?.total || 0) / limit)}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page >= Math.ceil((data?.total || 0) / limit)}
            onClick={() => setPage((p) => p + 1)}>
            Sau
          </button>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {showCreateForm && (
        <ProductForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}
