"use client";

import { useState } from "react";
import type { Product } from "@/lib/api/products";
import { useDeleteProduct } from "@/lib/hooks/useProducts";
import { ProductForm } from "./ProductForm";

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

  if (isEditing) {
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
            <button
              className={`py-3 border-b-2 ${
                activeTab === "inventory"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600"
              }`}
              onClick={() => setActiveTab("inventory")}>
              Tồn kho
            </button>
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
                  <label className="text-sm text-gray-600">Nhóm hàng</label>
                  <p className="font-medium">{product.category?.name || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Thương hiệu</label>
                  <p className="font-medium">
                    {product.tradeMark?.name || "-"}
                  </p>
                </div>
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
                  <label className="text-sm text-gray-600">Định mức tồn</label>
                  <p className="font-medium">{product.minStockAlert}</p>
                </div>
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
            </div>
          )}

          {activeTab === "description" && (
            <div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {product.description || "Chưa có mô tả"}
              </p>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">Tồn kho</p>
                  <p className="text-2xl font-bold">{product.stockQuantity}</p>
                </div>
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">Định mức tồn</p>
                  <p className="text-2xl font-bold">{product.minStockAlert}</p>
                </div>
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">Đang giao dịch</p>
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
