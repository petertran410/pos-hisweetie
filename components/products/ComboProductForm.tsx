"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Product } from "@/lib/api/products";
import {
  useCreateProduct,
  useUpdateProduct,
  useProducts,
} from "@/lib/hooks/useProducts";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { CostConfirmationModal } from "./CostConfirmationModal";
import { CategoryDropdown } from "./CategoryDropdown";

interface ComboComponent {
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

interface ComboProductFormProps {
  product?: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export function ComboProductForm({
  product,
  onClose,
  onSuccess,
}: ComboProductFormProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [components, setComponents] = useState<ComboComponent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCostConfirmation, setShowCostConfirmation] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const itemsPerPage = 10;

  const { data: trademarks } = useTrademarks();
  const { data: searchResults } = useProducts({
    search: searchQuery,
    limit: 10,
  });
  const { selectedBranch } = useBranchStore();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

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
      basePrice: product?.basePrice || 0,
      minStockAlert: 0,
      maxStockAlert: 0,
      weight: product?.weight || undefined,
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
      // Reset về trang cuối khi thêm sản phẩm mới
      const newTotalPages = Math.ceil((components.length + 1) / itemsPerPage);
      setCurrentPage(newTotalPages);
    }
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const updateComponentQuantity = (index: number, quantity: number) => {
    const updated = [...components];
    updated[index].quantity = Math.max(1, quantity);
    setComponents(updated);
  };

  const removeComponent = (index: number) => {
    const newComponents = components.filter((_, i) => i !== index);
    setComponents(newComponents);

    // Adjust current page if needed
    const newTotalPages = Math.ceil(newComponents.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  };

  const calculateTotalPurchasePrice = () => {
    return components.reduce((sum, comp) => {
      const componentProduct = comp.componentProduct;
      if (!componentProduct) return sum;

      const inventory = componentProduct.inventories?.find(
        (inv) => inv.branchId === selectedBranch?.id
      );
      const cost = inventory ? Number(inventory.cost) : 0;
      const quantity = Number(comp.quantity || 0);

      return sum + cost * quantity;
    }, 0);
  };

  const calculateTotalRetailPrice = () => {
    return components.reduce((sum, comp) => {
      const componentProduct = comp.componentProduct;
      if (!componentProduct) return sum;

      const price = Number(componentProduct.basePrice || 0);
      const quantity = Number(comp.quantity || 0);

      return sum + price * quantity;
    }, 0);
  };

  const totalPages = Math.ceil(components.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentComponents = components.slice(startIndex, endIndex);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const comboCost = calculateTotalPurchasePrice();
      const comboRetailPrice = calculateTotalRetailPrice();

      const finalBasePrice = Number(data.basePrice) || comboRetailPrice || 0;

      const formData = {
        code: data.code,
        name: data.name,
        type: 1,
        description: data.description || undefined,
        orderTemplate: data.orderTemplate || undefined,
        categoryId: data.categoryId ? Number(data.categoryId) : undefined,
        tradeMarkId: data.tradeMarkId ? Number(data.tradeMarkId) : undefined,
        basePrice: finalBasePrice,
        purchasePrice: comboCost,
        stockQuantity: 0,
        minStockAlert: Number(data.minStockAlert) || 0,
        maxStockAlert: Number(data.maxStockAlert) || 0,
        weight: data.weight ? Number(data.weight) : undefined,
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
      costBranchId: branchId,
    };

    await submitProduct(finalData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-5xl h-[90vh] flex flex-col rounded-lg">
        <div className="border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {product ? "Sửa Combo - đóng gói" : "Tạo Combo - đóng gói"}
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

            <div className="grid grid-cols-3 gap-4">
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

              <CategoryDropdown
                type="child"
                label="Danh Mục"
                placeholder="Chọn danh mục"
                value={watch("childName")}
                onChange={(value) => setValue("childName", value)}
              />
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Hàng thành phần</h3>
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
                    {searchResults.data
                      .filter((p) => p.type !== 1)
                      .map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addComponent(product)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3">
                          <span className="text-sm text-gray-500">
                            {product.code}
                          </span>
                          <span className="flex-1">{product.name}</span>
                          <span className="text-sm text-gray-500">
                            {Number(product.basePrice).toLocaleString()} đ
                          </span>
                        </button>
                      ))}
                  </div>
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
                      <th className="px-4 py-2"></th>
                    </tr>
                    {components.length > 0 && (
                      <tr className="bg-gray-100 font-semibold">
                        <td colSpan={5}></td>
                        <td className="px-4 py-2 text-right">
                          {calculateTotalPurchasePrice().toLocaleString()}
                        </td>
                        <td></td>
                        <td className="px-4 py-2 text-right">
                          {calculateTotalRetailPrice().toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {currentComponents.map((comp, index) => {
                      const actualIndex = startIndex + index;
                      const componentProduct = comp.componentProduct;

                      const inventory = componentProduct?.inventories?.find(
                        (inv) => inv.branchId === selectedBranch?.id
                      );
                      const purchasePrice = inventory
                        ? Number(inventory.cost)
                        : 0;

                      const retailPrice = Number(
                        componentProduct?.basePrice || 0
                      );
                      const totalPurchase = purchasePrice * comp.quantity;
                      const totalRetail = retailPrice * comp.quantity;

                      return (
                        <tr key={actualIndex} className="border-t">
                          <td className="px-4 py-2">{actualIndex + 1}</td>
                          <td className="px-4 py-2 text-sm">
                            {comp.componentProduct?.code}
                          </td>
                          <td className="px-4 py-2">
                            {comp.componentProduct?.name}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1"
                              value={comp.quantity}
                              onChange={(e) =>
                                updateComponentQuantity(
                                  actualIndex,
                                  Number(e.target.value)
                                )
                              }
                              className="w-20 border rounded px-2 py-1 text-center"
                            />
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
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => removeComponent(actualIndex)}
                              className="text-red-600 hover:text-red-800">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {components.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-8 text-center text-gray-500">
                          Chưa có hàng thành phần. Tìm kiếm và thêm sản phẩm ở
                          trên.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-t p-3 flex items-center justify-between bg-gray-50">
                    <div className="text-sm text-gray-600">
                      Hiển thị {startIndex + 1} -{" "}
                      {Math.min(endIndex, components.length)} trong tổng{" "}
                      {components.length} sản phẩm
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                        ‹
                      </button>
                      <span className="text-sm">
                        Trang {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Giá bán</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Giá bán
                  </label>
                  <input
                    {...register("basePrice", { valueAsNumber: true })}
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Vị trí, Trọng lượng</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Trọng lượng đơn vị
                  </label>
                  <div className="flex gap-2">
                    <input
                      {...register("weight", { valueAsNumber: true })}
                      type="number"
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="550"
                    />
                    <select
                      {...register("weightUnit")}
                      className="border rounded px-3 py-2">
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Hình ảnh</h3>
              <div className="flex gap-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24">
                    <img
                      src={img.preview}
                      alt=""
                      className="w-full h-full object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6">
                      ✕
                    </button>
                  </div>
                ))}
                <label className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-gray-50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <span className="text-3xl text-gray-400">+</span>
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
