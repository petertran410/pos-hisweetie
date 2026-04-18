// components/products/ProductDetailRow.tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  useProduct,
  useDeleteProduct,
  useProductInventoryLogs,
} from "@/lib/hooks/useProducts";
import { useBranchStore } from "@/lib/store/branch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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

  const [activeTab, setActiveTab] = useState<"info" | "inventoryLog">("info");
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
    const onScroll = () => {
      el.style.transform = `translateX(${scrollEl!.scrollLeft}px)`;
    };
    scrollEl.addEventListener("scroll", onScroll);
    return () => {
      ro.disconnect();
      scrollEl?.removeEventListener("scroll", onScroll);
    };
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

  // ── Edit mode: mở modal form tương ứng ──
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

  const calculateTotalPurchasePrice = () => {
    if (!product.comboComponents) return 0;
    return product.comboComponents.reduce((sum, comp) => {
      return (
        sum + calculateComponentCostByQuantity(comp, comp.componentProduct)
      );
    }, 0);
  };

  const calculateTotalRetailPrice = () => {
    if (!product.comboComponents) return 0;
    return product.comboComponents.reduce((sum, comp) => {
      const price = Number(comp.componentProduct?.basePrice || 0);
      return sum + price * Number(comp.quantity || 0);
    }, 0);
  };

  const components = product.comboComponents || [];
  const totalCompPages = Math.ceil(components.length / itemsPerPage);
  const currentComponents = components.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const startIndex = (currentPage - 1) * itemsPerPage;

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

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div ref={wrapperRef} className="bg-white">
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-800">
                  {product.name}
                </span>
                <span className="text-sm text-gray-500">({product.code})</span>
                <span
                  className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                    product.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                  {product.isActive ? "Hoạt động" : "Ngừng"}
                </span>
              </div>
              <span className="text-sm text-gray-600 font-medium">
                {selectedBranch?.name || "-"}
              </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-gray-100">
              {[
                { key: "info", label: "Thông tin" },
                { key: "inventoryLog", label: "Lịch sử tồn kho" },
              ].map((t) => (
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

            {/* Tab Content */}
            {activeTab === "info" && (
              <div className="space-y-4">
                {/* Info grid 3 cols */}
                <div className="grid grid-cols-3 gap-x-8 border-gray-200 pb-2 mb-2">
                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-sm text-gray-500">
                      Mã hàng:
                    </label>
                    <span className="block text-sm text-gray-900">
                      {product.code}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-sm text-gray-500">
                      Loại sản phẩm:
                    </label>
                    <span className="block text-sm text-gray-900">
                      {getProductTypeLabel(product.type)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-sm text-gray-500">
                      Thương hiệu:
                    </label>
                    <span className="block text-sm text-gray-900">
                      {product.tradeMark?.name || "-"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-sm text-gray-500">
                      Loại Hàng:
                    </label>
                    <span className="block text-sm text-gray-900">
                      {product.parentName || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-sm text-gray-500">
                      Nguồn Gốc:
                    </label>
                    <span className="block text-sm text-gray-900">
                      {product.middleName || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-sm text-gray-500">
                      Danh Mục:
                    </label>
                    <span className="block text-sm text-gray-900">
                      {product.childName || "-"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-sm text-gray-500">
                      Đơn vị:
                    </label>
                    <span className="block text-sm text-gray-900">
                      {product.unit || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-sm text-gray-500">
                      Khối lượng:
                    </label>
                    <span className="block text-sm text-gray-900">
                      {product.weight
                        ? `${Number(product.weight).toLocaleString()} ${product.weightUnit || "kg"}`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-sm text-gray-500">
                      Ngày tạo:
                    </label>
                    <span className="block text-sm text-gray-900">
                      {formatDateTime(product.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Tồn kho & Giá */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Tồn kho */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Thông tin tồn kho
                    </h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Giá vốn:</span>
                      <span className="font-medium">
                        {currentBranchInventory
                          ? Number(
                              currentBranchInventory.cost
                            ).toLocaleString() + " đ"
                          : "0 đ"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tồn kho:</span>
                      <span className="font-medium">
                        {currentBranchInventory
                          ? Number(
                              currentBranchInventory.onHand
                            ).toLocaleString()
                          : "0"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Định mức min:</span>
                      <span className="font-medium">
                        {currentBranchInventory
                          ? Number(
                              currentBranchInventory.minQuality
                            ).toLocaleString()
                          : "0"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Định mức max:</span>
                      <span className="font-medium">
                        {currentBranchInventory
                          ? Number(
                              currentBranchInventory.maxQuality
                            ).toLocaleString()
                          : "0"}
                      </span>
                    </div>
                  </div>

                  {/* Giá bán */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Thông tin giá
                    </h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Giá bán lẻ:</span>
                      <span className="font-semibold text-blue-600">
                        {Number(product.basePrice).toLocaleString()} đ
                      </span>
                    </div>
                    {(product.type === 1 || product.type === 4) && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">
                            Tổng giá vốn thành phần:
                          </span>
                          <span className="font-medium">
                            {calculateTotalPurchasePrice().toLocaleString()} đ
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">
                            Tổng giá bán thành phần:
                          </span>
                          <span className="font-medium">
                            {calculateTotalRetailPrice().toLocaleString()} đ
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mô tả */}
                {product.description && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Mô tả
                    </h4>
                    <p className="text-sm text-gray-600">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Bảng thành phần (Combo / Hàng SX) */}
                {(product.type === 1 || product.type === 4) &&
                  components.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Hàng thành phần
                        </h4>
                        <span className="text-xs text-gray-500">
                          {components.length} sản phẩm
                        </span>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                                STT
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                                Mã hàng
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                                Tên hàng
                              </th>
                              <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">
                                Số lượng
                              </th>
                              <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
                                Giá vốn
                              </th>
                              <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
                                Tổng giá vốn
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
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
                                    {Number(comp.quantity)}
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
                      {/* Pagination cho components */}
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

            {activeTab === "inventoryLog" && (
              <ProductInventoryLogTab
                productId={product.id}
                branchId={selectedBranch?.id}
              />
            )}

            {/* Action footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                {canUpdate && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">
                    Sửa
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors">
                    Xóa
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
