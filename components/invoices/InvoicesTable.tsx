"use client";

import { useState, useEffect, Fragment, useMemo, useRef } from "react";
import { useExportInvoices, useInvoices, useInvoicesTotals } from "@/lib/hooks/useInvoices";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import type { CustomerSearchResult } from "@/lib/types/customer";
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
  Download,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertTriangle,
} from "lucide-react";
import type { Invoice } from "@/lib/types/invoice";
import { InvoiceDetailRow } from "./InvoiceDetailRow";
import { formatCurrency } from "@/lib/utils";
import { InvoiceImportModal } from "./InvoiceImportModal";
import { PermissionGate } from "../permissions/PermissionGate";
import { CodeLink } from "../shared/CodeLink";
import { useInvoicePriceBookWarnings } from "@/lib/hooks/useInvoicePriceBookWarnings";

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
      <CodeLink entity="invoice" code={inv.code} />
    ),
  },
  {
    key: "order",
    label: "Đơn hàng",
    visible: true,
    width: "140px",
    render: (inv) =>
      inv.order?.code ? (
        <CodeLink entity="order" code={inv.order.code} />
      ) : (
        "-"
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
    render: (inv) =>
      inv.customer?.code ? (
        <CodeLink entity="customer" code={inv.customer.code} />
      ) : (
        "-"
      ),
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

const EXPORT_DETAIL_COLUMNS = [
  { key: "branchName", label: "Chi nhánh" },
  { key: "invoiceCode", label: "Mã hóa đơn" },
  { key: "purchaseDate", label: "Thời gian" },
  { key: "createdAt", label: "Thời gian tạo" },
  { key: "updatedAt", label: "Ngày cập nhật" },
  { key: "orderCode", label: "Mã đặt hàng" },
  { key: "customerCode", label: "Mã khách hàng" },
  { key: "customerName", label: "Tên khách hàng" },
  { key: "customerPhone", label: "Điện thoại" },
  { key: "customerAddress", label: "Địa chỉ KH" },
  { key: "customerLocationName", label: "Khu vực KH" },
  { key: "customerWardName", label: "Phường-Xã KH" },
  { key: "priceBookName", label: "Bảng giá" },
  { key: "soldByName", label: "Người bán" },
  { key: "creatorName", label: "Người tạo" },
  { key: "deliveryReceiver", label: "Người nhận" },
  { key: "deliveryPhone", label: "ĐT người nhận" },
  { key: "deliveryAddress", label: "Địa chỉ giao" },
  { key: "deliveryLocationName", label: "Khu vực giao" },
  { key: "deliveryWardName", label: "Phường-Xã giao" },
  { key: "deliveryWeight", label: "Trọng lượng (gram)" },
  { key: "deliveryNote", label: "Ghi chú giao hàng" },
  { key: "description", label: "Ghi chú" },
  { key: "totalAmount", label: "Tổng tiền hàng" },
  { key: "discount", label: "Giảm giá HĐ" },
  { key: "grandTotal", label: "Khách cần trả" },
  { key: "paidAmount", label: "Khách đã trả" },
  { key: "cashPayment", label: "Tiền mặt" },
  { key: "cardPayment", label: "Thẻ" },
  { key: "walletPayment", label: "Ví" },
  { key: "bankTransferPayment", label: "Chuyển khoản" },
  { key: "rewardPoint", label: "Điểm" },
  { key: "voucherAmount", label: "Voucher" },
  { key: "voucherCode", label: "Mã voucher" },
  { key: "codAmount", label: "Còn cần thu (COD)" },
  { key: "statusValue", label: "Trạng thái" },
  { key: "productCode", label: "Mã hàng" },
  { key: "productName", label: "Tên hàng" },
  { key: "productNote", label: "Ghi chú hàng hóa" },
  { key: "quantity", label: "Số lượng" },
  { key: "unitPrice", label: "Đơn giá" },
  { key: "detailDiscountRatio", label: "Giảm giá %" },
  { key: "detailDiscount", label: "Giảm giá (chi tiết)" },
  { key: "sellingPrice", label: "Giá bán" },
  { key: "totalPrice", label: "Thành tiền" },
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
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showExportDetailModal, setShowExportDetailModal] = useState(false);
  const [exportDetailCols, setExportDetailCols] = useState<string[]>(
    EXPORT_DETAIL_COLUMNS.map((c) => c.key)
  );
  const exportRef = useRef<HTMLDivElement>(null);

  const {
    exportOverview,
    exportDetail,
    isExportingOverview,
    isExportingDetail,
  } = useExportInvoices();
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const advancedRef = useRef<HTMLDivElement>(null);
  const [advancedSearch, setAdvancedSearch] = useState({
    invoiceCodeSearch: "",
    productSearch: "",
    deliveryCodeSearch: "",
    orderCodeSearch: "",
    descriptionSearch: "",
    productNoteSearch: "",
  });
  const [tempAdvanced, setTempAdvanced] = useState({
    invoiceCodeSearch: "",
    productSearch: "",
    deliveryCodeSearch: "",
    orderCodeSearch: "",
    descriptionSearch: "",
    productNoteSearch: "",
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  // ── Khách hàng: autocomplete theo tên (giống ban-hang) ──
  // Chọn 1 khách → lọc hóa đơn theo customerIds. Vẫn tuân theo filter chi nhánh
  // vì query đã kèm branchIds (sidebar) + header X-Branch-Id (apiClient).
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSearchResult | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerQueryDebounced, setCustomerQueryDebounced] = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const customerDropRef = useRef<HTMLDivElement>(null);
  const { data: customerSearchData } = useSearchCustomers(
    customerQueryDebounced || undefined
  );
  const customerResults: CustomerSearchResult[] =
    customerSearchData?.data || [];

  const SORTABLE_COLUMNS = new Set([
    "purchaseDate",
    "createTime",
    "updateDate",
    "customerDebt",
    "customerPaid",
    "returnOrderAmount",
    "cashRefundAmount",
    "debtOffsetAmount",
    "remainingAmount",
  ]);

  // Map column key -> orderBy param gửi lên backend
  const COLUMN_ORDER_BY: Record<string, string> = {
    purchaseDate: "purchaseDate",
    createTime: "createdAt",
    updateDate: "updatedAt",
    customerDebt: "grandTotal",
    customerPaid: "paidAmount",
    returnOrderAmount: "returnOrderAmount",
    cashRefundAmount: "cashRefundAmount",
    debtOffsetAmount: "debtOffsetAmount",
    remainingAmount: "remainingAmount",
  };

  const handleSort = (colKey: string) => {
    if (!SORTABLE_COLUMNS.has(colKey)) return;
    if (sortBy !== colKey) {
      // Lần đầu click cột mới: desc
      setSortBy(colKey);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      // Lần 2: asc
      setSortDir("asc");
    } else {
      // Lần 3: reset về default
      setSortBy(null);
      setSortDir(null);
    }
    setPage(1);
  };

  const advancedFilterCount = useMemo(() => {
    return (
      Object.values(advancedSearch).filter(Boolean).length +
      (selectedCustomer ? 1 : 0)
    );
  }, [advancedSearch, selectedCustomer]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Debounce ô tìm khách hàng (giống CustomerSearch ban-hang)
  useEffect(() => {
    const t = setTimeout(() => setCustomerQueryDebounced(customerQuery), 300);
    return () => clearTimeout(t);
  }, [customerQuery]);

  // Đóng dropdown khách hàng khi click ra ngoài
  useEffect(() => {
    if (!showCustomerDrop) return;
    const h = (e: MouseEvent) => {
      if (
        customerDropRef.current &&
        !customerDropRef.current.contains(e.target as Node)
      ) {
        setShowCustomerDrop(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showCustomerDrop]);

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
  }, [debouncedSearch, filters, activeStatusTab, advancedSearch, selectedCustomer]);

  // Tab override sidebar status — chỉ khi tab khác "all" VÀ sidebar không gửi multi-status
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab !== "all" && (!f.statusIds || f.statusIds.length <= 1))
      f.statusIds = [Number(activeStatusTab)];
    return f;
  }, [filters, activeStatusTab]);

  // Sync tab với sidebar — chỉ sync khi sidebar chọn đúng 1 status
  useEffect(() => {
    const ids = filters.statusIds;
    if (ids && ids.length === 1) {
      if (String(ids[0]) !== activeStatusTab)
        setActiveStatusTab(String(ids[0]));
    } else {
      if (activeStatusTab !== "all") setActiveStatusTab("all");
    }
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
    ...(selectedCustomer && {
      customerIds: [selectedCustomer.id],
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

  // Tổng các cột tiền của TOÀN BỘ hóa đơn match filter — không phụ thuộc page/limit/sort.
  const { data: totals } = useInvoicesTotals({
    search: debouncedSearch,
    ...effectiveFilters,
    ...(advancedSearch.invoiceCodeSearch && {
      invoiceCodeSearch: advancedSearch.invoiceCodeSearch,
    }),
    ...(advancedSearch.productSearch && {
      productSearch: advancedSearch.productSearch,
    }),
    ...(selectedCustomer && {
      customerIds: [selectedCustomer.id],
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

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (baoDonRef.current && !baoDonRef.current.contains(e.target as Node))
        setShowBaoDonDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node))
        setShowExportDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const invoices = data?.data || [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Hóa đơn nào (bảng giá 2/3) có giá thực bán thấp hơn giá niêm yết → cảnh báo.
  const priceWarningIds = useInvoicePriceBookWarnings(invoices);

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

  const handleExportOverview = async () => {
    setShowExportDropdown(false);
    const currentFilters = {
      ...effectiveFilters,
      search: debouncedSearch,
      ...advancedSearch,
      ...(selectedCustomer && { customerIds: [selectedCustomer.id] }),
    };
    await exportOverview(currentFilters);
  };

  const handleExportDetailConfirm = async () => {
    setShowExportDetailModal(false);
    const currentFilters = {
      ...effectiveFilters,
      search: debouncedSearch,
      ...advancedSearch,
      ...(selectedCustomer && { customerIds: [selectedCustomer.id] }),
    };
    await exportDetail(currentFilters, exportDetailCols);
  };

  const toggleExportCol = (key: string) =>
    setExportDetailCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const toggleAllExportCols = () =>
    setExportDetailCols(
      exportDetailCols.length === EXPORT_DETAIL_COLUMNS.length
        ? []
        : EXPORT_DETAIL_COLUMNS.map((c) => c.key)
    );

  // +1 checkbox, +1 cột cảnh báo (ngầm), +1 cột chevron mở rộng
  const colSpan = visibleColumns.length + 3;

  // Map cột → giá trị tổng tương ứng. Chỉ những cột có ý nghĩa cộng tổng
  // mới render số; các cột còn lại để trống (cell vẫn tồn tại để giữ layout).
  const renderTotalCell = (key: string): React.ReactNode => {
    if (!totals) return null;
    switch (key) {
      case "totalAmount":
        return (
          <span className="font-semibold text-gray-900">
            {formatCurrency(totals.totalAmount)}
          </span>
        );
      case "grandTotal":
        return (
          <span className="font-semibold text-gray-900">
            {formatCurrency(totals.grandTotal)}
          </span>
        );
      case "customerDebt":
        return (
          <span className="font-semibold text-gray-900">
            {formatCurrency(totals.customerDebt)}
          </span>
        );
      case "customerPaid":
        return (
          <span className="font-semibold text-green-700">
            {formatCurrency(totals.paidAmount)}
          </span>
        );
      case "returnOrderAmount":
        return (
          <span className="font-semibold text-gray-900">
            {formatCurrency(totals.returnOrderAmount)}
          </span>
        );
      case "cashRefundAmount": {
        const a = totals.cashRefundAmount;
        const d = a > 0 ? -a : a;
        return (
          <span
            className={`font-semibold ${d < 0 ? "text-red-600" : "text-gray-900"}`}>
            {formatCurrency(d)}
          </span>
        );
      }
      case "debtOffsetAmount": {
        const a = totals.debtOffsetAmount;
        const d = a > 0 ? -a : a;
        return (
          <span
            className={`font-semibold ${d < 0 ? "text-red-600" : "text-gray-900"}`}>
            {formatCurrency(d)}
          </span>
        );
      }
      case "remainingAmount": {
        const a = totals.remainingAmount;
        if (a > 0)
          return (
            <span className="font-semibold text-orange-600">
              {formatCurrency(a)}
            </span>
          );
        if (a < 0)
          return (
            <span className="font-semibold text-red-600">
              {formatCurrency(a)}
            </span>
          );
        return (
          <span className="font-semibold text-green-600">
            {formatCurrency(a)}
          </span>
        );
      }
      case "codAmount":
        return (
          <span className="font-semibold text-gray-900">
            {formatCurrency(totals.debtAmount)}
          </span>
        );
      default:
        return null;
    }
  };

  // Có ít nhất 1 cột tiền đang hiển thị thì mới render row tổng.
  const TOTAL_KEYS = new Set([
    "totalAmount",
    "grandTotal",
    "customerDebt",
    "customerPaid",
    "returnOrderAmount",
    "cashRefundAmount",
    "debtOffsetAmount",
    "remainingAmount",
    "codAmount",
  ]);
  const hasTotalRow = visibleColumns.some((c) => TOTAL_KEYS.has(c.key));

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
                    {/* ── Khách hàng: autocomplete theo tên (giống ban-hang) ── */}
                    <div ref={customerDropRef} className="relative">
                      {selectedCustomer ? (
                        <div className="w-full flex items-center justify-between gap-2 border border-blue-300 bg-blue-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-blue-700 font-medium truncate">
                            {selectedCustomer.name}
                            {selectedCustomer.code && (
                              <span className="text-blue-400 ml-1 font-normal">
                                ({selectedCustomer.code})
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(null);
                              setCustomerQuery("");
                            }}
                            className="text-blue-400 hover:text-blue-600 flex-shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Theo tên khách hàng"
                          value={customerQuery}
                          onChange={(e) => {
                            setCustomerQuery(e.target.value);
                            setShowCustomerDrop(true);
                          }}
                          onFocus={() => customerQuery && setShowCustomerDrop(true)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                      {showCustomerDrop &&
                        !selectedCustomer &&
                        customerResults.length > 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {customerResults.map((c, idx) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setCustomerQuery("");
                                  setShowCustomerDrop(false);
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors ${
                                  idx > 0 ? "border-t border-gray-50" : ""
                                }`}>
                                <div className="text-sm font-medium text-gray-800">
                                  {c.name}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {c.code ? `Mã: ${c.code}` : "Chưa có mã"}
                                  {c.contactNumber ? ` · ${c.contactNumber}` : ""}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>

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

            <PermissionGate resource="invoices" action="create">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                Import
              </button>
            </PermissionGate>

            <div ref={exportRef} className="relative">
              <button
                onClick={() => setShowExportDropdown((p) => !p)}
                disabled={isExportingOverview || isExportingDetail}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                {isExportingOverview || isExportingDetail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Xuất file
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showExportDropdown ? "rotate-180" : ""}`}
                />
              </button>
              {showExportDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-44 overflow-hidden">
                  <button
                    onClick={handleExportOverview}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                    Tổng quan
                  </button>
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      setShowExportDetailModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-100">
                    Chi tiết (chọn cột)
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
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
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
                {/* Cột ngầm cảnh báo lệch giá — luôn giữ chỗ để không thụt mã hóa đơn */}
                <th className="w-8 px-2 py-2.5" />
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
                            <ArrowDown className="w-3 h-3 text-blue-500" />
                          ) : sortBy === col.key && sortDir === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-blue-500" />
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
                  <td className="w-8 px-2 py-2.5" />
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
                      {/* Cột ngầm cảnh báo lệch giá bảng giá 2/3 */}
                      <td
                        className={`w-8 px-2 py-2.5 text-center ${
                          expandedInvoiceId === invoice.id
                            ? "border-t-2 border-blue-500"
                            : ""
                        }`}>
                        {priceWarningIds.has(invoice.id) && (
                          <span
                            title="Có sản phẩm bán thấp hơn giá niêm yết của bảng giá"
                            className="inline-flex">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 fill-yellow-100" />
                          </span>
                        )}
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

      {showExportDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-[540px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-base font-semibold text-gray-800">
                Chọn cột xuất chi tiết
              </h3>
              <button
                onClick={() => setShowExportDetailModal(false)}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chọn/Bỏ tất cả */}
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <button
                onClick={toggleAllExportCols}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                {exportDetailCols.length === EXPORT_DETAIL_COLUMNS.length
                  ? "Bỏ tất cả"
                  : "Chọn tất cả"}
              </button>
              <span className="text-xs text-gray-400">
                ({exportDetailCols.length}/{EXPORT_DETAIL_COLUMNS.length} cột)
              </span>
            </div>

            {/* Danh sách cột */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-1">
              {EXPORT_DETAIL_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportDetailCols.includes(col.key)}
                    onChange={() => toggleExportCol(col.key)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{col.label}</span>
                </label>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowExportDetailModal(false)}
                className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Hủy
              </button>
              <button
                onClick={handleExportDetailConfirm}
                disabled={exportDetailCols.length === 0 || isExportingDetail}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
                {isExportingDetail && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Xuất {exportDetailCols.length} cột
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <InvoiceImportModal onClose={() => setShowImportModal(false)} />
      )}
    </PermissionGate>
  );
}
