"use client";

import { useState } from "react";
import type { Product } from "@/lib/api/products";
import { useDeleteProduct } from "@/lib/hooks/useProducts";
import { ProductForm } from "./ProductForm";
import { ComboProductForm } from "./ComboProductForm";

interface ProductDetailProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetail({ product, onClose }: ProductDetailProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteProduct = useDeleteProduct();

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
    if (!product.comboComponents) return 0;
    return product.comboComponents.reduce((sum, comp) => {
      const price = Number(comp.componentProduct?.purchasePrice || 0);
      const quantity = Number(comp.quantity);
      return sum + price * quantity;
    }, 0);
  };

  const calculateTotalRetailPrice = () => {
    if (!product.comboComponents) return 0;
    return product.comboComponents.reduce((sum, comp) => {
      const price = Number(comp.componentProduct?.retailPrice || 0);
      const quantity = Number(comp.quantity);
      return sum + price * quantity;
    }, 0);
  };

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
      <div className="bg-white w-full max-w-4xl h-[90vh] flex flex-col rounded-lg">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {product.images && product.images.length > 0 && (
              <img
                src={product.images[0].image}
                alt={product.name}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <p className="text-sm text-gray-500">{product.code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b px-4">
          <div className="flex gap-6">
            <button
              className={`py-3 border-b-2 ${
                activeTab === "info"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600"
              }`}
              onClick={() => setActiveTab("info")}>
              Thông tin
            </button>
            <button
              className={`py-3 border-b-2 ${
                activeTab === "description"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600"
              }`}
              onClick={() => setActiveTab("description")}>
              Mô tả
            </button>
            {product.type !== 1 && (
              <button
                className={`py-3 border-b-2 ${
                  activeTab === "inventory"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600"
                }`}
                onClick={() => setActiveTab("inventory")}>
                Tồn kho
              </button>
            )}
            <button
              className={`py-3 border-b-2 ${
                activeTab === "links"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600"
              }`}
              onClick={() => setActiveTab("links")}>
              Liên kết kiểm bán
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "info" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="text-sm text-gray-600">Thương hiệu</label>
                  <p className="font-medium">
                    {product.tradeMark?.name || "-"}
                  </p>
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
                      <label className="text-sm text-gray-600">Giá bán</label>
                      <p className="font-medium">
                        {Number(product.retailPrice).toLocaleString()} đ
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm text-gray-600">Giá vốn</label>
                      <p className="font-medium">
                        {Number(product.purchasePrice).toLocaleString()} đ
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Giá bán</label>
                      <p className="font-medium">
                        {Number(product.retailPrice).toLocaleString()} đ
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Tồn kho</label>
                      <p className="font-medium">{product.stockQuantity}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">
                        Định mức tồn ít nhất
                      </label>
                      <p className="font-medium">{product.minStockAlert}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">
                        Định mức tồn nhiều nhất
                      </label>
                      <p className="font-medium">{product.maxStockAlert}</p>
                    </div>
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
              </div>

              {product.type === 1 && product.comboComponents && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Hàng thành phần</h3>
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
                        {product.comboComponents.map((comp, index) => {
                          const purchasePrice = Number(
                            comp.componentProduct?.purchasePrice || 0
                          );
                          const retailPrice = Number(
                            comp.componentProduct?.retailPrice || 0
                          );
                          const quantity = Number(comp.quantity);
                          const totalPurchase = purchasePrice * quantity;
                          const totalRetail = retailPrice * quantity;

                          return (
                            <tr key={comp.id} className="border-t">
                              <td className="px-4 py-2">{index + 1}</td>
                              <td className="px-4 py-2 text-sm">
                                {comp.componentProduct?.code}
                              </td>
                              <td className="px-4 py-2">
                                {comp.componentProduct?.name}
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
                        {product.comboComponents.length === 0 && (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-4 py-8 text-center text-gray-500">
                              Chưa có hàng thành phần
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {product.attributesText && (
                  <div>
                    <label className="text-sm text-gray-600">Thuộc tính</label>
                    <div className="mt-2 space-y-1">
                      {product.attributesText.split("|").map((attr, idx) => {
                        const [name, value] = attr.split(":");
                        return (
                          <p key={idx} className="text-sm">
                            <span className="font-medium">{name}:</span> {value}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0].image}
                      alt={product.name}
                      className="w-30 max-h-[15rem] rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs">
                      N/A
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "description" && (
            <div>
              <div className="mb-3 p-6 bg-gray-50 w-full border rounded-lg">
                <p className="mb-3">Mô tả:</p>
                <p className="whitespace-pre-wrap text-center">
                  {product.description || "Chưa có mô tả"}
                </p>
              </div>
              <div className="p-6 bg-gray-50 w-full border rounded-lg">
                <p className="mb-3">Ghi chú đơn hàng:</p>
                <p className="whitespace-pre-wrap text-center">
                  {product.orderTemplate || "Chưa có ghi chú đơn hàng"}
                </p>
              </div>
            </div>
          )}

          {activeTab === "inventory" && product.type !== 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">Tồn kho</p>
                  <p className="text-2xl font-bold">{product.stockQuantity}</p>
                </div>
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">
                    Định mức tồn thấp nhất
                  </p>
                  <p className="text-2xl font-bold">{product.minStockAlert}</p>
                </div>
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">
                    Định mức tồn nhiều nhất
                  </p>
                  <p className="text-2xl font-bold">{product.maxStockAlert}</p>
                </div>
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">Khách đặt</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "links" && (
            <div>
              <p className="text-gray-500">Chưa có liên kết kiểm bán</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50">
            Xóa
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Chỉnh sửa
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa sản phẩm "{product.name}"?
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
