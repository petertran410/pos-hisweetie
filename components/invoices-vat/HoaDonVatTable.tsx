"use client";

import { useState, useEffect, Fragment, useMemo, useRef } from "react";
import {
  useInvoicesVat,
  useInvoicesVatTotals,
} from "@/lib/hooks/useInvoices";
import {
  useCreateVoucher,
  useRetryVouchers,
  useDeleteVoucher,
  useCreateVouchersBulk,
} from "@/lib/hooks/useMisa";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  UploadCloud,
  RefreshCw,
  Trash2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
} from "lucide-react";
import type { InvoiceVat } from "@/lib/api/invoices";
import { HoaDonVatDetailRow } from "@/components/invoices-vat/HoaDonVatDetailRow";
import type { InvoiceBuyerInfoValue } from "@/components/invoices-vat/InvoiceBuyerTaxInfo";
import type { MisaBuyerOverride } from "@/lib/api/misa";
import { formatCurrency } from "@/lib/utils";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useCan } from "@/lib/hooks/useCan";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";
import Swal from "sweetalert2";

interface HoaDonVatTableProps {
  filters: any;
}

// ─── Trạng thái đồng bộ Misa ──────────────────────────────────────────────────
type MisaStatus = "PENDING" | "SYNCED" | "FAILED" | "SKIP";

const MISA_STATUS_META: Record<
  MisaStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  SYNCED: {
    label: "Đã đồng bộ",
    className: "bg-green-100 text-green-700",
    Icon: CheckCircle2,
  },
  FAILED: {
    label: "Thất bại",
    className: "bg-red-100 text-red-700",
    Icon: XCircle,
  },
  PENDING: {
    label: "Chờ xử lý",
    className: "bg-yellow-100 text-yellow-700",
    Icon: Clock,
  },
  SKIP: {
    label: "Bỏ qua",
    className: "bg-gray-100 text-gray-600",
    Icon: MinusCircle,
  },
};

const MISA_STATUS_OPTIONS: { value: MisaStatus; label: string }[] = [
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "SYNCED", label: "Đã đồng bộ" },
  { value: "FAILED", label: "Thất bại" },
  { value: "SKIP", label: "Bỏ qua" },
];

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

function MisaStatusBadge({ status }: { status?: MisaStatus }) {
  const meta = MISA_STATUS_META[status ?? "SKIP"];
  const { Icon } = meta;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.className}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

const DEFAULT_COLUMNS: ColumnConfig<InvoiceVat>[] = [
  {
    key: "code",
    label: "Mã hóa đơn",
    visible: true,
    width: "140px",
    render: (inv) => (
      <span className="font-medium text-brand">{inv.code}</span>
    ),
  },
  {
    key: "createTime",
    label: "Thời gian tạo",
    visible: false,
    width: "160px",
    render: (inv) => formatDateTime(inv.createdAt),
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
    key: "misaEmployee",
    label: "Nhân viên phụ trách",
    visible: true,
    width: "180px",
    render: (inv) =>
      inv.customer?.misaEmployeeName ||
      inv.customer?.misaEmployeeCode ||
      "-",
  },
  {
    key: "taxCode",
    label: "Mã số thuế",
    visible: false,
    width: "140px",
    render: (inv) =>
      inv.customer?.taxCode || inv.customer?.identificationNumber || "-",
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
    visible: false,
    width: "140px",
    render: (inv) => inv.soldBy?.name || inv.creator?.name || "-",
  },
  {
    key: "preTax",
    label: "Tiền trước thuế",
    visible: true,
    width: "150px",
    render: (inv) => formatCurrency(Number(inv.vat?.totalPreTax || 0)),
  },
  {
    key: "vat",
    label: "Thuế VAT",
    visible: true,
    width: "140px",
    render: (inv) => (
      <span className="text-brand-dark">
        {formatCurrency(Number(inv.vat?.totalVat || 0))}
      </span>
    ),
  },
  {
    key: "afterTax",
    label: "Tiền sau thuế",
    visible: true,
    width: "150px",
    render: (inv) => (
      <span className="font-medium text-gray-900">
        {formatCurrency(Number(inv.vat?.totalAfterTax || 0))}
      </span>
    ),
  },
  {
    key: "grandTotal",
    label: "Tổng hóa đơn (gốc)",
    visible: false,
    width: "150px",
    render: (inv) => formatCurrency(Number(inv.grandTotal)),
  },
  {
    key: "misaStatus",
    label: "Trạng thái Misa",
    visible: true,
    width: "150px",
    render: (inv) => <MisaStatusBadge status={inv.misaSyncStatus} />,
  },
  {
    key: "misaOrgRefId",
    label: "Mã chứng từ",
    visible: true,
    width: "200px",
    render: (inv) =>
      inv.misaOrgRefId ? (
        <span className="font-mono text-xs text-gray-600">
          {inv.misaOrgRefId}
        </span>
      ) : (
        "-"
      ),
  },
  {
    key: "misaSyncedAt",
    label: "Thời gian đồng bộ",
    visible: false,
    width: "160px",
    render: (inv) => formatDateTime(inv.misaSyncedAt || undefined),
  },
  {
    key: "misaError",
    label: "Lỗi Misa",
    visible: false,
    width: "240px",
    render: (inv) =>
      inv.misaErrorMessage ? (
        <span className="text-red-600 text-xs" title={inv.misaErrorMessage}>
          {inv.misaErrorMessage}
        </span>
      ) : (
        "-"
      ),
  },
  {
    key: "missingMisaCode",
    label: "Thiếu mã Misa",
    visible: false,
    width: "130px",
    render: (inv) =>
      inv.missingMisaCode ? (
        <span className="text-orange-600 text-xs font-medium">Có</span>
      ) : (
        <span className="text-gray-400 text-xs">Không</span>
      ),
  },
];

export function HoaDonVatTable({ filters }: HoaDonVatTableProps) {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [misaStatusFilter, setMisaStatusFilter] = useState<MisaStatus[]>([]);
  const [showMisaFilter, setShowMisaFilter] = useState(false);
  const misaFilterRef = useRef<HTMLDivElement>(null);
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const actionRef = useRef<HTMLDivElement>(null);

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
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Thông tin xuất hóa đơn nhập tay theo từng hóa đơn (key = invoice.id).
  // Chỉ khi cả 3 ô (MST, tên người mua, địa chỉ) đều có dữ liệu thì mới gửi
  // override khi đẩy Misa; ngược lại backend dùng thông tin từ database.
  // Lưu vào localStorage để không mất khi F5 / chuyển trang (không lưu DB).
  // Mỗi mục có thời hạn BUYER_INFO_TTL_MS — quá hạn sẽ tự bị dọn khi mở trang.
  const BUYER_INFO_STORAGE_KEY = "hoaDonVatBuyerInfo";
  const BUYER_INFO_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày kể từ lần sửa cuối

  const [buyerInfoMap, setBuyerInfoMap] = useState<
    Record<number, { value: InvoiceBuyerInfoValue; savedAt: number }>
  >(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(BUYER_INFO_STORAGE_KEY);
      if (!saved) return {};
      const parsed = JSON.parse(saved) as Record<
        number,
        { value: InvoiceBuyerInfoValue; savedAt: number }
      >;
      const now = Date.now();
      const fresh: Record<
        number,
        { value: InvoiceBuyerInfoValue; savedAt: number }
      > = {};
      for (const [id, entry] of Object.entries(parsed)) {
        if (
          entry &&
          typeof entry.savedAt === "number" &&
          now - entry.savedAt < BUYER_INFO_TTL_MS
        ) {
          fresh[Number(id)] = entry;
        }
      }
      return fresh;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        BUYER_INFO_STORAGE_KEY,
        JSON.stringify(buyerInfoMap)
      );
    } catch {
      // localStorage đầy hoặc bị chặn — bỏ qua, vẫn dùng được trong phiên.
    }
  }, [buyerInfoMap]);

  const getBuyerInfo = (inv: InvoiceVat): InvoiceBuyerInfoValue =>
    buyerInfoMap[inv.id]?.value ?? {
      taxCode:
        inv.customer?.taxCode || inv.customer?.identificationNumber || "",
      buyerName: inv.customer?.invoiceBuyerName || "",
      buyerAddress: inv.customer?.invoiceAddress || "",
    };

  const setBuyerInfo = (id: number, next: InvoiceBuyerInfoValue) =>
    setBuyerInfoMap((prev) => ({
      ...prev,
      [id]: { value: next, savedAt: Date.now() },
    }));

  /** Trả về override nếu cả 3 ô đều có dữ liệu, ngược lại undefined. */
  const buildBuyerOverride = (
    info: InvoiceBuyerInfoValue
  ): MisaBuyerOverride | undefined => {
    const taxCode = (info.taxCode || "").trim();
    const buyerName = (info.buyerName || "").trim();
    const buyerAddress = (info.buyerAddress || "").trim();
    if (taxCode && buyerName && buyerAddress) {
      return { taxCode, buyerName, buyerAddress };
    }
    return undefined;
  };

  const createVoucher = useCreateVoucher();
  const retryVouchers = useRetryVouchers();
  const deleteVoucher = useDeleteVoucher();
  const createVouchersBulk = useCreateVouchersBulk();

  const canPushMisa = useCan("vat_invoices", "push");
  const canDeleteMisa = useCan("vat_invoices", "delete");
  const canRowAction = canPushMisa || canDeleteMisa;

  const SORTABLE_COLUMNS = new Set([
    "createTime",
    "grandTotal",
  ]);

  const COLUMN_ORDER_BY: Record<string, string> = {
    createTime: "createdAt",
    grandTotal: "grandTotal",
  };

  const handleSort = (colKey: string) => {
    if (!SORTABLE_COLUMNS.has(colKey)) return;
    if (sortBy !== colKey) {
      setSortBy(colKey);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortBy(null);
      setSortDir(null);
    }
    setPage(1);
  };

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

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        misaFilterRef.current &&
        !misaFilterRef.current.contains(e.target as Node)
      ) {
        setShowMisaFilter(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(e.target as Node))
        setOpenActionId(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Reset page khi filter/search/tab đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab, advancedSearch, misaStatusFilter]);

  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab !== "all" && (!f.statusIds || f.statusIds.length <= 1))
      f.statusIds = [Number(activeStatusTab)];
    if (misaStatusFilter.length > 0) f.misaSyncStatus = misaStatusFilter;
    return f;
  }, [filters, activeStatusTab, misaStatusFilter]);

  useEffect(() => {
    const ids = filters.statusIds;
    if (ids && ids.length === 1) {
      if (String(ids[0]) !== activeStatusTab)
        setActiveStatusTab(String(ids[0]));
    } else {
      if (activeStatusTab !== "all") setActiveStatusTab("all");
    }
  }, [filters.statusIds]);

  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "hoaDonVatTableColumns",
    DEFAULT_COLUMNS
  );

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch,
      ...effectiveFilters,
      ...(sortBy && sortDir
        ? {
            orderBy: COLUMN_ORDER_BY[sortBy],
            orderDirection: sortDir,
          }
        : {
            orderBy: effectiveFilters.orderBy ?? "createdAt",
            orderDirection: effectiveFilters.orderDirection ?? "desc",
          }),
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
    }),
    [page, limit, debouncedSearch, effectiveFilters, sortBy, sortDir, advancedSearch]
  );

  const { data, isLoading } = useInvoicesVat(queryParams);

  // Tổng các cột VAT của TOÀN BỘ hóa đơn match filter — không phụ thuộc page/limit/sort.
  const totalsParams = useMemo(() => {
    const { page: _p, limit: _l, orderBy: _o, orderDirection: _d, ...rest } =
      queryParams as any;
    return rest;
  }, [queryParams]);
  const { data: totals } = useInvoicesVatTotals(totalsParams);

  const invoices = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const toggleExpand = (id: number) =>
    setExpandedInvoiceId((prev) => (prev === id ? null : id));

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const allOnPageSelected =
    invoices.length > 0 && invoices.every((inv) => selectedIds.includes(inv.id));

  const toggleSelectAll = () =>
    setSelectedIds((prev) => {
      if (invoices.every((inv) => prev.includes(inv.id)) && invoices.length > 0) {
        const pageIds = new Set(invoices.map((i) => i.id));
        return prev.filter((id) => !pageIds.has(id));
      }
      const merged = new Set(prev);
      invoices.forEach((inv) => merged.add(inv.id));
      return Array.from(merged);
    });

  // Bỏ chọn các id không còn trong trang hiện tại khi đổi filter/trang
  useEffect(() => {
    setSelectedIds([]);
  }, [debouncedSearch, filters, activeStatusTab, misaStatusFilter, page]);

  const toggleMisaStatus = (value: MisaStatus) =>
    setMisaStatusFilter((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );

  const handlePush = async (invoice: InvoiceVat) => {
    setOpenActionId(null);
    const result = await Swal.fire({
      title: "Đẩy hóa đơn lên Misa?",
      text: `Tạo chứng từ bán hàng Misa cho hóa đơn ${invoice.code}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Đẩy Misa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#2563eb",
    });
    if (result.isConfirmed) {
      createVoucher.mutate({
        invoiceCode: invoice.code,
        buyerOverride: buildBuyerOverride(getBuyerInfo(invoice)),
      });
    }
  };

  const handleDelete = async (invoice: InvoiceVat) => {
    setOpenActionId(null);
    const result = await Swal.fire({
      title: "Xóa chứng từ Misa?",
      text: `Xóa đề nghị sinh chứng từ Misa của hóa đơn ${invoice.code}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa chứng từ",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
    });
    if (result.isConfirmed) {
      deleteVoucher.mutate(invoice.code);
    }
  };

  const handleRetry = async () => {
    const result = await Swal.fire({
      title: "Retry các hóa đơn FAILED?",
      text: "Thử đẩy lại các hóa đơn đồng bộ Misa bị thất bại.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Retry",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#2563eb",
    });
    if (result.isConfirmed) {
      retryVouchers.mutate();
    }
  };

  const handleBulkPush = async () => {
    if (selectedIds.length === 0) return;
    const selectedInvoices = invoices.filter((inv) =>
      selectedIds.includes(inv.id)
    );
    const selectedCodes = selectedInvoices.map((inv) => inv.code);

    // Gom override theo mã hóa đơn (chỉ những hóa đơn nhập đủ 3 ô).
    const buyerOverrides: Record<string, MisaBuyerOverride> = {};
    for (const inv of selectedInvoices) {
      const override = buildBuyerOverride(getBuyerInfo(inv));
      if (override) buyerOverrides[inv.code] = override;
    }

    const result = await Swal.fire({
      title: `Đẩy ${selectedCodes.length} hóa đơn lên Misa?`,
      text: "Hệ thống sẽ tạo chứng từ bán hàng Misa cho các hóa đơn đã chọn. Quá trình xử lý tuần tự, có thể mất chút thời gian.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Đẩy hàng loạt",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#2563eb",
    });
    if (result.isConfirmed) {
      createVouchersBulk.mutate(
        { invoiceCodes: selectedCodes, buyerOverrides },
        {
          onSuccess: () => setSelectedIds([]),
        }
      );
    }
  };

  const colSpan = visibleColumns.length + 2;

  const renderTotalCell = (key: string): React.ReactNode => {
    if (!totals) return null;
    switch (key) {
      case "preTax":
        return (
          <span className="font-semibold text-gray-900">
            {formatCurrency(totals.totalPreTax)}
          </span>
        );
      case "vat":
        return (
          <span className="font-semibold text-brand-dark">
            {formatCurrency(totals.totalVat)}
          </span>
        );
      case "afterTax":
        return (
          <span className="font-semibold text-gray-900">
            {formatCurrency(totals.totalAfterTax)}
          </span>
        );
      default:
        return null;
    }
  };

  const TOTAL_KEYS = new Set(["preTax", "vat", "afterTax"]);
  const hasTotalRow = visibleColumns.some((c) => TOTAL_KEYS.has(c.key));

  return (
    <PermissionGate resource="invoices" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* Toolbar */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Hóa đơn VAT
            </h2>
            <div ref={advancedRef} className="relative">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Theo mã hóa đơn"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
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
                      ? "border-brand bg-brand-soft text-brand"
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
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
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
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
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
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />

                    {/* ── Expanded filters ── */}
                    {isExpanded && (
                      <>
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
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
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
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
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
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
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
                      className="px-4 py-1.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark">
                      Tìm kiếm
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Misa status filter */}
            <div ref={misaFilterRef} className="relative">
              <button
                onClick={() => setShowMisaFilter((p) => !p)}
                className={`px-3 py-1.5 border rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                  misaStatusFilter.length > 0
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}>
                Trạng thái Misa
                {misaStatusFilter.length > 0 && (
                  <span className="bg-brand text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {misaStatusFilter.length}
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showMisaFilter ? "rotate-180" : ""}`}
                />
              </button>
              {showMisaFilter && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-48 p-2">
                  {MISA_STATUS_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={misaStatusFilter.includes(opt.value)}
                        onChange={() => toggleMisaStatus(opt.value)}
                        className="accent-brand"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                  {misaStatusFilter.length > 0 && (
                    <button
                      onClick={() => setMisaStatusFilter([])}
                      className="w-full mt-1 text-xs text-brand hover:text-brand-dark py-1">
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PermissionGate resource="vat_invoices" action="push">
              <button
                onClick={handleBulkPush}
                disabled={
                  selectedIds.length === 0 || createVouchersBulk.isPending
                }
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {createVouchersBulk.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                Đẩy Misa
                {selectedIds.length > 0 && (
                  <span className="bg-white/25 text-white text-[11px] font-bold rounded-full px-1.5 min-w-[18px] text-center">
                    {selectedIds.length}
                  </span>
                )}
              </button>
            </PermissionGate>

            <PermissionGate resource="vat_invoices" action="push">
              <button
                onClick={handleRetry}
                disabled={retryVouchers.isPending}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                {retryVouchers.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Retry FAILED
              </button>
            </PermissionGate>

            <ColumnToggle columns={columns} onToggle={toggleColumn} />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left w-10 sticky left-0 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="cursor-pointer accent-brand"
                  />
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide ${
                      SORTABLE_COLUMNS.has(col.key)
                        ? "cursor-pointer select-none hover:bg-gray-100"
                        : ""
                    }`}
                    style={{ width: col.width, minWidth: col.width }}
                    onClick={() => handleSort(col.key)}>
                    <span className="flex items-center gap-1">
                      {col.label}
                      {SORTABLE_COLUMNS.has(col.key) && (
                        <span className="inline-flex text-gray-400">
                          {sortBy === col.key && sortDir === "desc" ? (
                            <ArrowDown className="w-3 h-3 text-brand" />
                          ) : sortBy === col.key && sortDir === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-brand" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {hasTotalRow && (
                <tr className="bg-gray-50/60 border-b">
                  <td className="px-4 py-2.5 sticky left-0 bg-gray-50/60" />
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-2.5 whitespace-nowrap"
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                      }}>
                      {renderTotalCell(col.key)}
                    </td>
                  ))}
                  <td className="px-4 py-2.5" />
                </tr>
              )}
              {isLoading ? (
                <tr>
                  <td colSpan={colSpan} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
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
                          ? "bg-brand-soft"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(invoice.id)}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedInvoiceId === invoice.id
                            ? "bg-brand-soft border-t-2 border-l-2 border-brand"
                            : "bg-white"
                        }`}
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(invoice.id)}
                          onChange={() => toggleSelect(invoice.id)}
                    className="cursor-pointer accent-brand"
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 ${
                            expandedInvoiceId === invoice.id
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
                          {col.render(invoice)}
                        </td>
                      ))}
                      <td
                        className={`px-4 py-2.5 ${
                          expandedInvoiceId === invoice.id
                            ? "border-t-2 border-r-2 border-brand"
                            : ""
                        }`}
                        onClick={(e) => e.stopPropagation()}>
                        {canRowAction && (
                          <div className="relative">
                            <button
                              onClick={() =>
                                setOpenActionId((prev) =>
                                  prev === invoice.id ? null : invoice.id
                                )
                              }
                              className="p-1 rounded hover:bg-gray-100 text-gray-500">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openActionId === invoice.id && (
                              <div
                                ref={actionRef}
                                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 w-44 overflow-hidden">
                                <PermissionGate
                                  resource="vat_invoices"
                                  action="push">
                                  <button
                                    onClick={() => handlePush(invoice)}
                                    disabled={createVoucher.isPending}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50">
                                    <UploadCloud className="w-4 h-4 text-brand" />
                                    Đẩy Misa
                                  </button>
                                </PermissionGate>
                                <PermissionGate
                                  resource="vat_invoices"
                                  action="delete">
                                  <button
                                    onClick={() => handleDelete(invoice)}
                                    disabled={deleteVoucher.isPending}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50 text-red-600 disabled:opacity-50">
                                    <Trash2 className="w-4 h-4" />
                                    Xóa chứng từ
                                  </button>
                                </PermissionGate>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedInvoiceId === invoice.id && (
                      <HoaDonVatDetailRow
                        invoiceId={invoice.id}
                        colSpan={colSpan}
                        buyerInfo={getBuyerInfo(invoice)}
                        onBuyerInfoChange={(next) =>
                          setBuyerInfo(invoice.id, next)
                        }
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
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronsLeft className="w-4 h-4" />
            </button>
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
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs text-gray-400">
            Trang {page}/{totalPages}
            {total > 0 ? ` • ${total.toLocaleString()} HĐ` : ""}
          </span>
        </div>
      </div>
    </PermissionGate>
  );
}
