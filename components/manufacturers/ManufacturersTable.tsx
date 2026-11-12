"use client";

import { Fragment, useRef, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  History,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import type { Manufacturer } from "@/lib/api/manufacturers";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";
import { usePermission } from "@/lib/hooks/usePermissions";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { ManufacturerDetailRow } from "./ManufacturerDetailRow";
import type { ManufacturerView } from "./ManufacturerSidebar";

const DEFAULT_COLUMNS: ColumnConfig<Manufacturer>[] = [
  {
    key: "code",
    label: "Mã nhà sản xuất",
    visible: true,
    width: "160px",
    render: (row) => <span className="font-medium text-brand">{row.code}</span>,
  },
  {
    key: "name",
    label: "Tên nhà sản xuất",
    visible: true,
    width: "220px",
    render: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    key: "contactNumber",
    label: "Điện thoại",
    visible: true,
    width: "140px",
    render: (row) => row.contactNumber || "-",
  },
  {
    key: "supplier",
    label: "Nhà cung cấp liên kết",
    visible: true,
    width: "210px",
    render: (row) => row.supplier?.name || "-",
  },
  {
    key: "currency",
    label: "Tiền tệ",
    visible: true,
    width: "90px",
    render: (row) => row.currency,
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "150px",
    render: (row) => (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
      >
        {row.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
      </span>
    ),
  },
  {
    key: "email",
    label: "Email",
    visible: false,
    width: "200px",
    render: (row) => row.email || "-",
  },
  {
    key: "address",
    label: "Địa chỉ",
    visible: false,
    width: "260px",
    render: (row) => row.address || "-",
  },
];

export function ManufacturersTable({
  rows,
  total,
  loading,
  error,
  refreshing,
  onRefresh,
  search,
  onSearchChange,
  page,
  limit,
  onPageChange,
  onLimitChange,
  selected,
  onSelect,
  view,
  onViewChange,
  onEdit,
  onCreate,
  onOpenCostHistory,
}: {
  rows: Manufacturer[];
  total: number;
  loading: boolean;
  error: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  selected: number | null;
  onSelect: (id: number | null) => void;
  view: ManufacturerView;
  onViewChange: (view: ManufacturerView) => void;
  onEdit: (value: Manufacturer) => void;
  onCreate: () => void;
  onOpenCostHistory: () => void;
}) {
  const canCreate = usePermission("productions", "create");
  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "manufacturerTableColumns",
    DEFAULT_COLUMNS,
  );
  const headerCheckbox = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<number[]>([]);
  const selectedCount = rows.filter((row) => selection.includes(row.id)).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  useEffect(() => {
    if (headerCheckbox.current)
      headerCheckbox.current.indeterminate = selectedCount > 0 && !allSelected;
  }, [selectedCount, allSelected]);
  const colSpan = visibleColumns.length + 2;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) =>
      Math.min(Math.max(page - 1, 1), Math.max(1, totalPages - 4)) + index,
  );
  const toggle = (id: number) => onSelect(selected === id ? null : id);

  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex min-w-0 basis-full flex-wrap items-center gap-3 sm:basis-auto sm:flex-1">
          <h2 className="shrink-0 text-base font-semibold text-gray-900">
            Nhà sản xuất
          </h2>
          <div className="relative w-full min-w-0 sm:w-64">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-2.5 text-gray-400"
            />
            <input
              type="search"
              aria-label="Tìm nhà sản xuất"
              placeholder="Theo mã hoặc tên"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />
          </div>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCostHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <History size={16} />
            Lịch sử giá thành
          </button>
          <button
            type="button"
            title="Làm mới danh sách"
            aria-label="Làm mới danh sách"
            disabled={refreshing}
            onClick={onRefresh}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              <Plus size={16} />
              Thêm nhà sản xuất
            </button>
          )}
          <ColumnToggle columns={columns} onToggle={toggleColumn} />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm" aria-label="Danh sách nhà sản xuất">
          <thead className="sticky top-0 z-20 bg-gray-50">
            <tr>
              <th className="sticky left-0 w-12 min-w-12 max-w-12 border-l-2 border-transparent bg-gray-50 p-0">
                <div className="flex h-10 items-center justify-center">
                  <input
                    ref={headerCheckbox}
                    type="checkbox"
                    aria-label="Chọn tất cả nhà sản xuất đang hiển thị"
                    checked={allSelected}
                    onChange={() =>
                      setSelection((previous) =>
                        allSelected
                          ? previous.filter(
                              (id) => !rows.some((row) => row.id === id),
                            )
                          : [
                              ...new Set([
                                ...previous,
                                ...rows.map((row) => row.id),
                              ]),
                            ],
                      )
                    }
                    className="m-0 block h-4 w-4 shrink-0 cursor-pointer accent-brand"
                  />
                </div>
              </th>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium uppercase text-gray-500"
                  style={{ width: column.width, minWidth: column.width }}
                >
                  {column.label}
                </th>
              ))}
              <th className="w-10">
                <span className="sr-only">Chi tiết</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="py-16">
                  <div
                    role="status"
                    className="flex items-center justify-center gap-2 text-sm text-gray-400"
                  >
                    <Loader2 size={20} className="animate-spin text-brand" />
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-16 text-center text-sm text-gray-500"
                >
                  <p>Không tải được danh sách nhà sản xuất</p>
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="mt-2 rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                  >
                    Thử lại
                  </button>
                </td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-20 text-center text-gray-400"
                >
                  {search.trim()
                    ? "Không tìm thấy nhà sản xuất phù hợp"
                    : "Chưa có nhà sản xuất"}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <Fragment key={row.id}>
                  <tr
                    className={`cursor-pointer transition-colors ${selected === row.id ? "bg-brand-soft" : "border-b hover:bg-gray-50"}`}
                    onClick={() => toggle(row.id)}
                  >
                    <td
                      className={`sticky left-0 z-10 w-12 min-w-12 max-w-12 border-l-2 p-0 ${selected === row.id ? "border-t-2 border-brand bg-brand-soft" : "border-l-transparent bg-white"}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex h-10 items-center justify-center">
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${row.name}`}
                          checked={selection.includes(row.id)}
                          className="m-0 block h-4 w-4 shrink-0 cursor-pointer accent-brand"
                          onChange={() =>
                            setSelection((previous) =>
                              previous.includes(row.id)
                                ? previous.filter((id) => id !== row.id)
                                : [...previous, row.id],
                            )
                          }
                        />
                      </div>
                    </td>
                    {visibleColumns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-2.5 text-gray-700 ${selected === row.id ? "border-t-2 border-brand" : ""}`}
                        style={{
                          width: column.width,
                          minWidth: column.width,
                          maxWidth: column.width,
                          overflowWrap: "anywhere",
                          whiteSpace: "normal",
                        }}
                      >
                        {column.key === "code" ? (
                          <button
                            type="button"
                            className="text-left font-medium text-brand hover:underline"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggle(row.id);
                            }}
                          >
                            {row.code}
                          </button>
                        ) : (
                          column.render(row)
                        )}
                      </td>
                    ))}
                    <td
                      className={`px-4 py-2.5 ${selected === row.id ? "border-r-2 border-t-2 border-brand" : ""}`}
                    >
                      <button
                        type="button"
                        aria-label={`Chi tiết ${row.name}`}
                        aria-expanded={selected === row.id}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggle(row.id);
                        }}
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${selected === row.id ? "rotate-180" : ""}`}
                        />
                      </button>
                    </td>
                  </tr>
                  {selected === row.id && (
                    <ManufacturerDetailRow
                      id={row.id}
                      colSpan={colSpan}
                      view={view}
                      onViewChange={onViewChange}
                      onEdit={onEdit}
                    />
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-white px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <label htmlFor="manufacturer-page-size">Hiển thị</label>
          <select
            id="manufacturer-page-size"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="rounded border bg-white px-2 py-1 outline-none focus:ring-1 focus:ring-brand"
          >
            {[10, 15, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>/ trang</span>
          {selection.length > 0 && (
            <span className="text-brand-dark">Đã chọn {selection.length}</span>
          )}
        </div>
        <nav
          aria-label="Phân trang nhà sản xuất"
          className="flex items-center gap-1"
        >
          <button
            type="button"
            title="Trang trước"
            disabled={page === 0 || loading}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            className="rounded border p-1 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          {pages.map((number) => (
            <button
              type="button"
              key={number}
              aria-label={`Trang ${number}`}
              aria-current={number === page + 1 ? "page" : undefined}
              onClick={() => onPageChange(number - 1)}
              className={`h-7 w-7 rounded border text-xs font-medium ${number === page + 1 ? "border-brand bg-brand text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {number}
            </button>
          ))}
          <button
            type="button"
            title="Trang sau"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            className="rounded border p-1 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
        <span className="text-xs text-gray-400">
          Trang {page + 1}/{totalPages}
          {total > 0 ? ` · ${total} nhà sản xuất` : ""}
        </span>
      </footer>
    </>
  );
}
