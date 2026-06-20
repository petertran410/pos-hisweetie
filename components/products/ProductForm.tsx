"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Product } from "@/lib/api/products";
import { useCreateProduct, useUpdateProduct } from "@/lib/hooks/useProducts";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { UnitAttributeModal } from "./UnitAttributeModal";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { CostConfirmationModal } from "./CostConfirmationModal";
import { CategoryDropdown } from "./CategoryDropdown";
import { TrademarkDropdown } from "./TrademarkDropdown";
import { MisaItemDropdown } from "./MisaItemDropdown";
import { MisaInventoryItem } from "@/lib/api/misa";
import { FormSection } from "./FormSection";
import { useFormattedNumber } from "@/lib/hooks/useFormattedNumber";
import { usePermission } from "@/lib/hooks/usePermissions";
import { API_URL } from "@/lib/config/api";
import { toast } from "sonner";
import { X } from "lucide-react";
import { usePublication } from "./publication/usePublication";
import { PublicationSection } from "./publication/PublicationSection";

interface ProductFormProps {
  product?: Product;
  productType?: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImageItem {
  url?: string;
  file?: File;
  preview: string;
}

export function ProductForm({
  product,
  productType,
  onClose,
  onSuccess,
}: ProductFormProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    "info" | "description" | "publication"
  >("info");

  // Toàn bộ state + logic phần Công bố gói trong hook dùng chung.
  const pub = usePublication(product);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showCostConfirmation, setShowCostConfirmation] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [attributes, setAttributes] = useState<
    { name: string; value: string }[]
  >(
    product?.attributesText
      ? product.attributesText.split("|").map((attr) => {
          const [name, value] = attr.split(":");
          return { name: name || "", value: value || "" };
        })
      : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const { selectedBranch } = useBranchStore();
  const canViewCostPrice = usePermission("products", "view_cost_price");
  const canViewSalePrice = usePermission("products", "view_sale_price");
  const canViewPublication = usePermission("products", "view_publication");
  const canLinkMisa = usePermission("products", "link_misa");
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const currentBranchInventory = product?.inventories?.find(
    (inv) => inv.branchId === selectedBranch?.id
  );
  const purchasePrice = useFormattedNumber(
    product?.inventories?.find((inv) => inv.branchId === selectedBranch?.id)
      ? Number(
          product.inventories.find((inv) => inv.branchId === selectedBranch?.id)
            ?.cost || 0
        )
      : 0
  );
  const basePrice = useFormattedNumber(product?.basePrice || 0);
  const [weightValue, setWeightValue] = useState<number>(product?.weight ?? 0);
  const [weightDisplay, setWeightDisplay] = useState<string>(
    product?.weight != null ? String(product.weight) : ""
  );

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.]/g, "");
    setWeightDisplay(raw);
    const num = parseFloat(raw);
    setWeightValue(isNaN(num) ? 0 : num);
  };

  const [shippingWeightValue, setShippingWeightValue] = useState<number>(
    product?.shippingWeight ?? 0
  );
  const [shippingWeightDisplay, setShippingWeightDisplay] = useState<string>(
    product?.shippingWeight != null ? String(product.shippingWeight) : ""
  );

  const handleShippingWeightChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const raw = e.target.value.replace(/[^\d.]/g, "");
    setShippingWeightDisplay(raw);
    const num = parseFloat(raw);
    setShippingWeightValue(isNaN(num) ? 0 : num);
  };

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
      purchasePrice: currentBranchInventory
        ? Number(currentBranchInventory.cost)
        : 0,
      stockQuantity: currentBranchInventory
        ? Number(currentBranchInventory.onHand)
        : 0,
      minStockAlert: currentBranchInventory
        ? Number(currentBranchInventory.minQuality)
        : 0,
      maxStockAlert: currentBranchInventory
        ? Number(currentBranchInventory.maxQuality)
        : 0,
      weight: product?.weight || undefined,
      weightUnit: product?.weightUnit || "kg",
      shippingWeightUnit: product?.shippingWeightUnit || "g",
      vat: product?.vat ?? 8,
      unit: product?.unit || "",
      isDirectSale: product?.isDirectSale || false,
      isPieceUnit: product?.isPieceUnit ?? false,
      isActive: product?.isActive ?? true,
      allowsSale: product?.allowsSale ?? true,
      isRewardPoint: product?.isRewardPoint ?? false,
    },
  });

  useEffect(() => {
    if (product?.images) {
      const loadedImages = product.images.map((img) => ({
        url: img.image,
        preview: img.image,
      }));
      setImages(loadedImages);
    }
  }, [product]);

  // Đồng bộ liên kết Misa khi đổi sản phẩm đang chỉnh sửa.
  useEffect(() => {
    setMisaMapping({
      code: product?.misa_code || "",
      name: product?.misa_name || "",
      unit: product?.misa_unit || "",
    });
  }, [product]);

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_URL}/upload/image?subfolder=products`, {
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

  const hasCostChanged = (newCost: number): boolean => {
    if (!product) return newCost > 0;
    return Number(currentBranchInventory?.cost) !== newCost;
  };

  const submitProduct = async (formData: any) => {
    setIsSubmitting(true);
    try {
      if (product) {
        await updateProduct.mutateAsync(
          { id: product.id, data: formData },
          {
            onSuccess: () => {
              onSuccess();
            },
          }
        );
      } else {
        await createProduct.mutateAsync(formData, {
          onSuccess: () => {
            onSuccess();
          },
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
      setPendingFormData(null);
    }
  };

  useEffect(() => {
    if (product) {
      const currentBranchInventory = product.inventories?.find(
        (inv) => inv.branchId === selectedBranch?.id
      );

      purchasePrice.reset(
        currentBranchInventory ? Number(currentBranchInventory.cost) : 0
      );
      basePrice.reset(product.basePrice || 0);
      setWeightValue(product.weight ?? 0);
      setWeightDisplay(product.weight != null ? String(product.weight) : "");
    }
  }, [product, selectedBranch]);

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

      // Upload tài liệu + gói dữ liệu công bố (chỉ khi có quyền xem).
      const publicationPayload = await pub.getPayload(canViewPublication);

      const formData = {
        code: data.code,
        name: data.name,
        type: product ? product.type : productType || 2,
        description: data.description || undefined,
        orderTemplate: data.orderTemplate || undefined,
        parentName: data.parentName,
        middleName: data.middleName,
        childName: data.childName,
        ...(canLinkMisa
          ? {
              misa_code: misaMapping.code,
              misa_name: misaMapping.name,
              misa_unit: misaMapping.unit,
            }
          : {}),
        tradeMarkId: data.tradeMarkId ? Number(data.tradeMarkId) : undefined,
        variantId: data.variantId ? Number(data.variantId) : undefined,
        // Chỉ gửi giá vốn khi user có quyền xem — tránh ghi đè 0 lên giá vốn
        // thật khi backend đã strip cost khỏi response.
        ...(canViewCostPrice ? { purchasePrice: purchasePrice.value } : {}),
        basePrice: basePrice.value,
        stockQuantity: Number(data.stockQuantity) || 0,
        minStockAlert: Number(data.minStockAlert) || 0,
        maxStockAlert: Number(data.maxStockAlert) || 0,
        weight: data.isPieceUnit ? undefined : weightValue || undefined,
        weightUnit: data.weightUnit,
        shippingWeight: shippingWeightValue || undefined,
        shippingWeightUnit: data.shippingWeightUnit || "g",
        vat: data.vat != null && !isNaN(Number(data.vat)) ? Number(data.vat) : 8,
        unit: data.unit || undefined,
        conversionValue: data.conversionValue
          ? Number(data.conversionValue)
          : undefined,
        attributesText:
          attributes.length > 0
            ? attributes.map((a) => `${a.name}:${a.value}`).join("|")
            : undefined,
        imageUrls: uploadedUrls,
        // Dữ liệu công bố (documents + publicationLocation/Date/Link) — hook
        // trả {} khi thiếu quyền để tránh xóa trắng dữ liệu thật.
        ...publicationPayload,
        isDirectSale: Boolean(data.isDirectSale),
        isPieceUnit: Boolean(data.isPieceUnit),
        isActive: Boolean(data.isActive),
        branchId: selectedBranch?.id,
      };

      if (canViewCostPrice && hasCostChanged(purchasePrice.value)) {
        setPendingFormData(formData);
        setShowCostConfirmation(true);
        setIsSubmitting(false);
        return;
      }
      await submitProduct(formData);
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
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

  useEffect(() => {
    if (product?.images) {
      setImages(
        product.images.map((img) => ({
          url: img.image,
          preview: img.image,
        }))
      );
    } else {
      setImages([]);
    }
  }, [product?.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-5xl h-[90vh] flex flex-col rounded-lg">
        <div className="border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {product
              ? `Sửa ${getProductTypeLabel(product.type)}`
              : `Thêm ${getProductTypeLabel(productType || 2)}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
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
          className="flex-1 overflow-y-auto bg-gray-50">
          <div className={activeTab === "info" ? "p-6 space-y-5" : "hidden"}>
            {/* Khối trên: thông tin cơ bản (trái) + ảnh (phải) */}
            <FormSection title="Thông tin chung" collapsible={false}>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 grid grid-cols-2 gap-4 content-start">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Mã hàng
                    </label>
                    <input
                      {...register("code")}
                      className="w-full border rounded px-3 py-2 bg-white"
                      placeholder="Tự động"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tên hàng <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register("name", { required: true })}
                      className="w-full border rounded px-3 py-2 bg-white"
                      placeholder="Nhập tên hàng"
                    />
                  </div>

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
                  <TrademarkDropdown
                    label="Thương hiệu"
                    placeholder="Chọn thương hiệu"
                    value={watch("tradeMarkId")}
                    onChange={(value) => setValue("tradeMarkId", value)}
                  />
                </div>

                {/* Khối ảnh bên phải */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium mb-1">
                    Hình ảnh
                  </label>
                  <div className="flex gap-3">
                    {/* Ô vuông: bấm để thêm ảnh */}
                    <label className="w-28 h-28 shrink-0 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 bg-white">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <span className="text-3xl text-gray-400 leading-none">
                        +
                      </span>
                      <span className="text-xs text-gray-400 mt-1">
                        Thêm ảnh
                      </span>
                    </label>

                    {/* Cột các ô vuông: nơi ảnh đã upload hiển thị */}
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: 4 }).map((_, index) => {
                        const img = images[index];
                        return (
                          <div
                            key={index}
                            className="relative w-16 h-16 border rounded bg-gray-50 overflow-hidden">
                            {img ? (
                              <>
                                <img
                                  src={img.preview}
                                  alt=""
                                  onClick={() => setPreviewImage(img.preview)}
                                  className="w-full h-full object-cover cursor-pointer"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                  ×
                                </button>
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    Mỗi ảnh không quá 2 MB
                  </p>
                </div>
              </div>
            </FormSection>

            {/* Section: Giá vốn, giá bán */}
            {(canViewCostPrice || canViewSalePrice) && (
              <FormSection title="Giá vốn, giá bán">
                <div className="grid grid-cols-2 gap-4">
                  {canViewCostPrice && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Giá vốn
                      </label>
                      <input
                        type="text"
                        value={purchasePrice.displayValue}
                        onChange={purchasePrice.handleChange}
                        onBlur={purchasePrice.handleBlur}
                        className="w-full border rounded px-3 py-2 bg-white"
                        placeholder="0"
                      />
                    </div>
                  )}
                  {canViewSalePrice && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Giá bán
                      </label>
                      <input
                        type="text"
                        value={basePrice.displayValue}
                        onChange={basePrice.handleChange}
                        onBlur={basePrice.handleBlur}
                        className="w-full border rounded px-3 py-2 bg-white"
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
              </FormSection>
            )}
            {/* Section: Tồn kho */}
            <FormSection
              title="Tồn kho"
              description="Quản lý số lượng tồn kho và định mức tồn. Khi tồn kho chạm đến định mức, bạn sẽ nhận được cảnh báo.">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tồn kho
                  </label>
                  <input
                    {...register("stockQuantity")}
                    type="text"
                    min="0"
                    step="1"
                    className="w-full border rounded px-3 py-2 bg-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Định mức tồn thấp nhất
                  </label>
                  <input
                    {...register("minStockAlert")}
                    type="text"
                    min="0"
                    step="1"
                    className="w-full border rounded px-3 py-2 bg-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Định mức tồn cao nhất
                  </label>
                  <input
                    {...register("maxStockAlert")}
                    type="text"
                    min="0"
                    step="1"
                    className="w-full border rounded px-3 py-2 bg-white"
                    placeholder="0"
                  />
                </div>
              </div>
            </FormSection>

            {/* Section: Vị trí, trọng lượng */}
            <FormSection
              title="Vị trí, trọng lượng"
              description="Quản lý đơn vị tính, thuế và trọng lượng hàng hóa.">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Khối lượng tịnh
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={weightDisplay}
                      onChange={handleWeightChange}
                      disabled={!!watch("isPieceUnit")}
                      className={`flex-1 border rounded px-3 py-2 ${
                        watch("isPieceUnit")
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white"
                      }`}
                      placeholder="0"
                    />
                    <select
                      {...register("weightUnit")}
                      disabled={!!watch("isPieceUnit")}
                      className={`border rounded px-3 py-2 w-24 ${
                        watch("isPieceUnit")
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white"
                      }`}>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("isPieceUnit")}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-xs text-orange-600">
                      Tính theo chiếc (không dùng gram/kg trong sản xuất)
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Trọng lượng vận chuyển
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shippingWeightDisplay}
                      onChange={handleShippingWeightChange}
                      className="flex-1 border rounded px-3 py-2 bg-white"
                      placeholder="0"
                    />
                    <select
                      {...register("shippingWeightUnit")}
                      className="border rounded px-3 py-2 w-24 bg-white">
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Đơn vị tính
                  </label>
                  <input
                    {...register("unit")}
                    className="w-full border rounded px-3 py-2 bg-white"
                    placeholder="cái, hộp, thùng..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    VAT (%)
                  </label>
                  <input
                    {...register("vat", { valueAsNumber: true })}
                    type="number"
                    step="any"
                    min={0}
                    className="w-full border rounded px-3 py-2 bg-white"
                    placeholder="8"
                  />
                </div>
              </div>

              {/* Liên kết vật tư hàng hóa Misa */}
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
            </FormSection>

            {/* Section: Quản lý theo đơn vị tính và thuộc tính */}
            <FormSection
              title="Quản lý theo đơn vị tính và thuộc tính"
              description="Thêm đặc điểm như hương vị, dung tích, màu sắc.">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Thuộc tính</h4>
                <div className="flex gap-2">
                  {["Vị", "Loại", "Màu sắc", "Kích cỡ"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setAttributes((prev) => [
                          ...prev,
                          { name: preset, value: "" },
                        ])
                      }
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-50 text-brand">
                      + {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setAttributes((prev) => [...prev, { name: "", value: "" }])
                    }
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-50">
                    + Tùy chỉnh
                  </button>
                </div>
              </div>

              {attributes.length > 0 && (
                <div className="space-y-2">
                  {attributes.map((attr, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        value={attr.name}
                        onChange={(e) =>
                          setAttributes((prev) =>
                            prev.map((a, i) =>
                              i === idx ? { ...a, name: e.target.value } : a
                            )
                          )
                        }
                        className="w-32 border rounded px-2 py-1.5 text-sm bg-white"
                        placeholder="Tên thuộc tính"
                      />
                      <span className="text-gray-400">:</span>
                      <input
                        value={attr.value}
                        onChange={(e) =>
                          setAttributes((prev) =>
                            prev.map((a, i) =>
                              i === idx ? { ...a, value: e.target.value } : a
                            )
                          )
                        }
                        className="flex-1 border rounded px-2 py-1.5 text-sm bg-white"
                        placeholder="Giá trị"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAttributes((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-red-500 hover:text-red-700 text-sm">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>

            {/* Bán trực tiếp */}
            <label className="flex items-center gap-2">
              <input {...register("isDirectSale")} type="checkbox" />
              <span className="text-sm font-medium">Bán trực tiếp</span>
            </label>
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
                Mẫu ghi chú (hóa đơn, đặt hàng)
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

          <div className="border-t p-4 flex justify-end gap-2 bg-white sticky bottom-0">
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

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-8"
          onClick={() => setPreviewImage(null)}>
          <img
            src={previewImage}
            alt=""
            className="max-w-full max-h-full object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 bg-white/90 text-gray-700 rounded-full w-9 h-9 flex items-center justify-center hover:bg-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
