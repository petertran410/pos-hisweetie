"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Product } from "@/lib/api/products";
import { useCreateProduct, useUpdateProduct } from "@/lib/hooks/useProducts";
import { useCategories } from "@/lib/hooks/useCategories";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { UnitAttributeModal } from "./UnitAttributeModal";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "sonner";
import { Category } from "@/lib/api/categories";
import { useRootCategories } from "@/lib/hooks/useCategories";
import { CategorySelect } from "./CategorySelect";

interface ProductFormProps {
  product?: Product;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImageItem {
  url?: string;
  file?: File;
  preview: string;
}

export function ProductForm({ product, onClose, onSuccess }: ProductFormProps) {
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);

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

  const { data: categories } = useRootCategories();
  const { data: trademarks } = useTrademarks();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      code: product?.code || "",
      name: product?.name || "",
      description: product?.description || "",
      orderTemplate: product?.orderTemplate || "",
      categoryId: product?.categoryId || undefined,
      tradeMarkId: product?.tradeMarkId || undefined,
      purchasePrice: product?.purchasePrice || 0,
      retailPrice: product?.retailPrice || 0,
      stockQuantity: product?.stockQuantity || 0,
      minStockAlert: product?.minStockAlert || 0,
      maxStockAlert: product?.minStockAlert || 0,
      weight: product?.weight || undefined,
      weightUnit: product?.weightUnit || "kg",
      unit: product?.unit || "",
      isDirectSale: product?.isDirectSale || false,
      isActive: product?.isActive ?? true,
    },
  });

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

  const flattenCategories = (
    cats: Category[],
    level: number = 0
  ): { id: number; name: string; level: number }[] => {
    return cats.reduce((acc, cat) => {
      acc.push({ id: cat.id, name: cat.name, level });
      if (cat.children && cat.children.length > 0) {
        acc.push(...flattenCategories(cat.children, level + 1));
      }
      return acc;
    }, [] as { id: number; name: string; level: number }[]);
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

      const formData = {
        ...data,
        categoryId: data.categoryId || undefined,
        tradeMarkId: data.tradeMarkId || undefined,
        attributesText: attributes.map((a) => `${a.name}:${a.value}`).join("|"),
        imageUrls: uploadedUrls,
      };

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
      toast.error("Lỗi khi lưu sản phẩm");
    } finally {
      setIsSubmitting(false);
    }
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
            {product ? "Sửa hàng hóa" : "Thêm hàng hóa"}
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
                  Mã hàng <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("code", { required: true })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Nhập mã hàng"
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nhóm hàng
                </label>
                <CategorySelect
                  categories={categories || []}
                  value={watch("categoryId")}
                  onChange={(categoryId) => setValue("categoryId", categoryId)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Thương hiệu
                </label>
                <select
                  {...register("tradeMarkId")}
                  className="w-full border rounded px-3 py-2">
                  <option value="">Chọn thương hiệu</option>
                  {trademarks?.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Giá vốn, giá bán</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Giá vốn
                  </label>
                  <input
                    {...register("purchasePrice", { valueAsNumber: true })}
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Giá bán
                  </label>
                  <input
                    {...register("retailPrice", { valueAsNumber: true })}
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Tồn kho</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tồn kho
                  </label>
                  <input
                    {...register("stockQuantity", { valueAsNumber: true })}
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Định mức tồn tối thiểu
                  </label>
                  <input
                    {...register("minStockAlert", { valueAsNumber: true })}
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Định mức tồn tối đa
                  </label>
                  <input
                    {...register("maxStockAlert", { valueAsNumber: true })}
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    placeholder="999,999,999"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Vị trí, Trọng lượng</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Trọng lượng
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
              {isSubmitting ? "Đang lưu..." : "Lưu"}
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
    </div>
  );
}
