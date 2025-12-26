"use client";

import { useState, useEffect } from "react";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { Filter, X, Calendar } from "lucide-react";

interface InvoicesSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

export function InvoicesSidebar({
  filters,
  onFiltersChange,
}: InvoicesSidebarProps) {
  const [branchId, setBranchId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([]);
  const [enablePurchaseDate, setEnablePurchaseDate] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [creatorId, setCreatorId] = useState<string>("");
  const [saleChannelId, setSaleChannelId] = useState<string>("");

  const { data: customersData } = useCustomers({ limit: 1000 });
  const customers = customersData?.data || [];

  useEffect(() => {
    applyFilters();
  }, [
    branchId,
    customerId,
    selectedStatuses,
    enablePurchaseDate,
    fromDate,
    toDate,
    creatorId,
    saleChannelId,
  ]);

  const applyFilters = () => {
    const newFilters: any = {};

    if (branchId) {
      newFilters.branchId = parseInt(branchId);
    }

    if (customerId) {
      newFilters.customerId = parseInt(customerId);
    }

    if (selectedStatuses.length > 0) {
      newFilters.status = selectedStatuses[0];
    }

    if (enablePurchaseDate && fromDate && toDate) {
      newFilters.fromDate = new Date(fromDate).toISOString();
      newFilters.toDate = new Date(toDate).toISOString();
    }

    if (creatorId) {
      newFilters.soldById = parseInt(creatorId);
    }

    if (saleChannelId) {
      newFilters.saleChannelId = parseInt(saleChannelId);
    }

    onFiltersChange(newFilters);
  };

  const toggleStatus = (status: number) => {
    setSelectedStatuses([status]);
  };

  const removeStatus = (status: number) => {
    setSelectedStatuses((prev) => prev.filter((s) => s !== status));
  };

  const clearAllFilters = () => {
    setBranchId("");
    setCustomerId("");
    setSelectedStatuses([]);
    setEnablePurchaseDate(false);
    setFromDate("");
    setToDate("");
    setCreatorId("");
    setSaleChannelId("");
  };

  const statusOptions = [
    { value: 3, label: "Đang xử lý", color: "bg-blue-100" },
    { value: 1, label: "Hoàn thành", color: "bg-green-100" },
    { value: 2, label: "Đã hủy", color: "bg-red-100" },
    { value: 5, label: "Không giao được", color: "bg-yellow-100" },
  ];

  return (
    <div className="w-80 border-r bg-white overflow-y-auto">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          <h3 className="font-semibold">Bộ lọc</h3>
        </div>
        <button
          onClick={clearAllFilters}
          className="text-sm text-blue-600 hover:underline">
          Xóa tất cả
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Khách hàng</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg">
            <option value="">Tất cả khách hàng</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Trạng thái</label>
          <div className="space-y-2">
            {statusOptions.map((status) => (
              <button
                key={status.value}
                onClick={() => toggleStatus(status.value)}
                className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between ${
                  selectedStatuses.includes(status.value)
                    ? status.color
                    : "hover:bg-gray-100"
                }`}>
                <span>{status.label}</span>
                {selectedStatuses.includes(status.value) && (
                  <X
                    className="w-4 h-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStatus(status.value);
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={enablePurchaseDate}
              onChange={(e) => setEnablePurchaseDate(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm font-medium">Lọc theo ngày bán</span>
          </label>
          {enablePurchaseDate && (
            <div className="space-y-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
