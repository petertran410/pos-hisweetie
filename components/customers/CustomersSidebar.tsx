"use client";

import { useState } from "react";
import { useCustomerGroups } from "@/lib/hooks/useCustomers";
import { useBranches } from "@/lib/hooks/useBranches";
import { CustomerFilters } from "@/lib/types/customer";

interface CustomersSidebarProps {
  filters: CustomerFilters;
  setFilters: (filters: Partial<CustomerFilters>) => void;
}

export function CustomersSidebar({
  filters,
  setFilters,
}: CustomersSidebarProps) {
  const { data: groupsData } = useCustomerGroups();
  const { data: branchesData } = useBranches();

  const resetFilters = () => {
    setFilters({
      pageSize: 15,
      currentItem: 0,
      orderBy: "createdAt",
      orderDirection: "desc",
      isActive: true,
      customerType: undefined,
      gender: undefined,
      groupId: undefined,
      branchId: undefined,
      createdDateFrom: undefined,
      createdDateTo: undefined,
      birthdayFrom: undefined,
      birthdayTo: undefined,
      totalPurchasedFrom: undefined,
      totalPurchasedTo: undefined,
      debtFrom: undefined,
      debtTo: undefined,
      debtDaysFrom: undefined,
      debtDaysTo: undefined,
      pointFrom: undefined,
      pointTo: undefined,
    });
  };

  return (
    <div className="w-64 border-r bg-white p-4 space-y-6 overflow-y-auto h-[calc(100vh-64px)]">
      {/* Nhóm khách hàng */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Nhóm khách hàng</label>
          <button
            onClick={resetFilters}
            className="text-xs text-blue-600 hover:underline">
            Đặt lại
          </button>
        </div>
        <select
          className="w-full border rounded px-3 py-2 text-sm"
          value={filters.groupId || ""}
          onChange={(e) =>
            setFilters({
              groupId: e.target.value ? Number(e.target.value) : undefined,
            })
          }>
          <option value="">Tất cả các nhóm</option>
          {groupsData?.data.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {/* Chi nhánh */}
      <div>
        <label className="text-sm font-medium mb-2 block">Chi nhánh</label>
        <select
          className="w-full border rounded px-3 py-2 text-sm"
          value={filters.branchId || ""}
          onChange={(e) =>
            setFilters({
              branchId: e.target.value ? Number(e.target.value) : undefined,
            })
          }>
          <option value="">Tất cả chi nhánh</option>
          {branchesData?.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Loại khách hàng */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Loại khách hàng
        </label>
        <div className="space-y-2">
          <button
            onClick={() => setFilters({ customerType: "all" })}
            className={`border w-full px-3 py-2 rounded text-sm text-left ${
              filters.customerType === "all" || !filters.customerType
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Tất cả
          </button>
          <button
            onClick={() => setFilters({ customerType: "individual" })}
            className={`border w-full px-3 py-2 rounded text-sm text-left ${
              filters.customerType === "individual"
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Cá nhân
          </button>
          <button
            onClick={() => setFilters({ customerType: "company" })}
            className={`border w-full px-3 py-2 rounded text-sm text-left ${
              filters.customerType === "company"
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Công ty
          </button>
        </div>
      </div>

      {/* Giới tính */}
      <div>
        <label className="text-sm font-medium mb-2 block">Giới tính</label>
        <div className="space-y-2">
          <button
            onClick={() => setFilters({ gender: "all" })}
            className={`border w-full px-3 py-2 rounded text-sm text-left ${
              filters.gender === "all" || !filters.gender
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Tất cả
          </button>
          <button
            onClick={() => setFilters({ gender: "male" })}
            className={`border w-full px-3 py-2 rounded text-sm text-left ${
              filters.gender === "male"
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Nam
          </button>
          <button
            onClick={() => setFilters({ gender: "female" })}
            className={`border w-full px-3 py-2 rounded text-sm text-left ${
              filters.gender === "female"
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Nữ
          </button>
        </div>
      </div>

      {/* Tổng bán */}
      <div>
        <label className="text-sm font-medium mb-2 block">Tổng bán</label>
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Từ"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.totalPurchasedFrom || ""}
            onChange={(e) =>
              setFilters({
                totalPurchasedFrom: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
          <input
            type="number"
            placeholder="Đến"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.totalPurchasedTo || ""}
            onChange={(e) =>
              setFilters({
                totalPurchasedTo: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
        </div>
      </div>

      {/* Công nợ */}
      <div>
        <label className="text-sm font-medium mb-2 block">Công nợ</label>
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Từ"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.debtFrom || ""}
            onChange={(e) =>
              setFilters({
                debtFrom: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <input
            type="number"
            placeholder="Đến"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.debtTo || ""}
            onChange={(e) =>
              setFilters({
                debtTo: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      {/* Số ngày nợ */}
      <div>
        <label className="text-sm font-medium mb-2 block">Số ngày nợ</label>
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Từ"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.debtDaysFrom || ""}
            onChange={(e) =>
              setFilters({
                debtDaysFrom: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
          <input
            type="number"
            placeholder="Đến"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.debtDaysTo || ""}
            onChange={(e) =>
              setFilters({
                debtDaysTo: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      {/* Điểm hiện tại */}
      <div>
        <label className="text-sm font-medium mb-2 block">Điểm hiện tại</label>
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Từ"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.pointFrom || ""}
            onChange={(e) =>
              setFilters({
                pointFrom: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <input
            type="number"
            placeholder="Đến"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.pointTo || ""}
            onChange={(e) =>
              setFilters({
                pointTo: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      {/* Trạng thái */}
      <div>
        <label className="text-sm font-medium mb-2 block">Trạng thái</label>
        <div className="space-y-2">
          <button
            onClick={() => setFilters({ isActive: undefined })}
            className={`w-full px-3 py-2 rounded text-sm text-left ${
              filters.isActive === undefined
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Tất cả
          </button>
          <button
            onClick={() => setFilters({ isActive: true })}
            className={`w-full px-3 py-2 rounded text-sm text-left ${
              filters.isActive === true
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Đang hoạt động
          </button>
          <button
            onClick={() => setFilters({ isActive: false })}
            className={`w-full px-3 py-2 rounded text-sm text-left ${
              filters.isActive === false
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Ngừng hoạt động
          </button>
        </div>
      </div>
    </div>
  );
}
