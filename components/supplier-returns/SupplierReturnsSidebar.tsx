"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBranchStore } from "@/lib/store/branch";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { SUPPLIER_RETURN_STATUS_LABELS } from "@/lib/types/supplier-return";

function getDateRangeFromPreset(
  preset: string
): { from: Date; to: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "all_time":
      return null;
    case "today":
      return { from: today, to: now };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      return { from: y, to: new Date(y.getTime() + 86399999) };
    }
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
    default:
      return null;
  }
}

const PRESET_GROUPS = [
  {
    label: "Tất cả",
    options: [{ label: "Toàn thời gian", value: "all_time" }],
  },
  {
    label: "Theo ngày",
    options: [
      { label: "Hôm nay", value: "today" },
      { label: "Hôm qua", value: "yesterday" },
    ],
  },
  {
    label: "Theo tháng",
    options: [
      { label: "Tháng này", value: "this_month" },
      { label: "Tháng trước", value: "last_month" },
    ],
  },
];

interface Props {
  onFiltersChange: (filters: any) => void;
}

export function SupplierReturnsSidebar({ onFiltersChange }: Props) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();

  const [branchId, setBranchId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedBranch) setBranchId(selectedBranch.id.toString());
  }, [selectedBranch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (branchId) f.branchId = parseInt(branchId);
      if (selectedStatus) f.status = parseInt(selectedStatus);
      if (creatorId) f.createdBy = parseInt(creatorId);
      if (selectedPreset !== "all_time") {
        const range = getDateRangeFromPreset(selectedPreset);
        if (range) {
          f.fromDate = range.from;
          f.toDate = range.to;
        }
      }
      if (fromDate) f.fromDate = fromDate;
      if (toDate) f.toDate = toDate;
      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [branchId, selectedStatus, creatorId, selectedPreset, fromDate, toDate]);

  if (collapsed) {
    return (
      <div className="w-8 border-r bg-white flex flex-col items-center pt-4">
        <button onClick={() => setCollapsed(false)}>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 border-r m-4 rounded-xl shadow-xl bg-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <span className="font-semibold text-sm">Bộ lọc</span>
        <button onClick={() => setCollapsed(true)}>
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {/* Chi nhánh */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Chi nhánh</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả chi nhánh</option>
            {branches?.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Trạng thái */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Trạng thái</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả</option>
            {Object.entries(SUPPLIER_RETURN_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Người tạo */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Người tạo</label>
          <select
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả</option>
            {users?.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Thời gian */}
        <div ref={presetRef}>
          <label className="block text-xs text-gray-500 mb-1">Thời gian</label>
          <button
            onClick={() => setShowPresetPanel(!showPresetPanel)}
            className="w-full border rounded-lg px-3 py-2 text-sm text-left">
            {selectedPreset === "all_time" ? "Toàn thời gian" : selectedPreset}
          </button>
          {showPresetPanel && (
            <div className="mt-1 border rounded-lg bg-white shadow-lg z-10 p-2">
              {PRESET_GROUPS.map((group) => (
                <div key={group.label} className="mb-2">
                  <div className="text-xs text-gray-400 px-2 mb-1">
                    {group.label}
                  </div>
                  {group.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSelectedPreset(opt.value);
                        setShowPresetPanel(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm hover:bg-gray-50 ${
                        selectedPreset === opt.value
                          ? "text-blue-600 font-medium"
                          : ""
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ngày tùy chỉnh */}
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setSelectedPreset("custom");
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setSelectedPreset("custom");
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
