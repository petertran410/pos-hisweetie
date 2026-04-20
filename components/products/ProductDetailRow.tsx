// components/products/ProductDetailRow.tsx
"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useProduct, useDeleteProduct } from "@/lib/hooks/useProducts";
import { useBranchStore } from "@/lib/store/branch";
import { Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { ProductForm } from "./ProductForm";
import { ComboProductForm } from "./ComboProductForm";
import { ManufacturingProductForm } from "./ManufacturingProductForm";
import { ProductInventoryLogTab } from "./ProductInventoryLogTab";
import { usePermission } from "@/lib/hooks/usePermissions";
import Link from "next/link";

interface ProductDetailRowProps {
  productId: number;
  colSpan: number;
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

export function ProductDetailRow({
  productId,
  colSpan,
}: ProductDetailRowProps) {
  const { data: product, isLoading } = useProduct(productId);
  const deleteProduct = useDeleteProduct();
  const { selectedBranch } = useBranchStore();

  const canUpdate = usePermission("products", "update");
  const canDelete = usePermission("products", "delete");

  const [activeTab, setActiveTab] = useState<
    "info" | "description" | "inventoryLog" | "inventory"
  >("info");
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sticky wrapper theo chiều ngang scroll
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let scrollEl: HTMLElement | null = el.parentElement;
    while (scrollEl) {
      const ox = getComputedStyle(scrollEl).overflowX;
      if (ox === "auto" || ox === "scroll") break;
      scrollEl = scrollEl.parentElement;
    }
    if (!scrollEl) return;
    const setWidth = () => {
      el.style.width = `${scrollEl!.clientWidth}px`;
    };
    setWidth();
    const ro = new ResizeObserver(setWidth);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [product]);

  if (isLoading || !product) {
    return (
      <tr>
        <td colSpan={colSpan}>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-500">
              Đang tải chi tiết...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  // ── Edit mode ──
  if (isEditing) {
    const handleCloseEdit = () => setIsEditing(false);
    const handleSuccess = () => setIsEditing(false);

    if (product.type === 1) {
      return (
        <tr>
          <td colSpan={colSpan}>
            <ComboProductForm
              product={product}
              onClose={handleCloseEdit}
              onSuccess={handleSuccess}
            />
          </td>
        </tr>
      );
    }
    if (product.type === 4) {
      return (
        <tr>
          <td colSpan={colSpan}>
            <ManufacturingProductForm
              product={product}
              onClose={handleCloseEdit}
              onSuccess={handleSuccess}
            />
          </td>
        </tr>
      );
    }
    return (
      <tr>
        <td colSpan={colSpan}>
          <ProductForm
            product={product}
            onClose={handleCloseEdit}
            onSuccess={handleSuccess}
          />
        </td>
      </tr>
    );
  }

  // ── Calculations ──
  const currentBranchInventory = product.inventories?.find(
    (inv) => inv.branchId === selectedBranch?.id
  );

  const calculateComponentCostByQuantity = (
    comp: any,
    componentProduct: any
  ): number => {
    if (!componentProduct) return 0;
    const inventory = componentProduct.inventories?.find(
      (inv: any) => inv.branchId === selectedBranch?.id
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

  const components = product.comboComponents || [];
  const totalCompPages = Math.ceil(components.length / itemsPerPage);
  const currentComponents = components.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Xác nhận xóa",
      text: `Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Hủy",
      confirmButtonText: "Xóa",
    });
    if (result.isConfirmed) {
      deleteProduct.mutate(product.id);
    }
  };

  const TABS = [
    { key: "info", label: "Thông tin" },
    { key: "description", label: "Mô tả, ghi chú" },
    { key: "inventoryLog", label: "Thẻ kho" },
    { key: "inventory", label: "Tồn kho" },
  ];

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-blue-500 p-0"
        style={{ width: 0 }}>
        <div ref={wrapperRef} className="sticky left-0">
          <div className="px-5 pb-5">
            {/* ── Tabs ── */}
            <div className="flex gap-1 mb-4">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === t.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ═══════════════════════════════════════════
                TAB 1: THÔNG TIN — giống hình 1
               ═══════════════════════════════════════════ */}
            {activeTab === "info" && (
              <div className="space-y-5">
                {/* Header: Ảnh + Tên + Badges */}
                <div className="flex gap-4">
                  {/* Ảnh sản phẩm */}
                  <div className="w-24 h-24 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0].image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </div>

                  {/* Tên + Nhóm + Badges */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
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

                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {getProductTypeLabel(product.type)}
                      </span>
                      {product.isDirectSale && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          Bán trực tiếp
                        </span>
                      )}
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
                <div className="grid grid-cols-4 gap-x-6">
                  <div className="flex flex-col gap-1 py-2 border-b">
                    <span className="text-xs text-gray-500">Mã hàng</span>
                    <span className="text-sm font-medium text-gray-900">
                      {product.code}
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

                  <div className="flex flex-col gap-1 py-2 border-b">
                    <span className="text-xs text-gray-500">Giá vốn</span>
                    <span className="text-sm font-medium text-gray-900">
                      {currentBranchInventory
                        ? Number(currentBranchInventory.cost).toLocaleString()
                        : "0"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 py-2 border-b">
                    <span className="text-xs text-gray-500">Giá bán</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Number(product.basePrice).toLocaleString()}
                    </span>
                  </div>
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
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
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
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">
                                Giá vốn
                              </th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">
                                Tổng giá vốn
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {currentComponents.map((comp, index) => {
                              const actualIndex = startIndex + index;
                              const cp = comp.componentProduct;
                              const inv = cp?.inventories?.find(
                                (i: any) => i.branchId === selectedBranch?.id
                              );
                              const cost = inv ? Number(inv.cost) : 0;
                              const totalCost =
                                calculateComponentCostByQuantity(comp, cp);
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
                                      className="text-blue-600 hover:underline"
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
                                  <td className="px-4 py-2 text-sm text-right">
                                    {cost.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right font-medium">
                                    {totalCost.toLocaleString()}
                                  </td>
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
                            {Math.min(
                              startIndex + itemsPerPage,
                              components.length
                            )}{" "}
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
                                  Math.min(totalCompPages, currentPage + 1)
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
            {activeTab === "description" && (
              <div className="space-y-4">
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

            {/* ═══════════════════════════════════════════
                TAB 3: THẺ KHO — giống hình 3
               ═══════════════════════════════════════════ */}
            {activeTab === "inventoryLog" && (
              <ProductInventoryLogTab
                productId={product.id}
                branchId={selectedBranch?.id}
              />
            )}

            {/* ═══════════════════════════════════════════
                TAB 4: TỒN KHO — giống hình 4
               ═══════════════════════════════════════════ */}
            {activeTab === "inventory" && (
              <div>
                {product.inventories && product.inventories.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                            Đặt NCC
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                            KH đặt
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                            Giá vốn
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                            Định mức tồn
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {/* Dòng tổng */}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-4 py-2.5 text-sm text-gray-700">
                            Tổng
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right">
                            {product.inventories
                              .reduce((sum, inv) => sum + Number(inv.onHand), 0)
                              .toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right">
                            {product.inventories
                              .reduce(
                                (sum, inv) => sum + Number(inv.onOrder),
                                0
                              )
                              .toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right">
                            {product.inventories
                              .reduce(
                                (sum, inv) => sum + Number(inv.reserved),
                                0
                              )
                              .toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right">-</td>
                          <td className="px-4 py-2.5 text-sm text-right">-</td>
                        </tr>
                        {/* Dòng từng chi nhánh */}
                        {product.inventories.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">
                              {inv.branchName ||
                                inv.branch?.name ||
                                `Chi nhánh ${inv.branchId}`}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right">
                              {Number(inv.onHand).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right">
                              {Number(inv.onOrder).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right">
                              {Number(inv.reserved).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right">
                              {Number(inv.cost).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right">
                              {Number(inv.minQuality).toLocaleString()} -{" "}
                              {Number(inv.maxQuality).toLocaleString()}
                            </td>
                          </tr>
                        ))}
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
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
              <div className="flex gap-2">
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                    Xóa
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {canUpdate && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                    Chỉnh sửa
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
