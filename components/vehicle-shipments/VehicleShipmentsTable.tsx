"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useVehicleShipments } from "@/lib/hooks/useVehicleShipments";
import type {
  VehicleShipment,
  VehicleShipmentFilters,
} from "@/lib/types/vehicle-shipment";
import {
  VEHICLE_SHIPMENT_STATUS,
  getVehicleShipmentStatusLabel,
} from "@/lib/types/vehicle-shipment";
import { PermissionGate } from "../permissions/PermissionGate";
import { useAuthStore } from "@/lib/store/auth";
import { CodeLink } from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";
import { VehicleShipmentDetailRow } from "./VehicleShipmentDetailRow";

interface VehicleShipmentsTableProps {
  filters: VehicleShipmentFilters;
  onFiltersChange: (filters: Partial<VehicleShipmentFilters>) => void;
}

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: String(VEHICLE_SHIPMENT_STATUS.DRAFT), label: "Phiếu tạm" },
  {
    value: String(VEHICLE_SHIPMENT_STATUS.CONFIRMED),
    label: "Đã xác nhận giao",
  },
  { value: String(VEHICLE_SHIPMENT_STATUS.RECEIVED), label: "Đã nhập" },
  { value: String(VEHICLE_SHIPMENT_STATUS.CANCELLED), label: "Đã hủy" },
];

const STATUS_COLOR: Record<number, string> = {
  [VEHICLE_SHIPMENT_STATUS.DRAFT]: "bg-gray-100 text-gray-700",
  [VEHICLE_SHIPMENT_STATUS.CONFIRMED]: "bg-blue-100 text-blue-700",
  [VEHICLE_SHIPMENT_STATUS.RECEIVED]: "bg-green-100 text-green-700",
  [VEHICLE_SHIPMENT_STATUS.CANCELLED]: "bg-red-100 text-red-700",
};

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString("vi-VN") : "-";

const summarizeItems = (vs: VehicleShipment) => {
  const items = vs.items || [];
  if (items.length === 0) return "-";
  const osCount = new Set(items.map((i) => i.orderSupplierId)).size;
  return `${items.length} dòng · ${osCount} PĐN`;
};

const DEFAULT_COLUMNS: ColumnConfig<VehicleShipment>[] = [
  {
    key: "code",
    label: "Mã phiếu xe",
    visible: true,
    width: "160px",
    render: (vs) => <CodeLink entity="vehicle-shipment" code={vs.code} />,
  },
  {
    key: "vehicleInfo",
    label: "Số hợp đồng",
    visible: true,
    width: "180px",
    render: (vs) => vs.vehicleInfo || "-",
  },
  {
    key: "branch",
    label: "Chi nhánh nhận",
    visible: true,
    width: "160px",
    render: (vs) => vs.branch?.name || "-",
  },
  {
    key: "items",
    label: "Hàng ghép",
    visible: true,
    width: "150px",
    render: (vs) => summarizeItems(vs),
  },
  {
    key: "purchaseOrderCode",
    label: "Mã nhập hàng",
    visible: true,
    width: "220px",
    render: (vs) =>
      vs.purchaseOrders?.length
        ? vs.purchaseOrders.map((po, idx) => (
            <Fragment key={po.code ?? idx}>
              {idx > 0 && <span className="text-gray-400"> | </span>}
              <CodeLink entity="purchase-order" code={po.code} />
            </Fragment>
          ))
        : "-",
  },
  {
    key: "createdDate",
    label: "Ngày tạo",
    visible: true,
    width: "170px",
    render: (vs) => formatDateTime(vs.createdAt),
  },
  {
    key: "updatedDate",
    label: "Ngày cập nhật",
    visible: false,
    width: "170px",
    render: (vs) => formatDateTime(vs.updatedAt),
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: false,
    width: "150px",
    render: (vs) => vs.creator?.name || "-",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "170px",
    render: (vs) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          STATUS_COLOR[vs.status] ?? "bg-gray-100 text-gray-700"
        }`}>
        {getVehicleShipmentStatusLabel(vs.status)}
      </span>
    ),
  },
];

export function VehicleShipmentsTable({
  filters,
  onFiltersChange,
}: VehicleShipmentsTableProps) {
  const router = useRouter();
  const isSupplierStaff = useAuthStore((s) => s.user?.supplierId != null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState(filters.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || "");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("all");

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset trang 1 khi filter/search/tab thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab]);

  // Sync tab từ sidebar
  useEffect(() => {
    if (filters.status !== undefined) {
      setActiveStatusTab(String(filters.status));
    } else {
      setActiveStatusTab("all");
    }
  }, [filters.status]);

  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab !== "all") {
      f.status = Number(activeStatusTab);
    } else {
      f.status = undefined;
    }
    return f;
  }, [filters, activeStatusTab]);

  const { columns, visibleColumns, toggleColumn } =
    useColumnVisibility<VehicleShipment>(
      "vehicleShipmentTableColumns",
      DEFAULT_COLUMNS
    );

  const { data, isLoading } = useVehicleShipments({
    ...effectiveFilters,
    search: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const shipments = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const colSpan = visibleColumns.length + 2; // checkbox + chevron

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === shipments.length
        ? []
        : shipments.map((vs) => vs.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <PermissionGate resource="vehicle_shipments" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* ── Toolbar ── */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Ghép xe
            </h2>
            <input
              type="text"
              placeholder="Tìm mã xe, biển số, mã PĐN, mã/tên SP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PermissionGate resource="vehicle_shipments" action="create">
              {!isSupplierStaff && (
                <button
                  onClick={() => router.push("/san-pham/ghep-xe/new")}
                  className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Tạo phiếu xe
                </button>
              )}
            </PermissionGate>
            <ColumnToggle columns={columns} onToggle={toggleColumn} />
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div className="flex items-center gap-1 px-4 border-b overflow-x-auto shrink-0">
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

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left w-10 sticky left-0 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === shipments.length &&
                      shipments.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide"
                    style={{ width: col.width, minWidth: col.width }}>
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-2.5 w-8" />
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
              ) : shipments.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400">
                    <div className="text-sm">Không có phiếu ghép xe nào</div>
                  </td>
                </tr>
              ) : (
                shipments.map((vs) => (
                  <Fragment key={vs.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        expandedId === vs.id
                          ? "bg-brand-soft"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(vs.id)}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedId === vs.id
                            ? "bg-brand-soft border-t-2 border-l-2 border-brand"
                            : "bg-white"
                        }`}
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(vs.id)}
                          onChange={() => toggleSelect(vs.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 ${
                            expandedId === vs.id
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
                          {col.render(vs)}
                        </td>
                      ))}
                      <td
                        className={`px-4 py-2.5 ${
                          expandedId === vs.id
                            ? "border-t-2 border-r-2 border-brand"
                            : ""
                        }`}>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedId === vs.id ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {expandedId === vs.id && (
                      <VehicleShipmentDetailRow
                        vehicleShipmentId={vs.id}
                        colSpan={colSpan}
                      />
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="border-t px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Hiển thị</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-white">
              {[10, 15, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">/ trang</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.min(
                Math.max(page - 2 + i, i + 1),
                totalPages - (Math.min(5, totalPages) - 1 - i)
              );
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 text-xs rounded border font-medium transition-colors ${
                    p === page
                      ? "bg-brand text-white border-brand"
                      : "hover:bg-gray-50 text-gray-600 border-gray-200"
                  }`}>
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs text-gray-400">
            Trang {page}/{totalPages}
            {total > 0 ? ` · ${total.toLocaleString("vi-VN")} phiếu` : ""}
          </span>
        </div>
      </div>
    </PermissionGate>
  );
}
