"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { UnitSelect } from "./UnitSelect";
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
import { ProductFormHeader } from "./ProductFormHeader";
import "./product-form.css";
import {
  ProductFactoryMappings,
  buildFactoryMappingsPayload,
  type FactoryMappingDraft,
} from "./ProductFactoryMappings";
import { useFormattedNumber } from "@/lib/hooks/useFormattedNumber";
import { usePermission } from "@/lib/hooks/usePermissions";
import { API_URL } from "@/lib/config/api";
import { usePublication } from "./publication/usePublication";
import { PublicationSection } from "./publication/PublicationSection";
import {
  ProductImageGallery,
  toProductImageItems,
  uploadProductImages,
  type ProductImageItem,
} from "./ProductImageGallery";

interface ProductFormProps {
  product?: Product;
  productType?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductForm({
  product,
  productType,
  onClose,
  onSuccess,
}: ProductFormProps) {
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    "info" | "description" | "publication"
  >("info");

  // Toàn bộ state + logic phần Công bố gói trong hook dùng chung.
  const pub = usePublication(product);

  const [showCostConfirmation, setShowCostConfirmation] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [attributes, setAttributes] = useState<
    { name: string; value: string }[]
  >(
    product?.attributes
      ? product.attributes.map((attr) => ({
          name: attr.name || "",
          value: attr.value || "",
        }))
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

  // Danh sách nhà máy gắn với sản phẩm — nguồn chân lý nhiều-nhiều.
  const [factoryMappings, setFactoryMappings] = useState<FactoryMappingDraft[]>(
    () =>
      [...(product?.factoryMappings ?? [])]
        .sort((a, b) => a.priority - b.priority)
        .map((item) => ({ factoryId: item.factoryId, role: item.role }))
  );
  const { selectedBranch } = useBranchStore();
  const canViewCostPrice = usePermission("products", "view_cost_price");
  const canViewSalePrice = usePermission("products", "view_sale_price");
  const canEditPublication = usePermission("products", "edit_publication");
  const canLinkMisa = usePermission("products", "link_misa");
  const canViewFactory = usePermission("products", "view_factory");
  const canAssignFactory = usePermission("products", "assign_factory");
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
      conversionValue: product?.conversionValue ?? 1,
      isDirectSale: product?.isDirectSale || false,
      isPieceUnit: product?.isPieceUnit ?? false,
      isActive: product?.isActive ?? true,
      allowsSale: product?.allowsSale ?? true,
      isRewardPoint: product?.isRewardPoint ?? false,
      cargoType: product?.cargoType || "NORMAL",
    },
  });

  useEffect(() => {
    if (product?.images) {
      setImages(toProductImageItems(product.images));
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

  // view_cost_price/view_sale_price chỉ ẩn ô giá trên UI, không quyết định
  // payload: ai có products:update thì lưu được đủ dữ liệu sản phẩm.
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const { imageUrls, primaryImageUrl } = await uploadProductImages(
        images,
        uploadFile
      );

      // Upload tài liệu + gói dữ liệu công bố chỉ khi có quyền sửa.
      const publicationPayload = await pub.getPayload(canEditPublication);

      const formData: Record<string, any> = {
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
        // Chỉ gửi giá bán khi có quyền xem, tránh NaN/0 ghi đè.
        ...(canViewSalePrice ? { basePrice: basePrice.value } : {}),
        imageUrls,
        primaryImageUrl,
        // Dữ liệu công bố (documents + publicationLocation/Date/Link) — hook
        // trả {} khi thiếu quyền để tránh xóa trắng dữ liệu thật.
        ...publicationPayload,
        isDirectSale: Boolean(data.isDirectSale),
        isPieceUnit: Boolean(data.isPieceUnit),
        isActive: Boolean(data.isActive),
        cargoType: data.cargoType || "NORMAL",
        branchId: selectedBranch?.id,
        // Nhà máy — chỉ gửi khi có quyền assign_factory, tránh ghi đè lên dữ
        // liệu thật khi user không có quyền chỉnh sửa. Gửi full danh sách:
        // backend replace-set, dòng không có trong list sẽ bị gỡ.
        ...(canAssignFactory
          ? { factoryMappings: buildFactoryMappingsPayload(factoryMappings) }
          : {}),
      };

      Object.assign(formData, {
        stockQuantity: Number(data.stockQuantity) || 0,
        minStockAlert: Number(data.minStockAlert) || 0,
        maxStockAlert: Number(data.maxStockAlert) || 0,
        weight: data.isPieceUnit ? undefined : weightValue || undefined,
        weightUnit: data.weightUnit,
        shippingWeight: shippingWeightValue || undefined,
        shippingWeightUnit: data.shippingWeightUnit || "g",
        vat:
          data.vat != null && !isNaN(Number(data.vat)) ? Number(data.vat) : 8,
        unit: data.unit || undefined,
        conversionValue: Math.max(
          1,
          Math.floor(Number(data.conversionValue) || 1)
        ),
        attributes: attributes
          .map((a) => ({ name: a.name.trim(), value: a.value.trim() }))
          .filter((a) => a.name && a.value),
      });

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

  useEffect(() => {
    setImages(toProductImageItems(product?.images));
  }, [product?.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="product-form bg-white w-full max-w-5xl h-[90vh] flex flex-col">
        <ProductFormHeader
          title={
            product
              ? `Sửa ${getProductTypeLabel(product.type)}`
              : `Thêm ${getProductTypeLabel(productType || 2)}`
          }
          productType={product?.type ?? productType ?? 2}
          code={product?.code}
          name={product?.name}
          onClose={onClose}
        />

        <div className="pf-tabs">
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
          {canEditPublication && (
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
          className="pf-body flex-1 overflow-y-auto">
          <div className={activeTab === "info" ? "p-6 space-y-5" : "hidden"}>
            {/* Thông tin cơ bản; ảnh nằm ở section riêng bên dưới */}
            <FormSection title="Thông tin chung" collapsible={false}>
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Loại vận chuyển
                  </label>
                  <select
                    value={watch("cargoType")}
                    onChange={(e) =>
                      setValue("cargoType", e.target.value as "COLD" | "NORMAL")
                    }
                    className="w-full border rounded px-3 py-2 bg-white">
                    <option value="NORMAL">Hàng thường</option>
                    <option value="COLD">Hàng lạnh</option>
                  </select>
                </div>
              </div>
            </FormSection>

            <FormSection title="Hình ảnh">
              <ProductImageGallery images={images} onChange={setImages} />
            </FormSection>

            {/* Section: Nhà máy sản xuất (mới) — chỉ hiện khi có quyền view_factory */}
            {canViewFactory && (
              <FormSection
                title="Nhà máy sản xuất"
                description="Một sản phẩm có thể gắn nhiều nhà máy chính và nhiều nhà máy backup. Giá, MOQ, leadtime khai báo ở trang nhà máy.">
                <ProductFactoryMappings
                  value={factoryMappings}
                  onChange={setFactoryMappings}
                  disabled={!canAssignFactory}
                />
                {!canAssignFactory && (
                  <p className="text-xs text-gray-500 mt-2">
                    Bạn chỉ có quyền xem thông tin nhà máy, không thể chỉnh sửa.
                  </p>
                )}
              </FormSection>
            )}

            {/* Section: Giá vốn, giá bán */}
            {(canViewCostPrice || canViewSalePrice) && (
              <FormSection title="Giá vốn, giá bán">
                <div className="grid grid-cols-2 gap-4">
                  {canViewCostPrice && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Giá vốn
                      </label>
                      <span className="pf-suffix" data-suffix="đ">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={purchasePrice.displayValue}
                          onChange={purchasePrice.handleChange}
                          onBlur={purchasePrice.handleBlur}
                          className="w-full border rounded px-3 py-2 bg-white"
                          placeholder="0"
                        />
                      </span>
                    </div>
                  )}
                  {canViewSalePrice && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Giá bán
                      </label>
                      <span className="pf-suffix" data-suffix="đ">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={basePrice.displayValue}
                          onChange={basePrice.handleChange}
                          onBlur={basePrice.handleBlur}
                          className="w-full border rounded px-3 py-2 bg-white"
                          placeholder="0"
                        />
                      </span>
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

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Đơn vị tính
                  </label>
                  <UnitSelect
                    value={watch("unit")}
                    onChange={(name) =>
                      setValue("unit", name, { shouldDirty: true })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Định lượng đóng gói
                  </label>
                  <input
                    {...register("conversionValue", { valueAsNumber: true })}
                    type="number"
                    min={1}
                    step={1}
                    className="w-full border rounded px-3 py-2 bg-white"
                    placeholder="1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ví dụ: 12 nghĩa là 1 thùng gồm 12 đơn vị sản phẩm.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    VAT (%)
                  </label>
                  <span className="pf-suffix" data-suffix="%">
                    <input
                      {...register("vat", { valueAsNumber: true })}
                      type="number"
                      step="any"
                      min={0}
                      className="w-full border rounded px-3 py-2 bg-white"
                      placeholder="8"
                    />
                  </span>
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
                <h4 className="text-sm font-medium text-gray-700">
                  Thuộc tính
                </h4>
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
                      setAttributes((prev) => [
                        ...prev,
                        { name: "", value: "" },
                      ])
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
              canEditPublication && activeTab === "publication"
                ? "p-6 space-y-5"
                : "hidden"
            }>
            <PublicationSection pub={pub} />
          </div>

          <div className="pf-footer sticky bottom-0">
            {/* Bán trực tiếp: luôn thấy ở footer */}
            <label className="pf-direct-sale">
              <input {...register("isDirectSale")} type="checkbox" />
              Bán trực tiếp
            </label>
            <div className="pf-footer-actions">
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
