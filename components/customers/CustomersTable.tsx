// components/customers/CustomersTable.tsx
"use client";

import { useState, useEffect } from "react";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useCustomerFiltersStore } from "@/lib/store/customerFilters";
import { Customer } from "@/lib/types/customer";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Search, Plus, Filter } from "lucide-react";
import { ColumnVisibilityDropdown } from "./ColumnVisibilityDropdown";

interface CustomersTableProps {
  onCreateClick: () => void;
}

export function CustomersTable({ onCreateClick }: CustomersTableProps) {
  const { filters } = useCustomerFiltersStore();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const { data, isLoading } = useCustomers({
    ...filters,
    page,
    limit,
    search: searchDebounced,
  });

  const { visibleColumns } = useCustomerFiltersStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, filters]);

  const isColumnVisible = (column: string) => visibleColumns.includes(column);

  const customers = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const totals = customers.reduce(
    (acc, customer) => ({
      debt: acc.debt + Number(customer.totalDebt),
      totalPurchased: acc.totalPurchased + Number(customer.totalPurchased),
      totalRevenue: acc.totalRevenue + Number(customer.totalRevenue),
    }),
    { debt: 0, totalPurchased: 0, totalRevenue: 0 }
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* HEADER SECTION - Tương tự ProductTable */}
      <div className="border-b p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Khách hàng</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreateClick}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Khách hàng
            </button>
            <ColumnVisibilityDropdown />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Theo mã, tên, số điện thoại"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded"
            />
          </div>
          <button className="p-2 border rounded hover:bg-gray-50">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse bg-white"
              style={{ minWidth: "max-content" }}>
              <thead className="sticky top-0 bg-gray-50 border-b z-10">
                <tr>
                  <th className="p-2 border-r">
                    <input type="checkbox" className="w-4 h-4" />
                  </th>
                  {isColumnVisible("code") && (
                    <th className="p-2 text-left text-sm font-medium border-r whitespace-nowrap">
                      Mã khách hàng
                    </th>
                  )}
                  {isColumnVisible("name") && (
                    <th className="p-2 text-left text-sm font-medium border-r whitespace-nowrap">
                      Tên khách hàng
                    </th>
                  )}
                  {isColumnVisible("contactNumber") && (
                    <th className="p-2 text-left text-sm font-medium border-r whitespace-nowrap">
                      Điện thoại
                    </th>
                  )}
                  {isColumnVisible("debtAmount") && (
                    <th className="p-2 text-right text-sm font-medium border-r whitespace-nowrap">
                      Nợ hiện tại
                    </th>
                  )}
                  {isColumnVisible("debtDays") && (
                    <th className="p-2 text-right text-sm font-medium border-r whitespace-nowrap">
                      Số ngày nợ
                    </th>
                  )}
                  {isColumnVisible("totalPurchased") && (
                    <th className="p-2 text-right text-sm font-medium border-r whitespace-nowrap">
                      Tổng bán
                    </th>
                  )}
                  {isColumnVisible("totalRevenue") && (
                    <th className="p-2 text-right text-sm font-medium whitespace-nowrap">
                      Tổng bán trừ trả hàng
                    </th>
                  )}
                  {isColumnVisible("wardName") && (
                    <th className="p-2 text-left text-sm font-medium border-r whitespace-nowrap">
                      Phương/Xã
                    </th>
                  )}
                  {isColumnVisible("customerType") && (
                    <th className="p-2 text-left text-sm font-medium border-r whitespace-nowrap">
                      Loại khách hàng
                    </th>
                  )}
                  {isColumnVisible("gender") && (
                    <th className="p-2 text-left text-sm font-medium border-r whitespace-nowrap">
                      Giới tính
                    </th>
                  )}
                  {isColumnVisible("email") && (
                    <th className="p-2 text-left text-sm font-medium border-r whitespace-nowrap">
                      Email
                    </th>
                  )}
                  {isColumnVisible("createdAt") && (
                    <th className="p-2 text-left text-sm font-medium border-r whitespace-nowrap">
                      Ngày tạo
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50 font-medium">
                  <td className="p-2"></td>
                  {isColumnVisible("code") && <td className="p-2"></td>}
                  {isColumnVisible("name") && (
                    <td className="p-2 text-sm">{total.toLocaleString()}</td>
                  )}
                  {isColumnVisible("contactNumber") && (
                    <td className="p-2"></td>
                  )}
                  {isColumnVisible("debtAmount") && (
                    <td className="p-2 text-right text-sm">
                      {formatCurrency(totals.debt)}
                    </td>
                  )}
                  {isColumnVisible("debtDays") && <td className="p-2"></td>}
                  {isColumnVisible("totalPurchased") && (
                    <td className="p-2 text-right text-sm">
                      {formatCurrency(totals.totalPurchased)}
                    </td>
                  )}
                  {isColumnVisible("totalRevenue") && (
                    <td className="p-2 text-right text-sm">
                      {formatCurrency(totals.totalRevenue)}
                    </td>
                  )}
                </tr>

                {customers.map((customer: Customer) => (
                  <tr
                    key={customer.id}
                    className="border-b hover:bg-gray-50 cursor-pointer">
                    <td className="p-2 border-r">
                      <input type="checkbox" className="w-4 h-4" />
                    </td>
                    {isColumnVisible("code") && (
                      <td className="p-2 text-sm border-r whitespace-nowrap">
                        {customer.code}
                      </td>
                    )}
                    {isColumnVisible("name") && (
                      <td className="p-2 text-sm border-r font-medium whitespace-nowrap">
                        {customer.name}
                      </td>
                    )}
                    {isColumnVisible("contactNumber") && (
                      <td className="p-2 text-sm border-r whitespace-nowrap">
                        {customer.contactNumber || customer.phone}
                      </td>
                    )}
                    {isColumnVisible("debtAmount") && (
                      <td className="p-2 text-sm text-right border-r whitespace-nowrap">
                        {formatCurrency(customer.totalDebt)}
                      </td>
                    )}
                    {isColumnVisible("debtDays") && (
                      <td className="p-2 text-sm text-right border-r whitespace-nowrap">
                        0
                      </td>
                    )}
                    {isColumnVisible("totalPurchased") && (
                      <td className="p-2 text-sm text-right border-r whitespace-nowrap">
                        {formatCurrency(customer.totalPurchased)}
                      </td>
                    )}
                    {isColumnVisible("totalRevenue") && (
                      <td className="p-2 text-sm text-right whitespace-nowrap">
                        {formatCurrency(customer.totalRevenue)}
                      </td>
                    )}
                    {isColumnVisible("wardName") && (
                      <td className="p-2 text-sm border-r whitespace-nowrap">
                        {customer.wardName}
                      </td>
                    )}
                    {isColumnVisible("customerType") && (
                      <td className="p-2 text-sm border-r whitespace-nowrap">
                        {customer.type === 0 ? "Cá nhân" : "Công ty"}
                      </td>
                    )}
                    {isColumnVisible("gender") && (
                      <td className="p-2 text-sm border-r whitespace-nowrap">
                        {customer.gender === true
                          ? "Nam"
                          : customer.gender === false
                          ? "Nữ"
                          : ""}
                      </td>
                    )}
                    {isColumnVisible("email") && (
                      <td className="p-2 text-sm border-r whitespace-nowrap">
                        {customer.email}
                      </td>
                    )}
                    {isColumnVisible("createdAt") && (
                      <td className="p-2 text-sm border-r whitespace-nowrap">
                        {formatDate(customer.createdAt)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION SECTION - Tương tự ProductTable */}
      <div className="border-t p-4 flex items-center justify-between bg-white">
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
          <span>trên tổng {total} khách hàng</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}>
            Trước
          </button>
          <span>
            Trang {page} / {totalPages || 1}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}>
            Sau
          </button>
        </div>
      </div>

      {customers.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          Không tìm thấy khách hàng nào
        </div>
      )}
    </div>
  );
}
