"use client";

import { useState, Fragment, useEffect } from "react";
import { useOrderSuppliers } from "@/lib/hooks/useOrderSuppliers";
import type {
  OrderSupplier,
  OrderSupplierFilters,
} from "@/lib/types/order-supplier";
import { OrderSupplierDetailRow } from "./OrderSupplierDetailRow";
import { Plus, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { getStatusLabel } from "@/lib/types/order-supplier";
import { formatCurrency, formatNumberInput } from "@/lib/utils";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width: string;
  render: (os: OrderSupplier) => React.ReactNode;
}

const formatDateTime = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN");
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã đặt hàng nhập",
    visible: true,
    width: "180px",
    render: (os) => os.code,
  },
  {
    key: "purchaseOrderCode",
    label: "Mã nhập hàng",
    visible: true,
    width: "150px",
    render: (os) => {
      if (!os.purchaseOrders || os.purchaseOrders.length === 0) {
        return "-";
      }
      return os.purchaseOrders.map((po) => po.code).join(" | ");
    },
  },
  {
    key: "orderDate",
    label: "Ngày đặt",
    visible: true,
    width: "180px",
    render: (os) => formatDateTime(os.orderDate),
  },
  {
    key: "createdDate",
    label: "Ngày tạo",
    visible: true,
    width: "180px",
    render: (os) => formatDateTime(os.createdAt),
  },
  {
    key: "upadatedDate",
    label: "Ngày cập nhật",
    visible: true,
    width: "180px",
    render: (os) => formatDateTime(os.updatedAt),
  },
  {
    key: "supplier",
    label: "Nhà cung cấp",
    visible: true,
    width: "180px",
    render: (os) => os.supplier?.name || "-",
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: true,
    width: "150px",
    render: (os) => os.branch?.name || "-",
  },
  {
    key: "total",
    label: "Tổng tiền hàng",
    visible: true,
    width: "150px",
    render: (os) => formatCurrency(os.total),
  },
  {
    key: "orderBy",
    label: "Người đặt",
    visible: false,
    width: "150px",
    render: (os) => os.user?.name,
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: true,
    width: "150px",
    render: (os) => os.creator?.name || "-",
  },
  {
    key: "totalQuantity",
    label: "Tổng số lượng",
    visible: false,
    width: "180px",
    render: (os) => formatCurrency(os.totalQty) || "-",
  },
  {
    key: "productQuantitt",
    label: "Số lượng mặt hàng",
    visible: false,
    width: "180px",
    render: (os) => os.productQty || "-",
  },
  {
    key: "discount",
    label: "Giảm giá",
    visible: false,
    width: "120px",
    render: (os) => formatCurrency(os.discount),
  },
  {
    key: "totalPayForSupplier",
    label: "Chi phí nhập trả NCC",
    visible: false,
    width: "220px",
    render: (os) => formatCurrency(os.total),
  },
  {
    key: "subTotal",
    label: "Cần trả NCC",
    visible: true,
    width: "150px",
    render: (os) => formatCurrency(os.supplierDebt),
  },
  {
    key: "paidAmount",
    label: "Đã trả NCC",
    visible: true,
    width: "150px",
    render: (os) => formatCurrency(os.paidAmount),
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "200px",
    render: (os) => (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${
          os.status === 0
            ? "bg-gray-100 text-gray-800"
            : os.status === 1
              ? "bg-blue-100 text-blue-800"
              : os.status === 2
                ? "bg-yellow-100 text-yellow-800"
                : os.status === 3
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
        }`}>
        {getStatusLabel(os.status)}
      </span>
    ),
  },
];

interface OrderSuppliersTableProps {
  filters: OrderSupplierFilters;
  onFiltersChange: (filters: Partial<OrderSupplierFilters>) => void;
}

export function OrderSuppliersTable({
  filters,
  onFiltersChange,
}: OrderSuppliersTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [search, setSearch] = useState("");

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("orderSupplierTableColumns");
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

  const { data, isLoading } = useOrderSuppliers({
    ...filters,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "orderSupplierTableColumns",
        JSON.stringify(columns)
      );
    }
  }, [columns]);

  const orderSuppliers = data?.data || [];
  const total = data?.total || 0;
  const visibleColumns = columns.filter((col) => col.visible);

  const currentItem = filters.currentItem ?? 0;
  const pageSize = filters.pageSize ?? 15;

  const toggleColumnVisibility = (key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === orderSuppliers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orderSuppliers.map((os) => os.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] mt-4 mr-4 mb-4 border rounded-xl">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 w-[500px]">
          <h1 className="text-xl font-semibold w-[250px]">Đặt hàng nhập</h1>
          <input
            type="text"
            placeholder="Theo mã phiếu đặt hàng nhập"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/san-pham/dat-hang-nhap/new")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Đặt hàng nhập</span>
          </button>
          <button className="px-4 py-2 border rounded hover:bg-gray-50 text-md flex items-center gap-2">
            Xuất file
          </button>
          <button
            onClick={() => setShowColumnModal(true)}
            className="px-4 py-2 border rounded hover:bg-gray-50 text-md flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Cột Hiển Thị
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-md">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  checked={
                    orderSuppliers.length > 0 &&
                    selectedIds.length === orderSuppliers.length
                  }
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left font-medium text-gray-700 whitespace-nowrap"
                  style={{
                    minWidth: col.width,
                    maxWidth: col.width,
                    width: col.width,
                  }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="p-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : orderSuppliers.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="p-8 text-center text-gray-500">
                  Không có phiếu đặt hàng nhập nào
                </td>
              </tr>
            ) : (
              orderSuppliers.map((os) => (
                <Fragment key={os.id}>
                  <tr
                    className={`border-b cursor-pointer ${
                      expandedId === os.id ? "" : ""
                    }`}
                    onClick={() => toggleExpand(os.id)}>
                    <td
                      className="px-6 py-3 sticky left-0 bg-white"
                      onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(os.id)}
                        onChange={() => toggleSelect(os.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className="px-6 py-3 text-md"
                        style={{
                          minWidth: col.width,
                          maxWidth: col.width,
                          width: col.width,
                        }}>
                        <div className="break-words">{col.render(os)}</div>
                      </td>
                    ))}
                  </tr>
                  {expandedId === os.id && (
                    <OrderSupplierDetailRow
                      orderSupplierId={os.id}
                      colSpan={visibleColumns.length + 1}
                    />
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t px-4 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <span className="text-md text-gray-600">
            Hiển thị {currentItem + 1} -{" "}
            {Math.min(currentItem + pageSize, total)} của {total}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (currentItem > 0) {
                onFiltersChange({ currentItem: currentItem - pageSize });
              }
            }}
            disabled={currentItem === 0}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-md">
            Trước
          </button>
          <button
            onClick={() => {
              if (currentItem + pageSize < total) {
                onFiltersChange({ currentItem: currentItem + pageSize });
              }
            }}
            disabled={currentItem + pageSize >= total}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-md">
            Sau
          </button>
        </div>
      </div>

      {showColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tùy chỉnh cột hiển thị</h3>
              <button
                onClick={() => setShowColumnModal(false)}
                className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => toggleColumnVisibility(col.key)}
                    className="cursor-pointer"
                  />
                  <span className="text-md">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
