"use client";

import { useState } from "react";
import type { Product } from "@/lib/api/products";
import { useDeleteProduct } from "@/lib/hooks/useProducts";
import { ProductForm } from "./ProductForm";
import { ComboProductForm } from "./ComboProductForm";
import { useBranchStore } from "@/lib/store/branch";

interface ProductDetailProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetail({ product, onClose }: ProductDetailProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const deleteProduct = useDeleteProduct();
  const { selectedBranch } = useBranchStore();

  const handleDelete = () => {
    deleteProduct.mutate(product.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onClose();
      },
    });
  };

  const getProductTypeLabel = (type: number) => {
    switch (type) {
      case 1:
        return "Combo - đóng gói";
      case 2:
        return "Hàng hóa";
      case 3:
        return "Dịch vụ";
      default:
        return "Hàng hóa";
    }
  };

  const calculateTotalPurchasePrice = () => {
    if (!product.comboComponents || product.comboComponents.length === 0) {
      return 0;
    }

    return product.comboComponents.reduce((sum, comp) => {
      const componentProduct = comp.componentProduct;
      if (!componentProduct) return sum;

      // Lấy cost từ inventory của chi nhánh hiện tại
      const inventory = componentProduct.inventories?.find(
        (inv) => inv.branchId === selectedBranch?.id
      );
      const cost = inventory ? Number(inventory.cost) : 0;
      const quantity = Number(comp.quantity || 0);

      return sum + cost * quantity;
    }, 0);
  };

  const calculateTotalRetailPrice = () => {
    if (!product.comboComponents || product.comboComponents.length === 0) {
      return 0;
    }

    return product.comboComponents.reduce((sum, comp) => {
      const componentProduct = comp.componentProduct;
      if (!componentProduct) return sum;

      const price = Number(componentProduct.basePrice || 0);
      const quantity = Number(comp.quantity || 0);

      return sum + price * quantity;
    }, 0);
  };

  const components = product.comboComponents || [];
  const totalPages = Math.ceil(components.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentComponents = components.slice(startIndex, endIndex);

  const currentBranchInventory = product.inventories?.find(
    (inv) => inv.branchId === selectedBranch?.id
  );

  if (isEditing) {
    if (product.type === 1) {
      return (
        <ComboProductForm
          product={product}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            onClose();
          }}
        />
      );
    }

    return (
      <ProductForm
        product={product}
        onClose={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Chi tiết sản phẩm</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="border-b px-4 flex gap-4">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-3 border-b-2 ${
              activeTab === "info"
                ? "border-blue-600 text-blue-600"
                : "border-transparent"
            }`}>
            Thông tin
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "info" && (
            <div className="space-y-6">
              {product.images && product.images.length > 0 && (
                <div className="flex gap-2">
                  {product.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.image}
                      alt={product.name}
                      className="w-24 h-24 object-cover rounded border"
                    />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-600">Mã hàng</label>
                  <p className="font-medium">{product.code}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Tên hàng</label>
                  <p className="font-medium">{product.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Loại hàng</label>
                  <p className="font-medium">
                    {getProductTypeLabel(product.type)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Nhóm hàng</label>
                  <p className="font-medium">{product.category?.name || "-"}</p>
                </div>

                {product.type === 1 ? (
                  <>
                    <div>
                      <label className="text-sm text-gray-600">
                        Tổng giá vốn
                      </label>
                      <p className="font-medium">
                        {calculateTotalPurchasePrice().toLocaleString()} đ
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">
                        Giá bán cơ bản
                      </label>
                      <p className="font-medium">
                        {Number(product.basePrice).toLocaleString()} đ
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm text-gray-600">
                        Giá bán cơ bản
                      </label>
                      <p className="font-medium">
                        {Number(product.basePrice).toLocaleString()} đ
                      </p>
                    </div>

                    {currentBranchInventory && (
                      <>
                        <div>
                          <label className="text-sm text-gray-600">
                            Giá vốn ({currentBranchInventory.branchName})
                          </label>
                          <p className="font-medium">
                            {Number(
                              currentBranchInventory.cost
                            ).toLocaleString()}{" "}
                            đ
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">
                            Tồn kho ({currentBranchInventory.branchName})
                          </label>
                          <p className="font-medium">
                            {Number(
                              currentBranchInventory.onHand
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">
                            Định mức tồn ít nhất
                          </label>
                          <p className="font-medium">
                            {Number(
                              currentBranchInventory.minQuality
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">
                            Định mức tồn nhiều nhất
                          </label>
                          <p className="font-medium">
                            {Number(
                              currentBranchInventory.maxQuality
                            ).toLocaleString()}
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}

                {product.weight && (
                  <div>
                    <label className="text-sm text-gray-600">Trọng lượng</label>
                    <p className="font-medium">
                      {product.weight} {product.weightUnit || "kg"}
                    </p>
                  </div>
                )}
                {product.unit && (
                  <div>
                    <label className="text-sm text-gray-600">Đơn vị tính</label>
                    <p className="font-medium">{product.unit}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-600">Bán trực tiếp</label>
                  <p className="font-medium">
                    {product.isDirectSale ? "Có" : "Không"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Trạng thái</label>
                  <p className="font-medium">
                    {product.isActive ? "Hoạt động" : "Ngừng"}
                  </p>
                </div>
              </div>

              {product.description && (
                <div>
                  <label className="text-sm text-gray-600">Mô tả</label>
                  <p className="font-medium">{product.description}</p>
                </div>
              )}

              {product.orderTemplate && (
                <div>
                  <label className="text-sm text-gray-600">
                    Ghi chú đơn hàng
                  </label>
                  <p className="font-medium">{product.orderTemplate}</p>
                </div>
              )}

              {product.inventories && product.inventories.length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-3">Tồn kho theo chi nhánh</h4>
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-left">Chi nhánh</th>
                          <th className="p-3 text-right">Giá vốn</th>
                          <th className="p-3 text-right">Tồn kho</th>
                          <th className="p-3 text-right">Đã đặt</th>
                          <th className="p-3 text-right">Đang giao</th>
                          <th className="p-3 text-right">
                            Định mức tồn ít nhất
                          </th>
                          <th className="p-3 text-right">
                            Định mức tồn nhiều nhất
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.inventories.map((inv) => (
                          <tr key={inv.id} className="border-t">
                            <td className="p-3 font-medium">
                              {inv.branchName}
                            </td>
                            <td className="p-3 text-right">
                              {Number(inv.cost).toLocaleString()} đ
                            </td>
                            <td className="p-3 text-right">
                              {Number(inv.onHand).toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                              {Number(inv.onOrder).toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                              {Number(inv.reserved).toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                              {Number(inv.minQuality).toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                              {Number(inv.maxQuality).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {product.type === 1 && product.comboComponents && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Hàng thành phần</h3>
                    {components.length > 0 && (
                      <span className="text-sm text-gray-600">
                        Tổng: {components.length} sản phẩm
                      </span>
                    )}
                  </div>
                  <div className="border rounded overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">
                            STT
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium">
                            Mã hàng
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium">
                            Tên hàng thành phần
                          </th>
                          <th className="px-4 py-2 text-center text-sm font-medium">
                            Số lượng
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-medium">
                            Giá vốn
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-medium">
                            Tổng giá vốn
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-medium">
                            Giá bán
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-medium">
                            Tổng giá bán
                          </th>
                        </tr>
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan={5}></td>
                          <td className="px-4 py-2 text-right">
                            {calculateTotalPurchasePrice().toLocaleString()}
                          </td>
                          <td></td>
                          <td className="px-4 py-2 text-right">
                            {calculateTotalRetailPrice().toLocaleString()}
                          </td>
                        </tr>
                      </thead>
                      <tbody>
                        {currentComponents.map((comp, index) => {
                          const actualIndex = startIndex + index;
                          const componentProduct = comp.componentProduct;

                          // Lấy giá vốn từ inventory
                          const inventory = componentProduct?.inventories?.find(
                            (inv) => inv.branchId === selectedBranch?.id
                          );
                          const purchasePrice = inventory
                            ? Number(inventory.cost)
                            : 0;

                          const retailPrice = Number(
                            componentProduct?.basePrice || 0
                          );
                          const quantity = Number(comp.quantity);
                          const totalPurchase = purchasePrice * quantity;
                          const totalRetail = retailPrice * quantity;

                          return (
                            <tr key={comp.id} className="border-t">
                              <td className="px-4 py-2">{actualIndex + 1}</td>
                              <td className="px-4 py-2 text-sm">
                                {componentProduct?.code}
                              </td>
                              <td className="px-4 py-2">
                                {componentProduct?.name}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {quantity}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {purchasePrice.toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {totalPurchase.toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {retailPrice.toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {totalRetail.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {totalPages > 1 && (
                      <div className="border-t p-3 flex items-center justify-between">
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-sm">
                          Trước
                        </button>
                        <span className="text-sm">
                          Trang {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-sm">
                          Sau
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t p-4 flex justify-between">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50">
            Xóa
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50">
              Đóng
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Sửa
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể
              hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50">
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
