"use client";

import { useRegisterPosInView } from "@/lib/store/posInView";
import { useState } from "react";
import type { Product, ProductComponent } from "@/lib/api/products";
import { useUpdateProduct } from "@/lib/hooks/useProducts";
import { useBranchStore } from "@/lib/store/branch";
import { Images, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { ProductForm } from "./ProductForm";
import { ComboProductForm } from "./ComboProductForm";
import { ManufacturingProductForm } from "./ManufacturingProductForm";
import { ProductInventoryLogTab } from "./ProductInventoryLogTab";
import { ProductConditionTab } from "./ProductConditionTab";
import { ProductSupplierOrdersModal } from "./ProductSupplierOrdersModal";
import { ProductCustomerOrdersModal } from "./ProductCustomerOrdersModal";
import { useOrderSuppliersConfirmedSummary } from "@/lib/hooks/useOrderSuppliers";
import { useOrdersPendingSummary } from "@/lib/hooks/useOrders";
import { usePermission } from "@/lib/hooks/usePermissions";
import Link from "next/link";
import { CodeLink } from "../shared/CodeLink";
import { ProductPublicationTab } from "./ProductPublicationTab";
import { AttachmentPreviewModal } from "../chat/AttachmentPreviewModal";

interface ProductDetailContentProps {
  product: Product;
  readOnly?: boolean;
  overlayZIndex?: number;
}

type ProductDetailTab =
  | "info"
  | "description"
  | "publication"
  | "inventoryLog"
  | "conditionLog"
  | "inventory";

/**
 * Cell hiển thị "Đặt NCC" cho từng dòng (mỗi chi nhánh) trong tab Tồn kho.
 * Tự fetch summary cho cặp (productId, branchId). Nếu > 0 → button click
 * mở `ProductSupplierOrdersModal` lọc đúng chi nhánh đang xét.
 */
function SupplierOrderCell({
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
    branch.id,
  );
  const total = data?.[productId] ?? 0;

  if (isLoading) {
    return <span className="text-gray-300">…</span>;
  }

  if (total <= 0) {
    return <span>0</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(branch)}
      className="text-brand hover:underline font-medium">
      {total.toLocaleString()}
    </button>
  );
}

/**
 * Cell hiển thị "KH đặt" cho từng dòng (mỗi chi nhánh) trong tab Tồn kho.
 * Đối xứng `SupplierOrderCell`: fetch summary đơn khách đang đặt (Phiếu tạm/
 * Đã xác nhận) cho cặp (productId, branchId) — KHÔNG dùng `inv.reserved` tĩnh.
 * Nếu > 0 → button click mở `ProductCustomerOrdersModal` lọc đúng chi nhánh.
 */
function CustomerOrderCell({
  productId,
  branch,
  onOpen,
}: {
  productId: number;
  branch: { id: number; name: string };
  onOpen: (branch: { id: number; name: string }) => void;
}) {
  const { data, isLoading } = useOrdersPendingSummary([productId], branch.id);
  const total = data?.[productId] ?? 0;

  if (isLoading) {
    return <span className="text-gray-300">…</span>;
  }

  if (total <= 0) {
    return <span>0</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(branch)}
      className="text-brand hover:underline font-medium">
      {total.toLocaleString()}
    </button>
  );
}

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

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

export function ProductDetailContent({
  product,
  readOnly = false,
  overlayZIndex = 50,
}: ProductDetailContentProps) {
  useRegisterPosInView(
    product
      ? {
          type: "product",
          id: product.id,
          code: product.code,
          name: product.name,
        }
      : null,
  );
  const updateProduct = useUpdateProduct();
  const { selectedBranch } = useBranchStore();

  const itemsPerPage = 10;

  const canUpdate = usePermission("products", "update");
  const canDelete = usePermission("products", "delete");
  const canViewCostPrice = usePermission("products", "view_cost_price");
  const canViewSalePrice = usePermission("products", "view_sale_price");
  const canViewPublication = usePermission("products", "view_publication");

  // Ảnh đang xem phóng to (index trong product.images), null = đóng
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ProductDetailTab>("info");
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFormulaId, setSelectedFormulaId] = useState<number>();
  const [supplierOrdersBranch, setSupplierOrdersBranch] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const [customerOrdersBranch, setCustomerOrdersBranch] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // ── Edit mode ──
  if (!readOnly && canUpdate && isEditing) {
    const handleCloseEdit = () => setIsEditing(false);
    const handleSuccess = () => setIsEditing(false);

    if (product.type === 1) {
      return (
        <ComboProductForm
          product={product}
          onClose={handleCloseEdit}
          onSuccess={handleSuccess}
        />
      );
    }
    if (product.type === 4) {
      return (
        <ManufacturingProductForm
          product={product}
          onClose={handleCloseEdit}
          onSuccess={handleSuccess}
        />
      );
    }
    return (
      <ProductForm
        product={product}
        onClose={handleCloseEdit}
        onSuccess={handleSuccess}
      />
    );
  }

  // ── Calculations ──
  const currentBranchInventory = product.inventories?.find(
    (inv) => inv.branchId === selectedBranch?.id,
  );

  const calculateComponentCostByQuantity = (
    comp: ProductComponent,
    componentProduct: Product | undefined,
  ): number => {
    if (!componentProduct) return 0;
    const inventory = componentProduct.inventories?.find(
      (inv) => inv.branchId === selectedBranch?.id,
    );
    const cost = inventory ? Number(inventory.cost) : 0;
    const quantity = Number(comp.quantity || 0);

    if (product.type === 4) {
      const weight = componentProduct.weight
        ? Number(componentProduct.weight)
        : 0;
      if (weight === 0) return 0;
      const weightInGrams =
        componentProduct.weightUnit === "kg" ? weight * 1000 : weight;
      return (cost / weightInGrams) * quantity;
    }
    return cost * quantity;
  };

  // Hàng sản xuất nhiều công thức: xem thành phần theo công thức đang chọn.
  const formulas = product.type === 4 ? (product.formulas ?? []) : [];
  const selectedFormula =
    formulas.find((f) => f.id === selectedFormulaId) ??
    formulas.find((f) => f.isDefault) ??
    formulas[0];
  const components = selectedFormula
    ? selectedFormula.components
    : product.comboComponents || [];
  const totalCompPages = Math.ceil(components.length / itemsPerPage);
  const currentComponents = components.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const startIndex = (currentPage - 1) * itemsPerPage;

  // Nhóm hàng chain
  const categoryChain = [
    product.parentName,
    product.middleName,
    product.childName,
  ]
    .filter(Boolean)
    .join(" >> ");

  const handleToggleActive = async () => {
    if (readOnly || !canDelete) return;
    const willDeactivate = product.isActive;
    const result = await Swal.fire({
      title: willDeactivate ? "Ngừng hoạt động" : "Kích hoạt sản phẩm",
      text: willDeactivate
        ? `Bạn có chắc chắn muốn ngừng hoạt động sản phẩm "${product.name}"?`
        : `Bạn có chắc chắn muốn kích hoạt lại sản phẩm "${product.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: willDeactivate ? "#ef4444" : "#16a34a",
      cancelButtonText: "Hủy",
      confirmButtonText: willDeactivate ? "Ngừng hoạt động" : "Kích hoạt",
    });
    if (result.isConfirmed) {
      updateProduct.mutate({
        id: product.id,
        data: { isActive: !product.isActive },
      });
    }
  };

  const TABS: { key: ProductDetailTab; label: string }[] = [
    { key: "info", label: "Thông tin" },
    { key: "description", label: "Mô tả, ghi chú" },
    ...(canViewPublication
      ? [{ key: "publication" as const, label: "Xem công bố" }]
      : []),
    { key: "inventoryLog", label: "Thẻ kho" },
    { key: "conditionLog", label: "Thẻ kho loại tồn" },
    { key: "inventory", label: "Tồn kho" },
  ];

  // Ảnh sản phẩm cho modal xem phóng to (dùng chung AttachmentPreviewModal của chat)
  const imageItems = (product.images ?? []).map((img, i) => ({
    url: img.image,
    thumbnail: null,
    title: `${product.name} (${i + 1})`,
    type: "image",
  }));
  const primaryImageIndex = Math.max(
    0,
    (product.images ?? []).findIndex((image) => image.isPrimary === true),
  );
  const primaryImage = product.images?.[primaryImageIndex];
  const visibleTab =
    activeTab === "publication" && !canViewPublication ? "info" : activeTab;

  const activeInventories = (product.inventories ?? []).filter(
    (inv) => inv.branch?.isActive !== false,
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* ── Tabs ── */}
      <div
        role="tablist"
        aria-label="Chi tiết sản phẩm"
        className="flex shrink-0 gap-1 overflow-x-auto border-b px-3 lg:px-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={visibleTab === t.key}
            onClick={() => setActiveTab(t.key)}
            className={`shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-brand ${
              visibleTab === t.key
                ? "border-brand text-brand"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
        {/* ═══════════════════════════════════════════
                TAB 1: THÔNG TIN — giống hình 1
               ═══════════════════════════════════════════ */}
        {visibleTab === "info" && (
          <div className="space-y-5">
            {/* Header: Ảnh + Tên + Badges */}
            <div className="flex gap-4">
              {/* Ảnh sản phẩm */}
              <div className="w-24 h-24 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                {primaryImage ? (
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(primaryImageIndex)}
                    aria-label={`Xem ${imageItems.length} ảnh của ${product.name}`}
                    className="relative w-full h-full cursor-zoom-in focus-visible:outline-brand">
                    <img
                      src={primaryImage.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {imageItems.length > 1 && (
                      <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-1 text-[11px] font-medium text-white">
                        <Images className="h-3.5 w-3.5" />
                        {imageItems.length} ảnh
                      </span>
                    )}
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">N/A</span>
                )}
              </div>

              {/* Tên + Nhóm + Badges */}
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="break-words text-base lg:text-lg font-bold text-gray-900">
                    {product.name}
                  </span>
                  {product.unit && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                      {product.unit}
                    </span>
                  )}
                </div>

                {categoryChain && (
                  <span className="text-sm text-gray-500">
                    Nhóm hàng: {categoryChain}
                  </span>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                    {getProductTypeLabel(product.type)}
                  </span>
                  {product.isDirectSale && (
                    <span className="px-2 py-0.5 bg-brand-soft text-brand-dark rounded text-xs font-medium">
                      Bán trực tiếp
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      product.cargoType === "COLD"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                    {product.cargoType === "COLD" ? "Hàng lạnh" : "Hàng thường"}
                  </span>
                  {/* <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          product.isRewardPoint
                            ? "bg-green-50 text-green-700"
                            : "bg-orange-50 text-orange-600"
                        }`}>
                        {product.isRewardPoint
                          ? "Tích điểm"
                          : "Không tích điểm"}
                      </span> */}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      product.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                    {product.isActive ? "Hoạt động" : "Ngừng"}
                  </span>
                </div>
              </div>
            </div>

            {/* Info grid 4 cols — giống hình 1 */}
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 [&>div]:min-w-0 [&_span]:break-words">
              <div className="flex flex-col gap-1 py-2 border-b">
                <span className="text-xs text-gray-500">Mã hàng</span>
                <span className="text-sm font-medium text-gray-900">
                  <CodeLink entity="product" code={product.code} />
                </span>
              </div>
              <div className="flex flex-col gap-1 py-2 border-b">
                <span className="text-xs text-gray-500">Tồn kho</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentBranchInventory
                    ? Number(currentBranchInventory.onHand).toLocaleString()
                    : "0"}
                </span>
              </div>
              <div className="flex flex-col gap-1 py-2 border-b">
                <span className="text-xs text-gray-500">Định mức tồn</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentBranchInventory
                    ? `${Number(currentBranchInventory.minQuality).toLocaleString()} - ${Number(currentBranchInventory.maxQuality).toLocaleString()}`
                    : "0 - 0"}
                </span>
              </div>
              <div className="flex flex-col gap-1 py-2 border-b">
                <span className="text-xs text-gray-500">Thương hiệu</span>
                <span className="text-sm font-medium text-gray-900">
                  {product.tradeMark?.name || "-"}
                </span>
              </div>

              {canViewCostPrice && (
                <div className="flex flex-col gap-1 py-2 border-b">
                  <span className="text-xs text-gray-500">Giá vốn</span>
                  <span className="text-sm font-medium text-gray-900">
                    {currentBranchInventory
                      ? Number(currentBranchInventory.cost).toLocaleString()
                      : "0"}
                  </span>
                </div>
              )}
              {canViewSalePrice && (
                <div className="flex flex-col gap-1 py-2 border-b">
                  <span className="text-xs text-gray-500">Giá bán</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Number(product.basePrice).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1 py-2 border-b">
                <span className="text-xs text-gray-500">Trọng lượng</span>
                <span className="text-sm font-medium text-gray-900">
                  {product.weight
                    ? `${Number(product.weight).toLocaleString()} ${product.weightUnit || "kg"}`
                    : "-"}
                </span>
              </div>
              <div className="flex flex-col gap-1 py-2 border-b">
                <span className="text-xs text-gray-500">Ngày tạo</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDateTime(product.createdAt)}
                </span>
              </div>
            </div>

            {/* Bảng thành phần (Combo / Hàng SX) */}
            {(product.type === 1 || product.type === 4) &&
              components.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Hàng thành phần ({components.length})
                  </h4>
                  {formulas.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formulas.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setSelectedFormulaId(f.id);
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1 rounded-full border text-xs ${
                            f.id === selectedFormula?.id
                              ? "border-brand bg-brand-soft text-brand font-medium"
                              : "border-gray-300 text-gray-600 hover:bg-gray-50"
                          }`}>
                          {f.name}
                          {f.isDefault && " (mặc định)"}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">
                            STT
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">
                            Mã hàng
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">
                            Tên hàng
                          </th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">
                            Số lượng / Gram
                          </th>
                          {canViewCostPrice && (
                            <>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">
                                Giá vốn
                              </th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">
                                Tổng giá vốn
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentComponents.map((comp, index) => {
                          const actualIndex = startIndex + index;
                          const cp = comp.componentProduct;
                          const inv = cp?.inventories?.find(
                            (i) => i.branchId === selectedBranch?.id,
                          );
                          const cost = inv ? Number(inv.cost) : 0;
                          const totalCost = calculateComponentCostByQuantity(
                            comp,
                            cp,
                          );
                          return (
                            <tr
                              key={comp.id || comp.componentProductId}
                              className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm">
                                {actualIndex + 1}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <Link
                                  href={`/san-pham/danh-sach?Code=${cp?.code}`}
                                  target="_blank"
                                  className="text-brand hover:underline"
                                  onClick={(e) => e.stopPropagation()}>
                                  {cp?.code || "-"}
                                </Link>
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {cp?.name || "-"}
                              </td>
                              <td className="px-4 py-2 text-sm text-center">
                                {(() => {
                                  const mode = comp.inputMode;
                                  const qty = Number(comp.quantity);

                                  // Piece mode → hiển thị số chiếc + đơn vị của sản phẩm
                                  if (mode === "piece") {
                                    return `${qty} ${cp?.unit || "chiếc"}`;
                                  }

                                  // Quantity mode → convert gram về số lượng để hiển thị
                                  if (mode === "quantity") {
                                    const w = cp?.weight
                                      ? Number(cp.weight)
                                      : 0;
                                    const wu = cp?.weightUnit || "g";
                                    const wg = wu === "kg" ? w * 1000 : w;
                                    if (wg > 0) {
                                      const units = qty / wg;
                                      return `${units.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} ${cp?.unit || "đv"}`;
                                    }
                                  }

                                  // Gram mode (default) → hiển thị gram
                                  return `${qty} gram`;
                                })()}
                              </td>
                              {canViewCostPrice && (
                                <>
                                  <td className="px-4 py-2 text-sm text-right">
                                    {cost.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right font-medium">
                                    {totalCost.toLocaleString()}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {totalCompPages > 1 && (
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>
                        {startIndex + 1} -{" "}
                        {Math.min(startIndex + itemsPerPage, components.length)}{" "}
                        / {components.length}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                          className="px-2 py-1 border rounded disabled:opacity-40">
                          ‹
                        </button>
                        <span className="px-2 py-1">
                          {currentPage}/{totalCompPages}
                        </span>
                        <button
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalCompPages, currentPage + 1),
                            )
                          }
                          disabled={currentPage === totalCompPages}
                          className="px-2 py-1 border rounded disabled:opacity-40">
                          ›
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
                TAB 2: MÔ TẢ, GHI CHÚ — giống hình 2
               ═══════════════════════════════════════════ */}
        {visibleTab === "description" && (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Hình ảnh sản phẩm
                {imageItems.length > 0 && (
                  <span className="ml-1 font-normal text-gray-400">
                    ({imageItems.length})
                  </span>
                )}
              </h4>
              {imageItems.length ? (
                <div className="flex flex-wrap gap-3">
                  {product.images!.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setPreviewIndex(i)}
                      title="Bấm để xem phóng to"
                      className="relative h-28 w-28 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 cursor-zoom-in hover:border-brand">
                      <img
                        src={img.image}
                        alt={imageItems[i].title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      {img.isPrimary && (
                        <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Ảnh chính
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Chưa có hình ảnh</p>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Mô tả
              </h4>
              <p className="text-sm text-gray-600">
                {product.description || "Chưa có mô tả"}
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Ghi chú đặt hàng
              </h4>
              <p className="text-sm text-gray-600">
                {product.orderTemplate || "Chưa có ghi chú"}
              </p>
            </div>
          </div>
        )}

        {canViewPublication && visibleTab === "publication" && (
          <ProductPublicationTab product={product} />
        )}

        {/* ═══════════════════════════════════════════
                TAB 3: THẺ KHO — giống hình 3
               ═══════════════════════════════════════════ */}
        {visibleTab === "inventoryLog" && (
          <ProductInventoryLogTab
            productId={product.id}
            branchId={selectedBranch?.id}
          />
        )}

        {visibleTab === "conditionLog" && (
          <ProductConditionTab
            productId={product.id}
            branchId={selectedBranch?.id}
          />
        )}

        {/* ═══════════════════════════════════════════
                TAB 4: TỒN KHO — giống hình 4
               ═══════════════════════════════════════════ */}
        {visibleTab === "inventory" && (
          <div>
            {activeInventories.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                        Chi nhánh
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        Tồn kho
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        Bục rách
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        Cận date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        Khuyến mãi
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        Hàng tốt
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        KH đặt
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        Đặt NCC
                      </th>
                      {canViewCostPrice && (
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                          Giá vốn
                        </th>
                      )}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        Định mức tồn
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Dòng chi tiết */}
                    {activeInventories.map((inv) => {
                      const onHand = Number(inv.onHand);
                      const damaged = Number(inv.damagedQuantity || 0);
                      const nearExpiry = Number(inv.nearExpiryQuantity || 0);
                      const promoQty = Number(inv.promoQuantity || 0);
                      // Hàng tốt = tồn - bục rách - cận date - hàng KM phân bổ
                      const goodStock =
                        onHand - damaged - nearExpiry - Math.max(promoQty, 0);

                      return (
                        <tr key={inv.id}>
                          <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                            {inv.branchName}
                          </td>

                          <td className="px-3 py-2.5 text-sm text-right whitespace-nowrap">
                            {onHand.toLocaleString()}
                          </td>

                          <td className="px-2 py-2.5 text-sm text-right whitespace-nowrap">
                            <span
                              className={
                                damaged > 0 ? "text-red-600 font-medium" : ""
                              }>
                              {damaged.toLocaleString()}
                            </span>
                          </td>

                          <td className="px-2 py-2.5 text-sm text-right whitespace-nowrap">
                            <span
                              className={
                                nearExpiry > 0
                                  ? "text-orange-600 font-medium"
                                  : ""
                              }>
                              {nearExpiry.toLocaleString()}
                            </span>
                          </td>

                          <td className="px-2 py-2.5 text-sm text-right whitespace-nowrap">
                            <span
                              className={
                                promoQty < 0
                                  ? "text-purple-700 font-medium"
                                  : promoQty > 0
                                    ? "text-purple-600 font-medium"
                                    : ""
                              }>
                              {promoQty.toLocaleString()}
                            </span>
                          </td>

                          <td className="px-2 py-2.5 text-sm text-right whitespace-nowrap">
                            <span className="text-green-700 font-medium">
                              {goodStock.toLocaleString()}
                            </span>
                          </td>

                          <td className="px-2 py-2.5 text-sm text-right whitespace-nowrap">
                            <CustomerOrderCell
                              productId={product.id}
                              branch={{
                                id: inv.branchId,
                                name: inv.branchName,
                              }}
                              onOpen={(b) => setCustomerOrdersBranch(b)}
                            />
                          </td>

                          <td className="px-2 py-2.5 text-sm text-right whitespace-nowrap">
                            <SupplierOrderCell
                              productId={product.id}
                              branch={{
                                id: inv.branchId,
                                name: inv.branchName,
                              }}
                              onOpen={(b) => setSupplierOrdersBranch(b)}
                            />
                          </td>

                          {canViewCostPrice && (
                            <td className="px-2 py-2.5 text-sm text-right whitespace-nowrap">
                              {Number(inv.cost).toLocaleString()}
                            </td>
                          )}

                          <td className="px-2 py-2.5 text-sm text-right whitespace-nowrap">
                            {Number(inv.minQuality).toLocaleString()} -{" "}
                            {Number(inv.maxQuality).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-400">
                Chưa có dữ liệu tồn kho
              </div>
            )}
          </div>
        )}

        {/* ── Action footer ── */}
        {!readOnly && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
            <div className="flex gap-2">
              {canDelete && (
                <button
                  onClick={handleToggleActive}
                  disabled={updateProduct.isPending}
                  className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors flex items-center gap-1.5 disabled:opacity-60 ${
                    product.isActive
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}>
                  {updateProduct.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {product.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {canUpdate && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors flex items-center gap-1.5">
                  Chỉnh sửa
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {supplierOrdersBranch && (
        <ProductSupplierOrdersModal
          productId={product.id}
          productName={product.name}
          productCode={product.code}
          branchId={supplierOrdersBranch.id}
          branchName={supplierOrdersBranch.name}
          zIndex={overlayZIndex}
          onClose={() => setSupplierOrdersBranch(null)}
        />
      )}

      {customerOrdersBranch && (
        <ProductCustomerOrdersModal
          productId={product.id}
          productName={product.name}
          productCode={product.code}
          branchId={customerOrdersBranch.id}
          branchName={customerOrdersBranch.name}
          zIndex={overlayZIndex}
          onClose={() => setCustomerOrdersBranch(null)}
        />
      )}

      {previewIndex !== null && imageItems.length > 0 && (
        <AttachmentPreviewModal
          items={imageItems}
          index={Math.min(previewIndex, imageItems.length - 1)}
          onClose={() => setPreviewIndex(null)}
          showThumbnailStrip
        />
      )}
    </div>
  );
}
