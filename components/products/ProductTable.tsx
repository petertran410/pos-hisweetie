"use client";

import { useState } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { ProductDetail } from "./ProductDetail";
import type { Product } from "@/lib/api/products";

export function ProductTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [visibleColumns, setVisibleColumns] = useState({
    code: true,
    name: true,
    category: true,
    type: true,
    price: true,
    stock: true,
  });

  const { data, isLoading } = useProducts({ page, limit, search });

  const toggleColumnVisibility = (column: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  };

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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded">
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
          <button className="px-3 py-2 border rounded">Import file</button>
          <div className="relative">
            <button className="px-3 py-2 border rounded">Cột hiển thị</button>
            {/* Column visibility dropdown */}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
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
              {visibleColumns.code && (
                <th className="p-3 text-left">Mã hàng</th>
              )}
              {visibleColumns.name && (
                <th className="p-3 text-left">Tên hàng</th>
              )}
              {visibleColumns.category && (
                <th className="p-3 text-left">Nhóm hàng</th>
              )}
              {visibleColumns.type && (
                <th className="p-3 text-left">Loại hàng</th>
              )}
              {visibleColumns.price && (
                <th className="p-3 text-left">Giá bán</th>
              )}
              {visibleColumns.stock && (
                <th className="p-3 text-left">Tồn kho</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data?.data.map((product) => (
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
                {visibleColumns.code && <td className="p-3">{product.code}</td>}
                {visibleColumns.name && <td className="p-3">{product.name}</td>}
                {visibleColumns.category && (
                  <td className="p-3">{product.category?.name || "-"}</td>
                )}
                {visibleColumns.type && <td className="p-3">Hàng hóa</td>}
                {visibleColumns.price && (
                  <td className="p-3">
                    {Number(product.retailPrice).toLocaleString()}
                  </td>
                )}
                {visibleColumns.stock && (
                  <td className="p-3">{product.stockQuantity}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {/* Product Detail Drawer */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
