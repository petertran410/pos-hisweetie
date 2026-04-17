"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useCustomerGroups } from "@/lib/hooks/useCustomerGroups";
import { useBranches } from "@/lib/hooks/useBranches";
import { CustomerFilters } from "@/lib/types/customer";
import { ChevronDown, X, Search, Pencil, Plus } from "lucide-react";
import { CustomerGroupForm } from "./CustomerGroupForm";

interface CustomersSidebarProps {
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
}

// ─── SimpleDropdown (giống OrdersSidebar) ─────────────────────────────────────
function SimpleDropdown({
  options,
  value,
  placeholder,
  onChange,
  searchable = false,
}: {
  options: { value: string; label: string }[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between px-3 py-2 border rounded-lg text-sm cursor-pointer transition-all ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "hover:border-gray-400"
        } bg-white`}>
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
          {filtered.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value === value ? "" : opt.value);
                setOpen(false);
                setSearch("");
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                opt.value === value
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              {opt.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-gray-500 text-center text-sm">
              Không tìm thấy
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── GroupDropdown (searchable + edit button, riêng Customer) ──────────────────
function GroupDropdown({
  groups,
  value,
  onChange,
  onEdit,
  onCreate,
}: {
  groups: {
    id: number;
    name: string;
    discount?: number;
    description?: string;
  }[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  onEdit: (e: React.MouseEvent, group: any) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const selected = groups.find((g) => g.id === value);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          Nhóm khách hàng
        </label>
        <button
          onClick={onCreate}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" />
          Tạo nhóm
        </button>
      </div>

      <div
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between px-3 py-2 border rounded-lg text-sm cursor-pointer transition-all ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "hover:border-gray-400"
        } bg-white`}>
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.name : "Tất cả các nhóm"}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
                setSearch("");
              }}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                !value
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              }`}>
              Tất cả các nhóm
            </button>
            {filtered.map((group) => (
              <div
                key={group.id}
                className={`flex items-center justify-between hover:bg-gray-50 ${
                  value === group.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700"
                }`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(value === group.id ? undefined : group.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex-1 px-3 py-2.5 text-left text-sm">
                  {group.name}
                </button>
                <button
                  type="button"
                  onClick={(e) => onEdit(e, group)}
                  className="px-3 py-2 text-gray-400 hover:text-blue-600">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-gray-500 text-center text-sm">
                Không tìm thấy
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RangeInput (cho tổng bán, công nợ, điểm) ────────────────────────────────
function RangeInput({
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}: {
  label: string;
  fromValue: number | undefined;
  toValue: number | undefined;
  onFromChange: (v: number | undefined) => void;
  onToChange: (v: number | undefined) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Từ"
          className="w-1/2 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={fromValue ?? ""}
          onChange={(e) =>
            onFromChange(e.target.value ? Number(e.target.value) : undefined)
          }
        />
        <input
          type="number"
          placeholder="Đến"
          className="w-1/2 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={toValue ?? ""}
          onChange={(e) =>
            onToChange(e.target.value ? Number(e.target.value) : undefined)
          }
        />
      </div>
    </div>
  );
}

// ─── StatusButtons (cho loại KH, giới tính, trạng thái) ──────────────────────
function StatusButtons({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              value === opt.value
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export function CustomersSidebar({
  filters,
  onFiltersChange,
}: CustomersSidebarProps) {
  const { data: groupsData } = useCustomerGroups();
  const { data: branchesData } = useBranches();

  // ─── Local state ───
  const [groupId, setGroupId] = useState<number | undefined>(filters.groupId);
  const [branchId, setBranchId] = useState("");
  const [customerType, setCustomerType] = useState("all");
  const [gender, setGender] = useState("all");
  const [isActive, setIsActive] = useState("true"); // "true" | "false" | "all"
  const [totalPurchasedFrom, setTotalPurchasedFrom] = useState<
    number | undefined
  >();
  const [totalPurchasedTo, setTotalPurchasedTo] = useState<
    number | undefined
  >();
  const [debtFrom, setDebtFrom] = useState<number | undefined>();
  const [debtTo, setDebtTo] = useState<number | undefined>();
  const [pointFrom, setPointFrom] = useState<number | undefined>();
  const [pointTo, setPointTo] = useState<number | undefined>();

  // Group form
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);

  // ─── Active filter count ───
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (groupId) count++;
    if (branchId) count++;
    if (customerType !== "all") count++;
    if (gender !== "all") count++;
    if (isActive !== "true") count++;
    if (totalPurchasedFrom !== undefined || totalPurchasedTo !== undefined)
      count++;
    if (debtFrom !== undefined || debtTo !== undefined) count++;
    if (pointFrom !== undefined || pointTo !== undefined) count++;
    return count;
  }, [
    groupId,
    branchId,
    customerType,
    gender,
    isActive,
    totalPurchasedFrom,
    totalPurchasedTo,
    debtFrom,
    debtTo,
    pointFrom,
    pointTo,
  ]);

  // ─── Debounce emit filters (giống OrdersSidebar) ───
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: CustomerFilters = {
        pageSize: 15,
        currentItem: 0,
        orderBy: "createdAt",
        orderDirection: "desc",
        includeCustomerGroup: true,
      };

      if (groupId) f.groupId = groupId;
      if (branchId) f.branchId = Number(branchId);
      if (customerType !== "all") f.customerType = customerType as any;
      if (gender !== "all") f.gender = gender as any;

      if (isActive === "true") f.isActive = true;
      else if (isActive === "false") f.isActive = false;
      // "all" → không set isActive

      if (totalPurchasedFrom !== undefined)
        f.totalPurchasedFrom = totalPurchasedFrom;
      if (totalPurchasedTo !== undefined) f.totalPurchasedTo = totalPurchasedTo;
      if (debtFrom !== undefined) f.debtFrom = debtFrom;
      if (debtTo !== undefined) f.debtTo = debtTo;
      if (pointFrom !== undefined) f.pointFrom = pointFrom;
      if (pointTo !== undefined) f.pointTo = pointTo;

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    groupId,
    branchId,
    customerType,
    gender,
    isActive,
    totalPurchasedFrom,
    totalPurchasedTo,
    debtFrom,
    debtTo,
    pointFrom,
    pointTo,
  ]);

  // ─── Clear all ───
  const clearAll = () => {
    setGroupId(undefined);
    setBranchId("");
    setCustomerType("all");
    setGender("all");
    setIsActive("true");
    setTotalPurchasedFrom(undefined);
    setTotalPurchasedTo(undefined);
    setDebtFrom(undefined);
    setDebtTo(undefined);
    setPointFrom(undefined);
    setPointTo(undefined);
  };

  const handleEditGroup = (e: React.MouseEvent, group: any) => {
    e.stopPropagation();
    setEditingGroup(group);
    setShowGroupForm(true);
  };

  return (
    <>
      <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
        {/* Header (giống OrdersSidebar) */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Xóa tất cả
            </button>
          )}
        </div>

        <div className="p-4 space-y-5">
          {/* ── Nhóm khách hàng ── */}
          <GroupDropdown
            groups={groupsData?.data || []}
            value={groupId}
            onChange={setGroupId}
            onEdit={handleEditGroup}
            onCreate={() => {
              setEditingGroup(null);
              setShowGroupForm(true);
            }}
          />

          <div className="border-t border-gray-100" />

          {/* ── Chi nhánh ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chi nhánh
            </label>
            <SimpleDropdown
              options={
                branchesData?.map((b) => ({
                  value: String(b.id),
                  label: b.name,
                })) ?? []
              }
              value={branchId}
              placeholder="Tất cả chi nhánh"
              onChange={setBranchId}
              searchable
            />
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Loại khách hàng ── */}
          <StatusButtons
            label="Loại khách hàng"
            options={[
              { value: "all", label: "Tất cả" },
              { value: "individual", label: "Cá nhân" },
              { value: "company", label: "Công ty" },
            ]}
            value={customerType}
            onChange={setCustomerType}
          />

          <div className="border-t border-gray-100" />

          {/* ── Giới tính ── */}
          <StatusButtons
            label="Giới tính"
            options={[
              { value: "all", label: "Tất cả" },
              { value: "male", label: "Nam" },
              { value: "female", label: "Nữ" },
            ]}
            value={gender}
            onChange={setGender}
          />

          <div className="border-t border-gray-100" />

          {/* ── Tổng bán ── */}
          <RangeInput
            label="Tổng bán"
            fromValue={totalPurchasedFrom}
            toValue={totalPurchasedTo}
            onFromChange={setTotalPurchasedFrom}
            onToChange={setTotalPurchasedTo}
          />

          <div className="border-t border-gray-100" />

          {/* ── Công nợ ── */}
          <RangeInput
            label="Công nợ"
            fromValue={debtFrom}
            toValue={debtTo}
            onFromChange={setDebtFrom}
            onToChange={setDebtTo}
          />

          <div className="border-t border-gray-100" />

          {/* ── Điểm ── */}
          <RangeInput
            label="Điểm thưởng"
            fromValue={pointFrom}
            toValue={pointTo}
            onFromChange={setPointFrom}
            onToChange={setPointTo}
          />

          <div className="border-t border-gray-100" />

          {/* ── Trạng thái ── */}
          <StatusButtons
            label="Trạng thái"
            options={[
              { value: "true", label: "Hoạt động" },
              { value: "false", label: "Ngừng HĐ" },
              { value: "all", label: "Tất cả" },
            ]}
            value={isActive}
            onChange={setIsActive}
          />
        </div>
      </aside>

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
