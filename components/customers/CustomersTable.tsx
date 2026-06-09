"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import { useCustomers, useCustomersTotals, useExportCustomers } from "@/lib/hooks/useCustomers";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Upload,
  Download,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import type { Customer, CustomerFilters } from "@/lib/types/customer";
import { CustomerDetailRow } from "./CustomerDetailRow";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PermissionGate } from "../permissions/PermissionGate";
import { useCan } from "@/lib/hooks/useCan";
import { CodeLink } from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

interface CustomersTableProps {
  filters: CustomerFilters;
  onCreateClick: () => void;
  onEditClick: (customer: Customer) => void;
  onImportClick: () => void;
}

const formatDateTime = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN");
};

const DEFAULT_COLUMNS: ColumnConfig<Customer>[] = [
  {
    key: "code",
    label: "Mã khách hàng",
    visible: true,
    width: "160px",
    render: (c) => (
      <CodeLink
        entity="customer"
        code={c.code}
        className="text-blue-600 hover:underline font-medium break-all"
      />
    ),
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
  // {
  //   key: "totalPoint",
  //   label: "Tổng điểm",
  //   visible: false,
  //   width: "120px",
  //   render: (c) => Number(c.totalPoint).toLocaleString(),
  // },
  // {
  //   key: "rewardPoint",
  //   label: "Điểm thưởng",
  //   visible: false,
  //   width: "120px",
  //   render: (c) => c.rewardPoint.toLocaleString(),
  // },
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
  onImportClick,
}: CustomersTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  // Map cột (key trong bảng) → field sort của backend (field thật trên model Customer)
  const COLUMN_ORDER_BY: Record<string, string> = {
    code: "code",
    name: "name",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    debtAmount: "totalDebt",
    totalPurchased: "totalPurchased",
    totalRevenue: "totalRevenue",
  };

  const SORTABLE_COLUMNS = new Set(Object.keys(COLUMN_ORDER_BY));

  const handleSort = (colKey: string) => {
    if (!SORTABLE_COLUMNS.has(colKey)) return;
    if (sortBy !== colKey) {
      setSortBy(colKey);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortBy(null);
      setSortDir(null);
    }
    setPage(1);
  };

  const canViewDebt = useCan("customers", "view_debt");
  const { exportToFile, isExporting } = useExportCustomers();

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page khi filter/search thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const { columns, toggleColumn } = useColumnVisibility(
    "customerTableColumns",
    DEFAULT_COLUMNS
  );

  const DEBT_KEYS = ["debtAmount", "debtDays"];

  const displayColumns = useMemo(
    () =>
      canViewDebt ? columns : columns.filter((c) => !DEBT_KEYS.includes(c.key)),
    [columns, canViewDebt]
  );

  const { data, isLoading } = useCustomers({
    ...filters,
    name: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
    ...(sortBy && sortDir
      ? { orderBy: COLUMN_ORDER_BY[sortBy], orderDirection: sortDir }
      : {}),
  });

  // Tổng các cột tiền của TOÀN BỘ khách hàng match filter — không phụ thuộc page/limit.
  const { data: totals } = useCustomersTotals({
    ...filters,
    name: debouncedSearch || undefined,
  });

  const customers: Customer[] = data?.data || [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const visibleColumns = useMemo(
    () => displayColumns.filter((c) => c.visible),
    [displayColumns]
  );

  const colSpan = visibleColumns.length + 2;

  // Map cột → giá trị tổng tương ứng. Chỉ những cột có ý nghĩa cộng tổng
  // mới render số; các cột còn lại để trống (cell vẫn tồn tại để giữ layout).
  const renderTotalCell = (key: string): React.ReactNode => {
    if (!totals) return null;
    switch (key) {
      case "debtAmount": {
        const debt = totals.totalDebt;
        return debt > 0 ? (
          <span className="font-semibold text-orange-600">
            {formatCurrency(debt)}
          </span>
        ) : (
          <span className="font-semibold text-gray-400">
            {formatCurrency(debt)}
          </span>
        );
      }
      case "totalPurchased":
        return (
          <span className="font-semibold text-gray-900">
            {formatCurrency(totals.totalPurchased)}
          </span>
        );
      case "totalRevenue":
        return (
          <span className="font-semibold text-gray-900">
            {formatCurrency(totals.totalRevenue)}
          </span>
        );
      default:
        return null;
    }
  };

  // Có ít nhất 1 cột tiền đang hiển thị thì mới render row tổng.
  const TOTAL_KEYS = new Set([
    "debtAmount",
    "totalPurchased",
    "totalRevenue",
  ]);
  const hasTotalRow = visibleColumns.some((c) => TOTAL_KEYS.has(c.key));

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
    <PermissionGate resource="orders" action="view">
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
            <PermissionGate resource="customers" action="create">
              <button
                onClick={onCreateClick}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Tạo khách hàng
              </button>
            </PermissionGate>
            <PermissionGate resource="customers" action="create">
              <button
                onClick={onImportClick}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-600">
                <Upload className="w-4 h-4" />
                Import
              </button>
            </PermissionGate>
            <PermissionGate resource="customers" action="view">
              <button
                onClick={() =>
                  exportToFile({
                    ...filters,
                    name: debouncedSearch || undefined,
                  })
                }
                disabled={isExporting}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-600 disabled:opacity-50">
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExporting ? "Đang xuất..." : "Xuất file"}
              </button>
            </PermissionGate>
            <ColumnToggle columns={displayColumns} onToggle={toggleColumn} />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
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
                    className={`px-4 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide ${
                      SORTABLE_COLUMNS.has(col.key)
                        ? "cursor-pointer select-none hover:bg-gray-100"
                        : ""
                    }`}
                    style={{ width: col.width, minWidth: col.width }}
                    onClick={() => handleSort(col.key)}>
                    <span className="flex items-center gap-1">
                      {col.label}
                      {SORTABLE_COLUMNS.has(col.key) && (
                        <span className="inline-flex text-gray-400">
                          {sortBy === col.key && sortDir === "desc" ? (
                            <ArrowDown className="w-3 h-3 text-blue-500" />
                          ) : sortBy === col.key && sortDir === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-blue-500" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {hasTotalRow && (
                <tr className="bg-gray-50/60 border-b">
                  <td className="px-4 py-2.5 sticky left-0 bg-gray-50/60" />
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-2.5 whitespace-nowrap"
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                      }}>
                      {renderTotalCell(col.key)}
                    </td>
                  ))}
                  <td className="px-4 py-2.5" />
                </tr>
              )}
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
                      className={`cursor-pointer transition-colors ${
                        expandedCustomerId === customer.id
                          ? "bg-blue-50"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(customer.id)}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedCustomerId === customer.id
                            ? "bg-blue-50 border-t-2 border-l-2 border-blue-500"
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
                          className={`px-4 py-2.5 ${
                            expandedCustomerId === customer.id
                              ? "border-t-2 border-blue-500"
                              : ""
                          }`}
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
                      <td
                        className={`px-4 py-2.5 ${
                          expandedCustomerId === customer.id
                            ? "border-t-2 border-r-2 border-blue-500"
                            : ""
                        }`}>
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
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronsLeft className="w-4 h-4" />
            </button>
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
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs text-gray-400">
            Trang {page}/{totalPages}
            {total > 0 ? ` · ${total} khách hàng` : ""}
          </span>
        </div>
      </div>
    </PermissionGate>
  );
}
