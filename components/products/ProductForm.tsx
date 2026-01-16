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
import { useFormattedNumber } from "@/lib/hooks/useFormattedNumber";

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
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
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
  const { selectedBranch } = useBranchStore();
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
  const weight = useFormattedNumber(product?.weight || 0);

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
      unit: product?.unit || "",
      isDirectSale: product?.isDirectSale || false,
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
      weight.reset(product.weight || 0);
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

      const formData = {
        code: data.code,
        name: data.name,
        type: product ? product.type : productType || 2,
        description: data.description || undefined,
        orderTemplate: data.orderTemplate || undefined,
        parentName: data.parentName,
        middleName: data.middleName,
        childName: data.childName,
        tradeMarkId: data.tradeMarkId ? Number(data.tradeMarkId) : undefined,
        variantId: data.variantId ? Number(data.variantId) : undefined,
        purchasePrice: purchasePrice.value,
        basePrice: basePrice.value,
        stockQuantity: Number(data.stockQuantity) || 0,
        minStockAlert: Number(data.minStockAlert) || 0,
        maxStockAlert: Number(data.maxStockAlert) || 0,
        weight: weight.value || undefined,
        weightUnit: data.weightUnit || undefined,
        unit: data.unit || undefined,
        conversionValue: data.conversionValue
          ? Number(data.conversionValue)
          : undefined,
        attributesText:
          attributes.length > 0
            ? attributes.map((a) => `${a.name}:${a.value}`).join("|")
            : undefined,
        imageUrls: uploadedUrls,
        isDirectSale: Boolean(data.isDirectSale),
        isActive: Boolean(data.isActive),
        branchId: selectedBranch?.id,
      };

      if (hasCostChanged(purchasePrice.value)) {
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
      <div className="bg-white w-full max-w-4xl h-[90vh] flex flex-col rounded-lg">
        <div className="border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {product
              ? `Sửa ${getProductTypeLabel(product.type)}`
              : `Thêm ${getProductTypeLabel(productType || 2)}`}
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

            <div className="grid grid-cols-2 gap-4">
              <TrademarkDropdown
                label="Thương hiệu"
                placeholder="Chọn thương hiệu"
                value={watch("tradeMarkId")}
                onChange={(value) => setValue("tradeMarkId", value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Giá vốn
                </label>
                <input
                  type="text"
                  value={purchasePrice.displayValue}
                  onChange={purchasePrice.handleChange}
                  onBlur={purchasePrice.handleBlur}
                  className="w-full border rounded px-3 py-2"
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
                  {...register("stockQuantity")}
                  type="text"
                  min="0"
                  step="1"
                  className="w-full border rounded px-3 py-2"
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
                  className="w-full border rounded px-3 py-2"
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
                  className="w-full border rounded px-3 py-2"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Trọng lượng
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
                <div className="flex gap-2">
                  <input
                    {...register("unit")}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Cái, hộp, thùng..."
                    readOnly
                    onClick={() => setShowUnitModal(true)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnitModal(true)}
                    className="px-3 py-2 border rounded hover:bg-gray-50">
                    ...
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">
                Quản lý theo đơn vị tính và thuộc tính
              </h3>
              <button
                type="button"
                onClick={() => setShowUnitModal(true)}
                className="text-blue-600 hover:underline">
                Xem chi tiết
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hình ảnh</label>
              <div className="flex gap-2 flex-wrap">
                {images.map((img, index) => (
                  <div key={index} className="relative w-20 h-20">
                    <img
                      src={img.preview}
                      alt=""
                      className="w-full h-full object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      ×
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-gray-50">
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

      {showUnitModal && (
        <UnitAttributeModal
          unit={watch("unit")}
          attributes={attributes}
          onSave={(unit, attrs) => {
            setValue("unit", unit);
            setAttributes(attrs);
            setShowUnitModal(false);
          }}
          onClose={() => setShowUnitModal(false)}
        />
      )}

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
