"use client";

import { useState, useRef, useEffect } from "react";
import { useCustomerFiltersStore } from "@/lib/store/customerFilters";
import { Settings2 } from "lucide-react";

const ALL_COLUMNS = [
  { key: "code", label: "Mã khách hàng" },
  { key: "name", label: "Tên khách hàng" },
  { key: "contactNumber", label: "Điện thoại" },
  { key: "debtAmount", label: "Nợ hiện tại" },
  { key: "debtDays", label: "Số ngày nợ" },
  { key: "totalPurchased", label: "Tổng bán" },
  { key: "totalRevenue", label: "Tổng bán trừ trả hàng" },
  { key: "wardName", label: "Phương/Xã" },
  { key: "createdBy", label: "Người tạo" },
  { key: "createdAt", label: "Ngày tạo" },
  { key: "comments", label: "Ghi chú" },
  { key: "lastTransaction", label: "Ngày giao dịch cuối" },
  { key: "customerType", label: "Loại khách hàng" },
  { key: "gender", label: "Giới tính" },
  { key: "birthDate", label: "Ngày sinh" },
  { key: "email", label: "Email" },
  { key: "facebook", label: "Facebook" },
  { key: "organization", label: "Công ty" },
  { key: "taxCode", label: "Mã số thuế" },
  { key: "cccdCmnd", label: "Số CCCD/CMND" },
  { key: "address", label: "Địa chỉ" },
  { key: "locationName", label: "Khu vực giao hàng" },
  { key: "totalPoint", label: "Tổng điểm" },
  { key: "status", label: "Trạng thái" },
];

export function ColumnVisibilityDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { visibleColumns, toggleColumn } = useCustomerFiltersStore();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Split columns into 2 rows
  const midpoint = Math.ceil(ALL_COLUMNS.length / 2);
  const firstRow = ALL_COLUMNS.slice(0, midpoint);
  const secondRow = ALL_COLUMNS.slice(midpoint);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded border"
        title="Hiển thị/ẩn cột">
        <Settings2 className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[600px] bg-white border rounded-lg shadow-lg p-4 z-50">
          <div className="space-y-3">
            {/* Row 1 */}
            <div className="grid grid-cols-4 gap-2">
              {firstRow.map((column) => (
                <label
                  key={column.key}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                    className="w-4 h-4"
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 gap-2">
              {secondRow.map((column) => (
                <label
                  key={column.key}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                    className="w-4 h-4"
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
