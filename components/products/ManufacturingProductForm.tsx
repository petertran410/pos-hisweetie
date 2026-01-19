"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Product } from "@/lib/api/products";
import {
  useCreateProduct,
  useUpdateProduct,
  useProducts,
} from "@/lib/hooks/useProducts";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { CostConfirmationModal } from "./CostConfirmationModal";
import { CategoryDropdown } from "./CategoryDropdown";
import { toast } from "sonner";
import { TrademarkDropdown } from "./TrademarkDropdown";
import { useFormattedNumber } from "@/lib/hooks/useFormattedNumber";

interface ManufacturingComponent {
  id?: number;
  componentProductId: number;
  componentProduct?: Product;
  quantity: number;
}

interface ImageItem {
  url?: string;
  file?: File;
  preview: string;
}

interface ManufacturingProductFormProps {
  product?: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManufacturingProductForm({
  product,
  onClose,
  onSuccess,
}: ManufacturingProductFormProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [components, setComponents] = useState<ManufacturingComponent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCostConfirmation, setShowCostConfirmation] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const itemsPerPage = 10;

  const { data: searchResults } = useProducts({
    search: searchQuery,
    limit: 10,
  });
  const { selectedBranch } = useBranchStore();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const currentBranchInventory = product?.inventories?.find(
    (inv) => inv.branchId === selectedBranch?.id
  );

  const [quantityInputs, setQuantityInputs] = useState<{
    [key: number]: string;
  }>({});

  const handleQuantityChange = (productId: number, inputValue: string) => {
    const cleaned = inputValue.replace(/[^\d.]/g, "");

    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) return;

    setQuantityInputs((prev) => ({
      ...prev,
      [productId]: cleaned,
    }));

    if (cleaned === "" || cleaned === ".") {
      updateComponentQuantity(productId, 0);
      return;
    }

    const numValue = parseFloat(cleaned);
    if (!isNaN(numValue)) {
      updateComponentQuantity(productId, numValue);
    }
  };

  const basePrice = useFormattedNumber(product?.basePrice || 0);
  const weight = useFormattedNumber(product?.weight || 0);
  const stockQuantity = useFormattedNumber(
    currentBranchInventory ? Number(currentBranchInventory.onHand) : 0
  );
  const minStockAlert = useFormattedNumber(
    currentBranchInventory ? Number(currentBranchInventory.minQuality) : 0
  );
  const maxStockAlert = useFormattedNumber(
    currentBranchInventory ? Number(currentBranchInventory.maxQuality) : 0
  );

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      code: product?.code || "",
      name: product?.name || "",
      description: product?.description || "",
      orderTemplate: product?.orderTemplate || "",
      parentName: product?.parentName || undefined,
      middleName: product?.middleName || undefined,
      childName: product?.childName || undefined,
      tradeMarkId: product?.tradeMarkId || undefined,
      weightUnit: product?.weightUnit || "kg",
      unit: product?.unit || "",
      isDirectSale: product?.isDirectSale || false,
      isActive: product?.isActive ?? true,
      allowsSale: product?.allowsSale ?? true,
      isRewardPoint: product?.isRewardPoint ?? false,
    },
  });

  const hasCostChanged = (): boolean => {
    const newCost = calculateTotalPurchasePrice();

    if (!product) return newCost > 0;

    const currentCost =
      product.inventories?.find((inv) => inv.branchId === selectedBranch?.id)
        ?.cost || 0;

    return Number(currentCost) !== newCost;
  };

  const submitProduct = async (formData: any) => {
    setIsSubmitting(true);
    try {
      if (product) {
        await updateProduct.mutateAsync(
          { id: product.id, data: formData },
          { onSuccess }
        );
      } else {
        await createProduct.mutateAsync(formData, { onSuccess });
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
      setPendingFormData(null);
    }
  };

  useEffect(() => {
    if (product?.comboComponents) {
      const loadedComponents = product.comboComponents.map((comp) => ({
        id: comp.id,
        componentProductId: comp.componentProductId,
        componentProduct: comp.componentProduct,
        quantity: Number(comp.quantity),
      }));
      setComponents(loadedComponents);

      const initialInputs: { [key: number]: string } = {};
      loadedComponents.forEach((comp) => {
        initialInputs[comp.componentProductId] = comp.quantity.toString();
      });
      setQuantityInputs(initialInputs);
    }
  }, [product]);

  useEffect(() => {
    if (product?.images) {
      const loadedImages = product.images.map((img) => ({
        url: img.image,
        preview: img.image,
      }));
      setImages(loadedImages);
    }
  }, [product]);

  useEffect(() => {
    if (product) {
      basePrice.reset(product.basePrice || 0);
      weight.reset(product.weight || 0);
      stockQuantity.reset(
        currentBranchInventory ? Number(currentBranchInventory.onHand) : 0
      );
      minStockAlert.reset(
        currentBranchInventory ? Number(currentBranchInventory.minQuality) : 0
      );
      maxStockAlert.reset(
        currentBranchInventory ? Number(currentBranchInventory.maxQuality) : 0
      );
    }
  }, [product, selectedBranch]);

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const token = useAuthStore.getState().token;
    const res = await fetch("http://localhost:3060/api/upload/image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Upload failed");
    }

    const result = await res.json();
    return result.url;
  };

  const addComponent = (selectedProduct: Product) => {
    const exists = components.find(
      (c) => c.componentProductId === selectedProduct.id
    );
    if (!exists) {
      setComponents([
        ...components,
        {
          componentProductId: selectedProduct.id,
          componentProduct: selectedProduct,
          quantity: 1,
        },
      ]);
      setSearchQuery("");
      setShowSearchResults(false);
    }
  };

  const removeComponent = (productId: number) => {
    setComponents((prev) =>
      prev.filter((c) => c.componentProductId !== productId)
    );
  };

  const updateComponentQuantity = (productId: number, quantity: number) => {
    setComponents((prev) =>
      prev.map((c) =>
        c.componentProductId === productId ? { ...c, quantity } : c
      )
    );
  };

  const calculateComponentCostByQuantity = (
    comp: ManufacturingComponent
  ): number => {
    const componentProduct = comp.componentProduct;
    if (!componentProduct) return 0;

    const inventory = componentProduct.inventories?.find(
      (inv) => inv.branchId === selectedBranch?.id
    );
    const cost = inventory ? Number(inventory.cost) : 0;
    const weight = componentProduct.weight
      ? Number(componentProduct.weight)
      : 0;

    if (weight === 0) return 0;

    const weightInGrams =
      componentProduct.weightUnit === "kg" ? weight * 1000 : weight;

    return (cost / weightInGrams) * comp.quantity;
  };

  const calculateTotalPurchasePrice = () => {
    return components.reduce((sum, comp) => {
      return sum + calculateComponentCostByQuantity(comp);
    }, 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImages((prev) => [
        ...prev,
        {
          file,
          preview: reader.result as string,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: any) => {
    if (components.length === 0) {
      toast.error("Hàng thành phần thiếu", {
        description: "Vui lòng thêm ít nhất một hàng thành phần.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrls: string[] = [];

      for (const img of images) {
        if (img.file) {
          const url = await uploadFile(img.file);
          uploadedUrls.push(url);
        } else if (img.url) {
          uploadedUrls.push(img.url);
        }
      }

      const manufacturingCost = calculateTotalPurchasePrice();

      const formData = {
        code: data.code,
        name: data.name,
        type: 4,
        description: data.description || undefined,
        orderTemplate: data.orderTemplate || undefined,
        parentName: data.parentName || undefined,
        middleName: data.middleName || undefined,
        childName: data.childName || undefined,
        tradeMarkId: data.tradeMarkId ? Number(data.tradeMarkId) : undefined,
        basePrice: basePrice.value,
        purchasePrice: manufacturingCost,
        stockQuantity: stockQuantity.value,
        minStockAlert: minStockAlert.value,
        maxStockAlert: maxStockAlert.value,
        weight: weight.value || undefined,
        weightUnit: data.weightUnit || "kg",
        unit: data.unit || undefined,
        isDirectSale: data.isDirectSale || false,
        isActive: data.isActive ?? true,
        imageUrls: uploadedUrls,
        components: components.map((comp) => ({
          componentProductId: comp.componentProductId,
          quantity: comp.quantity,
        })),
        branchId: selectedBranch?.id,
      };

      if (hasCostChanged()) {
        setPendingFormData(formData);
        setShowCostConfirmation(true);
        setIsSubmitting(false);
        return;
      }

      await submitProduct(formData);
    } catch (error) {
      console.error("Submit error:", error);
      setIsSubmitting(false);
    }
  };

  const handleCostConfirm = async (
    scope: "all" | "specific",
    branchId?: number[]
  ) => {
    setShowCostConfirmation(false);

    if (!pendingFormData) return;

    const finalData = {
      ...pendingFormData,
      costScope: scope,
      costBranchIds: branchId,
    };

    await submitProduct(finalData);
  };

  const totalPages = Math.ceil((components.length || 0) / itemsPerPage);
  const paginatedComponents = components.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-5xl h-[90vh] flex flex-col rounded-lg">
        <div className="border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {product ? "Sửa Hàng sản xuất" : "Tạo Hàng sản xuất"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="border-b px-4">
          <button className="py-3 border-b-2 border-blue-600 text-blue-600">
            Thông tin
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mã hàng
                </label>
                <input
                  {...register("code")}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Tự động"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tên hàng <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("name", { required: true })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Nhập tên hàng"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <CategoryDropdown
                type="parent"
                label="Loại Hàng"
                placeholder="Chọn loại hàng"
                value={watch("parentName")}
                onChange={(value) => setValue("parentName", value)}
              />

              <CategoryDropdown
                type="middle"
                label="Nguồn Gốc"
                placeholder="Chọn nguồn gốc"
                value={watch("middleName")}
                onChange={(value) => setValue("middleName", value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <CategoryDropdown
                type="child"
                label="Danh Mục"
                placeholder="Chọn danh mục"
                value={watch("childName")}
                onChange={(value) => setValue("childName", value)}
              />

              <TrademarkDropdown
                label="Thương hiệu"
                placeholder="Chọn thương hiệu"
                value={watch("tradeMarkId")}
                onChange={(value) => setValue("tradeMarkId", value)}
              />
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  Hàng thành phần <span className="text-red-500">*</span>
                </h3>
                {components.length > 0 && (
                  <span className="text-sm text-gray-600">
                    Tổng: {components.length} sản phẩm
                  </span>
                )}
              </div>

              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Thêm hàng thành phần"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  onBlur={() =>
                    setTimeout(() => setShowSearchResults(false), 200)
                  }
                  className="w-full border rounded px-3 py-2"
                />

                {showSearchResults && searchQuery && searchResults?.data && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto z-10">
                    {searchResults.data.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addComponent(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-sm text-gray-500">{p.code}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {components.length > 0 && (
                <div className="border rounded">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium">
                          Mã hàng
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium">
                          Tên hàng
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium">
                          Tồn kho
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium">
                          Định lượng
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium">
                          Giá vốn theo định lượng
                        </th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedComponents.map((comp) => {
                        const inventory =
                          comp.componentProduct?.inventories?.find(
                            (inv) => inv.branchId === selectedBranch?.id
                          );
                        const cost = inventory ? Number(inventory.cost) : 0;
                        const stock = inventory ? Number(inventory.onHand) : 0;
                        const costByQuantity =
                          calculateComponentCostByQuantity(comp);

                        return (
                          <tr
                            key={comp.componentProductId}
                            className="border-t">
                            <td className="px-3 py-2 text-sm">
                              {comp.componentProduct?.code}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {comp.componentProduct?.name}
                            </td>
                            <td className="px-3 py-2 text-sm">{stock}</td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={
                                  quantityInputs[comp.componentProductId] !==
                                  undefined
                                    ? quantityInputs[comp.componentProductId]
                                    : comp.quantity.toString()
                                }
                                onChange={(e) =>
                                  handleQuantityChange(
                                    comp.componentProductId,
                                    e.target.value
                                  )
                                }
                                onBlur={() => {
                                  if (
                                    comp.quantity === 0 ||
                                    !quantityInputs[comp.componentProductId]
                                  ) {
                                    setQuantityInputs((prev) => ({
                                      ...prev,
                                      [comp.componentProductId]: "",
                                    }));
                                  }
                                }}
                                className="w-24 border rounded px-2 py-1 text-sm"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {costByQuantity.toLocaleString()} đ
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  removeComponent(comp.componentProductId)
                                }
                                className="text-red-500 hover:text-red-700">
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className="px-3 py-1 border rounded disabled:opacity-50">
                        Trước
                      </button>
                      <span className="text-sm">
                        Trang {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="px-3 py-1 border rounded disabled:opacity-50">
                        Sau
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Giá vốn (tự động tính)
                </label>
                <input
                  type="text"
                  value={calculateTotalPurchasePrice().toLocaleString("en-US")}
                  readOnly
                  className="w-full border rounded px-3 py-2 bg-gray-50 cursor-not-allowed"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Giá bán
                </label>
                <input
                  type="text"
                  value={basePrice.displayValue}
                  onChange={basePrice.handleChange}
                  onBlur={basePrice.handleBlur}
                  className="w-full border rounded px-3 py-2"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tồn kho
                </label>
                <input
                  type="text"
                  value={stockQuantity.displayValue}
                  onChange={stockQuantity.handleChange}
                  onBlur={stockQuantity.handleBlur}
                  className="w-full border rounded px-3 py-2"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Định mức tồn thấp nhất
                </label>
                <input
                  type="text"
                  value={minStockAlert.displayValue}
                  onChange={minStockAlert.handleChange}
                  onBlur={minStockAlert.handleBlur}
                  className="w-full border rounded px-3 py-2"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Định mức tồn cao nhất
                </label>
                <input
                  type="text"
                  value={maxStockAlert.displayValue}
                  onChange={maxStockAlert.handleChange}
                  onBlur={maxStockAlert.handleBlur}
                  className="w-full border rounded px-3 py-2"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Trọng lượng đơn vị
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={weight.displayValue}
                    onChange={weight.handleChange}
                    onBlur={weight.handleBlur}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="0"
                  />
                  <select
                    {...register("weightUnit")}
                    className="border rounded px-3 py-2 w-24">
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Đơn vị tính
                </label>
                <input
                  {...register("unit")}
                  className="w-full border rounded px-3 py-2"
                  placeholder="cái, chiếc, hộp..."
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Hình ảnh</h3>
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24">
                    <img
                      src={img.preview}
                      alt=""
                      className="w-full h-full object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      ✕
                    </button>
                  </div>
                ))}
                <label className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-gray-50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <span className="text-2xl text-gray-400">+</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <textarea
                {...register("description")}
                className="w-full border rounded px-3 py-2 h-24"
                placeholder="Nhập mô tả sản phẩm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Ghi chú đơn hàng
              </label>
              <textarea
                {...register("orderTemplate")}
                className="w-full border rounded px-3 py-2 h-24"
                placeholder="Nhập ghi chú đơn hàng"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input {...register("isDirectSale")} type="checkbox" />
                <span className="text-sm font-medium">Bán trực tiếp</span>
              </label>
            </div>
          </div>

          <div className="border-t p-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              disabled={isSubmitting}>
              Bỏ qua
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? "Đang lưu..." : product ? "Lưu" : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
      {showCostConfirmation && (
        <CostConfirmationModal
          onConfirm={handleCostConfirm}
          onCancel={() => {
            setShowCostConfirmation(false);
            setPendingFormData(null);
            setIsSubmitting(false);
          }}
        />
      )}
    </div>
  );
}
