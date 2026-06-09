"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import { useProductions } from "@/lib/hooks/useProductions";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import type { Production } from "@/lib/api/productions";
import { ProductionDetailRow } from "./ProductionDetailRow";
import { SelectBranchModal } from "./SelectBranchModal";
import { ProductionForm } from "./ProductionForm";
import { PermissionGate } from "../permissions/PermissionGate";
import { CodeLink } from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

interface ProductionTableProps {
  filters: any;
}

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "1", label: "Phiếu tạm" },
  { value: "2", label: "Hoàn thành" },
  { value: "3", label: "Đã hủy" },
];

const STATUS_COLOR: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-700",
  2: "bg-green-100 text-green-700",
  3: "bg-red-100 text-red-700",
};

const STATUS_TEXT: Record<number, string> = {
  1: "Phiếu tạm",
  2: "Hoàn thành",
  3: "Đã hủy",
};

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

const DEFAULT_COLUMNS: ColumnConfig<Production>[] = [
  {
    key: "code",
    label: "Mã sản xuất",
    visible: true,
    width: "140px",
    render: (prod) => <CodeLink entity="production" code={prod.code} />,
  },
  {
    key: "manufacturedDate",
    label: "Thời gian SX",
    visible: true,
    width: "160px",
    render: (prod) => formatDateTime(prod.manufacturedDate),
  },
  {
    key: "productName",
    label: "Tên sản phẩm",
    visible: true,
    width: "200px",
    render: (prod) => prod.productName,
  },
  {
    key: "productCode",
    label: "Mã hàng",
    visible: false,
    width: "120px",
    render: (prod) =>
      prod.productCode ? (
        <CodeLink entity="product" code={prod.productCode} />
      ) : (
        "-"
      ),
  },
  {
    key: "sourceBranchName",
    label: "Kho đầu vào",
    visible: true,
    width: "160px",
    render: (prod) => prod.sourceBranchName,
  },
  {
    key: "destinationBranchName",
    label: "Kho đầu ra",
    visible: true,
    width: "160px",
    render: (prod) => prod.destinationBranchName,
  },
  {
    key: "quantity",
    label: "Số lượng",
    visible: true,
    width: "100px",
    render: (prod) => String(prod.quantity),
  },
  {
    key: "createdByName",
    label: "Người tạo",
    visible: true,
    width: "140px",
    render: (prod) => prod.createdByName,
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "130px",
    render: (prod) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          STATUS_COLOR[prod.status] ?? "bg-gray-100 text-gray-700"
        }`}>
        {STATUS_TEXT[prod.status] ?? "-"}
      </span>
    ),
  },
  {
    key: "note",
    label: "Ghi chú",
    visible: false,
    width: "200px",
    render: (prod) => prod.note || "-",
  },
  {
    key: "createdAt",
    label: "Ngày tạo",
    visible: false,
    width: "160px",
    render: (prod) => formatDateTime(prod.createdAt),
  },
];

export function ProductionTable({ filters }: ProductionTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("all");

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

  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "productionTableColumns",
    DEFAULT_COLUMNS
  );

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter/search/tab change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab]);

  // Sync tab with sidebar status filter
  useEffect(() => {
    const s = filters.status?.[0];
    if (s != null && String(s) !== activeStatusTab)
      setActiveStatusTab(String(s));
    else if (s == null && activeStatusTab !== "all") setActiveStatusTab("all");
  }, [filters.status]);

  // Effective filters: tab overrides sidebar status
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab !== "all") f.status = [Number(activeStatusTab)];
    return f;
  }, [filters, activeStatusTab]);

  const { data, isLoading } = useProductions({
    pageSize: limit,
    currentItem: (page - 1) * limit,
    search: debouncedSearch || undefined,
    ...effectiveFilters,
  });

  const productions = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const colSpan = visibleColumns.length + 1;

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === productions.length
        ? []
        : productions.map((p) => p.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const handleCreateProduction = () => setShowBranchModal(true);

  const handleBranchConfirm = (srcId: number, dstId: number) => {
    setSelectedSourceBranch(srcId);
    setSelectedDestinationBranch(dstId);
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

  return (
    <PermissionGate resource="productions" action="view">
      <div className="flex-1 flex flex-col overflow-y-auto bg-white m-4 border rounded-xl">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">
              Sản xuất
            </h1>
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm mã, tên sản phẩm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <PermissionGate resource="productions" action="create">
              <button
                onClick={handleCreateProduction}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand text-white text-sm rounded-lg hover:bg-brand-dark transition-colors">
                <Plus className="w-4 h-4" />
                Sản xuất
              </button>
            </PermissionGate>

            {/* Column toggle */}
            <ColumnToggle columns={columns} onToggle={toggleColumn} />
          </div>
        </div>

        {/* STATUS_TABS */}
        <div className="flex items-center gap-1 px-4 border-b overflow-x-auto flex-shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatusTab(tab.value)}
              className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeStatusTab === tab.value
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table
            className="w-full border-collapse"
            style={{ minWidth: "max-content" }}>
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left w-10 sticky left-0 bg-gray-50">
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
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap"
                    style={{ width: col.width, minWidth: col.width }}>
                    {col.label}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={colSpan} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
                      <span className="text-xs">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : productions.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400">
                    <div className="text-sm">Không có phiếu sản xuất nào</div>
                  </td>
                </tr>
              ) : (
                productions.map((production) => (
                  <Fragment key={production.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        expandedId === production.id
                          ? "bg-brand-soft"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(production.id)}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedId === production.id
                            ? "bg-brand-soft border-t-2 border-l-2 border-brand"
                            : "bg-white"
                        }`}
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
                          className={`px-4 py-2.5 text-sm ${
                            expandedId === production.id
                              ? "border-t-2 border-brand"
                              : ""
                          }`}
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}>
                          {col.render(production)}
                        </td>
                      ))}
                    </tr>
                    {expandedId === production.id && (
                      <ProductionDetailRow
                        productionId={production.id}
                        colSpan={colSpan}
                        onEdit={() => handleEditProduction(production)}
                      />
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t px-4 py-3 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Hiển thị</span>
            <select
              className="border border-gray-200 rounded px-2 py-1 text-sm"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}>
              {[15, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>
              trên tổng <strong>{total}</strong> phiếu
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm text-gray-700">
              {page} / {totalPages || 1}
            </span>
            <button
              className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
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
    </PermissionGate>
  );
}
