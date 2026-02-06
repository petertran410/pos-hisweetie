"use client";

import { useState, useRef, useEffect } from "react";
import { useCustomerGroups } from "@/lib/hooks/useCustomerGroups";
import { useBranches } from "@/lib/hooks/useBranches";
import { CustomerFilters } from "@/lib/types/customer";
import { ChevronDown, Search, Pencil, Plus } from "lucide-react";
import { CustomerGroupForm } from "./CustomerGroupForm";

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

  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);

  const groupDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        groupDropdownRef.current &&
        !groupDropdownRef.current.contains(event.target as Node)
      ) {
        setShowGroupDropdown(false);
        setGroupSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedGroup = groupsData?.data?.find(
    (group) => group.id === filters.groupId
  );

  const filteredGroups = groupsData?.data?.filter((group) =>
    group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  const handleEditGroup = (
    e: React.MouseEvent,
    group: { id: number; name: string; discount?: number; description?: string }
  ) => {
    e.stopPropagation();
    setEditingGroup(group);
    setShowGroupForm(true);
    setShowGroupDropdown(false);
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setShowGroupForm(true);
  };

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
    <>
      <div className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 space-y-6 bg-white shadow-xl">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Nhóm khách hàng</label>
            <button
              onClick={handleCreateGroup}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" />
              Tạo nhóm
            </button>
          </div>

          <div ref={groupDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              className={`w-full border rounded px-3 py-2 text-left flex items-center justify-between bg-white cursor-pointer text-sm ${
                showGroupDropdown ? "border-blue-500" : "border-gray-300"
              }`}>
              <span
                className={selectedGroup ? "text-gray-900" : "text-gray-400"}>
                {selectedGroup ? selectedGroup.name : "Tất cả các nhóm"}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showGroupDropdown ? "transform rotate-180" : ""
                }`}
              />
            </button>

            {showGroupDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[300px] overflow-hidden">
                <div className="p-2 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[240px]">
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ groupId: undefined });
                      setShowGroupDropdown(false);
                      setGroupSearchTerm("");
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-blue-50 text-sm ${
                      !filters.groupId
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-900"
                    }`}>
                    Tất cả các nhóm
                  </button>

                  {filteredGroups && filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => (
                      <div
                        key={group.id}
                        className={`flex items-center justify-between hover:bg-blue-50 ${
                          filters.groupId === group.id
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-900"
                        }`}>
                        <button
                          type="button"
                          onClick={() => {
                            setFilters({ groupId: group.id });
                            setShowGroupDropdown(false);
                            setGroupSearchTerm("");
                          }}
                          className="flex-1 px-3 py-2 text-left text-sm">
                          {group.name}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleEditGroup(e, group)}
                          className="px-3 py-2 text-gray-500 hover:text-blue-600">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-center text-sm">
                      Không tìm thấy kết quả
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

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
                  debtDaysTo: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Điểm hiện tại
          </label>
          <div className="space-y-2">
            <input
              type="number"
              placeholder="Từ"
              className="w-full border rounded px-3 py-2 text-sm"
              value={filters.pointFrom || ""}
              onChange={(e) =>
                setFilters({
                  pointFrom: e.target.value
                    ? Number(e.target.value)
                    : undefined,
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

        <button
          onClick={resetFilters}
          className="w-full px-4 py-2 border rounded hover:bg-gray-50 text-sm">
          Đặt lại bộ lọc
        </button>
      </div>

      <CustomerGroupForm
        isOpen={showGroupForm}
        onClose={() => {
          setShowGroupForm(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
      />
    </>
  );
}
