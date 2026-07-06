"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { X, Loader2, Info } from "lucide-react";
import { useCreateFactory, useUpdateFactory } from "@/lib/hooks/useFactories";
import { Factory } from "@/lib/api/factories";

interface FactoryQuickFormModalProps {
  /** Nếu truyền factory -> chế độ sửa; nếu không -> chế độ tạo mới. */
  factory?: Factory | null;
  /**
   * NCC gắn sẵn khi tạo mới (dùng trong SupplierForm để nhà máy mới thuộc luôn
   * NCC hiện tại). Khi có giá trị này, ghi chú "chưa gắn NCC" sẽ được ẩn.
   * Không ảnh hưởng chế độ sửa (sửa không đụng tới supplierId).
   */
  defaultSupplierId?: number | null;
  /** Gọi sau khi tạo/sửa thành công, trả về factory vừa lưu để caller auto-chọn. */
  onSaved: (factory: Factory) => void;
  onClose: () => void;
}

const INPUT_CLASS =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand transition-all";

/**
 * Modal nhập nhanh nhà máy (chỉ Tên + Mã) mở đè lên ProductForm.
 *
 * Cố ý KHÔNG có trường Nhà cung cấp: quan hệ "NCC quản lý nhiều nhà máy" thuộc
 * ngữ cảnh nhà cung cấp, được quản lý ở trang Nhà cung cấp. Nhà máy tạo ở đây
 * chưa gắn NCC nên sẽ không xuất hiện trong bộ lọc theo NCC ở đơn đặt hàng cho
 * tới khi được gắn vào một NCC.
 */
export function FactoryQuickFormModal({
  factory,
  defaultSupplierId,
  onSaved,
  onClose,
}: FactoryQuickFormModalProps) {
  const isEdit = !!factory;
  const createFactory = useCreateFactory();
  const updateFactory = useUpdateFactory();

  // Guard SSR: chỉ render portal sau khi mount trên client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: {
      name: factory?.name ?? "",
      code: factory?.code ?? "",
    },
  });

  const onSubmit = async (data: { name: string; code: string }) => {
    const payload = {
      name: data.name.trim(),
      code: data.code.trim() || undefined,
    };
    if (!payload.name) return;

    try {
      if (isEdit && factory) {
        const updated = await updateFactory.mutateAsync({
          id: factory.id,
          data: payload,
        });
        onSaved(updated);
      } else {
        const created = await createFactory.mutateAsync({
          ...payload,
          // Gắn NCC ngay khi tạo (nếu ngữ cảnh có NCC, vd trong SupplierForm).
          ...(defaultSupplierId != null
            ? { supplierId: defaultSupplierId }
            : {}),
        });
        onSaved(created);
      }
      onClose();
    } catch {
      // Toast lỗi đã được xử lý trong hook mutation.
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4"
      onMouseDown={onClose}
      onKeyDown={handleKeyDown}>
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b px-5 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? "Sửa nhà máy" : "Thêm nhà máy mới"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body: form riêng, không lồng trong form sản phẩm (portal ở body) */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tên nhà máy <span className="text-red-500">*</span>
              </label>
              <input
                {...register("name", { required: true })}
                autoFocus
                placeholder="VD: Xưởng gia công Bắc Ninh"
                className={INPUT_CLASS}
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-1">
                  Vui lòng nhập tên nhà máy.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mã nhà máy
              </label>
              <input
                {...register("code")}
                placeholder="VD: NM-BN-01 (tùy chọn)"
                className={INPUT_CLASS}
              />
            </div>

            {!isEdit && defaultSupplierId == null && (
              <div className="flex gap-2 items-start bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-500 leading-relaxed">
                  Nhà máy tạo ở đây chưa gắn nhà cung cấp nên sẽ không hiện
                  trong bộ lọc theo NCC ở đơn đặt hàng. Vào trang Nhà cung cấp
                  để gắn nhà máy vào NCC tương ứng.
                </p>
              </div>
            )}
            {!isEdit && defaultSupplierId != null && (
              <div className="flex gap-2 items-start bg-brand-soft/40 border border-brand-soft rounded-lg px-3 py-2.5">
                <Info className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
                <p className="text-xs text-brand-dark leading-relaxed">
                  Nhà máy sẽ được gắn vào nhà cung cấp hiện tại.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-5 py-3.5 flex justify-end gap-2 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors">
              Bỏ qua
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 transition-colors">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting
                ? "Đang lưu..."
                : isEdit
                ? "Cập nhật"
                : "Lưu nhà máy"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
