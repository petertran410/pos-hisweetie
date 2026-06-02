"use client";

import { useEffect, useState } from "react";
import { useProduct } from "@/lib/hooks/useProducts";
import { useOrderSuppliersConfirmedSummary } from "@/lib/hooks/useOrderSuppliers";
import { useBranchStore } from "@/lib/store/branch";
import { formatCurrency } from "@/lib/utils";
import { CodeLink } from "@/components/shared/CodeLink";
import {
  X,
  Loader2,
  Package,
  Tag,
  Box,
  Calendar,
  Weight,
  ArrowLeft,
} from "lucide-react";
import { ProductSupplierOrdersModal } from "./ProductSupplierOrdersModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const getProductTypeBadge = (type: number) => {
  switch (type) {
    case 1:
      return "bg-purple-100 text-purple-700";
    case 2:
      return "bg-blue-100 text-blue-700";
    case 3:
      return "bg-amber-100 text-amber-700";
    case 4:
      return "bg-teal-100 text-teal-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductMobileDetailSheetProps {
  productId: number;
  onClose: () => void;
}

/**
 * Cell hiển thị "Đặt NCC" cho mobile — tự fetch summary per (productId, branchId).
 */
function MobileSupplierOrderCell({
  productId,
  branch,
  onOpen,
}: {
  productId: number;
  branch: { id: number; name: string };
  onOpen: (branch: { id: number; name: string }) => void;
}) {
  const { data, isLoading } = useOrderSuppliersConfirmedSummary(
    [productId],
    branch.id
  );
  const total = data?.[productId] ?? 0;

  if (isLoading) {
    return <span className="text-xs font-medium text-gray-300">…</span>;
  }

  if (total <= 0) {
    return <span className="text-xs font-medium text-gray-600">0</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(branch)}
      className="text-xs font-medium text-blue-600 hover:underline">
      {total.toLocaleString()}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductMobileDetailSheet({
  productId,
  onClose,
}: ProductMobileDetailSheetProps) {
  const { data: product, isLoading } = useProduct(productId);
  const { selectedBranch } = useBranchStore();
  const [activeTab, setActiveTab] = useState<
    "info" | "description" | "inventory"
  >("info");
  const [supplierOrdersBranch, setSupplierOrdersBranch] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const currentBranchInventory = product?.inventories?.find(
    (inv) => inv.branchId === selectedBranch?.id
  );

  const activeInventories = (product?.inventories ?? []).filter(
    (inv) => inv.branch?.isActive !== false
  );

  const categoryChain = [
    product?.parentName,
    product?.middleName,
    product?.childName,
  ]
    .filter(Boolean)
    .join(" > ");

  const components = product?.comboComponents || [];

  const TABS = [
    { key: "info", label: "Thông tin" },
    { key: "description", label: "Mô tả" },
    { key: "inventory", label: "Tồn kho" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative mt-10 flex-1 bg-white rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-base font-bold text-gray-900">
            Chi tiết sản phẩm
          </span>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading || !product ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-sm text-gray-400">
                Đang tải chi tiết...
              </span>
            </div>
          ) : (
            <div className="px-4 py-4">
              {/* ── Product header: image + name + badges ── */}
              <div className="flex gap-3 mb-4">
                <div className="flex-shrink-0">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0].image}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-xl border border-gray-100"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-blue-600 font-bold text-sm mb-0.5">
                    <CodeLink entity="product" code={product.code} />
                  </p>
                  <p className="font-semibold text-gray-900 text-base leading-tight mb-2">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${getProductTypeBadge(product.type)}`}>
                      {getProductTypeLabel(product.type)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        product.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                      {product.isActive ? "Hoạt động" : "Ngừng"}
                    </span>
                    {product.isDirectSale && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[11px] font-medium">
                        Bán trực tiếp
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Category chain */}
              {categoryChain && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-xl">
                  <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600">{categoryChain}</span>
                </div>
              )}

              {/* ── Tabs ── */}
              <div
                className="flex gap-1 mb-4 overflow-x-auto -mx-4 px-4"
                style={{ scrollbarWidth: "none" }}>
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                      activeTab === t.key
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ═══ TAB: THÔNG TIN ═══ */}
              {activeTab === "info" && (
                <div className="space-y-3">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard
                      label="Giá bán"
                      value={`${formatCurrency(Number(product.basePrice))} đ`}
                      highlight
                    />
                    <InfoCard
                      label="Giá vốn"
                      value={
                        currentBranchInventory
                          ? `${formatCurrency(Number(currentBranchInventory.cost))} đ`
                          : "0 đ"
                      }
                    />
                    <InfoCard
                      label="Tồn kho"
                      value={
                        currentBranchInventory
                          ? Number(
                              currentBranchInventory.onHand
                            ).toLocaleString()
                          : "0"
                      }
                      valueColor={
                        currentBranchInventory &&
                        Number(currentBranchInventory.onHand) > 0
                          ? "text-green-600"
                          : "text-red-500"
                      }
                    />
                    <InfoCard
                      label="Định mức tồn"
                      value={
                        currentBranchInventory
                          ? `${Number(currentBranchInventory.minQuality).toLocaleString()} - ${Number(currentBranchInventory.maxQuality).toLocaleString()}`
                          : "0 - 0"
                      }
                    />
                    <InfoCard
                      label="Thương hiệu"
                      value={product.tradeMark?.name || "-"}
                    />
                    <InfoCard
                      label="Trọng lượng"
                      value={
                        product.weight
                          ? `${Number(product.weight).toLocaleString()} ${product.weightUnit || "kg"}`
                          : "-"
                      }
                    />
                    <InfoCard
                      label="Đơn vị"
                      value={product.unit || "-"}
                    />
                    <InfoCard
                      label="Ngày tạo"
                      value={formatDateTime(product.createdAt)}
                      small
                    />
                  </div>

                  {/* Combo / Manufacturing components */}
                  {(product.type === 1 || product.type === 4) &&
                    components.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Hàng thành phần ({components.length})
                        </p>
                        <div className="space-y-2">
                          {components.map((comp, index) => {
                            const cp = comp.componentProduct;
                            const inv = cp?.inventories?.find(
                              (i) => i.branchId === selectedBranch?.id
                            );
                            const cost = inv ? Number(inv.cost) : 0;
                            return (
                              <div
                                key={comp.id || comp.componentProductId}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                <span className="text-xs text-gray-400 font-medium w-5">
                                  {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {cp?.name || "-"}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {cp?.code ? (
                                      <CodeLink
                                        entity="product"
                                        code={cp.code}
                                        className="text-blue-600 hover:underline"
                                      />
                                    ) : (
                                      "-"
                                    )}{" "}
                                    | SL: {Number(comp.quantity)}
                                  </p>
                                </div>
                                <span className="text-xs font-medium text-gray-600">
                                  {cost.toLocaleString()} đ
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* ═══ TAB: MÔ TẢ ═══ */}
              {activeTab === "description" && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Mô tả
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {product.description || "Chưa có mô tả"}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Ghi chú đặt hàng
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {product.orderTemplate || "Chưa có ghi chú"}
                    </p>
                  </div>
                </div>
              )}

              {/* ═══ TAB: TỒN KHO ═══ */}
              {activeTab === "inventory" && (
                <div>
                  {activeInventories.length > 0 ? (
                    <div className="space-y-2">
                      {activeInventories.map((inv) => {
                        const onHand = Number(inv.onHand);
                        const damaged = Number(inv.damagedQuantity || 0);
                        const nearExpiry = Number(inv.nearExpiryQuantity || 0);
                        const goodStock = onHand - damaged - nearExpiry;

                        return (
                          <div
                            key={inv.id}
                            className="p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {inv.branchName}
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                {onHand.toLocaleString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Hàng tốt
                                </p>
                                <p className="text-xs font-medium text-green-600">
                                  {goodStock.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Bục rách
                                </p>
                                <p
                                  className={`text-xs font-medium ${damaged > 0 ? "text-red-500" : "text-gray-500"}`}>
                                  {damaged.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Cận date
                                </p>
                                <p
                                  className={`text-xs font-medium ${nearExpiry > 0 ? "text-orange-500" : "text-gray-500"}`}>
                                  {nearExpiry.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Đặt NCC
                                </p>
                                <MobileSupplierOrderCell
                                  productId={productId}
                                  branch={{
                                    id: inv.branchId,
                                    name: inv.branchName,
                                  }}
                                  onOpen={(b) => setSupplierOrdersBranch(b)}
                                />
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  KH đặt
                                </p>
                                <p className="text-xs font-medium text-gray-600">
                                  {Number(inv.reserved).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Giá vốn
                                </p>
                                <p className="text-xs font-medium text-gray-600">
                                  {Number(inv.cost).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Box className="w-10 h-10 text-gray-200" />
                      <span className="text-sm text-gray-400">
                        Chưa có dữ liệu tồn kho
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {supplierOrdersBranch && product && (
        <ProductSupplierOrdersModal
          productId={product.id}
          productName={product.name}
          productCode={product.code}
          branchId={supplierOrdersBranch.id}
          branchName={supplierOrdersBranch.name}
          onClose={() => setSupplierOrdersBranch(null)}
        />
      )}
    </div>
  );
}

// ─── InfoCard helper ──────────────────────────────────────────────────────────

function InfoCard({
  label,
  value,
  highlight,
  valueColor,
  small,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: string;
  small?: boolean;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      <p
        className={`font-semibold leading-tight ${
          valueColor
            ? valueColor
            : highlight
              ? "text-gray-900"
              : "text-gray-700"
        } ${small ? "text-xs" : "text-sm"}`}>
        {value}
      </p>
    </div>
  );
}
