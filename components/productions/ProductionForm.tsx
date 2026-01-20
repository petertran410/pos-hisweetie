"use client";

import { useState, useEffect } from "react";
import { X, Search, Calendar } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useProducts, useProduct } from "@/lib/hooks/useProducts";
import {
  useCreateProduction,
  useUpdateProduction,
} from "@/lib/hooks/useProductions";
import type { Production } from "@/lib/api/productions";
import type { Product } from "@/lib/api/products";
import { CancelConfirmationModal } from "./CancelConfirmationModal";

interface ProductionFormProps {
  sourceBranchId: number;
  destinationBranchId: number;
  production?: Production | null;
  onClose: () => void;
}

export function ProductionForm({
  sourceBranchId: initialSourceBranchId,
  destinationBranchId: initialDestinationBranchId,
  production,
  onClose,
}: ProductionFormProps) {
  const [activeTab, setActiveTab] = useState<"info" | "components">("info");
  const [code, setCode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [manufacturedDate, setManufacturedDate] = useState<Date>(new Date());
  const [quantity, setQuantity] = useState<number>(1);
  const [sourceBranchId, setSourceBranchId] = useState(initialSourceBranchId);
  const [destinationBranchId, setDestinationBranchId] = useState(
    initialDestinationBranchId
  );
  const [note, setNote] = useState("");
  const [autoDeductComponents, setAutoDeductComponents] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { data: branches } = useBranches();
  const { data: productsData } = useProducts({ type: 4 });
  const { data: productDetail } = useProduct(production?.productId || 0);
  const { mutate: createProduction, isPending: isCreating } =
    useCreateProduction();
  const { mutate: updateProduction, isPending: isUpdating } =
    useUpdateProduction();

  const isCompleted = production?.status === 2;
  const isCancelled = production?.status === 3;
  const isSubmitting = isCreating || isUpdating;
  const isFormDisabled = isSubmitting || isCompleted || isCancelled;

  const manufacturingProducts =
    productsData?.data?.filter((p) => p.type === 4) || [];

  const filteredProducts = manufacturingProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (production) {
      setCode(production.code);
      setQuantity(Number(production.quantity));
      setSourceBranchId(production.sourceBranchId);
      setDestinationBranchId(production.destinationBranchId);
      setNote(production.note || "");
      setAutoDeductComponents(production.autoDeductComponents);
      if (production.manufacturedDate) {
        setManufacturedDate(new Date(production.manufacturedDate));
      }
    }
  }, [production]);

  useEffect(() => {
    if (production && productDetail && !selectedProduct) {
      setSelectedProduct(productDetail);
    }
  }, [production, productDetail, selectedProduct]);

  const calculateComponentRequirements = () => {
    if (!selectedProduct || !selectedProduct.comboComponents) return [];

    return selectedProduct.comboComponents.map((comp) => {
      const componentProduct = comp.componentProduct;
      const requiredGramsPerUnit = Number(comp.quantity);
      const totalRequiredGrams = requiredGramsPerUnit * quantity;

      const componentWeight = componentProduct?.weight
        ? Number(componentProduct.weight)
        : 0;
      const componentWeightUnit = componentProduct?.weightUnit || "g";
      const weightInGrams =
        componentWeightUnit === "kg" ? componentWeight * 1000 : componentWeight;

      let unitsToDeduct = 0;
      if (weightInGrams > 0) {
        unitsToDeduct = totalRequiredGrams / weightInGrams;
      }

      const inventory = componentProduct?.inventories?.find(
        (inv) => inv.branchId === sourceBranchId
      );

      const availableStock = inventory ? Number(inventory.onHand) : 0;
      const isInsufficient = availableStock < unitsToDeduct;

      return {
        productCode: componentProduct?.code || "",
        productName: componentProduct?.name || "",
        requiredGramsPerUnit,
        totalRequiredGrams,
        weightInGrams,
        unitsToDeduct,
        availableStock,
        isInsufficient,
      };
    });
  };

  const componentRequirements = calculateComponentRequirements();

  const validateForm = () => {
    if (!selectedProduct) {
      alert("Vui lòng chọn sản phẩm cần sản xuất");
      return false;
    }

    if (quantity <= 0) {
      alert("Số lượng phải lớn hơn 0");
      return false;
    }

    return true;
  };

  const handleSubmit = (status: number) => {
    if (!validateForm()) return;

    const hasInsufficientStock = componentRequirements.some(
      (c) => c.isInsufficient
    );

    if (status === 2 && hasInsufficientStock && autoDeductComponents) {
      alert("Một số thành phần không đủ tồn kho. Vui lòng kiểm tra lại.");
      return;
    }

    const data = {
      code: code || undefined,
      sourceBranchId: Number(sourceBranchId),
      destinationBranchId: Number(destinationBranchId),
      productId: Number(selectedProduct!.id),
      quantity: Number(quantity),
      note: note || undefined,
      status: Number(status),
      manufacturedDate: manufacturedDate.toISOString(),
      autoDeductComponents: Boolean(autoDeductComponents),
    };

    if (production) {
      updateProduction(
        { id: production.id, data },
        {
          onSuccess: () => onClose(),
          onError: (error) => {
            console.error("Error updating production:", error);
            alert("Có lỗi xảy ra khi cập nhật phiếu sản xuất");
          },
        }
      );
    } else {
      createProduction(data, {
        onSuccess: () => onClose(),
        onError: (error) => {
          console.error("Error creating production:", error);
          alert("Có lỗi xảy ra khi tạo phiếu sản xuất");
        },
      });
    }
  };

  const handleSaveDraft = () => {
    handleSubmit(1);
  };

  const handleComplete = () => {
    if (!autoDeductComponents) {
      const confirmMessage =
        "Bạn đã tắt tùy chọn 'Tự động trừ thành phần'. Phiếu sẽ được đánh dấu hoàn thành nhưng tồn kho sẽ không thay đổi. Bạn có chắc chắn?";
      if (!confirm(confirmMessage)) return;
    }
    handleSubmit(2);
  };

  const handleCancel = () => {
    if (!production) return;

    if (production.status === 3) {
      alert("Phiếu đã bị hủy rồi");
      return;
    }

    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    if (!production) return;

    const data = {
      status: 3,
    };

    updateProduction(
      { id: production.id, data },
      {
        onSuccess: () => {
          setShowCancelConfirm(false);
          onClose();
        },
        onError: (error) => {
          console.error("Error canceling production:", error);
          setShowCancelConfirm(false);
          alert("Có lỗi xảy ra khi hủy phiếu sản xuất");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {production
              ? isCompleted
                ? "Xem phiếu sản xuất"
                : "Sửa phiếu sản xuất"
              : "Tạo phiếu sản xuất"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-6 py-3 border-b-2 transition-colors ${
                activeTab === "info"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              Thông tin sản xuất
            </button>
            <button
              onClick={() => setActiveTab("components")}
              className={`px-6 py-3 border-b-2 transition-colors ${
                activeTab === "components"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              Bảng dự tính sử dụng nguyên liệu
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "info" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mã sản xuất
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Mã phiếu tự động"
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={isFormDisabled}
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-1">
                    Sản xuất mặt hàng
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={
                        selectedProduct ? selectedProduct.name : searchQuery
                      }
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowProductSearch(true);
                      }}
                      onFocus={() =>
                        !isFormDisabled && setShowProductSearch(true)
                      }
                      placeholder="Tìm mặt hàng"
                      className="w-full px-3 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      disabled={isFormDisabled}
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {showProductSearch && !isFormDisabled && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-60 overflow-y-auto">
                      {filteredProducts.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Không tìm thấy sản phẩm
                        </div>
                      ) : (
                        filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowProductSearch(false);
                              setSearchQuery("");
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              {product.code}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ngày tạo
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={manufacturedDate.toISOString().slice(0, 16)}
                      onChange={(e) =>
                        setManufacturedDate(new Date(e.target.value))
                      }
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      disabled={isFormDisabled}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={isFormDisabled}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Chi nhánh đầu vào
                  </label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={isFormDisabled}>
                    {branches?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Chi nhánh đầu ra
                  </label>
                  <select
                    value={destinationBranchId}
                    onChange={(e) =>
                      setDestinationBranchId(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={isFormDisabled}>
                    {branches?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Ghi chú..."
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isFormDisabled}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDeductComponents}
                    onChange={(e) => setAutoDeductComponents(e.target.checked)}
                    className="rounded disabled:cursor-not-allowed"
                    disabled={isFormDisabled}
                  />
                  <span className="text-sm">
                    Tự động trừ thành phần thứ cấp khi sản xuất
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  {autoDeductComponents
                    ? "Khi hoàn thành, tồn kho nguyên liệu sẽ tự động trừ và tồn kho thành phẩm sẽ được cộng"
                    : "Tồn kho sẽ không tự động thay đổi khi hoàn thành phiếu"}
                </p>
              </div>
            </div>
          ) : (
            <div>
              {!selectedProduct ? (
                <div className="text-center text-gray-500 py-8">
                  Vui lòng chọn sản phẩm ở tab "Thông tin sản xuất"
                </div>
              ) : componentRequirements.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Sản phẩm này chưa có thành phần nào
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Mã thành phần
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Tên thành phần
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Cần (g/sp)
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Tổng cần (g)
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Quy đổi (units)
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Tồn kho
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {componentRequirements.map((req, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-3 text-sm">
                            {req.productCode}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {req.productName}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {req.requiredGramsPerUnit.toLocaleString("vi-VN")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {req.totalRequiredGrams.toLocaleString("vi-VN")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {req.unitsToDeduct.toLocaleString("vi-VN", {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {req.availableStock.toLocaleString("vi-VN")}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {req.isInsufficient ? (
                              <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
                                Không đủ
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                                Đủ
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-4 border-t">
          {production && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50"
              hidden={isSubmitting || production.status === 3}>
              {isSubmitting ? "Đang xử lý..." : "Hủy"}
            </button>
          )}

          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              disabled={isSubmitting}>
              Bỏ qua
            </button>

            {(!production || production.status === 1) && (
              <>
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
                  disabled={isSubmitting}>
                  {isSubmitting ? "Đang xử lý..." : "Lưu tạm"}
                </button>
                <button
                  onClick={handleComplete}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmitting}>
                  {isSubmitting ? "Đang xử lý..." : "Hoàn thành"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showCancelConfirm && production && (
        <CancelConfirmationModal
          productionCode={production.code}
          productionStatus={production.status}
          onConfirm={confirmCancel}
          onClose={() => setShowCancelConfirm(false)}
        />
      )}
    </div>
  );
}
