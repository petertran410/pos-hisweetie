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
import { MisaItemDropdown } from "./MisaItemDropdown";
import { MisaInventoryItem } from "@/lib/api/misa";
import { usePermission } from "@/lib/hooks/usePermissions";
import { API_URL } from "@/lib/config/api";
import { toast } from "sonner";
import { usePublication } from "./publication/usePublication";
import { PublicationSection } from "./publication/PublicationSection";

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
  const canLinkMisa = usePermission("products", "link_misa");
  const canViewPublication = usePermission("products", "view_publication");
  const canViewCostPrice = usePermission("products", "view_cost_price");
  const canViewSalePrice = usePermission("products", "view_sale_price");
  // Chỉ-công-bố: thiếu cả quyền giá vốn lẫn giá bán.
  const isPublicationOnly = !canViewCostPrice && !canViewSalePrice;
  const [activeTab, setActiveTab] = useState<
    "info" | "description" | "publication"
  >("info");
  const pub = usePublication(product);

  // Liên kết với vật tư hàng hóa Misa (lưu mã + tên + đơn vị).
  const [misaMapping, setMisaMapping] = useState<{
    code: string;
    name: string;
    unit: string;
  }>({
    code: product?.misa_code || "",
    name: product?.misa_name || "",
    unit: product?.misa_unit || "",
  });

  useEffect(() => {
    setMisaMapping({
      code: product?.misa_code || "",
      name: product?.misa_name || "",
      unit: product?.misa_unit || "",
    });
  }, [product]);

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
      shippingWeight: product?.shippingWeight || undefined,
      shippingWeightUnit: product?.shippingWeightUnit || "g",
      vat: product?.vat ?? 8,
      unit: product?.unit || "",
      isDirectSale: product?.isDirectSale || false,
      isActive: product?.isActive ?? true,
      allowsSale: product?.allowsSale ?? true,
      isRewardPoint: product?.isRewardPoint ?? false,
    },
  });

  const hasCostChanged = (): boolean => {
    // Thiếu quyền giá vốn → calculateTotalPurchasePrice() ra NaN (cost thành
    // phần bị strip). Không coi là thay đổi để tránh bật modal sai + gửi NaN.
    if (!canViewCostPrice) return false;

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
    const res = await fetch(`${API_URL}/upload/image`, {
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

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 2MB");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImages((prev) => [
        ...prev,
        { file, preview: reader.result as string },
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

      // Gói dữ liệu công bố (chỉ khi có quyền xem).
      const publicationPayload = await pub.getPayload(canViewPublication);

      const formData: Record<string, any> = {
        code: data.code,
        name: data.name,
        type: 1,
        description: data.description || undefined,
        orderTemplate: data.orderTemplate || undefined,
        categoryId: data.categoryId ? Number(data.categoryId) : undefined,
        tradeMarkId: data.tradeMarkId ? Number(data.tradeMarkId) : undefined,
        ...(canLinkMisa
          ? {
              misa_code: misaMapping.code,
              misa_name: misaMapping.name,
              misa_unit: misaMapping.unit,
            }
          : {}),
        isDirectSale: data.isDirectSale || false,
        isActive: data.isActive ?? true,
        imageUrls: uploadedUrls,
        ...publicationPayload,
        branchId: selectedBranch?.id,
      };

      // Luồng chỉ-công-bố: không gửi giá/tồn kho/thành phần để tránh ghi đè
      // dữ liệu thật, tránh NaN (giá vốn thành phần bị strip) và StockAudit ảo.
      if (isPublicationOnly) {
        await submitProduct(formData);
        return;
      }

      const comboCost = calculateTotalPurchasePrice();
      const comboRetailPrice = calculateTotalRetailPrice();
      const finalBasePrice = Number(data.basePrice) || comboRetailPrice || 0;

      Object.assign(formData, {
        ...(canViewSalePrice ? { basePrice: finalBasePrice } : {}),
        ...(canViewCostPrice ? { purchasePrice: comboCost } : {}),
        stockQuantity: 0,
        minStockAlert: Number(data.minStockAlert) || 0,
        maxStockAlert: Number(data.maxStockAlert) || 0,
        weight: data.weight ? Number(data.weight) : undefined,
        weightUnit: data.weightUnit || "kg",
        shippingWeight: data.shippingWeight
          ? Number(data.shippingWeight)
          : undefined,
        shippingWeightUnit: data.shippingWeightUnit || "g",
        vat:
          data.vat != null && !isNaN(Number(data.vat)) ? Number(data.vat) : 8,
        unit: data.unit || undefined,
        components: components.map((comp) => ({
          componentProductId: comp.componentProductId,
          quantity: comp.quantity,
        })),
      });

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
    branchIds?: number[]
  ) => {
    setShowCostConfirmation(false);

    if (!pendingFormData) return;

    const finalData = {
      ...pendingFormData,
      costScope: scope,
      costBranchIds: branchIds,
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

        <div className="border-b px-4 flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`py-3 px-3 border-b-2 ${
              activeTab === "info"
                ? "border-brand text-brand font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Thông tin
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("description")}
            className={`py-3 px-3 border-b-2 ${
              activeTab === "description"
                ? "border-brand text-brand font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Mô tả
          </button>
          {canViewPublication && (
            <button
              type="button"
              onClick={() => setActiveTab("publication")}
              className={`py-3 px-3 border-b-2 ${
                activeTab === "publication"
                  ? "border-brand text-brand font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              Công bố
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto">
          <div className={activeTab === "info" ? "p-6 space-y-6" : "hidden"}>
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

            {canViewSalePrice && (
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
            )}

            <div>
              <h3 className="font-semibold mb-3">Vị trí, Trọng lượng</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Khối lượng tịnh
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
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Trọng lượng vận chuyển
                  </label>
                  <div className="flex gap-2">
                    <input
                      {...register("shippingWeight", { valueAsNumber: true })}
                      type="number"
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="0"
                    />
                    <select
                      {...register("shippingWeightUnit")}
                      className="border rounded px-3 py-2">
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    VAT (%)
                  </label>
                  <input
                    {...register("vat", { valueAsNumber: true })}
                    type="number"
                    step="any"
                    min={0}
                    className="w-full border rounded px-3 py-2"
                    placeholder="8"
                  />
                </div>
              </div>
              {canLinkMisa && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <MisaItemDropdown
                      label="Liên kết Misa"
                      placeholder="Chọn vật tư hàng hóa Misa"
                      value={misaMapping.code || undefined}
                      valueName={misaMapping.name || undefined}
                      onChange={(item: MisaInventoryItem | null) =>
                        setMisaMapping({
                          code: item?.code || "",
                          name: item?.name || "",
                          unit: item?.unitName || "",
                        })
                      }
                    />
                    {misaMapping.code ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Đã liên kết: {misaMapping.code}
                        {misaMapping.name ? ` - ${misaMapping.name}` : ""}
                        {misaMapping.unit ? ` (${misaMapping.unit})` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
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
              <label className="flex items-center gap-2">
                <input {...register("isDirectSale")} type="checkbox" />
                <span className="text-sm font-medium">Bán trực tiếp</span>
              </label>
            </div>
          </div>

          {/* Tab Mô tả */}
          <div
            className={
              activeTab === "description" ? "p-6 space-y-5" : "hidden"
            }>
            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <textarea
                {...register("description")}
                maxLength={1000}
                className="w-full border rounded px-3 py-2 h-40 bg-white"
                placeholder="Nhập mô tả sản phẩm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Ghi chú đơn hàng
              </label>
              <textarea
                {...register("orderTemplate")}
                maxLength={1000}
                className="w-full border rounded px-3 py-2 h-40 bg-white"
                placeholder="Nhập ghi chú đơn hàng"
              />
            </div>
          </div>

          {/* Tab Công bố */}
          <div
            className={
              canViewPublication && activeTab === "publication"
                ? "p-6 space-y-5"
                : "hidden"
            }>
            <PublicationSection pub={pub} />
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
              className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50">
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
