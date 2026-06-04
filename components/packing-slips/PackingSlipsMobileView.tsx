"use client";

import { useState, useEffect, useMemo } from "react";
import { useAllPacking } from "@/lib/hooks/useAllPacking";
import { useBranchStore } from "@/lib/store/branch";
import { useBranches } from "@/lib/hooks/useBranches";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  Plus,
  SlidersHorizontal,
  Calendar,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Package,
  Truck,
  Boxes,
  Image as ImageIcon,
  Pencil,
  Trash2,
  ChevronDown,
  Send,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_TABS = [
  { value: "all", label: "Tất cả", apiType: undefined },
  { value: "giao-hang", label: "Giao hàng", apiType: "giao-hang" },
  { value: "dong-hang", label: "Đóng hàng", apiType: "dong-hang" },
  { value: "loading", label: "Loading", apiType: "loading" },
] as const;

const TYPE_BADGE: Record<
  string,
  { text: string; className: string; icon: any }
> = {
  "giao-hang": {
    text: "Giao hàng",
    className: "bg-green-100 text-green-700",
    icon: Truck,
  },
  "dong-hang": {
    text: "Đóng hàng",
    className: "bg-blue-100 text-blue-700",
    icon: Package,
  },
  loading: {
    text: "Loading",
    className: "bg-purple-100 text-purple-700",
    icon: Boxes,
  },
};

// ─── PackingMobileCard ────────────────────────────────────────────────────────
function PackingMobileCard({
  item,
  onClick,
}: {
  item: any;
  onClick: () => void;
}) {
  const typeKey = item.type || "giao-hang";
  const badge = TYPE_BADGE[typeKey];
  const Icon = badge.icon;
  const invoices = item.invoices || [];
  const imageCount = item.images?.length || 0;
  const customerNames = invoices
    .map((inv: any) => inv.invoice?.customer?.name)
    .filter(Boolean);
  const firstCustomer = customerNames[0];
  const extraCustomers = customerNames.length - 1;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-[0.98] transition-transform select-none">
      {/* Row 1: code + type badge */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-blue-600 font-bold text-[15px]">{item.code}</span>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
          <Icon className="w-3 h-3" />
          {badge.text}
        </div>
      </div>

      {/* Row 2: customer / branch */}
      <p className="font-semibold text-gray-900 text-sm leading-tight mb-1.5">
        {firstCustomer || item.branch?.name || "—"}
        {extraCustomers > 0 && (
          <span className="text-xs font-normal text-gray-400 ml-1">
            +{extraCustomers} khách
          </span>
        )}
      </p>

      {/* Row 3: meta — date + creator */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <Calendar className="w-3.5 h-3.5" />
        <span>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
        {item.creator?.name && (
          <>
            <span>·</span>
            <span className="truncate">{item.creator.name}</span>
          </>
        )}
      </div>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-gray-200 mb-3" />

      {/* Row 4: footer — số kiện + hóa đơn + ảnh + tiền (nếu có) */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Package className="w-3.5 h-3.5" />
            <span className="font-medium text-gray-700">
              {item.numberOfPackages} kiện
            </span>
          </div>
          {invoices.length > 0 && (
            <div className="text-xs text-gray-500">
              {invoices.length} hóa đơn
            </div>
          )}
          {imageCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <ImageIcon className="w-3.5 h-3.5" />
              {imageCount} hình
            </div>
          )}
        </div>

        {typeKey === "giao-hang" && (
          <div className="text-right">
            {item.paymentMethod === "cash" && Number(item.cashAmount) > 0 ? (
              <>
                <p className="text-xs text-gray-400 leading-none mb-0.5">
                  Tiền mặt
                </p>
                <p className="text-sm font-bold text-green-600 leading-none">
                  {formatCurrency(item.cashAmount)} đ
                </p>
              </>
            ) : item.paymentMethod === "transfer" ? (
              <p className="text-xs text-blue-600 font-medium">Chuyển khoản</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PackingMobileFilterSheet ─────────────────────────────────────────────────
function PackingMobileFilterSheet({
  filters,
  branches,
  onApply,
  onClose,
}: {
  filters: any;
  branches: any[];
  onApply: (f: any) => void;
  onClose: () => void;
}) {
  const [localBranchIds, setLocalBranchIds] = useState<number[]>(
    filters.branchIds || []
  );
  const [localInvoiceSearch, setLocalInvoiceSearch] = useState(
    filters.invoiceSearch || ""
  );
  const [localCustomerSearch, setLocalCustomerSearch] = useState(
    filters.customerSearch || ""
  );

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const toggleBranch = (id: number) => {
    setLocalBranchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    const next: any = {};
    if (localBranchIds.length > 0) next.branchIds = localBranchIds;
    if (localInvoiceSearch) next.invoiceSearch = localInvoiceSearch;
    if (localCustomerSearch) next.customerSearch = localCustomerSearch;
    onApply(next);
  };

  const handleReset = () => {
    setLocalBranchIds([]);
    setLocalInvoiceSearch("");
    setLocalCustomerSearch("");
  };

  const activeCount =
    (localBranchIds.length > 0 ? 1 : 0) +
    (localInvoiceSearch ? 1 : 0) +
    (localCustomerSearch ? 1 : 0);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">Bộ lọc</span>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                Xóa tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Mã hóa đơn */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Mã hóa đơn
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={localInvoiceSearch}
                onChange={(e) => setLocalInvoiceSearch(e.target.value)}
                placeholder="Tìm theo mã hóa đơn..."
                className="w-full pl-9 pr-8 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              {localInvoiceSearch && (
                <button
                  onClick={() => setLocalInvoiceSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Khách hàng */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Khách hàng
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={localCustomerSearch}
                onChange={(e) => setLocalCustomerSearch(e.target.value)}
                placeholder="Tìm theo tên khách hàng..."
                className="w-full pl-9 pr-8 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              {localCustomerSearch && (
                <button
                  onClick={() => setLocalCustomerSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Chi nhánh */}
          {branches.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Chi nhánh
              </p>
              <div className="flex flex-wrap gap-2">
                {branches.map((b) => {
                  const isActive = localBranchIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      onClick={() => toggleBranch(b.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                      }`}>
                      {isActive && <Check className="w-3.5 h-3.5" />}
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleApply}
            className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all">
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PackingMobileDetailSheet ─────────────────────────────────────────────────
function PackingMobileDetailSheet({
  item,
  onClose,
  onEdit,
  onDelete,
  onResend,
}: {
  item: any;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResend?: () => void;
}) {
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const typeKey = item.type || "giao-hang";
  const badge = TYPE_BADGE[typeKey];
  const Icon = badge.icon;
  const invoices = item.invoices || [];
  const images = item.images || [];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative bg-white rounded-t-3xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${badge.className}`}>
                <Icon className="w-3 h-3" />
                {badge.text}
              </div>
              <span className="text-base font-bold text-blue-600 truncate">
                {item.code}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Thông tin chung */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
              <Row label="Chi nhánh" value={item.branch?.name} />
              <Row label="Người tạo" value={item.creator?.name} />
              <Row
                label="Ngày tạo"
                value={new Date(item.createdAt).toLocaleString("vi-VN")}
              />
              <Row label="Số kiện" value={item.numberOfPackages} />
              {typeKey === "loading" && item.loadingBy?.name && (
                <Row label="Người loading" value={item.loadingBy.name} />
              )}
              {item.note && <Row label="Ghi chú" value={item.note} />}
            </div>

            {/* Thanh toán & phí (chỉ giao-hang) */}
            {typeKey === "giao-hang" && (
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  Thanh toán & phí
                </p>
                <Row
                  label="Hình thức"
                  value={
                    item.paymentMethod === "cash"
                      ? `Tiền mặt — ${formatCurrency(item.cashAmount)}đ`
                      : item.paymentMethod === "transfer"
                        ? "Chuyển khoản"
                        : "—"
                  }
                />
                {item.hasFeeGuiBen && (
                  <Row
                    label="Phí gửi bến"
                    value={`${formatCurrency(item.feeGuiBen)}đ`}
                  />
                )}
                {item.hasFeeGrab && (
                  <Row
                    label="Phí Grab"
                    value={`${formatCurrency(item.feeGrab)}đ`}
                  />
                )}
                {item.hasCuocGuiHang && (
                  <Row
                    label="Cước gửi hàng"
                    value={`${formatCurrency(item.cuocGuiHang)}đ`}
                  />
                )}
              </div>
            )}

            {/* Hóa đơn */}
            {invoices.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Hóa đơn ({invoices.length})
                </p>
                <div className="space-y-2">
                  {invoices.map((inv: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-3 border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-blue-600 text-sm">
                          {inv.invoice?.code}
                        </span>
                        {inv.invoice?.grandTotal != null && (
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(inv.invoice.grandTotal)}đ
                          </span>
                        )}
                      </div>
                      {inv.invoice?.customer?.name && (
                        <p className="text-xs text-gray-500">
                          {inv.invoice.customer.name}
                          {inv.invoice.customer.contactNumber && (
                            <span className="ml-2 text-gray-400">
                              · {inv.invoice.customer.contactNumber}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hình ảnh */}
            {images.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Hình ảnh ({images.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setViewingImage(img.imageUrl)}
                      className="aspect-square rounded-xl overflow-hidden bg-white border border-gray-200 active:scale-95 transition-transform">
                      <img
                        src={img.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="h-2" />
          </div>

          {/* Footer */}
          <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex-shrink-0 flex flex-col gap-2">
            {onResend && typeKey === "giao-hang" && (
              <button
                onClick={() => {
                  if (confirm("Gửi lại tin nhắn Zalo cho báo đơn này?")) {
                    onResend();
                  }
                }}
                className="w-full py-3 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-2xl font-semibold text-sm hover:bg-emerald-100 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
                <Send className="w-4 h-4" />
                Gửi lại Zalo
              </button>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirm("Bạn có chắc chắn muốn xóa báo đơn này?")) {
                    onDelete();
                  }
                }}
                className="flex-1 py-3 border border-red-200 text-red-600 rounded-2xl font-semibold text-sm hover:bg-red-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                Xóa
              </button>
              <button
                onClick={onEdit}
                className="flex-[2] py-3 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
                <Pencil className="w-4 h-4" />
                Sửa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}>
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white">
            <X className="w-6 h-6" />
          </button>
          <img
            src={viewingImage}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-gray-900 font-medium text-right break-words">
        {value}
      </span>
    </div>
  );
}

// ─── CreateActionSheet ────────────────────────────────────────────────────────
function CreateActionSheet({
  onSelect,
  onClose,
}: {
  onSelect: (type: "giao-hang" | "dong-hang" | "loading") => void;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const options: Array<{
    value: "giao-hang" | "dong-hang" | "loading";
    label: string;
    description: string;
    icon: any;
    bgClass: string;
    iconClass: string;
  }> = [
    {
      value: "giao-hang",
      label: "Giao hàng",
      description: "Tạo phiếu giao hàng",
      icon: Truck,
      bgClass: "bg-green-50",
      iconClass: "text-green-600",
    },
    {
      value: "dong-hang",
      label: "Đóng hàng",
      description: "Tạo phiếu đóng hàng",
      icon: Package,
      bgClass: "bg-blue-50",
      iconClass: "text-blue-600",
    },
    {
      value: "loading",
      label: "Loading",
      description: "Tạo phiếu lên xe",
      icon: Boxes,
      bgClass: "bg-purple-50",
      iconClass: "text-purple-600",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pb-3 pt-1 border-b border-gray-100">
          <p className="text-base font-bold text-gray-900">Tạo báo đơn</p>
        </div>

        <div className="p-3 space-y-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => onSelect(opt.value)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 active:scale-[0.98] transition-all text-left">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${opt.bgClass}`}>
                  <Icon className={`w-5 h-5 ${opt.iconClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500">{opt.description}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
              </button>
            );
          })}
        </div>

        <div className="px-3 pb-6 pt-1">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all">
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PackingSlipsMobileView (main export) ────────────────────────────────────
interface PackingSlipsMobileViewProps {
  onCreateGiaoHangClick: () => void;
  onCreateDongHangClick: () => void;
  onCreateLoadingClick: () => void;
  onEditClick: (item: any) => void;
  onDeleteClick: (id: number) => void;
  onResendClick?: (id: number) => void;
}

export function PackingSlipsMobileView({
  onCreateGiaoHangClick,
  onCreateDongHangClick,
  onCreateLoadingClick,
  onEditClick,
  onDeleteClick,
  onResendClick,
}: PackingSlipsMobileViewProps) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const activeBranches = useMemo(
    () => (branches || []).filter((b: any) => b.isActive),
    [branches]
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filters, setFilters] = useState<any>({});
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const limit = 20;

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page khi filter / search / tab thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeTab]);

  // Branch filter: nếu user chưa chọn manual, dùng selectedBranch
  const effectiveBranchIds = useMemo(() => {
    if (filters.branchIds?.length) return filters.branchIds;
    if (selectedBranch?.id) return [selectedBranch.id];
    return undefined;
  }, [filters.branchIds, selectedBranch?.id]);

  const apiType = TYPE_TABS.find((t) => t.value === activeTab)?.apiType;

  const { data, isLoading } = useAllPacking({
    ...(effectiveBranchIds ? { branchIds: effectiveBranchIds } : {}),
    ...(apiType ? { type: apiType } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filters.invoiceSearch ? { invoiceSearch: filters.invoiceSearch } : {}),
    ...(filters.customerSearch
      ? { customerSearch: filters.customerSearch }
      : {}),
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Filter count: chỉ tính filters không phải branch của header
  const activeFilterCount =
    (filters.branchIds?.length ? 1 : 0) +
    (filters.invoiceSearch ? 1 : 0) +
    (filters.customerSearch ? 1 : 0);

  const handleCreateSelect = (type: "giao-hang" | "dong-hang" | "loading") => {
    setShowCreateSheet(false);
    if (type === "giao-hang") onCreateGiaoHangClick();
    else if (type === "dong-hang") onCreateDongHangClick();
    else onCreateLoadingClick();
  };

  const handleEdit = () => {
    if (selectedItem) {
      const item = selectedItem;
      setSelectedItem(null);
      onEditClick(item);
    }
  };

  const handleDelete = () => {
    if (selectedItem) {
      const id = selectedItem.id;
      setSelectedItem(null);
      onDeleteClick(id);
    }
  };

  const handleResend = () => {
    if (selectedItem && onResendClick) {
      const id = selectedItem.id;
      setSelectedItem(null);
      onResendClick(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ─── Header: search + filter icon ─── */}
      <div className="bg-white px-4 pt-4 pb-0 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã báo đơn, ghi chú..."
              className="w-full pl-9 pr-8 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilter(true)}
            className={`relative p-2.5 rounded-xl transition-colors flex-shrink-0 ${
              activeFilterCount > 0
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-100 hover:bg-gray-200"
            }`}>
            <SlidersHorizontal
              className={`w-5 h-5 ${activeFilterCount > 0 ? "text-white" : "text-gray-600"}`}
            />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Type tabs */}
        <div
          className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {TYPE_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── List ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-sm text-gray-400">Đang tải...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="w-12 h-12 text-gray-300 mb-3" />
            <span className="text-gray-400 text-sm">
              Không có báo đơn nào
            </span>
          </div>
        ) : (
          <>
            {items.map((item: any) => (
              <PackingMobileCard
                key={`${item.type || "x"}-${item.id}`}
                item={item}
                onClick={() => setSelectedItem(item)}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                <span className="text-sm text-gray-500 font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── FAB ─── */}
      <button
        onClick={() => setShowCreateSheet(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all z-40">
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* ─── Filter sheet ─── */}
      {showFilter && (
        <PackingMobileFilterSheet
          filters={filters}
          branches={activeBranches}
          onApply={(f) => {
            setFilters(f);
            setShowFilter(false);
          }}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* ─── Create action sheet ─── */}
      {showCreateSheet && (
        <CreateActionSheet
          onSelect={handleCreateSelect}
          onClose={() => setShowCreateSheet(false)}
        />
      )}

      {/* ─── Detail sheet ─── */}
      {selectedItem && (
        <PackingMobileDetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onResend={onResendClick ? handleResend : undefined}
        />
      )}
    </div>
  );
}
