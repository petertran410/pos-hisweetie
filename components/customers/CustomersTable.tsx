// components/customers/CustomersTable.tsx
"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import { useCustomers } from "@/lib/hooks/useCustomers";
import {
  Plus,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { Customer, CustomerFilters } from "@/lib/types/customer";
import { CustomerDetailRow } from "./CustomerDetailRow";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Can } from "../permissions/Can";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  render: (customer: Customer) => React.ReactNode;
}

interface CustomersTableProps {
  filters: CustomerFilters;
  onCreateClick: () => void;
  onEditClick: (customer: Customer) => void;
}

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Ngừng hoạt động" },
];

const formatDateTime = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN");
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã khách hàng",
    visible: true,
    width: "160px",
    render: (c) => <span className="font-medium text-blue-600">{c.code}</span>,
  },
  {
    key: "name",
    label: "Tên khách hàng",
    visible: true,
    width: "250px",
    render: (c) => <span className="font-medium">{c.name}</span>,
  },
  {
    key: "contactNumber",
    label: "Điện thoại",
    visible: true,
    width: "150px",
    render: (c) => c.contactNumber || c.phone || "-",
  },
  {
    key: "createdAt",
    label: "Ngày tạo",
    visible: false,
    width: "200px",
    render: (c) => formatDateTime(c.createdAt),
  },
  {
    key: "updatedAt",
    label: "Ngày cập nhật",
    visible: false,
    width: "200px",
    render: (c) => formatDateTime(c.updatedAt),
  },
  {
    key: "debtAmount",
    label: "Nợ hiện tại",
    visible: true,
    width: "150px",
    render: (c) => {
      const debt = Number(c.totalDebt);
      return debt > 0 ? (
        <span className="text-orange-600 font-medium">
          {formatCurrency(debt)}
        </span>
      ) : (
        <span className="text-gray-400">{formatCurrency(debt)}</span>
      );
    },
  },
  {
    key: "totalPurchased",
    label: "Tổng bán",
    visible: true,
    width: "150px",
    render: (c) => formatCurrency(c.totalPurchased),
  },
  {
    key: "totalRevenue",
    label: "Tổng bán trừ trả hàng",
    visible: true,
    width: "180px",
    render: (c) => formatCurrency(c.totalRevenue),
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
    render: (c) => c.email || "-",
  },
  {
    key: "gender",
    label: "Giới tính",
    visible: false,
    width: "100px",
    render: (c) => {
      if (c.gender === true) return "Nam";
      if (c.gender === false) return "Nữ";
      return "-";
    },
  },
  {
    key: "birthDate",
    label: "Sinh nhật",
    visible: false,
    width: "150px",
    render: (c) => (c.birthDate ? formatDate(c.birthDate) : "-"),
  },
  {
    key: "customerType",
    label: "Loại khách hàng",
    visible: false,
    width: "150px",
    render: (c) => (c.type === 0 ? "Cá nhân" : "Công ty"),
  },
  {
    key: "organization",
    label: "Tên công ty",
    visible: false,
    width: "200px",
    render: (c) => c.organization || "-",
  },
  {
    key: "taxCode",
    label: "Mã số thuế",
    visible: false,
    width: "150px",
    render: (c) => c.taxCode || "-",
  },
  {
    key: "cityName",
    label: "Thành phố",
    visible: false,
    width: "150px",
    render: (c) => {
      const addr =
        c.addresses?.find((a: any) => a.isDefault) || c.addresses?.[0];
      return (addr as any)?.cityName || (addr as any)?.newCityName || "-";
    },
  },
  {
    key: "wardName",
    label: "Phường/Xã",
    visible: false,
    width: "150px",
    render: (c) => {
      const addr =
        c.addresses?.find((a: any) => a.isDefault) || c.addresses?.[0];
      return (addr as any)?.wardName || (addr as any)?.newWardName || "-";
    },
  },
  {
    key: "address",
    label: "Địa chỉ",
    visible: false,
    width: "300px",
    render: (c) => {
      const addr =
        c.addresses?.find((a: any) => a.isDefault) || c.addresses?.[0];
      return (addr as any)?.address || "-";
    },
  },
  {
    key: "phone",
    label: "Điện thoại 2",
    visible: false,
    width: "150px",
    render: (c) => c.phone || "-",
  },
  {
    key: "totalPoint",
    label: "Tổng điểm",
    visible: false,
    width: "120px",
    render: (c) => Number(c.totalPoint).toLocaleString(),
  },
  {
    key: "rewardPoint",
    label: "Điểm thưởng",
    visible: false,
    width: "120px",
    render: (c) => c.rewardPoint.toLocaleString(),
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: false,
    width: "150px",
    render: (c) => c.branch?.name || "-",
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
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("all");

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page khi filter/search/tab thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab]);

  // Tab status override sidebar isActive filter
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab === "active") f.isActive = true;
    else if (activeStatusTab === "inactive") f.isActive = false;
    else if (activeStatusTab === "all") delete f.isActive;
    return f;
  }, [filters, activeStatusTab]);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("customerTableColumns");
      if (saved) {
        try {
          const savedCols = JSON.parse(saved);
          return DEFAULT_COLUMNS.map((col) => ({
            ...col,
            visible:
              savedCols.find((s: any) => s.key === col.key)?.visible ??
              col.visible,
          }));
        } catch {
          return DEFAULT_COLUMNS;
        }
      }
    }
    return DEFAULT_COLUMNS;
  });

  const { data, isLoading } = useCustomers({
    ...effectiveFilters,
    name: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("customerTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const customers: Customer[] = data?.data || [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible),
    [columns]
  );

  const pageSummary = useMemo(
    () => ({
      totalPurchased: customers.reduce(
        (s, c) => s + Number(c.totalPurchased),
        0
      ),
      totalDebt: customers.reduce((s, c) => s + Number(c.totalDebt), 0),
      totalRevenue: customers.reduce((s, c) => s + Number(c.totalRevenue), 0),
    }),
    [customers]
  );

  const colSpan = visibleColumns.length + 2;

  const toggleColumnVisibility = (key: string) =>
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === customers.length ? [] : customers.map((c) => c.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedCustomerId((prev) => (prev === id ? null : id));

  return (
    <Can resource="orders" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* ── Header ── */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Khách hàng
            </h2>
            <input
              type="text"
              placeholder="Theo mã, tên, SĐT khách hàng"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Can resource="customers" action="create">
              <button
                onClick={onCreateClick}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Tạo khách hàng
              </button>
            </Can>
            <button
              onClick={() => setShowColumnModal(true)}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1.5 text-gray-600">
              <Settings className="w-4 h-4" />
              Cột
            </button>
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div className="flex gap-1 px-4 bg-white border-b">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatusTab(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeStatusTab === tab.value
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Summary Row ── */}
        <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-6 text-sm">
          <span className="text-gray-600">
            Tổng bán:{" "}
            <strong>{formatCurrency(pageSummary.totalPurchased)}</strong>
          </span>
          <span className="text-gray-600">
            Tổng nợ:{" "}
            <strong className="text-orange-600">
              {formatCurrency(pageSummary.totalDebt)}
            </strong>
          </span>
          <span className="text-gray-600">
            Tổng doanh thu:{" "}
            <strong className="text-green-700">
              {formatCurrency(pageSummary.totalRevenue)}
            </strong>
          </span>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left w-10 sticky left-0 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === customers.length &&
                      customers.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide"
                    style={{ width: col.width, minWidth: col.width }}>
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={colSpan} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                      <span className="text-xs">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400">
                    <div className="text-sm">Không tìm thấy khách hàng nào</div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <Fragment key={customer.id}>
                    <tr
                      className={`border-b cursor-pointer transition-colors ${
                        expandedCustomerId === customer.id
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(customer.id)}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedCustomerId === customer.id
                            ? "bg-blue-50"
                            : "bg-white"
                        }`}
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(customer.id)}
                          onChange={() => toggleSelect(customer.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className="px-4 py-2.5"
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
                      <td className="px-4 py-2.5">
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedCustomerId === customer.id
                              ? "rotate-180"
                              : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {expandedCustomerId === customer.id && (
                      <CustomerDetailRow
                        customerId={customer.id}
                        colSpan={colSpan}
                        onEditClick={onEditClick}
                      />
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination (giống OrdersTable) ── */}
        <div className="border-t px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Hiển thị</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              {[10, 15, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">/ trang</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.min(
                Math.max(page - 2 + i, i + 1),
                totalPages - (Math.min(5, totalPages) - 1 - i)
              );
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 text-xs rounded border font-medium transition-colors ${
                    p === page
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:bg-gray-50 text-gray-600 border-gray-200"
                  }`}>
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs text-gray-400">
            Trang {page}/{totalPages}
            {total > 0 ? ` · ${total} khách hàng` : ""}
          </span>
        </div>
      </div>

      {showColumnModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
          onClick={() => setShowColumnModal(false)}>
          <div
            className="bg-white rounded-xl shadow-xl w-72 p-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">
                Cột hiển thị
              </h3>
              <button onClick={() => setShowColumnModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-0.5 max-h-80 overflow-y-auto">
              {columns
                .filter(
                  (c) => c.key !== "discount" && c.key !== "discountRatio"
                )
                .map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-3 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumnVisibility(col.key)}
                      className="cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
            </div>
          </div>
        </div>
      )}
    </Can>
  );
}
