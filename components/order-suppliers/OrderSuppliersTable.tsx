"use client";

import { useState, useEffect, Fragment, useMemo, useRef } from "react";
import {
  useOrderSuppliers,
  useExportOrderSuppliers,
} from "@/lib/hooks/useOrderSuppliers";
import type {
  OrderSupplier,
  OrderSupplierFilters,
} from "@/lib/types/order-supplier";
import {
  getStatusLabel,
  ORDER_SUPPLIER_STATUS,
} from "@/lib/types/order-supplier";
import { OrderSupplierDetailRow } from "./OrderSupplierDetailRow";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { PermissionGate } from "../permissions/PermissionGate";
import { useAuthStore } from "@/lib/store/auth";
import { CodeLink } from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

interface OrderSuppliersTableProps {
  filters: OrderSupplierFilters;
  onFiltersChange: (filters: Partial<OrderSupplierFilters>) => void;
}

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: String(ORDER_SUPPLIER_STATUS.DRAFT), label: "Phiếu tạm" },
  { value: String(ORDER_SUPPLIER_STATUS.CONFIRMED), label: "Đã xác nhận NCC" },
  { value: String(ORDER_SUPPLIER_STATUS.PARTIAL), label: "Nhập một phần" },
  { value: String(ORDER_SUPPLIER_STATUS.COMPLETED), label: "Hoàn thành" },
  { value: String(ORDER_SUPPLIER_STATUS.CANCELLED), label: "Đã hủy" },
];

const STATUS_COLOR: Record<number, string> = {
  [ORDER_SUPPLIER_STATUS.DRAFT]: "bg-gray-100 text-gray-700",
  [ORDER_SUPPLIER_STATUS.CONFIRMED]: "bg-blue-100 text-blue-700",
  [ORDER_SUPPLIER_STATUS.PARTIAL]: "bg-yellow-100 text-yellow-700",
  [ORDER_SUPPLIER_STATUS.COMPLETED]: "bg-green-100 text-green-700",
  [ORDER_SUPPLIER_STATUS.CANCELLED]: "bg-red-100 text-red-700",
};

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString("vi-VN") : "-";

// Format số CNY (làm tròn 2 chữ số thập phân, dùng dấu phẩy phân cách hàng nghìn)
const formatCNY = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value) + " CNY";

// Tính các giá trị CNY cho PDN NCC nước ngoài.
// - totalCNY = Σ items[i].factorySubTotal (đã là CNY, BE lưu CNY gốc)
// - paidAmountCNY: ưu tiên Σ payments.foreignAmount (snapshot CNY mỗi lần trả
//   — đúng kể cả khi tỉ giá TT ≠ tỉ giá phiếu). Fallback legacy:
//   paidAmount(VND) / exchangeRate phiếu.
// - discountCNY: ratio nếu có, không thì discount(VND) / rate
// - supplierDebtCNY = max(0, totalCNY - discountCNY - paidAmountCNY)
//
// LƯU Ý: BE lưu `total`/`supplierDebt`/`paidAmount` có thể là số ÂM cho
// PDN của NCC nước ngoài (do lỗi logic cũ). Để hiển thị CNY đúng, ta lấy
// giá trị tuyệt đối khi quy đổi sang CNY (vì CNY luôn dương).
// Mirror PurchaseOrdersTable.computeImportAmounts + OrderSupplierDetailRow.
function computeImportAmounts(os: OrderSupplier) {
  const rate = Number(os.exchangeRate) || 1;
  const totalCNY = (os.items || []).reduce(
    (sum, it) => sum + (Math.abs(Number(it.factorySubTotal)) || 0),
    0
  );
  // Ưu tiên tổng foreignAmount (CNY thật đã snapshot mỗi lần trả) — chính xác
  // kể cả khi tỉ giá thanh toán khác tỉ giá phiếu. Bỏ payment đã hủy (status=2).
  // Fallback (payment legacy không có foreignAmount) mới chia paidAmount/rate.
  const paidForeignSum = (os.payments || [])
    .filter((p) => p.status !== 2 && p.foreignAmount != null)
    .reduce((s, p) => s + Math.abs(Number(p.foreignAmount)), 0);
  const paidAmountCNY =
    paidForeignSum > 0
      ? paidForeignSum
      : Math.abs(Number(os.paidAmount || 0)) > 0
        ? Math.abs(Number(os.paidAmount)) / rate
        : 0;
  const discountCNY =
    Number(os.discountRatio) > 0
      ? (totalCNY * Number(os.discountRatio)) / 100
      : Math.abs(Number(os.discount || 0)) / rate;
  const supplierDebtCNY = Math.max(0, totalCNY - discountCNY - paidAmountCNY);
  return { totalCNY, paidAmountCNY, discountCNY, supplierDebtCNY };
}

// Ô hiển thị 2-dòng: CNY làm chính (text-sm), VND phụ (text-xs xám).
// Dùng cho 3 cột Tổng tiền hàng / Cần trả NCC / Đã trả NCC ở bảng danh sách
// khi NCC nước ngoài. Khi NCC nội địa → fallback dùng formatCurrency bình thường.
// VND luôn hiển thị giá trị tuyệt đối — BE có thể lưu số âm cho
// total/supplierDebt/paidAmount (vd đối với PDN NCC nước ngoài trong một số
// edge case cũ); Math.abs() để tránh hiển thị dấu "-" sai context.
// Layout: w-full + items-end để 2 dòng canh phải trong <td> (kết hợp
// text-right + align-top của <td>). Hàng 1-dòng (NCC nội địa) vẫn canh phải
// đồng nhất.
function ImportAmountCell({
  primaryCNY,
  vnd,
  className,
}: {
  primaryCNY: number;
  vnd: number | null;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-end leading-tight whitespace-nowrap ${
        className ?? ""
      }`}>
      <span className="text-sm font-medium text-gray-900">
        {formatCNY(primaryCNY)}
      </span>
      {vnd != null && (
        <span className="text-xs text-gray-400">
          (~{formatCurrency(Math.abs(vnd))})
        </span>
      )}
    </div>
  );
}

const DEFAULT_COLUMNS: ColumnConfig<OrderSupplier>[] = [
  {
    key: "code",
    label: "Mã đặt hàng nhập",
    visible: true,
    width: "140px",
    render: (os) => <CodeLink entity="order-supplier" code={os.code} />,
  },
  {
    key: "purchaseOrderCode",
    label: "Mã nhập hàng",
    visible: true,
    width: "150px",
    render: (os) =>
      os.purchaseOrders?.length
        ? os.purchaseOrders.map((po, idx) => (
            <Fragment key={po.code ?? idx}>
              {idx > 0 && <span className="text-gray-400"> | </span>}
              <CodeLink entity="purchase-order" code={po.code} />
            </Fragment>
          ))
        : "-",
  },
  {
    key: "contractNos",
    label: "Số HĐ",
    visible: true,
    width: "130px",
    render: (os) => {
      // BE trả về `contractNos` (mảng DISTINCT, có thể rỗng) + `contractNo`
      // (string|null, phần tử đầu tiên) cho backward-compat. Ưu tiên
      // `contractNos` để hiển thị đủ các HĐ (vd HH00082-26 → "169, 197").
      const list = (os as any).contractNos as string[] | undefined;
      if (list && list.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {list.map((c) => (
              <span
                key={c}
                className="inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                {c}
              </span>
            ))}
          </div>
        );
      }
      const single = (os as any).contractNo as string | null | undefined;
      return single ? (
        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
          {single}
        </span>
      ) : (
        <span className="text-xs text-gray-300 italic">—</span>
      );
    },
  },
  {
    key: "orderDate",
    label: "Ngày dự kiến nhập hàng",
    visible: true,
    width: "150px",
    render: (os) => formatDateTime(os.orderDate),
  },
  {
    key: "createdDate",
    label: "Ngày tạo",
    visible: true,
    width: "150px",
    render: (os) => formatDateTime(os.createdAt),
  },
  {
    key: "updatedDate",
    label: "Ngày cập nhật",
    visible: false,
    width: "150px",
    render: (os) => formatDateTime(os.updatedAt),
  },
  {
    key: "supplier",
    label: "Nhà cung cấp",
    visible: true,
    width: "160px",
    render: (os) => os.supplier?.name || "-",
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: true,
    width: "130px",
    render: (os) => os.branch?.name || "-",
  },
  {
    key: "total",
    label: "Tổng tiền hàng",
    visible: true,
    width: "150px",
    render: (os) => {
      // NCC nước ngoài: hiển thị CNY chính + VND phụ
      if (os.currency === "CNY") {
        const { totalCNY } = computeImportAmounts(os);
        return <ImportAmountCell primaryCNY={totalCNY} vnd={os.total} />;
      }
      return formatCurrency(os.total);
    },
  },
  {
    key: "orderBy",
    label: "Người đặt",
    visible: false,
    width: "130px",
    render: (os) => os.user?.name || "-",
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: true,
    width: "130px",
    render: (os) => os.creator?.name || "-",
  },
  {
    key: "totalQuantity",
    label: "Tổng số lượng",
    visible: false,
    width: "120px",
    render: (os) => String(os.totalQty ?? "-"),
  },
  {
    key: "productQty",
    label: "Số mặt hàng",
    visible: false,
    width: "120px",
    render: (os) => String(os.productQty ?? "-"),
  },
  {
    key: "discount",
    label: "Giảm giá",
    visible: false,
    width: "120px",
    render: (os) => formatCurrency(os.discount),
  },
  {
    key: "subTotal",
    label: "Cần trả NCC",
    visible: true,
    width: "150px",
    render: (os) => {
      // NCC nước ngoài: hiển thị CNY chính + VND phụ
      if (os.currency === "CNY") {
        const { supplierDebtCNY } = computeImportAmounts(os);
        return (
          <ImportAmountCell
            primaryCNY={supplierDebtCNY}
            vnd={os.supplierDebt}
          />
        );
      }
      return formatCurrency(os.supplierDebt);
    },
  },
  {
    key: "paidAmount",
    label: "Đã trả NCC",
    visible: true,
    width: "150px",
    render: (os) => {
      // NCC nước ngoài: hiển thị CNY chính + VND phụ
      if (os.currency === "CNY") {
        const { paidAmountCNY } = computeImportAmounts(os);
        return (
          <ImportAmountCell primaryCNY={paidAmountCNY} vnd={os.paidAmount} />
        );
      }
      return formatCurrency(os.paidAmount);
    },
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "130px",
    render: (os) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          STATUS_COLOR[os.status] ?? "bg-gray-100 text-gray-700"
        }`}>
        {getStatusLabel(os.status)}
      </span>
    ),
  },
];

export function OrderSuppliersTable({
  filters,
  onFiltersChange,
}: OrderSuppliersTableProps) {
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

  // Sync tab từ sidebar (chỉ sync khi sidebar chọn đúng 1 status)
  useEffect(() => {
    if (filters.status && filters.status.length === 1) {
      setActiveStatusTab(String(filters.status[0]));
    } else if (!filters.status || filters.status.length === 0) {
      setActiveStatusTab("all");
    } else {
      // multi-select → reset tab về "all"
      setActiveStatusTab("all");
    }
  }, [filters.status]);

  // effectiveFilters: tab override sidebar status
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab !== "all") {
      f.status = [Number(activeStatusTab)];
    }
    return f;
  }, [filters, activeStatusTab]);

  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "orderSupplierTableColumns",
    DEFAULT_COLUMNS
  );

  const { data, isLoading } = useOrderSuppliers({
    ...effectiveFilters,
    search: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const {
    exportToFile,
    exportDetailToFile,
    isExportingOverview,
    isExportingDetail,
  } = useExportOrderSuppliers();
  const isExporting = isExportingOverview || isExportingDetail;
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu]);

  const buildExportFilters = (): OrderSupplierFilters => ({
    ...effectiveFilters,
    search: debouncedSearch || undefined,
  });

  const orderSuppliers = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const colSpan = visibleColumns.length + 2; // checkbox + chevron

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === orderSuppliers.length
        ? []
        : orderSuppliers.map((os) => os.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <PermissionGate resource="order_suppliers" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* ── Toolbar ── */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Đặt hàng nhập
            </h2>
            <input
              type="text"
              placeholder="Tìm mã đặt hàng, mã nhập hàng, NCC, mã hàng, tên SP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PermissionGate resource="order_suppliers" action="create">
              {!isSupplierStaff && (
                <button
                  onClick={() => router.push("/san-pham/dat-hang-nhap/new")}
                  className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Tạo phiếu
                </button>
              )}
            </PermissionGate>
            <PermissionGate resource="order_suppliers" action="export">
              <div ref={exportMenuRef} className="relative">
                <button
                  onClick={() => setShowExportMenu((o) => !o)}
                  disabled={isExporting}
                  className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-600 disabled:opacity-50">
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isExporting ? "Đang xuất..." : "Xuất file"}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        exportToFile(buildExportFilters());
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-soft transition-colors">
                      Xuất tổng quan
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        exportDetailToFile(buildExportFilters());
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-soft transition-colors border-t border-gray-100">
                      Xuất chi tiết
                    </button>
                  </div>
                )}
              </div>
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
          <table className="w-full text-sm" style={{ minWidth: "max-content" }}>
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left w-10 sticky left-0 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === orderSuppliers.length &&
                      orderSuppliers.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                {visibleColumns.map((col) => {
                  // Cột tiền tệ (3 cột Tổng tiền hàng / Cần trả NCC / Đã trả
                  // NCC) chứa CNY + VND phụ 2 dòng cho NCC nước ngoài.
                  // Header canh phải cho khớp với cell để mắt không bị lệch.
                  // Cell align-top để các hàng 1-dòng (NCC nội địa) có text
                  // dính lên đầu, các hàng 2-dòng (NCC ngoài) text cũng
                  // dính lên → không bị "nhảy" giữa các hàng.
                  const isMoneyColumn =
                    col.key === "total" ||
                    col.key === "subTotal" ||
                    col.key === "paidAmount";
                  return (
                    <th
                      key={col.key}
                      className={`px-4 py-2.5 ${
                        isMoneyColumn ? "text-right" : "text-left"
                      } font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide`}
                      style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}>
                      {col.label}
                    </th>
                  );
                })}
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
              ) : orderSuppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400">
                    <div className="text-sm">
                      Không có phiếu đặt hàng nhập nào
                    </div>
                  </td>
                </tr>
              ) : (
                orderSuppliers.map((os) => (
                  <Fragment key={os.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        expandedId === os.id
                          ? "bg-brand-soft"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(os.id)}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedId === os.id
                            ? "bg-brand-soft border-t-2 border-l-2 border-brand"
                            : "bg-white"
                        }`}
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(os.id)}
                          onChange={() => toggleSelect(os.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      {visibleColumns.map((col) => {
                        const isMoneyColumn =
                          col.key === "total" ||
                          col.key === "subTotal" ||
                          col.key === "paidAmount";
                        return (
                          <td
                            key={col.key}
                            className={`px-4 py-2.5 ${
                              isMoneyColumn
                                ? "align-top text-right"
                                : "align-middle"
                            } ${
                              expandedId === os.id
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
                            {col.render(os)}
                          </td>
                        );
                      })}
                      <td
                        className={`px-4 py-2.5 ${
                          expandedId === os.id
                            ? "border-t-2 border-r-2 border-brand"
                            : ""
                        }`}>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedId === os.id ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {expandedId === os.id && (
                      <OrderSupplierDetailRow
                        orderSupplierId={os.id}
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
