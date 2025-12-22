"use client";

import { useState } from "react";
import { useCustomerFiltersStore } from "@/lib/store/customerFilters";
import { useCustomerGroups } from "@/lib/hooks/useCustomers";
import { useBranches } from "@/lib/hooks/useBranches";
import { Calendar } from "lucide-react";

export function CustomersSidebar() {
  const { filters, setFilters, resetFilters } = useCustomerFiltersStore();
  const { data: groupsData } = useCustomerGroups();
  const { data: branchesData } = useBranches();

  const [dateType, setDateType] = useState<"all" | "custom">("all");
  const [birthdayType, setBirthdayType] = useState<"all" | "custom">("all");
  const [lastTransactionType, setLastTransactionType] = useState<
    "all" | "custom"
  >("all");
  const [timeType, setTimeType] = useState<"all" | "custom">("all");

  return (
    <div className="w-64 border-r bg-white p-4 space-y-6 overflow-y-auto h-[calc(100vh-64px)]">
      {/* Nhóm khách hàng */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Nhóm khách hàng</label>
          <button
            onClick={resetFilters}
            className="text-xs text-blue-600 hover:underline">
            Tạo mới
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

      {/* Chi nhánh tạo */}
      <div>
        <label className="text-sm font-medium mb-2 flex items-center gap-1">
          Chi nhánh tạo
          <span className="text-blue-500">•</span>
        </label>
        <input
          type="text"
          placeholder="Chọn chi nhánh"
          className="w-full border rounded px-3 py-2 text-sm"
          value={filters.branchId || ""}
          onChange={(e) =>
            setFilters({
              branchId: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>

      {/* Ngày tạo */}
      <div>
        <label className="text-sm font-medium mb-2 block">Ngày tạo</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dateType"
              checked={dateType === "all"}
              onChange={() => {
                setDateType("all");
                setFilters({
                  createdDateFrom: undefined,
                  createdDateTo: undefined,
                });
              }}
              className="w-4 h-4"
            />
            <span className="text-sm">Toàn thời gian</span>
            <span className="ml-auto text-sm text-gray-400">›</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dateType"
              checked={dateType === "custom"}
              onChange={() => setDateType("custom")}
              className="w-4 h-4"
            />
            <span className="text-sm">Tùy chỉnh</span>
            <Calendar className="ml-auto w-4 h-4 text-gray-400" />
          </label>
        </div>
      </div>

      {/* Người tạo */}
      <div>
        <label className="text-sm font-medium mb-2 block">Người tạo</label>
        <input
          type="text"
          placeholder="Chọn người tạo"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Loại khách hàng */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Loại khách hàng
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setFilters({ customerType: "all" })}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
              filters.customerType === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}>
            Tất cả
          </button>
          <button
            onClick={() => setFilters({ customerType: "individual" })}
            className={`flex-1 px-3 py-2 rounded text-sm ${
              filters.customerType === "individual"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}>
            Cá nhân
          </button>
        </div>
        <button
          onClick={() => setFilters({ customerType: "company" })}
          className={`w-full mt-2 px-3 py-2 rounded text-sm ${
            filters.customerType === "company"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}>
          Công ty
        </button>
      </div>

      {/* Giới tính */}
      <div>
        <label className="text-sm font-medium mb-2 block">Giới tính</label>
        <div className="flex gap-2">
          <button
            onClick={() => setFilters({ gender: "all" })}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
              filters.gender === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}>
            Tất cả
          </button>
          <button
            onClick={() => setFilters({ gender: "male" })}
            className={`flex-1 px-3 py-2 rounded text-sm ${
              filters.gender === "male"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}>
            Nam
          </button>
          <button
            onClick={() => setFilters({ gender: "female" })}
            className={`flex-1 px-3 py-2 rounded text-sm ${
              filters.gender === "female"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}>
            Nữ
          </button>
        </div>
      </div>

      {/* Sinh nhật */}
      <div>
        <label className="text-sm font-medium mb-2 block">Sinh nhật</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="birthdayType"
              checked={birthdayType === "all"}
              onChange={() => {
                setBirthdayType("all");
                setFilters({ birthdayFrom: undefined, birthdayTo: undefined });
              }}
              className="w-4 h-4"
            />
            <span className="text-sm">Toàn thời gian</span>
            <span className="ml-auto text-sm text-gray-400">›</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="birthdayType"
              checked={birthdayType === "custom"}
              onChange={() => setBirthdayType("custom")}
              className="w-4 h-4"
            />
            <span className="text-sm">Tùy chỉnh</span>
            <Calendar className="ml-auto w-4 h-4 text-gray-400" />
          </label>
        </div>
      </div>

      {/* Ngày giao dịch cuối */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Ngày giao dịch cuối
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="lastTransactionType"
              checked={lastTransactionType === "all"}
              onChange={() => setLastTransactionType("all")}
              className="w-4 h-4"
            />
            <span className="text-sm">Toàn thời gian</span>
            <span className="ml-auto text-sm text-gray-400">›</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="lastTransactionType"
              checked={lastTransactionType === "custom"}
              onChange={() => setLastTransactionType("custom")}
              className="w-4 h-4"
            />
            <span className="text-sm">Tùy chỉnh</span>
            <Calendar className="ml-auto w-4 h-4 text-gray-400" />
          </label>
        </div>
      </div>

      {/* Tổng bán */}
      <div>
        <label className="text-sm font-medium mb-2 block">Tổng bán</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Giá trị</span>
          </div>
          <input
            type="number"
            placeholder="Từ"
            className="w-full border rounded px-3 py-2 text-sm"
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
            placeholder="Nhập giá trị"
            className="w-full border rounded px-3 py-2 text-sm"
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

      {/* Thời gian */}
      <div>
        <label className="text-sm font-medium mb-2 block">Thời gian</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="timeType"
              checked={timeType === "all"}
              onChange={() => setTimeType("all")}
              className="w-4 h-4"
            />
            <span className="text-sm">Toàn thời gian</span>
            <span className="ml-auto text-sm text-gray-400">›</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="timeType"
              checked={timeType === "custom"}
              onChange={() => setTimeType("custom")}
              className="w-4 h-4"
            />
            <span className="text-sm">Tùy chỉnh</span>
            <Calendar className="ml-auto w-4 h-4 text-gray-400" />
          </label>
        </div>
      </div>

      {/* Nợ hiện tại */}
      <div>
        <label className="text-sm font-medium mb-2 block">Nợ hiện tại</label>
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Từ"
            className="w-full border rounded px-3 py-2 text-sm"
            onChange={(e) =>
              setFilters({
                debtFrom: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <input
            type="number"
            placeholder="Nhập giá trị"
            className="w-full border rounded px-3 py-2 text-sm"
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
            placeholder="Nhập giá trị"
            className="w-full border rounded px-3 py-2 text-sm"
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
            onChange={(e) =>
              setFilters({
                pointFrom: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <input
            type="number"
            placeholder="Nhập giá trị"
            className="w-full border rounded px-3 py-2 text-sm"
            onChange={(e) =>
              setFilters({
                pointTo: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      {/* Khu vực giao hàng */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Khu vực giao hàng
        </label>
        <input
          type="text"
          placeholder="Chọn Tỉnh/TP - Quận/Huyện"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Trạng thái */}
      <div>
        <label className="text-sm font-medium mb-2 block">Trạng thái</label>
        <div className="space-y-2">
          <button
            onClick={() => setFilters({ isActive: undefined })}
            className={`w-full px-3 py-2 rounded text-sm text-left ${
              filters.isActive === undefined
                ? "bg-gray-100 text-gray-700"
                : "hover:bg-gray-50"
            }`}>
            Tất cả
          </button>
          <button
            onClick={() => setFilters({ isActive: true })}
            className={`w-full px-3 py-2 rounded text-sm text-left ${
              filters.isActive === true
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-50"
            }`}>
            Đang hoạt động
          </button>
          <button
            onClick={() => setFilters({ isActive: false })}
            className={`w-full px-3 py-2 rounded text-sm text-left ${
              filters.isActive === false
                ? "bg-gray-100 text-gray-700"
                : "hover:bg-gray-50"
            }`}>
            Ngừng hoạt động
          </button>
        </div>
      </div>
    </div>
  );
}
