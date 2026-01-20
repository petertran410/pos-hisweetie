"use client";

import { useState, useMemo } from "react";
import { Settings2, Plus } from "lucide-react";
import { SelectBranchModal } from "./SelectBranchModal";
import { ProductionForm } from "./ProductionForm";
import type { Production } from "@/lib/api/productions";

interface ProductionTableProps {
  productions: Production[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onEdit: (production: Production) => void;
}

interface Column {
  key: string;
  label: string;
  render: (production: Production) => React.ReactNode;
}

export function ProductionTable({
  productions,
  isLoading,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onEdit,
}: ProductionTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showProductionForm, setShowProductionForm] = useState(false);
  const [selectedSourceBranch, setSelectedSourceBranch] = useState<
    number | null
  >(null);
  const [selectedDestinationBranch, setSelectedDestinationBranch] = useState<
    number | null
  >(null);
  const [selectedProduction, setSelectedProduction] =
    useState<Production | null>(null);

  const allColumns: Column[] = useMemo(
    () => [
      {
        key: "code",
        label: "Mã sản xuất",
        render: (prod) => (
          <span className="font-medium text-blue-600">{prod.code}</span>
        ),
      },
      {
        key: "manufacturedDate",
        label: "Thời gian",
        render: (prod) =>
          prod.manufacturedDate
            ? new Date(prod.manufacturedDate).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
      },
      {
        key: "productCode",
        label: "Mã hàng",
        render: (prod) => prod.productCode,
      },
      {
        key: "productName",
        label: "Tên hàng",
        render: (prod) => prod.productName,
      },
      {
        key: "quantity",
        label: "Số lượng",
        render: (prod) => Number(prod.quantity).toLocaleString("vi-VN"),
      },
      {
        key: "note",
        label: "Ghi chú",
        render: (prod) => prod.note || "-",
      },
      {
        key: "status",
        label: "Trạng thái",
        render: (prod) => {
          const statusConfig = {
            1: { label: "Phiếu tạm", color: "bg-gray-100 text-gray-700" },
            2: { label: "Hoàn thành", color: "bg-green-100 text-green-700" },
            3: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
          };
          const config = statusConfig[prod.status as keyof typeof statusConfig];
          return (
            <span className={`px-2 py-1 rounded text-xs ${config?.color}`}>
              {config?.label}
            </span>
          );
        },
      },
    ],
    []
  );

  const visibleColumns = allColumns.filter(
    (col) => !hiddenColumns.includes(col.key)
  );

  const totalPages = Math.ceil(total / limit);

  const toggleSelectAll = () => {
    if (selectedIds.length === productions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(productions.map((p) => p.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleColumn = (key: string) => {
    setHiddenColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleCreateProduction = () => {
    setShowBranchModal(true);
  };

  const handleBranchConfirm = (
    sourceBranchId: number,
    destinationBranchId: number
  ) => {
    setSelectedSourceBranch(sourceBranchId);
    setSelectedDestinationBranch(destinationBranchId);
    setShowBranchModal(false);
    setShowProductionForm(true);
  };

  const handleEditProduction = (production: Production) => {
    setSelectedProduction(production);
    setSelectedSourceBranch(production.sourceBranchId);
    setSelectedDestinationBranch(production.destinationBranchId);
    setShowProductionForm(true);
  };

  const handleCloseForm = () => {
    setShowProductionForm(false);
    setSelectedProduction(null);
    setSelectedSourceBranch(null);
    setSelectedDestinationBranch(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] mt-4 mr-4 mb-4 border rounded-xl">
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Sản xuất</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateProduction}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Sản xuất
            </button>

            <div className="relative">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50">
                <Settings2 className="w-4 h-4" />
                Tùy chỉnh cột
              </button>

              {showColumnDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    {allColumns.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!hiddenColumns.includes(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded"
                        />
                        <span className="text-sm">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table
            className="w-full border-collapse"
            style={{ minWidth: "max-content" }}>
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={
                      productions.length > 0 &&
                      selectedIds.length === productions.length
                    }
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productions.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 1}
                    className="px-4 py-8 text-center text-gray-500">
                    Chưa có phiếu sản xuất nào
                  </td>
                </tr>
              ) : (
                productions.map((production) => (
                  <tr
                    key={production.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEditProduction(production)}>
                    <td
                      className="px-4 py-3 sticky left-0 bg-white"
                      onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(production.id)}
                        onChange={() => toggleSelect(production.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-sm whitespace-nowrap">
                        {col.render(production)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t p-4 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <select
              className="border rounded px-2 py-1"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>trên tổng {total} phiếu sản xuất</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}>
              Trước
            </button>
            <span>
              Trang {page} / {totalPages || 1}
            </span>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}>
              Sau
            </button>
          </div>
        </div>
      </div>

      {showBranchModal && (
        <SelectBranchModal
          onClose={() => setShowBranchModal(false)}
          onConfirm={handleBranchConfirm}
        />
      )}

      {showProductionForm &&
        selectedSourceBranch &&
        selectedDestinationBranch && (
          <ProductionForm
            sourceBranchId={selectedSourceBranch}
            destinationBranchId={selectedDestinationBranch}
            production={selectedProduction}
            onClose={handleCloseForm}
          />
        )}
    </>
  );
}
