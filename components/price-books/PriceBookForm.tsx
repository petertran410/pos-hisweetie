"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { PriceBook } from "@/lib/api/price-books";
import {
  useCreatePriceBook,
  useUpdatePriceBook,
} from "@/lib/hooks/usePriceBooks";
import { useBranches } from "@/lib/hooks/useBranches"; // SỬA
import { useCustomerGroups } from "@/lib/hooks/useCustomerGroups"; // SỬA
import { useUsers } from "@/lib/hooks/useUsers"; // SỬA

interface PriceBookFormProps {
  priceBook?: PriceBook | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PriceBookForm({
  priceBook,
  onClose,
  onSuccess,
}: PriceBookFormProps) {
  const [activeTab, setActiveTab] = useState<"info" | "scope">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: branchesData } = useBranches();
  const { data: customerGroupsData } = useCustomerGroups();
  const { data: usersData } = useUsers();

  const createPriceBook = useCreatePriceBook();
  const updatePriceBook = useUpdatePriceBook();

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      name: priceBook?.name || "",
      startDate: priceBook?.startDate
        ? new Date(priceBook.startDate).toISOString().slice(0, 16)
        : "",
      endDate: priceBook?.endDate
        ? new Date(priceBook.endDate).toISOString().slice(0, 16)
        : "",
      status: priceBook?.isActive ? "active" : "inactive",
      allowNonListed: priceBook?.allowNonListedProducts ? "allow" : "restrict",
      warnNonListed: priceBook?.warnNonListedProducts || false,
      branchScope: priceBook?.isGlobal
        ? "all"
        : priceBook?.priceBookBranches && priceBook.priceBookBranches.length > 0
        ? "specific"
        : "all",
      selectedBranches:
        priceBook?.priceBookBranches?.map((b) => b.branchId) || [],
      customerGroupScope: priceBook?.forAllCusGroup
        ? "all"
        : priceBook?.priceBookCustomerGroups &&
          priceBook.priceBookCustomerGroups.length > 0
        ? "specific"
        : "all",
      selectedCustomerGroups:
        priceBook?.priceBookCustomerGroups?.map((g) => g.customerGroupId) || [],
      userScope: priceBook?.forAllUser
        ? "all"
        : priceBook?.priceBookUsers && priceBook.priceBookUsers.length > 0
        ? "specific"
        : "all",
      selectedUsers: priceBook?.priceBookUsers?.map((u) => u.userId) || [],
    },
  });

  const allowNonListed = watch("allowNonListed");
  const branchScope = watch("branchScope");
  const customerGroupScope = watch("customerGroupScope");
  const userScope = watch("userScope");

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        isActive: data.status === "active",
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        allowNonListedProducts: data.allowNonListed === "allow",
        warnNonListedProducts: data.warnNonListed,
        isGlobal: data.branchScope === "all",
        forAllCusGroup: data.customerGroupScope === "all",
        forAllUser: data.userScope === "all",
        branches:
          data.branchScope === "specific"
            ? data.selectedBranches.map((id: any) => Number(id))
            : [],
        customerGroups:
          data.customerGroupScope === "specific"
            ? data.selectedCustomerGroups.map((id: any) => Number(id))
            : [],
        users:
          data.userScope === "specific"
            ? data.selectedUsers.map((id: any) => Number(id))
            : [],
      };

      if (priceBook) {
        await updatePriceBook.mutateAsync({ id: priceBook.id, data: payload });
      } else {
        await createPriceBook.mutateAsync(payload);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error saving price book:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {priceBook ? "Sửa bảng giá" : "Tạo bảng giá"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="border-b px-4">
          <button
            className={`py-3 px-4 ${
              activeTab === "info"
                ? "border-b-2 border-blue-600 text-blue-600"
                : ""
            }`}
            onClick={() => setActiveTab("info")}>
            Thông tin
          </button>
          <button
            className={`py-3 px-4 ${
              activeTab === "scope"
                ? "border-b-2 border-blue-600 text-blue-600"
                : ""
            }`}
            onClick={() => setActiveTab("scope")}>
            Phạm vi áp dụng
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto">
          {activeTab === "info" && (
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tên bảng giá <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("name", { required: true })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Nhập tên bảng giá"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Hiệu lực
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Hiệu lực</label>
                    <input
                      type="datetime-local"
                      {...register("startDate")}
                      className="border rounded px-3 py-2"
                    />
                  </div>
                  <span className="text-sm">đến</span>
                  <input
                    type="datetime-local"
                    {...register("endDate")}
                    className="border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Trạng thái
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      {...register("status")}
                      value="active"
                    />
                    <span className="text-sm">Áp dụng</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      {...register("status")}
                      value="inactive"
                    />
                    <span className="text-sm">Chưa áp dụng</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Khi thu ngân lên đơn với bảng giá này
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      {...register("allowNonListed")}
                      value="allow"
                      className="mt-1"
                    />
                    <span className="text-sm">
                      Được phép thêm hàng hóa không có trong bảng giá
                    </span>
                  </label>

                  {allowNonListed === "allow" && (
                    <div className="ml-6">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" {...register("warnNonListed")} />
                        <span className="text-sm">
                          Gửi cảnh báo khi thêm hàng hóa không có trong bảng giá
                        </span>
                      </label>
                    </div>
                  )}

                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      {...register("allowNonListed")}
                      value="restrict"
                      className="mt-1"
                    />
                    <span className="text-sm">
                      Chỉ được thêm hàng hóa có trong bảng giá này
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "scope" && (
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Chi nhánh
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      {...register("branchScope")}
                      value="all"
                    />
                    <span className="text-sm">Toàn hệ thống</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      {...register("branchScope")}
                      value="specific"
                    />
                    <span className="text-sm">Chi nhánh cụ thể</span>
                  </label>
                </div>

                {branchScope === "specific" && branchesData && (
                  <div className="mt-3 space-y-2 ml-6">
                    {branchesData.map((branch) => (
                      <label
                        key={branch.id}
                        className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          value={branch.id}
                          {...register("selectedBranches")}
                        />
                        <span className="text-sm">{branch.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Nhóm khách hàng
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      {...register("customerGroupScope")}
                      value="all"
                    />
                    <span className="text-sm">Tất cả</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      {...register("customerGroupScope")}
                      value="specific"
                    />
                    <span className="text-sm">Nhóm khách hàng cụ thể</span>
                  </label>
                </div>

                {customerGroupScope === "specific" &&
                  customerGroupsData?.data && (
                    <div className="mt-3 space-y-2 ml-6">
                      {customerGroupsData.data.map((group) => (
                        <label
                          key={group.id}
                          className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            value={group.id}
                            {...register("selectedCustomerGroups")}
                          />
                          <span className="text-sm">{group.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Người tạo giao dịch
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      {...register("userScope")}
                      value="all"
                    />
                    <span className="text-sm">Tất cả</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      {...register("userScope")}
                      value="specific"
                    />
                    <span className="text-sm">Người tạo giao dịch cụ thể</span>
                  </label>
                </div>

                {userScope === "specific" && usersData && (
                  <div className="mt-3 space-y-2 ml-6 max-h-60 overflow-y-auto">
                    {usersData.map((user) => (
                      <label key={user.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          value={user.id}
                          {...register("selectedUsers")}
                        />
                        <span className="text-sm">{user.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
    </div>
  );
}
