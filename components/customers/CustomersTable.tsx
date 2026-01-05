"use client";

import { useState, useEffect, Fragment } from "react";
import { useCustomers, useCustomer } from "@/lib/hooks/useCustomers";
import { Customer, CustomerFilters } from "@/lib/types/customer";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";
import { CustomerDetailRow } from "./CustomerDetailRow";

interface CustomersTableProps {
  filters: CustomerFilters;
  onCreateClick: () => void;
  onEditClick: (customer: Customer) => void;
}

type ColumnKey =
  | "code"
  | "name"
  | "contactNumber"
  | "phone"
  | "email"
  | "gender"
  | "birthDate"
  | "customerType"
  | "organization"
  | "taxCode"
  | "cityName"
  | "wardName"
  | "address"
  | "debtAmount"
  | "debtDays"
  | "totalPurchased"
  | "totalRevenue"
  | "totalPoint"
  | "rewardPoint"
  | "facebook"
  | "branch"
  | "createdAt"
  | "updatedAt";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
  width?: string;
  render: (customer: Customer) => React.ReactNode;
}

const formatDateTime = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN");
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã khách hàng",
    visible: true,
    width: "150px",
    render: (customer) => customer.code,
  },
  {
    key: "name",
    label: "Tên khách hàng",
    visible: true,
    width: "250px",
    render: (customer) => <span className="font-medium">{customer.name}</span>,
  },
  {
    key: "contactNumber",
    label: "Điện thoại",
    visible: true,
    width: "150px",
    render: (customer) => customer.contactNumber || customer.phone || "-",
  },
  {
    key: "createdAt",
    label: "Ngày tạo",
    visible: false,
    width: "180px",
    render: (customer) => formatDateTime(customer.createdAt),
  },
  {
    key: "updatedAt",
    label: "Ngày Cập nhật",
    visible: false,
    width: "180px",
    render: (customer) => formatDateTime(customer.updatedAt),
  },
  {
    key: "debtAmount",
    label: "Nợ hiện tại",
    visible: true,
    width: "150px",
    render: (customer) => formatCurrency(customer.totalDebt),
  },

  {
    key: "totalPurchased",
    label: "Tổng bán",
    visible: true,
    width: "150px",
    render: (customer) => formatCurrency(customer.totalPurchased),
  },
  {
    key: "totalRevenue",
    label: "Tổng bán trừ trả hàng",
    visible: true,
    width: "180px",
    render: (customer) => formatCurrency(customer.totalRevenue),
  },
  {
    key: "debtDays",
    label: "Số ngày nợ",
    visible: true,
    width: "120px",
    render: () => "0",
  },
  {
    key: "email",
    label: "Email",
    visible: false,
    width: "200px",
    render: (customer) => customer.email || "-",
  },
  {
    key: "gender",
    label: "Giới tính",
    visible: false,
    width: "100px",
    render: (customer) => {
      if (customer.gender === true) return "Nam";
      if (customer.gender === false) return "Nữ";
      return "-";
    },
  },
  {
    key: "birthDate",
    label: "Sinh nhật",
    visible: false,
    width: "150px",
    render: (customer) =>
      customer.birthDate ? formatDate(customer.birthDate) : "-",
  },
  {
    key: "customerType",
    label: "Loại khách hàng",
    visible: false,
    width: "150px",
    render: (customer) => (customer.type === 0 ? "Cá nhân" : "Công ty"),
  },
  {
    key: "organization",
    label: "Tên công ty",
    visible: false,
    width: "200px",
    render: (customer) => customer.organization || "-",
  },
  {
    key: "taxCode",
    label: "Mã số thuế",
    visible: false,
    width: "150px",
    render: (customer) => customer.taxCode || "-",
  },
  {
    key: "cityName",
    label: "Thành Phố",
    visible: false,
    width: "150px",
    render: (customer) => customer.cityName || "-",
  },
  {
    key: "wardName",
    label: "Phường/Xã",
    visible: false,
    width: "150px",
    render: (customer) => customer.wardName || "-",
  },
  {
    key: "address",
    label: "Địa chỉ",
    visible: false,
    width: "300px",
    render: (customer) => customer.address || "-",
  },

  {
    key: "totalPoint",
    label: "Tổng điểm",
    visible: false,
    width: "120px",
    render: (customer) => Number(customer.totalPoint).toLocaleString(),
  },
  {
    key: "phone",
    label: "Điện thoại 2",
    visible: false,
    width: "150px",
    render: (customer) => customer.phone || "-",
  },
  {
    key: "rewardPoint",
    label: "Điểm thưởng",
    visible: false,
    width: "120px",
    render: (customer) => customer.rewardPoint.toLocaleString(),
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: false,
    width: "150px",
    render: (customer) => customer.branch?.name || "-",
  },
];

export function CustomersTable({
  filters,
  onCreateClick,
  onEditClick,
}: CustomersTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState(search);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("customerTableColumns");
      if (saved) {
        try {
          const savedColumns = JSON.parse(saved);
          return DEFAULT_COLUMNS.map((col) => ({
            ...col,
            visible:
              savedColumns.find((s: any) => s.key === col.key)?.visible ??
              col.visible,
          }));
        } catch (e) {
          return DEFAULT_COLUMNS;
        }
      }
    }
    return DEFAULT_COLUMNS;
  });

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("customerTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const { data, isLoading } = useCustomers({
    ...filters,
    name: searchDebounced || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExpand = (customerId: number) => {
    setExpandedCustomerId((prev) => (prev === customerId ? null : customerId));
  };

  const toggleColumnVisibility = (key: ColumnKey) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const visibleColumns = columns.filter((col) => col.visible);
  const customers = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Khách hàng
          </button>
          <input
            type="text"
            placeholder="Theo mã, tên, số điện thoại"
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
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left sticky left-0 bg-gray-50 w-[50px]">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === customers.length &&
                      customers.length > 0
                    }
                    onChange={() => {
                      if (selectedIds.length === customers.length) {
                        setSelectedIds([]);
                      } else {
                        setSelectedIds(customers.map((c) => c.id));
                      }
                    }}
                  />
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-6 py-3 text-left font-medium text-gray-700"
                    style={{
                      width: col.width,
                      minWidth: col.width,
                      maxWidth: col.width,
                    }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 1}
                    className="text-center py-12 text-gray-500">
                    Không tìm thấy khách hàng nào
                  </td>
                </tr>
              ) : (
                customers.map((customer: Customer) => (
                  <Fragment key={customer.id}>
                    <tr
                      onClick={() => toggleExpand(customer.id)}
                      className="border-b hover:bg-gray-50 cursor-pointer">
                      <td
                        className="px-6 py-3 sticky left-0 bg-white z-10"
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(customer.id)}
                          onChange={() => toggleSelect(customer.id)}
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className="px-6 py-3"
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}>
                          {col.render(customer)}
                        </td>
                      ))}
                    </tr>
                    {expandedCustomerId === customer.id && (
                      <CustomerDetailRow
                        customerId={customer.id}
                        colSpan={visibleColumns.length + 1}
                        onEditClick={onEditClick}
                      />
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <span>Hiển thị</span>
          <select
            className="border rounded px-2 py-1"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>trên tổng {total} khách hàng</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}>
            Trước
          </button>
          <span>
            Trang {page} / {totalPages || 1}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}>
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
