"use client";

import { useState, useEffect } from "react";
import { X, Search, Calendar, Clock } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useProducts } from "@/lib/hooks/useProducts";
import {
  useCreateProduction,
  useUpdateProduction,
} from "@/lib/hooks/useProductions";
import type { Production } from "@/lib/api/productions";
import type { Product } from "@/lib/api/products";

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

  const { data: branches } = useBranches();
  const { data: productsData } = useProducts({ type: 4 });
  const { mutate: createProduction } = useCreateProduction();
  const { mutate: updateProduction } = useUpdateProduction();

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

  const handleSubmit = () => {
    if (!selectedProduct) {
      alert("Vui lòng chọn sản phẩm cần sản xuất");
      return;
    }

    if (quantity <= 0) {
      alert("Số lượng phải lớn hơn 0");
      return;
    }

    const hasInsufficientStock = componentRequirements.some(
      (c) => c.isInsufficient
    );
    if (hasInsufficientStock && autoDeductComponents) {
      alert("Một số thành phần không đủ tồn kho. Vui lòng kiểm tra lại.");
      return;
    }

    const data = {
      code: code || undefined,
      sourceBranchId,
      destinationBranchId,
      productId: selectedProduct.id,
      quantity,
      note,
      status: 1,
      manufacturedDate: manufacturedDate.toISOString(),
      autoDeductComponents,
    };

    if (production) {
      updateProduction(
        { id: production.id, data },
        {
          onSuccess: () => onClose(),
        }
      );
    } else {
      createProduction(data, {
        onSuccess: () => onClose(),
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {production ? "Sửa phiếu sản xuất" : "Tạo phiếu sản xuất"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
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
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      onFocus={() => setShowProductSearch(true)}
                      placeholder="Tìm mặt hàng"
                      className="w-full px-3 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {showProductSearch && (
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
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDeductComponents}
                    onChange={(e) => setAutoDeductComponents(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    Tự động trừ thành phần thứ cấp khi sản xuất
                  </span>
                </label>
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

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50">
            Bỏ qua
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {production ? "Hoàn thành" : "Lưu tạm"}
          </button>
        </div>
      </div>
    </div>
  );
}
