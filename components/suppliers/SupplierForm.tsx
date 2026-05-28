"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateSupplier,
  useUpdateSupplier,
  useSupplierGroups,
} from "@/lib/hooks/useSuppliers";
import { Supplier } from "@/lib/types/supplier";
import { useBranchStore } from "@/lib/store/branch";
import { X, Check, ChevronDown, Search, Loader2 } from "lucide-react";

interface SupplierFormProps {
  supplier?: Supplier;
  onClose: () => void;
}

const INPUT_CLASS =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all";

export function SupplierForm({ supplier, onClose }: SupplierFormProps) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const { data: groupsData } = useSupplierGroups();
  const { selectedBranch } = useBranchStore();

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
      email: "",
      address: "",
      location: "",
      wardName: "",
      taxCode: "",
      organization: "",
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
      setValue("organization", supplier.organization || "");
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
        branchId: selectedBranch?.id,
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl h-[92dvh] sm:h-auto sm:max-h-[90vh] sm:m-4 flex flex-col overflow-hidden shadow-2xl">
        {/* ── Header ── */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between z-10 flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            {supplier ? "Chỉnh sửa nhà cung cấp" : "Tạo nhà cung cấp"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            type="button">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-5">
            {/* ── Section: Thông tin cơ bản ── */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Thông tin cơ bản
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tên nhà cung cấp{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("name", { required: true })}
                    placeholder="Bắt buộc"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mã nhà cung cấp
                  </label>
                  <input
                    {...register("code")}
                    placeholder="Tự động"
                    className={INPUT_CLASS}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {autoGenerateCode
                      ? "Mã sẽ được tự động tạo hoặc sử dụng mã tùy chỉnh"
                      : "Sử dụng mã tùy chỉnh hoặc giữ nguyên mã hiện tại"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Điện thoại
                  </label>
                  <input
                    {...register("contactNumber")}
                    placeholder="Nhập số điện thoại"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="email@gmail.com"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </section>

            {/* ── Section: Địa chỉ ── */}
            <section className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Địa chỉ
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Địa chỉ
                  </label>
                  <input
                    {...register("address")}
                    placeholder="Nhập địa chỉ"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Khu vực
                  </label>
                  <input
                    {...register("location")}
                    placeholder="Chọn Tỉnh/Thành phố"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phường/Xã
                  </label>
                  <input
                    {...register("wardName")}
                    placeholder="Chọn Phường/Xã"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </section>

            {/* ── Section: Nhóm + Ghi chú ── */}
            <section className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Nhóm nhà cung cấp & ghi chú
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nhóm nhà cung cấp
                  </label>
                  <div
                    onClick={() => setShowGroupDropdown(true)}
                    className={`border border-gray-200 rounded-lg px-3 py-2 min-h-[42px] flex flex-wrap gap-1.5 items-center cursor-text bg-white transition-all ${
                      showGroupDropdown
                        ? "border-blue-400 ring-2 ring-blue-100"
                        : "hover:border-gray-300"
                    }`}>
                    {selectedGroups.map((group) => (
                      <span
                        key={group.id}
                        className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                        {group.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveGroup(group.id);
                          }}
                          className="text-blue-400 hover:text-blue-700 transition-colors">
                          <X className="w-3 h-3" />
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
                      className="flex-1 outline-none min-w-[120px] bg-transparent text-sm placeholder:text-gray-400"
                    />
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                        showGroupDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {showGroupDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[240px] overflow-y-auto">
                      {filteredGroups.length > 0 ? (
                        filteredGroups.map((group, idx) => {
                          const isSelected = selectedGroupIds.includes(
                            group.id
                          );
                          return (
                            <div
                              key={group.id}
                              onClick={() => handleToggleGroup(group.id)}
                              className={`px-4 py-2.5 cursor-pointer flex items-center justify-between text-sm transition-colors ${
                                isSelected
                                  ? "bg-blue-50 text-blue-700 font-medium"
                                  : "hover:bg-gray-50 text-gray-700"
                              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                              <span className="truncate">{group.name}</span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-blue-500 flex-shrink-0 ml-2" />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-6 text-sm text-gray-400 text-center flex flex-col items-center gap-2">
                          <Search className="w-5 h-5 text-gray-300" />
                          Không tìm thấy nhóm nhà cung cấp
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ghi chú
                  </label>
                  <textarea
                    {...register("comments")}
                    maxLength={1000}
                    placeholder="Nhập ghi chú"
                    rows={3}
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>
              </div>
            </section>

            {/* ── Section: Hóa đơn ── */}
            <section className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Thông tin xuất hóa đơn
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tên công ty
                  </label>
                  <input
                    {...register("organization")}
                    placeholder="Nhập tên công ty"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mã số thuế
                  </label>
                  <input
                    {...register("taxCode")}
                    placeholder="Nhập mã số thuế"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* ── Footer ── */}
          <div className="sticky bottom-0 bg-white border-t px-4 py-3 sm:px-6 sm:py-4 flex justify-end gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Bỏ qua
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 transition-colors">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
