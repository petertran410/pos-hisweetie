"use client";

import { useCustomers } from "@/lib/hooks/useCustomers";
import { useCustomerFiltersStore } from "@/lib/store/customerFilters";
import { Customer } from "@/lib/types/customer";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function CustomersTable() {
  const { filters } = useCustomerFiltersStore();
  const { data, isLoading } = useCustomers(filters);
  const { visibleColumns } = useCustomerFiltersStore();

  const isColumnVisible = (column: string) => visibleColumns.includes(column);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const customers = data?.data || [];
  const total = data?.total || 0;

  // Calculate totals
  const totals = customers.reduce(
    (acc, customer) => ({
      debt: acc.debt + Number(customer.totalDebt),
      totalPurchased: acc.totalPurchased + Number(customer.totalPurchased),
      totalRevenue: acc.totalRevenue + Number(customer.totalRevenue),
    }),
    { debt: 0, totalPurchased: 0, totalRevenue: 0 }
  );

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse bg-white">
        <thead className="sticky top-0 bg-gray-50 border-b">
          <tr>
            <th className="p-2 border-r">
              <input type="checkbox" className="w-4 h-4" />
            </th>
            {isColumnVisible("code") && (
              <th className="p-2 text-left text-sm font-medium border-r">
                Mã khách hàng
              </th>
            )}
            {isColumnVisible("name") && (
              <th className="p-2 text-left text-sm font-medium border-r">
                Tên khách hàng
              </th>
            )}
            {isColumnVisible("contactNumber") && (
              <th className="p-2 text-left text-sm font-medium border-r">
                Điện thoại
              </th>
            )}
            {isColumnVisible("debtAmount") && (
              <th className="p-2 text-right text-sm font-medium border-r">
                Nợ hiện tại
              </th>
            )}
            {isColumnVisible("debtDays") && (
              <th className="p-2 text-right text-sm font-medium border-r">
                Số ngày nợ
              </th>
            )}
            {isColumnVisible("totalPurchased") && (
              <th className="p-2 text-right text-sm font-medium border-r">
                Tổng bán
              </th>
            )}
            {isColumnVisible("totalRevenue") && (
              <th className="p-2 text-right text-sm font-medium">
                Tổng bán trừ trả hàng
              </th>
            )}
            {isColumnVisible("wardName") && (
              <th className="p-2 text-left text-sm font-medium border-r">
                Phương/Xã
              </th>
            )}
            {isColumnVisible("customerType") && (
              <th className="p-2 text-left text-sm font-medium border-r">
                Loại khách hàng
              </th>
            )}
            {isColumnVisible("gender") && (
              <th className="p-2 text-left text-sm font-medium border-r">
                Giới tính
              </th>
            )}
            {isColumnVisible("email") && (
              <th className="p-2 text-left text-sm font-medium border-r">
                Email
              </th>
            )}
            {isColumnVisible("createdAt") && (
              <th className="p-2 text-left text-sm font-medium border-r">
                Ngày tạo
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {/* Summary row */}
          <tr className="bg-blue-50 font-medium">
            <td className="p-2"></td>
            {isColumnVisible("code") && <td className="p-2"></td>}
            {isColumnVisible("name") && (
              <td className="p-2 text-sm">{total.toLocaleString()}</td>
            )}
            {isColumnVisible("contactNumber") && <td className="p-2"></td>}
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

          {/* Data rows */}
          {customers.map((customer: Customer) => (
            <tr
              key={customer.id}
              className="border-b hover:bg-gray-50 cursor-pointer">
              <td className="p-2 border-r">
                <input type="checkbox" className="w-4 h-4" />
              </td>
              {isColumnVisible("code") && (
                <td className="p-2 text-sm border-r">{customer.code}</td>
              )}
              {isColumnVisible("name") && (
                <td className="p-2 text-sm border-r font-medium">
                  {customer.name}
                </td>
              )}
              {isColumnVisible("contactNumber") && (
                <td className="p-2 text-sm border-r">
                  {customer.contactNumber || customer.phone}
                </td>
              )}
              {isColumnVisible("debtAmount") && (
                <td className="p-2 text-sm text-right border-r">
                  {formatCurrency(customer.totalDebt)}
                </td>
              )}
              {isColumnVisible("debtDays") && (
                <td className="p-2 text-sm text-right border-r">0</td>
              )}
              {isColumnVisible("totalPurchased") && (
                <td className="p-2 text-sm text-right border-r">
                  {formatCurrency(customer.totalPurchased)}
                </td>
              )}
              {isColumnVisible("totalRevenue") && (
                <td className="p-2 text-sm text-right">
                  {formatCurrency(customer.totalRevenue)}
                </td>
              )}
              {isColumnVisible("wardName") && (
                <td className="p-2 text-sm border-r">{customer.wardName}</td>
              )}
              {isColumnVisible("customerType") && (
                <td className="p-2 text-sm border-r">
                  {customer.type === 0 ? "Cá nhân" : "Công ty"}
                </td>
              )}
              {isColumnVisible("gender") && (
                <td className="p-2 text-sm border-r">
                  {customer.gender === true
                    ? "Nam"
                    : customer.gender === false
                    ? "Nữ"
                    : ""}
                </td>
              )}
              {isColumnVisible("email") && (
                <td className="p-2 text-sm border-r">{customer.email}</td>
              )}
              {isColumnVisible("createdAt") && (
                <td className="p-2 text-sm border-r">
                  {formatDate(customer.createdAt)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {customers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Không tìm thấy khách hàng nào
        </div>
      )}
    </div>
  );
}
