"use client";

import { useState, useEffect, Fragment, useMemo, useRef } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useOrdersPendingSummary } from "@/lib/hooks/useOrders";
import { useOrderSuppliersConfirmedSummary } from "@/lib/hooks/useOrderSuppliers";
import { useConsignmentSummary } from "@/lib/hooks/useConsignments";
import { useBranchStore } from "@/lib/store/branch";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import type { Product } from "@/lib/api/products";
import { ProductDetailRow } from "./ProductDetailRow";
import { ProductForm } from "./ProductForm";
import { ComboProductForm } from "./ComboProductForm";
import { ManufacturingProductForm } from "./ManufacturingProductForm";
import { ProductCustomerOrdersModal } from "./ProductCustomerOrdersModal";
import { ProductSupplierOrdersModal } from "./ProductSupplierOrdersModal";
import { ProductConsignmentsModal } from "./ProductConsignmentsModal";
import { ProductExportModal } from "./ProductExportModal";
import { usePermission } from "@/lib/hooks/usePermissions";
import { CodeLink } from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

interface ProductsTableProps {
  filters: any;
  codeFilter?: string;
  onImportClick?: () => void;
}

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Ngừng hoạt động" },
];

const getProductTypeLabel = (type: number) => {
  switch (type) {
    case 1:
      return "Combo - đóng gói";
    case 2:
      return "Hàng hóa";
    case 3:
      return "Dịch vụ";
    case 4:
      return "Hàng sản xuất";
    default:
      return "Hàng hóa";
  }
};

const calculateComboPurchasePrice = (product: Product): number => {
  if (!product.comboComponents) return 0;
  const selectedBranchId = useBranchStore.getState().selectedBranch?.id;
  return product.comboComponents.reduce((sum, comp) => {
    const componentProduct = comp.componentProduct;
    if (!componentProduct) return sum;
    const inventory = componentProduct.inventories?.find(
      (inv) => inv.branchId === selectedBranchId
    );
    const cost = inventory ? Number(inventory.cost) : 0;
    return sum + cost * Number(comp.quantity || 0);
  }, 0);
};

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

interface ProductColumnCtx {
  pendingMap: Record<string | number, number>;
  onOpenPending: (product: Product) => void;
  supplierMap: Record<string | number, number>;
  onOpenSupplier: (product: Product) => void;
  consignmentMap: Record<string | number, number>;
  onOpenConsignment: (product: Product) => void;
}

const DEFAULT_COLUMNS: ColumnConfig<Product, ProductColumnCtx>[] = [
  {
    key: "image",
    label: "Hình ảnh",
    visible: true,
    width: "60px",
    render: (product) =>
      product.images?.[0] ? (
        <img
          src={product.images[0].image}
          alt={product.name}
          className="w-10 h-10 object-cover rounded"
        />
      ) : (
        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs">
          N/A
        </div>
      ),
  },
  {
    key: "code",
    label: "Mã hàng",
    visible: true,
    width: "130px",
    render: (product) => <CodeLink entity="product" code={product.code} />,
  },
  {
    key: "name",
    label: "Tên hàng",
    visible: true,
    width: "200px",
    render: (product) => product.name,
  },
  {
    key: "parentName",
    label: "Loại Hàng",
    visible: true,
    width: "140px",
    render: (product) => product.parentName || "-",
  },
  {
    key: "middleName",
    label: "Nguồn Gốc",
    visible: true,
    width: "140px",
    render: (product) => product.middleName || "-",
  },
  {
    key: "childName",
    label: "Danh Mục",
    visible: true,
    width: "140px",
    render: (product) => product.childName || "-",
  },
  {
    key: "type",
    label: "Loại sản phẩm",
    visible: true,
    width: "140px",
    render: (product) => getProductTypeLabel(product.type),
  },
  {
    key: "basePrice",
    label: "Giá bán",
    visible: true,
    width: "120px",
    render: (product) => Number(product.basePrice).toLocaleString() + " đ",
  },
  {
    key: "inventory.cost",
    label: "Giá vốn",
    visible: true,
    width: "120px",
    render: (product) => {
      if (product.type === 1) {
        return calculateComboPurchasePrice(product).toLocaleString() + " đ";
      }
      const selectedBranchId = useBranchStore.getState().selectedBranch?.id;
      const inventory = product.inventories?.find(
        (inv) => inv.branchId === selectedBranchId
      );
      return (inventory ? Number(inventory.cost) : 0).toLocaleString() + " đ";
    },
  },
  {
    key: "tradeMark",
    label: "Thương hiệu",
    visible: false,
    width: "140px",
    render: (product) => product.tradeMark?.name || "-",
  },
  {
    key: "stock",
    label: "Tồn kho",
    visible: true,
    width: "100px",
    render: (product) => {
      const selectedBranchId = useBranchStore.getState().selectedBranch?.id;
      if (selectedBranchId) {
        const inventory = product.inventories?.find(
          (inv) => inv.branchId === selectedBranchId
        );
        return inventory ? Number(inventory.onHand).toLocaleString() : "0";
      }
      const totalStock =
        product.inventories?.reduce(
          (sum, inv) => sum + Number(inv.onHand),
          0
        ) || 0;
      return totalStock.toLocaleString();
    },
  },
  // {
  //   key: "channelLink",
  //   label: "Liên kết kênh bán",
  //   visible: false,
  //   width: "140px",
  //   render: () => "-",
  // },
  {
    key: "customerOrder",
    label: "Khách đặt",
    visible: false,
    width: "100px",
    render: (product, ctx) => {
      const total = ctx?.pendingMap?.[product.id] ?? 0;
      const display = total.toLocaleString();
      if (total <= 0) {
        return <span className="text-gray-500">{display}</span>;
      }
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            ctx?.onOpenPending(product);
          }}
          className="text-brand hover:underline font-medium">
          {display}
        </button>
      );
    },
  },
  {
    key: "customerReserved",
    label: "Đặt NCC",
    visible: false,
    width: "100px",
    render: (product, ctx) => {
      const total = ctx?.supplierMap?.[product.id] ?? 0;
      const display = total.toLocaleString();
      if (total <= 0) {
        return <span className="text-gray-500">{display}</span>;
      }
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            ctx?.onOpenSupplier(product);
          }}
          className="text-brand hover:underline font-medium">
          {display}
        </button>
      );
    },
  },
  {
    key: "consignment",
    label: "Ký gửi",
    visible: false,
    width: "100px",
    render: (product, ctx) => {
      const total = ctx?.consignmentMap?.[product.id] ?? 0;
      const display = total.toLocaleString();
      if (total <= 0) {
        return <span className="text-gray-500">{display}</span>;
      }
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            ctx?.onOpenConsignment(product);
          }}
          className="text-brand hover:underline font-medium">
          {display}
        </button>
      );
    },
  },
  {
    key: "createdAt",
    label: "Thời gian tạo",
    visible: false,
    width: "160px",
    render: (product) => formatDateTime(product.createdAt),
  },
  {
    key: "updatedAt",
    label: "Thời gian cập nhật",
    visible: false,
    width: "160px",
    render: (product) => formatDateTime(product.updatedAt),
  },
  {
    key: "minStock",
    label: "Định mức tồn ít nhất",
    visible: false,
    width: "160px",
    render: (product) => {
      const selectedBranchId = useBranchStore.getState().selectedBranch?.id;
      const inventory = product.inventories?.find(
        (inv) => inv.branchId === selectedBranchId
      );
      return inventory ? Number(inventory.minQuality).toLocaleString() : "0";
    },
  },
  {
    key: "maxStock",
    label: "Định mức tồn nhiều nhất",
    visible: false,
    width: "160px",
    render: (product) => {
      const selectedBranchId = useBranchStore.getState().selectedBranch?.id;
      const inventory = product.inventories?.find(
        (inv) => inv.branchId === selectedBranchId
      );
      return inventory ? Number(inventory.maxQuality).toLocaleString() : "0";
    },
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: false,
    width: "120px",
    render: (product) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          product.isActive
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}>
        {product.isActive ? "Hoạt động" : "Ngừng"}
      </span>
    ),
  },
  {
    key: "rewardPoint",
    label: "Tích điểm",
    visible: false,
    width: "100px",
    render: (product) => (product.isRewardPoint ? "Có" : "Không"),
  },
];

export function ProductsTable({
  filters,
  codeFilter,
  onImportClick,
}: ProductsTableProps) {
  const { selectedBranch } = useBranchStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(
    null
  );
  const [showExportModal, setShowExportModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("active");

  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  // Các cột số được phép sắp xếp (server-side). Key khớp với column key,
  // value là tên trường backend hiểu trong query `orderBy`.
  const SORTABLE_COLUMNS: Record<string, string> = {
    basePrice: "basePrice",
    "inventory.cost": "cost",
    stock: "onHand",
    minStock: "minQuality",
    maxStock: "maxQuality",
  };

  const handleSort = (colKey: string) => {
    if (!SORTABLE_COLUMNS[colKey]) return;
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

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [productType, setProductType] = useState<number | null>(null);
  const createDropdownRef = useRef<HTMLDivElement>(null);

  const canCreate = usePermission("products", "create");
  const canViewCostPrice = usePermission("products", "view_cost_price");
  const canViewSalePrice = usePermission("products", "view_sale_price");
  const canExport = usePermission("products", "export");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page khi filter/search/tab đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab]);

  // Tab override sidebar status
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab === "active") f.isActive = true;
    else if (activeStatusTab === "inactive") f.isActive = false;
    else delete f.isActive; // "all" → bỏ filter trạng thái, lấy tất cả
    return f;
  }, [filters, activeStatusTab]);

  // Sync tab với filters (nguồn sự thật từ sidebar/page).
  // Phụ thuộc cả object `filters` (mỗi onFiltersChange tạo object mới, kể cả
  // "Xóa tất cả" emit {}), nên tab luôn reset đúng theo trạng thái filters.
  useEffect(() => {
    const isActive = filters.isActive;
    if (isActive === true) setActiveStatusTab("active");
    else if (isActive === false) setActiveStatusTab("inactive");
    else setActiveStatusTab("all");
  }, [filters]);

  const { columns, toggleColumn } = useColumnVisibility<Product, ProductColumnCtx>(
    "productTableColumnsV2",
    DEFAULT_COLUMNS
  );

  const displayColumns = useMemo(
    () =>
      columns.filter((c) => {
        if (c.key === "inventory.cost" && !canViewCostPrice) return false;
        if (c.key === "basePrice" && !canViewSalePrice) return false;
        return true;
      }),
    [columns, canViewCostPrice, canViewSalePrice]
  );

  const { data, isLoading } = useProducts({
    page,
    limit,
    search: codeFilter || debouncedSearch,
    branchId: selectedBranch?.id,
    ...effectiveFilters,
    ...(sortBy && sortDir && SORTABLE_COLUMNS[sortBy]
      ? {
          orderBy: SORTABLE_COLUMNS[sortBy],
          orderDirection: sortDir,
        }
      : {}),
  });

  // Đóng dropdown tạo mới khi click ngoài
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        createDropdownRef.current &&
        !createDropdownRef.current.contains(e.target as Node)
      )
        setShowCreateDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const products = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const visibleColumns = useMemo(
    () => displayColumns.filter((c) => c.visible),
    [displayColumns]
  );

  const isCustomerOrderColumnVisible = useMemo(
    () => visibleColumns.some((c) => c.key === "customerOrder"),
    [visibleColumns]
  );

  const isSupplierOrderColumnVisible = useMemo(
    () => visibleColumns.some((c) => c.key === "customerReserved"),
    [visibleColumns]
  );

  // Chỉ fetch summary "Khách đặt" khi cột đang hiển thị, gom theo trang hiện tại.
  const productIdsForPending = useMemo(
    () => (isCustomerOrderColumnVisible ? products.map((p) => p.id) : []),
    [isCustomerOrderColumnVisible, products]
  );

  const { data: pendingSummary } = useOrdersPendingSummary(
    productIdsForPending,
    selectedBranch?.id,
    { silentForbidden: true }
  );
  const pendingMap = pendingSummary || {};

  // Chỉ fetch summary "Đặt NCC" khi cột đang hiển thị, gom theo trang hiện tại.
  const productIdsForSupplier = useMemo(
    () => (isSupplierOrderColumnVisible ? products.map((p) => p.id) : []),
    [isSupplierOrderColumnVisible, products]
  );

  const { data: supplierSummary } = useOrderSuppliersConfirmedSummary(
    productIdsForSupplier,
    selectedBranch?.id,
    { silentForbidden: true }
  );
  const supplierMap = supplierSummary || {};

  // Chỉ fetch summary "Ký gửi" khi cột đang hiển thị, gom theo trang hiện tại.
  const isConsignmentColumnVisible = useMemo(
    () => visibleColumns.some((c) => c.key === "consignment"),
    [visibleColumns]
  );

  const productIdsForConsignment = useMemo(
    () => (isConsignmentColumnVisible ? products.map((p) => p.id) : []),
    [isConsignmentColumnVisible, products]
  );

  const { data: consignmentSummary } = useConsignmentSummary(
    productIdsForConsignment,
    selectedBranch?.id,
    { silentForbidden: true }
  );
  const consignmentMap = consignmentSummary || {};

  const [pendingModalProduct, setPendingModalProduct] =
    useState<Product | null>(null);

  const [supplierModalProduct, setSupplierModalProduct] =
    useState<Product | null>(null);

  const [consignmentModalProduct, setConsignmentModalProduct] =
    useState<Product | null>(null);

  const colSpan = visibleColumns.length + 2; // +checkbox +chevron

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === products.length ? [] : products.map((p) => p.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedProductId((prev) => (prev === id ? null : id));

  const handleCreateProduct = (type: number) => {
    setProductType(type);
    setShowCreateForm(true);
    setShowCreateDropdown(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {canCreate && (
            <div className="relative" ref={createDropdownRef}>
              <button
                onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark flex items-center gap-2 text-sm font-medium">
                <Plus className="w-4 h-4" />
                Tạo mới
              </button>
              {showCreateDropdown && (
                <div className="absolute top-full mt-1 bg-white border rounded-lg shadow-lg min-w-[200px] z-50">
                  <button
                    onClick={() => handleCreateProduct(2)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                    Hàng hóa
                  </button>
                  <button
                    onClick={() => handleCreateProduct(3)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                    Dịch vụ
                  </button>
                  <button
                    onClick={() => handleCreateProduct(1)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                    Combo - đóng gói
                  </button>
                  <button
                    onClick={() => handleCreateProduct(4)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                    Hàng sản xuất
                  </button>
                </div>
              )}
            </div>
          )}
          <input
            type="text"
            placeholder="Theo mã, tên hàng"
            className="border rounded-lg px-3 py-2 w-64 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onImportClick}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-600">
            <Upload className="w-4 h-4" />
            Import
          </button>
          {canExport && (
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              Xuất file
            </button>
          )}
          <ColumnToggle columns={displayColumns} onToggle={toggleColumn} />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 px-4 pt-2 border-b shrink-0 bg-white">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveStatusTab(tab.value)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
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
        <table className="w-full text-sm" style={{ minWidth: "max-content" }}>
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left w-10 sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  checked={
                    products.length > 0 &&
                    selectedIds.length === products.length
                  }
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left font-medium text-gray-700 whitespace-nowrap ${
                    SORTABLE_COLUMNS[col.key]
                      ? "cursor-pointer select-none hover:bg-gray-100"
                      : ""
                  }`}
                  style={{
                    width: col.width,
                    minWidth: col.width,
                    maxWidth: col.width,
                  }}
                  onClick={() => handleSort(col.key)}>
                  <span className="flex items-center gap-1">
                    {col.label}
                    {SORTABLE_COLUMNS[col.key] && (
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
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
                    <span className="text-xs">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-20 text-center text-gray-400">
                  <div className="text-sm">Không có sản phẩm nào</div>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <Fragment key={product.id}>
                  <tr
                    className={`cursor-pointer transition-colors ${
                      expandedProductId === product.id
                        ? "bg-brand-soft"
                        : "border-b hover:bg-gray-50"
                    }`}
                    onClick={() => toggleExpand(product.id)}>
                    <td
                      className={`px-4 py-2.5 sticky left-0 z-10 ${
                        expandedProductId === product.id
                          ? "bg-brand-soft border-t-2 border-l-2 border-brand"
                          : "bg-white"
                      }`}
                      onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 ${
                          expandedProductId === product.id
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
                        {col.render(product, {
                          pendingMap,
                          onOpenPending: (p) => setPendingModalProduct(p),
                          supplierMap,
                          onOpenSupplier: (p) => setSupplierModalProduct(p),
                          consignmentMap,
                          onOpenConsignment: (p) =>
                            setConsignmentModalProduct(p),
                        })}
                      </td>
                    ))}
                    <td
                      className={`px-4 py-2.5 ${
                        expandedProductId === product.id
                          ? "border-t-2 border-r-2 border-brand"
                          : ""
                      }`}>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedProductId === product.id ? "rotate-180" : ""
                        }`}
                      />
                    </td>
                  </tr>
                  {expandedProductId === product.id && (
                    <ProductDetailRow
                      productId={product.id}
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
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-white">
            {[10, 15, 20, 50, 100].map((n) => (
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
          {total > 0 ? ` (${total} sản phẩm)` : ""}
        </span>
      </div>

      {/* Create Forms (modal) */}
      {showCreateForm && productType === 2 && (
        <ProductForm
          productType={2}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}
      {showCreateForm && productType === 3 && (
        <ProductForm
          productType={3}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}
      {showCreateForm && productType === 1 && (
        <ComboProductForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}
      {showCreateForm && productType === 4 && (
        <ManufacturingProductForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}

      {pendingModalProduct && (
        <ProductCustomerOrdersModal
          productId={pendingModalProduct.id}
          productName={pendingModalProduct.name}
          productCode={pendingModalProduct.code}
          onClose={() => setPendingModalProduct(null)}
        />
      )}

      {supplierModalProduct && (
        <ProductSupplierOrdersModal
          productId={supplierModalProduct.id}
          productName={supplierModalProduct.name}
          productCode={supplierModalProduct.code}
          branchId={selectedBranch?.id}
          branchName={selectedBranch?.name}
          onClose={() => setSupplierModalProduct(null)}
        />
      )}

      {consignmentModalProduct && (
        <ProductConsignmentsModal
          productId={consignmentModalProduct.id}
          productName={consignmentModalProduct.name}
          productCode={consignmentModalProduct.code}
          branchId={selectedBranch?.id}
          branchName={selectedBranch?.name}
          onClose={() => setConsignmentModalProduct(null)}
        />
      )}

      {showExportModal && (
        <ProductExportModal
          filters={{
            ...effectiveFilters,
            search: codeFilter || debouncedSearch || undefined,
          }}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
