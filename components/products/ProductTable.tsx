"use client";

import { useState, useEffect } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { ProductDetail } from "./ProductDetail";
import { ProductForm } from "./ProductForm";
import type { Product } from "@/lib/api/products";
import { ComboProductForm } from "./ComboProductForm";

interface ProductTableProps {
  selectedCategoryIds: number[];
}

type ColumnKey =
  | "image"
  | "code"
  | "name"
  | "category"
  | "type"
  | "channelLink"
  | "retailPrice"
  | "purchasePrice"
  | "tradeMark"
  | "stock"
  | "customerOrder"
  | "createdAt"
  | "updatedAt"
  | "stockOutDate"
  | "minStock"
  | "maxStock"
  | "status"
  | "rewardPoint"
  | "supplierOrder"
  | "point";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
  render: (product: Product) => React.ReactNode;
}

const getProductTypeLabel = (type: number) => {
  switch (type) {
    case 1:
      return "Combo - đóng gói";
    case 2:
      return "Hàng hóa";
    case 3:
      return "Dịch vụ";
    default:
      return "Hàng hóa";
  }
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "image",
    label: "Hình ảnh",
    visible: true,
    render: (product) =>
      product.images?.[0] ? (
        <img
          src={product.images[0].image}
          alt={product.name}
          className="w-10 h-10 object-cover rounded"
        />
      ) : (
        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs">
          N/A
        </div>
      ),
  },
  {
    key: "code",
    label: "Mã hàng",
    visible: true,
    render: (product) => product.code,
  },
  {
    key: "name",
    label: "Tên hàng",
    visible: true,
    render: (product) => product.name,
  },
  {
    key: "category",
    label: "Nhóm hàng",
    visible: true,
    render: (product) => product.category?.name || "-",
  },
  {
    key: "type",
    label: "Loại hàng",
    visible: true,
    render: (product) => getProductTypeLabel(product.type),
  },

  {
    key: "channelLink",
    label: "Liên kết kênh bán",
    visible: false,
    render: () => "-",
  },
  {
    key: "retailPrice",
    label: "Giá bán",
    visible: true,
    render: (product) => Number(product.retailPrice).toLocaleString() + " đ",
  },
  {
    key: "purchasePrice",
    label: "Giá vốn",
    visible: false,
    render: (product) => Number(product.purchasePrice).toLocaleString() + " đ",
  },
  {
    key: "tradeMark",
    label: "Thương hiệu",
    visible: false,
    render: (product) => product.tradeMark?.name || "-",
  },
  {
    key: "stock",
    label: "Tồn kho",
    visible: true,
    render: (product) => product.stockQuantity,
  },
  {
    key: "customerOrder",
    label: "Khách đặt",
    visible: false,
    render: () => "-",
  },
  {
    key: "createdAt",
    label: "Thời gian tạo",
    visible: false,
    render: (product) =>
      product.createdAt
        ? new Date(product.createdAt).toLocaleDateString("vi-VN")
        : "-",
  },
  {
    key: "updatedAt",
    label: "Thời gian cập nhật",
    visible: false,
    render: (product) =>
      product.updatedAt
        ? new Date(product.updatedAt).toLocaleDateString("vi-VN")
        : "-",
  },
  {
    key: "stockOutDate",
    label: "Dự kiến hết hàng",
    visible: false,
    render: () => "-",
  },
  {
    key: "minStock",
    label: "Định mức tồn ít nhất",
    visible: false,
    render: (product) => product.minStockAlert,
  },
  {
    key: "maxStock",
    label: "Định mức tồn nhiều nhất",
    visible: false,
    render: (product) => product.maxStockAlert,
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: false,
    render: (product) => (product.isActive ? "Hoạt động" : "Ngừng"),
  },
  {
    key: "rewardPoint",
    label: "Tích điểm",
    visible: false,
    render: (product) => (product.isRewardPoint ? "Có" : "Không"),
  },
  {
    key: "supplierOrder",
    label: "Đặt NCC",
    visible: false,
    render: () => "-",
  },
  {
    key: "point",
    label: "Điểm",
    visible: false,
    render: () => "-",
  },
];

export function ProductTable({ selectedCategoryIds }: ProductTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [productType, setProductType] = useState<number | null>(null);

  const handleCreateProduct = (type: number) => {
    setProductType(type);
    setShowCreateForm(true);
    setShowCreateDropdown(false);
  };

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("productTableColumns");
      if (saved) {
        try {
          const savedColumns = JSON.parse(saved);
          return DEFAULT_COLUMNS.map((col) => ({
            ...col,
            visible:
              savedColumns.find((s: any) => s.key === col.key)?.visible ??
              col.visible,
          }));
        } catch {
          return DEFAULT_COLUMNS;
        }
      }
    }
    return DEFAULT_COLUMNS;
  });

  const categoryIds =
    selectedCategoryIds.length > 0 ? selectedCategoryIds.join(",") : undefined;

  const { data, isLoading, error } = useProducts({
    page,
    limit,
    search,
    categoryIds,
  });

  useEffect(() => {
    setPage(1);
  }, [selectedCategoryIds, search]);

  useEffect(() => {
    localStorage.setItem("productTableColumns", JSON.stringify(columns));
  }, [columns]);

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

  const toggleColumnVisibility = (key: ColumnKey) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const visibleColumns = columns.filter((col) => col.visible);

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
          <div className="relative">
            <button
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
              + Tạo mới
              <svg
                className={`w-4 h-4 transition-transform ${
                  showCreateDropdown ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showCreateDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-50 w-48">
                <button
                  onClick={() => handleCreateProduct(2)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                  Hàng hóa
                </button>
                <button
                  onClick={() => handleCreateProduct(3)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                  Dịch vụ
                </button>
                <button
                  onClick={() => handleCreateProduct(1)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                  Combo - đóng gói
                </button>
              </div>
            )}
          </div>
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
          <button
            onClick={() => setShowColumnModal(!showColumnModal)}
            className="px-3 py-2 border rounded hover:bg-gray-50 relative">
            Cột hiển thị
          </button>
        </div>
      </div>

      {showColumnModal && (
        <div className="absolute right-4 top-32 bg-white border rounded shadow-lg z-50 p-4 w-64 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Hiển thị cột</h3>
            <button
              onClick={() => setShowColumnModal(false)}
              className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {columns.map((col) => (
              <label key={col.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggleColumnVisibility(col.key)}
                  className="cursor-pointer"
                />
                <span className="text-sm">{col.label}</span>
              </label>
            ))}
          </div>
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
              className="w-full"
              style={{ minWidth: "max-content", borderSpacing: "0 1px" }}>
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left sticky left-0 bg-gray-50 z-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === data?.data.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      className="px-6 py-3 text-left whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data && data.data.length > 0 ? (
                  data.data.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedProduct(product)}>
                      <td
                        className="px-6 py-3 sticky left-0 bg-white z-10"
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelect(product.id)}
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className="px-6 py-3 whitespace-nowrap">
                          {col.render(product)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + 1}
                      className="p-8 text-center text-gray-500">
                      Không có sản phẩm nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

      {showCreateForm && productType === 1 && (
        <ComboProductForm
          onClose={() => {
            setShowCreateForm(false);
            setProductType(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setProductType(null);
          }}
        />
      )}

      {showCreateForm && productType && productType !== 1 && (
        <ProductForm
          productType={productType}
          onClose={() => {
            setShowCreateForm(false);
            setProductType(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setProductType(null);
          }}
        />
      )}
    </div>
  );
}
