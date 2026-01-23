"use client";

import { useState } from "react";
import { Supplier } from "@/lib/types/supplier";
import { formatCurrency } from "@/lib/utils";
import { SupplierDetailRow } from "./SupplierDetailRow";

interface SuppliersTableProps {
  suppliers: Supplier[];
  visibleColumns: { [key: string]: boolean };
}

const formatDateTime = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN");
};

export function SuppliersTable({
  suppliers,
  visibleColumns,
}: SuppliersTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-md">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="border p-2 text-left">
              <input type="checkbox" />
            </th>
            {visibleColumns.code && (
              <th className="border p-2 text-left text-sm font-medium">
                Mã nhà cung cấp
              </th>
            )}
            {visibleColumns.name && (
              <th className="border p-2 text-left text-sm font-medium">
                Tên nhà cung cấp
              </th>
            )}
            {visibleColumns.contactNumber && (
              <th className="border p-2 text-left text-sm font-medium">
                Điện thoại
              </th>
            )}
            {visibleColumns.groupName && (
              <th className="border p-2 text-left text-sm font-medium">
                Nhóm nhà cung cấp
              </th>
            )}
            {visibleColumns.email && (
              <th className="border p-2 text-left text-sm font-medium">
                Email
              </th>
            )}
            {visibleColumns.address && (
              <th className="border p-2 text-left text-sm font-medium">
                Địa chỉ
              </th>
            )}
            {visibleColumns.location && (
              <th className="border p-2 text-left text-sm font-medium">
                Khu vực
              </th>
            )}
            {visibleColumns.wardName && (
              <th className="border p-2 text-left text-sm font-medium">
                Phường/Xã
              </th>
            )}
            {visibleColumns.totalDebt && (
              <th className="border p-2 text-left text-sm font-medium">
                Nợ hiện tại
              </th>
            )}
            {visibleColumns.totalInvoiced && (
              <th className="border p-2 text-left text-sm font-medium">
                Tổng mua
              </th>
            )}
            {visibleColumns.totalInvoicedWithoutReturn && (
              <th className="border p-2 text-left text-sm font-medium">
                Tổng mua trừ trả hàng
              </th>
            )}
            {visibleColumns.taxCode && (
              <th className="border p-2 text-left text-sm font-medium">
                Mã số thuế
              </th>
            )}
            {visibleColumns.contactPerson && (
              <th className="border p-2 text-left text-sm font-medium">
                Người liên hệ
              </th>
            )}
            {visibleColumns.createdAt && (
              <th className="border p-2 text-left text-sm font-medium">
                Ngày tạo
              </th>
            )}
            {visibleColumns.updatedAt && (
              <th className="border p-2 text-left text-sm font-medium">
                Ngày cập nhật
              </th>
            )}
            {visibleColumns.isActive && (
              <th className="border p-2 text-left text-sm font-medium">
                Trạng thái
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => (
            <>
              <tr
                key={supplier.id}
                onClick={() => toggleExpand(supplier.id)}
                className={`hover:bg-gray-50 cursor-pointer ${
                  expandedId === supplier.id ? "bg-blue-50" : ""
                }`}>
                <td className="border p-2">
                  <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                </td>
                {visibleColumns.code && (
                  <td className="border p-2 text-sm">{supplier.code}</td>
                )}
                {visibleColumns.name && (
                  <td className="border p-2 text-sm font-medium">
                    {supplier.name}
                  </td>
                )}
                {visibleColumns.contactNumber && (
                  <td className="border p-2 text-sm">
                    {supplier.contactNumber || supplier.phone || "-"}
                  </td>
                )}
                {visibleColumns.groupName && (
                  <td className="border p-2 text-sm">
                    {supplier.supplierGroupDetails &&
                    supplier.supplierGroupDetails.length > 0
                      ? supplier.supplierGroupDetails
                          .map((g) => g.supplierGroup.name)
                          .join(", ")
                      : "-"}
                  </td>
                )}
                {visibleColumns.email && (
                  <td className="border p-2 text-sm">
                    {supplier.email || "-"}
                  </td>
                )}
                {visibleColumns.address && (
                  <td className="border p-2 text-sm">
                    {supplier.address || "-"}
                  </td>
                )}
                {visibleColumns.location && (
                  <td className="border p-2 text-sm">
                    {supplier.location || "-"}
                  </td>
                )}
                {visibleColumns.wardName && (
                  <td className="border p-2 text-sm">
                    {supplier.wardName || "-"}
                  </td>
                )}
                {visibleColumns.totalDebt && (
                  <td className="border p-2 text-sm">
                    {formatCurrency(supplier.totalDebt)}
                  </td>
                )}
                {visibleColumns.totalInvoiced && (
                  <td className="border p-2 text-sm">
                    {formatCurrency(supplier.totalInvoiced)}
                  </td>
                )}
                {visibleColumns.totalInvoicedWithoutReturn && (
                  <td className="border p-2 text-sm">
                    {formatCurrency(supplier.totalInvoicedWithoutReturn)}
                  </td>
                )}
                {visibleColumns.taxCode && (
                  <td className="border p-2 text-sm">
                    {supplier.taxCode || "-"}
                  </td>
                )}
                {visibleColumns.contactPerson && (
                  <td className="border p-2 text-sm">
                    {supplier.contactPerson || "-"}
                  </td>
                )}
                {visibleColumns.createdAt && (
                  <td className="border p-2 text-sm">
                    {formatDateTime(supplier.createdAt)}
                  </td>
                )}
                {visibleColumns.updatedAt && (
                  <td className="border p-2 text-sm">
                    {formatDateTime(supplier.updatedAt)}
                  </td>
                )}
                {visibleColumns.isActive && (
                  <td className="border p-2 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        supplier.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                      {supplier.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </span>
                  </td>
                )}
              </tr>
              {expandedId === supplier.id && (
                <tr>
                  <td
                    colSpan={
                      Object.values(visibleColumns).filter(Boolean).length + 1
                    }>
                    <SupplierDetailRow supplier={supplier} />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
