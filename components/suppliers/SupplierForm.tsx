"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateSupplier,
  useUpdateSupplier,
  useSupplierGroups,
} from "@/lib/hooks/useSuppliers";
import { Supplier, SupplierGroup } from "@/lib/types/supplier";

interface SupplierFormProps {
  supplier?: Supplier;
  onClose: () => void;
}

export function SupplierForm({ supplier, onClose }: SupplierFormProps) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const { data: groupsData } = useSupplierGroups();

  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      code: "",
      name: "",
      contactNumber: "",
      phone: "",
      email: "",
      address: "",
      location: "",
      wardName: "",
      taxCode: "",
      contactPerson: "",
      comments: "",
      isActive: true,
    },
  });

  const autoGenerateCode = watch("code") === "";

  useEffect(() => {
    if (supplier) {
      setValue("code", supplier.code || "");
      setValue("name", supplier.name);
      setValue("contactNumber", supplier.contactNumber || "");
      setValue("email", supplier.email || "");
      setValue("address", supplier.address || "");
      setValue("location", supplier.location || "");
      setValue("wardName", supplier.wardName || "");
      setValue("taxCode", supplier.taxCode || "");
      setValue("comments", supplier.comments || "");
      setValue("isActive", supplier.isActive);

      if (
        supplier.supplierGroupDetails &&
        supplier.supplierGroupDetails.length > 0
      ) {
        const groupIds = supplier.supplierGroupDetails.map(
          (detail) => detail.supplierGroupId
        );
        setSelectedGroupIds(groupIds);
      }
    }
  }, [supplier, setValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowGroupDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleGroup = (groupId: number) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleRemoveGroup = (groupId: number) => {
    setSelectedGroupIds((prev) => prev.filter((id) => id !== groupId));
  };

  const filteredGroups =
    groupsData?.data.filter((group) =>
      group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
    ) || [];

  const selectedGroups =
    groupsData?.data.filter((group) => selectedGroupIds.includes(group.id)) ||
    [];

  const onSubmit = async (data: any) => {
    try {
      const submitData = {
        ...data,
        groupIds: selectedGroupIds,
        code: autoGenerateCode ? undefined : data.code,
      };

      if (supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, data: submitData });
      } else {
        await createSupplier.mutateAsync(submitData);
      }
      onClose();
    } catch (error) {
      console.error("Error saving supplier:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold">
            {supplier ? "Chỉnh sửa nhà cung cấp" : "Tạo nhà cung cấp"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tên nhà cung cấp <span className="text-red-500">*</span>
              </label>
              <input
                {...register("name", { required: true })}
                placeholder="Bắt buộc"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mã nhà cung cấp
              </label>
              <input
                {...register("code")}
                placeholder="Tự động"
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {autoGenerateCode
                  ? "Mã sẽ được tự động tạo"
                  : "Sử dụng mã tùy chỉnh"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Điện thoại
              </label>
              <input
                {...register("contactNumber")}
                placeholder="Nhập số điện thoại"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="email@gmail.com"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="border-t pt-6 mb-6">
            <h3 className="font-semibold mb-4">Địa chỉ</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Địa chỉ
                </label>
                <input
                  {...register("address")}
                  placeholder="Nhập địa chỉ"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Khu vực
                </label>
                <input
                  {...register("location")}
                  placeholder="Chọn Tỉnh/Thành phố"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phường/Xã
                </label>
                <input
                  {...register("wardName")}
                  placeholder="Chọn Phường/Xã"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6 mb-6">
            <h3 className="font-semibold mb-4">Nhóm nhà cung cấp, ghi chú</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium mb-2">
                  Nhóm nhà cung cấp
                </label>
                <div className="border rounded px-3 py-2 min-h-[42px] flex flex-wrap gap-2 items-center cursor-pointer">
                  {selectedGroups.map((group) => (
                    <span
                      key={group.id}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {group.name}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveGroup(group.id);
                        }}
                        className="text-blue-600 hover:text-blue-800">
                        ✕
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={groupSearchTerm}
                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                    onFocus={() => setShowGroupDropdown(true)}
                    placeholder={
                      selectedGroups.length === 0
                        ? "Chọn nhóm nhà cung cấp"
                        : ""
                    }
                    className="flex-1 outline-none min-w-[120px] bg-transparent"
                  />
                </div>

                {showGroupDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map((group) => {
                        const isSelected = selectedGroupIds.includes(group.id);
                        return (
                          <div
                            key={group.id}
                            onClick={() => handleToggleGroup(group.id)}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between">
                            <span className="text-sm">{group.name}</span>
                            {isSelected && (
                              <svg
                                className="w-5 h-5 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        Không tìm thấy nhóm nhà cung cấp
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Ghi chú
                </label>
                <textarea
                  {...register("comments")}
                  placeholder="Nhập ghi chú"
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6 mb-6">
            <h3 className="font-semibold mb-4">Thông tin xuất hóa đơn</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tên công ty
                </label>
                <input
                  {...register("contactPerson")}
                  placeholder="Nhập tên công ty"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Mã số thuế
                </label>
                <input
                  {...register("taxCode")}
                  placeholder="Nhập mã số thuế"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded hover:bg-gray-50">
              Bỏ qua
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
