"use client";

import { useState, useEffect, Fragment, useMemo, useRef } from "react";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { useBranchStore } from "@/lib/store/branch";
import {
  Plus,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import type { Invoice } from "@/lib/types/invoice";
import { InvoiceDetailRow } from "./InvoiceDetailRow";
import { formatCurrency } from "@/lib/utils";
import { InvoiceImportModal } from "./InvoiceImportModal";
import { PermissionGate } from "../permissions/PermissionGate";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  render: (invoice: Invoice) => React.ReactNode;
}

interface InvoicesTableProps {
  filters: any;
  onCreateClick: () => void;
  onEditClick: (invoice: Invoice) => void;
  onCreateGiaoHang: (selectedIds: number[], branchId: number | null) => void;
  onCreateDongHang: (selectedIds: number[], branchId: number | null) => void;
  onCreateLoading: (selectedIds: number[], branchId: number | null) => void;
}

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "3", label: "Đang xử lý" },
  { value: "5", label: "Đóng hàng" },
  { value: "6", label: "Loading" },
  { value: "7", label: "Giao thành công" },
  { value: "1", label: "Hoàn thành" },
  { value: "4", label: "Không giao được" },
  { value: "8", label: "Trả hàng" },
  { value: "2", label: "Đã hủy" },
];

const STATUS_COLOR: Record<number, string> = {
  1: "bg-green-100 text-green-700",
  2: "bg-red-100 text-red-700",
  3: "bg-blue-100 text-blue-700",
  4: "bg-yellow-100 text-yellow-700",
  5: "bg-orange-100 text-orange-700",
  6: "bg-purple-100 text-purple-700",
  7: "bg-teal-100 text-teal-700",
  8: "bg-pink-100 text-pink-700",
};

const STATUS_TEXT: Record<number, string> = {
  1: "Hoàn thành",
  2: "Đã hủy",
  3: "Đang xử lý",
  4: "Không giao được",
  5: "Đóng hàng",
  6: "Loading",
  7: "Giao thành công",
  8: "Trả hàng",
};

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã hóa đơn",
    visible: true,
    width: "140px",
    render: (inv) => (
      <span className="font-medium text-blue-600">{inv.code}</span>
    ),
  },
  {
    key: "orderCode",
    label: "Mã vận đơn",
    visible: false,
    width: "160px",
    render: (inv) => inv.delivery?.deliveryCode || "-",
  },
  {
    key: "deliveryStatus",
    label: "Trạng thái giao hàng",
    visible: false,
    width: "160px",
    render: (inv) => {
      const s = inv.delivery?.status;
      if (!s) return "-";
      return s === 1 ? "Chưa giao" : "Đã giao";
    },
  },
  {
    key: "purchaseDate",
    label: "Thời gian",
    visible: true,
    width: "160px",
    render: (inv) => formatDateTime(inv.purchaseDate),
  },
  {
    key: "createTime",
    label: "Thời gian tạo",
    visible: true,
    width: "160px",
    render: (inv) => formatDateTime(inv.createdAt),
  },
  {
    key: "updateDate",
    label: "Ngày cập nhật",
    visible: false,
    width: "160px",
    render: (inv) => formatDateTime(inv.updatedAt),
  },
  {
    key: "customerCode",
    label: "Mã KH",
    visible: true,
    width: "120px",
    render: (inv) => inv.customer?.code || "-",
  },
  {
    key: "customer",
    label: "Khách hàng",
    visible: true,
    width: "180px",
    render: (inv) => inv.customer?.name || "-",
  },
  {
    key: "phone",
    label: "Điện thoại",
    visible: false,
    width: "140px",
    render: (inv) => inv.customer?.contactNumber || inv.customer?.phone || "-",
  },
  {
    key: "address",
    label: "Địa chỉ",
    visible: false,
    width: "200px",
    render: (inv) => inv.delivery?.address || "-",
  },
  {
    key: "area",
    label: "Khu vực",
    visible: false,
    width: "160px",
    render: (inv) => inv.delivery?.locationName || "-",
  },
  {
    key: "ward",
    label: "Phường/Xã",
    visible: false,
    width: "160px",
    render: (inv) => inv.delivery?.wardName || "-",
  },
  {
    key: "deliveryPartner",
    label: "Đối tác giao hàng",
    visible: false,
    width: "180px",
    render: (inv) => inv.delivery?.partnerDelivery?.name || "-",
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: false,
    width: "160px",
    render: (inv) => inv.branch?.name || "-",
  },
  {
    key: "seller",
    label: "Người bán",
    visible: true,
    width: "140px",
    render: (inv) => inv.soldBy?.name || inv.creator?.name || "-",
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: false,
    width: "140px",
    render: (inv) => inv.creator?.name || "-",
  },
  {
    key: "saleChannel",
    label: "Kênh bán",
    visible: false,
    width: "140px",
    render: (inv) => inv.saleChannel?.name || "Khác",
  },
  {
    key: "notes",
    label: "Ghi chú",
    visible: false,
    width: "200px",
    render: (inv) => inv.description || "-",
  },
  {
    key: "totalAmount",
    label: "Tổng tiền hàng",
    visible: false,
    width: "140px",
    render: (inv) => formatCurrency(Number(inv.totalAmount)),
  },
  {
    key: "discount",
    label: "Giảm giá",
    visible: false,
    width: "120px",
    render: (inv) => formatCurrency(Number(inv.discount)),
  },
  {
    key: "grandTotal",
    label: "Tổng sau giảm",
    visible: false,
    width: "140px",
    render: (inv) => formatCurrency(Number(inv.grandTotal)),
  },
  {
    key: "customerDebt",
    label: "Khách cần trả",
    visible: true,
    width: "140px",
    render: (inv) => formatCurrency(Number(inv.grandTotal)),
  },
  {
    key: "customerPaid",
    label: "Khách đã trả",
    visible: true,
    width: "120px",
    render: (inv) => (
      <span className="text-green-700 font-medium">
        {formatCurrency(Number(inv.paidAmount))}
      </span>
    ),
  },
  {
    key: "returnOrderAmount",
    label: "Trả hàng",
    visible: true,
    width: "120px",
    render: (inv) =>
      formatCurrency(Number((inv as any).returnOrderAmount || 0)),
  },
  {
    key: "cashRefundAmount",
    label: "Phiếu chi",
    visible: false,
    width: "120px",
    render: (inv) => {
      const a = Number((inv as any).cashRefundAmount || 0);
      const d = a > 0 ? -a : a;
      return d < 0 ? (
        <span className="text-red-600">{formatCurrency(d)}</span>
      ) : (
        formatCurrency(d)
      );
    },
  },
  {
    key: "debtOffsetAmount",
    label: "Cấn trừ nợ",
    visible: false,
    width: "120px",
    render: (inv) => {
      const a = Number((inv as any).debtOffsetAmount || 0);
      const d = a > 0 ? -a : a;
      return d < 0 ? (
        <span className="text-red-600">{formatCurrency(d)}</span>
      ) : (
        formatCurrency(d)
      );
    },
  },
  {
    key: "remainingAmount",
    label: "Còn lại",
    visible: true,
    width: "120px",
    render: (inv) => {
      const a = Number((inv as any).remainingAmount || 0);
      if (a > 0)
        return (
          <span className="text-orange-600 font-medium">
            {formatCurrency(a)}
          </span>
        );
      if (a < 0)
        return <span className="text-red-600">{formatCurrency(a)}</span>;
      return <span className="text-green-600">{formatCurrency(a)}</span>;
    },
  },
  {
    key: "codAmount",
    label: "Còn cần thu (COD)",
    visible: false,
    width: "140px",
    render: (inv) => formatCurrency(Number(inv.debtAmount)),
  },
  {
    key: "deliveryFee",
    label: "Phí trả ĐTGH",
    visible: false,
    width: "120px",
    render: (inv) =>
      inv.delivery?.price ? formatCurrency(Number(inv.delivery.price)) : "-",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "140px",
    render: (inv) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[inv.status] || "bg-gray-100 text-gray-700"}`}>
        {STATUS_TEXT[inv.status] || inv.status}
      </span>
    ),
  },
];

export function InvoicesTable({
  filters,
  onCreateClick,
  onCreateGiaoHang,
  onCreateDongHang,
  onCreateLoading,
}: InvoicesTableProps) {
  const { selectedBranch } = useBranchStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(
    null
  );
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [showBaoDonDropdown, setShowBaoDonDropdown] = useState(false);
  const baoDonRef = useRef<HTMLDivElement>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const advancedRef = useRef<HTMLDivElement>(null);
  const [advancedSearch, setAdvancedSearch] = useState({
    invoiceCodeSearch: "",
    productSearch: "",
    customerSearch: "",
    deliveryCodeSearch: "",
    orderCodeSearch: "",
    descriptionSearch: "",
    productNoteSearch: "",
  });
  const [tempAdvanced, setTempAdvanced] = useState({
    invoiceCodeSearch: "",
    productSearch: "",
    customerSearch: "",
    deliveryCodeSearch: "",
    orderCodeSearch: "",
    descriptionSearch: "",
    productNoteSearch: "",
  });
  const [showImportModal, setShowImportModal] = useState(false);

  const advancedFilterCount = useMemo(() => {
    return Object.values(advancedSearch).filter(Boolean).length;
  }, [advancedSearch]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!showAdvancedSearch) return;
    const h = (e: MouseEvent) => {
      if (
        advancedRef.current &&
        !advancedRef.current.contains(e.target as Node)
      ) {
        setShowAdvancedSearch(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showAdvancedSearch]);

  // Reset page khi filter/search/tab đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab, advancedSearch]);

  // Tab override sidebar status
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab !== "all") f.statusIds = [Number(activeStatusTab)];
    return f;
  }, [filters, activeStatusTab]);

  // Sync tab với sidebar
  useEffect(() => {
    const s = filters.statusIds?.[0];
    if (s != null && String(s) !== activeStatusTab)
      setActiveStatusTab(String(s));
    else if (s == null && activeStatusTab !== "all") setActiveStatusTab("all");
  }, [filters.statusIds]);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("invoiceTableColumns");
      if (saved) {
        try {
          const savedCols = JSON.parse(saved);
          return DEFAULT_COLUMNS.map((col) => ({
            ...col,
            visible:
              savedCols.find((s: any) => s.key === col.key)?.visible ??
              col.visible,
          }));
        } catch {
          return DEFAULT_COLUMNS;
        }
      }
    }
    return DEFAULT_COLUMNS;
  });

  const { data, isLoading } = useInvoices({
    page,
    limit,
    search: debouncedSearch,
    branchId: selectedBranch?.id,
    ...effectiveFilters,
    ...(advancedSearch.invoiceCodeSearch && {
      invoiceCodeSearch: advancedSearch.invoiceCodeSearch,
    }),
    ...(advancedSearch.productSearch && {
      productSearch: advancedSearch.productSearch,
    }),
    ...(advancedSearch.customerSearch && {
      customerSearch: advancedSearch.customerSearch,
    }),
    ...(advancedSearch.deliveryCodeSearch && {
      deliveryCodeSearch: advancedSearch.deliveryCodeSearch,
    }),
    ...(advancedSearch.orderCodeSearch && {
      orderCodeSearch: advancedSearch.orderCodeSearch,
    }),
    ...(advancedSearch.descriptionSearch && {
      descriptionSearch: advancedSearch.descriptionSearch,
    }),
    ...(advancedSearch.productNoteSearch && {
      productNoteSearch: advancedSearch.productNoteSearch,
    }),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("invoiceTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  // Đóng dropdown Báo đơn khi click ngoài
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (baoDonRef.current && !baoDonRef.current.contains(e.target as Node))
        setShowBaoDonDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const invoices = data?.data || [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.key !== "discount" && c.visible),
    [columns]
  );

  const toggleColumnVisibility = (key: string) =>
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === invoices.length ? [] : invoices.map((i) => i.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedInvoiceId((prev) => (prev === id ? null : id));

  const handleCreateBaoDon = (type: "giao-hang" | "dong-hang" | "loading") => {
    const branchId = selectedBranch?.id || null;
    if (type === "giao-hang") onCreateGiaoHang(selectedIds, branchId);
    else if (type === "dong-hang") onCreateDongHang(selectedIds, branchId);
    else onCreateLoading(selectedIds, branchId);
    setShowBaoDonDropdown(false);
  };

  const colSpan = visibleColumns.length + 2;

  return (
    <PermissionGate resource="invoices" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* Toolbar */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Hóa đơn
            </h2>
            <div ref={advancedRef} className="relative">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Theo mã hóa đơn"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    if (!showAdvancedSearch) {
                      setTempAdvanced({ ...advancedSearch });
                    }
                    setShowAdvancedSearch((p) => !p);
                  }}
                  className={`relative p-1.5 border rounded-lg transition-colors ${
                    advancedFilterCount > 0
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-gray-300 text-gray-500 hover:bg-gray-50"
                  }`}
                  title="Tìm kiếm nâng cao">
                  <SlidersHorizontal className="w-4 h-4" />
                  {advancedFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {advancedFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* ── Advanced Search Dropdown ── */}
              {showAdvancedSearch && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-[420px] p-4">
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      placeholder="Theo mã hóa đơn"
                      value={tempAdvanced.invoiceCodeSearch}
                      onChange={(e) =>
                        setTempAdvanced((p) => ({
                          ...p,
                          invoiceCodeSearch: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Theo mã, tên hàng"
                      value={tempAdvanced.productSearch}
                      onChange={(e) =>
                        setTempAdvanced((p) => ({
                          ...p,
                          productSearch: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Theo mã, tên, số điện thoại khách hàng"
                      value={tempAdvanced.customerSearch}
                      onChange={(e) =>
                        setTempAdvanced((p) => ({
                          ...p,
                          customerSearch: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* ── Expanded filters ── */}
                    {isExpanded && (
                      <>
                        <input
                          type="text"
                          placeholder="Theo mã vận đơn"
                          value={tempAdvanced.deliveryCodeSearch}
                          onChange={(e) =>
                            setTempAdvanced((p) => ({
                              ...p,
                              deliveryCodeSearch: e.target.value,
                            }))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Theo mã đặt hàng"
                          value={tempAdvanced.orderCodeSearch}
                          onChange={(e) =>
                            setTempAdvanced((p) => ({
                              ...p,
                              orderCodeSearch: e.target.value,
                            }))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Theo ghi chú"
                          value={tempAdvanced.descriptionSearch}
                          onChange={(e) =>
                            setTempAdvanced((p) => ({
                              ...p,
                              descriptionSearch: e.target.value,
                            }))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Theo ghi chú hàng hóa"
                          value={tempAdvanced.productNoteSearch}
                          onChange={(e) =>
                            setTempAdvanced((p) => ({
                              ...p,
                              productNoteSearch: e.target.value,
                            }))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setIsExpanded((p) => !p)}
                      className="px-4 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      {isExpanded ? "Thu gọn" : "Mở rộng"}
                    </button>
                    <button
                      onClick={() => {
                        setAdvancedSearch({ ...tempAdvanced });
                        setShowAdvancedSearch(false);
                        setPage(1);
                      }}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                      Tìm kiếm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PermissionGate resource="invoices" action="create">
              <button
                onClick={onCreateClick}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Tạo hóa đơn
              </button>
            </PermissionGate>

            <PermissionGate resource="invoices" action="create">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                Import
              </button>
            </PermissionGate>

            {/* Báo đơn dropdown */}
            <div ref={baoDonRef} className="relative">
              <button
                onClick={() => setShowBaoDonDropdown((p) => !p)}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Báo đơn
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showBaoDonDropdown ? "rotate-180" : ""}`}
                />
              </button>
              {showBaoDonDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-40 overflow-hidden">
                  <button
                    onClick={() => handleCreateBaoDon("giao-hang")}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                    Giao hàng
                  </button>
                  <button
                    onClick={() => handleCreateBaoDon("dong-hang")}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-50">
                    Đóng hàng
                  </button>
                  <button
                    onClick={() => handleCreateBaoDon("loading")}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-50">
                    Loading
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowColumnModal(true)}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1.5 text-gray-600">
              <Settings className="w-4 h-4" />
              Cột
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left w-10 sticky left-0 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === invoices.length &&
                      invoices.length > 0
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
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                      <span className="text-xs">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400">
                    <div className="text-sm">Không có hóa đơn nào</div>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <Fragment key={invoice.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        expandedInvoiceId === invoice.id
                          ? "bg-blue-50"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(invoice.id)}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedInvoiceId === invoice.id
                            ? "bg-blue-50 border-t-2 border-l-2 border-blue-500"
                            : "bg-white"
                        }`}
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(invoice.id)}
                          onChange={() => toggleSelect(invoice.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 ${
                            expandedInvoiceId === invoice.id
                              ? "border-t-2 border-blue-500"
                              : ""
                          }`}
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}>
                          {col.render(invoice)}
                        </td>
                      ))}
                      <td
                        className={`px-4 py-2.5 ${
                          expandedInvoiceId === invoice.id
                            ? "border-t-2 border-r-2 border-blue-500"
                            : ""
                        }`}>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedInvoiceId === invoice.id ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {expandedInvoiceId === invoice.id && (
                      <InvoiceDetailRow
                        invoiceId={invoice.id}
                        colSpan={colSpan}
                      />
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Hiển thị</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
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
                      ? "bg-blue-600 text-white border-blue-600"
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
            {total > 0 ? ` • ${total.toLocaleString()} HĐ` : ""}
          </span>
        </div>

        {/* Column modal */}
        {showColumnModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-base font-semibold text-gray-800">
                  Tùy chỉnh cột hiển thị
                </h3>
                <button
                  onClick={() => setShowColumnModal(false)}
                  className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumnVisibility(col.key)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showImportModal && (
        <InvoiceImportModal onClose={() => setShowImportModal(false)} />
      )}
    </PermissionGate>
  );
}
