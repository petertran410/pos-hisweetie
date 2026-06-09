"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { PriceBook } from "@/lib/api/price-books";
import {
  useCreatePriceBook,
  useUpdatePriceBook,
  usePriceBookProducts,
  useRemoveProductsFromPriceBook,
  useUpdateProductPrice,
} from "@/lib/hooks/usePriceBooks";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCustomerGroups } from "@/lib/hooks/useCustomerGroups";
import { useUsers, useUsersForFilter } from "@/lib/hooks/useUsers";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import type { CustomerSearchResult } from "@/lib/types/customer";
import { DateTimePickerField } from "../ui/DateTimePickerField";
import { PriceBookProductSelector } from "./PriceBookProductSelector";
import { Pencil, Trash2, Plus, Check, X as XIcon, Search } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";

interface PriceBookFormProps {
  priceBook?: PriceBook | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PriceBookProductRow {
  id: number;
  price: number | string;
  product: {
    id: number;
    code: string;
    name: string;
    basePrice?: number | string;
  };
}

export function PriceBookForm({
  priceBook,
  onClose,
  onSuccess,
}: PriceBookFormProps) {
  const [activeTab, setActiveTab] = useState<"info" | "scope" | "products">(
    "info"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [editingPriceProductId, setEditingPriceProductId] = useState<
    number | null
  >(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");

  const { data: branchesData } = useBranches();
  const { data: customerGroupsData } = useCustomerGroups();
  const { data: usersData } = useUsersForFilter();

  const createPriceBook = useCreatePriceBook();
  const updatePriceBook = useUpdatePriceBook();
  const removeProducts = useRemoveProductsFromPriceBook();
  const updateProductPrice = useUpdateProductPrice();

  const isEditMode = !!priceBook;
  const { data: priceBookProducts, isLoading: isLoadingProducts } =
    usePriceBookProducts(
      isEditMode ? priceBook!.id : null,
      productSearch || undefined
    );

  const { register, handleSubmit, watch, setValue, control } = useForm({
    defaultValues: {
      name: priceBook?.name || "",
      startDate: priceBook?.startDate
        ? new Date(priceBook.startDate)
        : (null as Date | null),
      endDate: priceBook?.endDate
        ? new Date(priceBook.endDate)
        : (null as Date | null),
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
      customerScope: priceBook?.forAllCustomer
        ? "all"
        : priceBook?.priceBookCustomers &&
            priceBook.priceBookCustomers.length > 0
          ? "specific"
          : "all",
      selectedCustomers:
        priceBook?.priceBookCustomers?.map((c) => c.customerId) || [],
    },
  });

  const allowNonListed = watch("allowNonListed");
  const branchScope = watch("branchScope");
  const customerGroupScope = watch("customerGroupScope");
  const userScope = watch("userScope");
  const customerScope = watch("customerScope");
  const selectedCustomers = (watch("selectedCustomers") as number[]) || [];
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const dateRangeError =
    startDate && endDate && endDate < startDate
      ? "Ngày kết thúc phải sau ngày bắt đầu"
      : null;

  // Customer search states
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchDebounced, setCustomerSearchDebounced] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const [customerInfoMap, setCustomerInfoMap] = useState<
    Map<number, { id: number; name: string; code?: string }>
  >(() => {
    const m = new Map<number, { id: number; name: string; code?: string }>();
    priceBook?.priceBookCustomers?.forEach((c) => {
      m.set(c.customerId, {
        id: c.customerId,
        name: c.customer?.name || c.customerName,
        code: c.customer?.code,
      });
    });
    return m;
  });

  useEffect(() => {
    const t = setTimeout(
      () => setCustomerSearchDebounced(customerSearchQuery),
      300
    );
    return () => clearTimeout(t);
  }, [customerSearchQuery]);

  const { data: customerSearchData } = useSearchCustomers(
    customerSearchDebounced || undefined
  );
  const customerResults: CustomerSearchResult[] =
    customerSearchData?.data || [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const onSubmit = async (data: any) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        isActive: data.status === "active",
        startDate: data.startDate ? data.startDate.toISOString() : undefined,
        endDate: data.endDate ? data.endDate.toISOString() : undefined,
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
        forAllCustomer: data.customerScope === "all",
        customers:
          data.customerScope === "specific"
            ? (data.selectedCustomers || []).map((id: any) => Number(id))
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
            type="button"
            className={`py-3 px-4 ${
              activeTab === "info"
                ? "border-b-2 border-brand text-brand"
                : ""
            }`}
            onClick={() => setActiveTab("info")}>
            Thông tin
          </button>
          <button
            type="button"
            className={`py-3 px-4 ${
              activeTab === "scope"
                ? "border-b-2 border-brand text-brand"
                : ""
            }`}
            onClick={() => setActiveTab("scope")}>
            Phạm vi áp dụng
          </button>
          {isEditMode && (
            <button
              type="button"
              className={`py-3 px-4 ${
                activeTab === "products"
                  ? "border-b-2 border-brand text-brand"
                  : ""
              }`}
              onClick={() => setActiveTab("products")}>
              Hàng hóa
              {priceBookProducts && priceBookProducts.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs bg-brand-soft text-brand-dark rounded-full">
                  {priceBookProducts.length}
                </span>
              )}
            </button>
          )}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Từ ngày
                    </label>
                    <Controller
                      name="startDate"
                      control={control}
                      render={({ field }) => (
                        <DateTimePickerField
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Chọn ngày bắt đầu"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Đến ngày
                    </label>
                    <Controller
                      name="endDate"
                      control={control}
                      render={({ field }) => (
                        <DateTimePickerField
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Chọn ngày kết thúc"
                          min={startDate ?? null}
                        />
                      )}
                    />
                  </div>
                </div>
                {dateRangeError && (
                  <p className="mt-2 text-xs text-red-600">{dateRangeError}</p>
                )}
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

                {allowNonListed === "restrict" && (
                  <div className="mt-3 ml-6 p-3 rounded-lg border border-amber-200 bg-amber-50">
                    {isEditMode ? (
                      <div className="text-xs text-amber-800 space-y-1">
                        <p>
                          Bảng giá này chỉ cho phép thu ngân thêm các sản phẩm
                          đã có trong danh sách.
                        </p>
                        {priceBookProducts &&
                        priceBookProducts.length === 0 ? (
                          <p className="font-medium">
                            Hiện chưa có sản phẩm nào.{" "}
                            <button
                              type="button"
                              onClick={() => setActiveTab("products")}
                              className="text-brand hover:underline">
                              Thêm sản phẩm ngay →
                            </button>
                          </p>
                        ) : (
                          <p>
                            Đang có{" "}
                            <span className="font-semibold">
                              {priceBookProducts?.length || 0}
                            </span>{" "}
                            sản phẩm.{" "}
                            <button
                              type="button"
                              onClick={() => setActiveTab("products")}
                              className="text-brand hover:underline">
                              Quản lý hàng hóa →
                            </button>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-800">
                        Sau khi lưu bảng giá, mở lại để thêm sản phẩm vào tab
                        &quot;Hàng hóa&quot;.
                      </p>
                    )}
                  </div>
                )}
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
                  Khách hàng
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      {...register("customerScope")}
                      value="all"
                    />
                    <span className="text-sm">Tất cả</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      {...register("customerScope")}
                      value="specific"
                    />
                    <span className="text-sm">Khách hàng cụ thể</span>
                  </label>
                </div>

                {customerScope === "specific" && (
                  <div className="mt-3 ml-6 space-y-2">
                    {selectedCustomers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCustomers.map((cid) => {
                          const info = customerInfoMap.get(Number(cid));
                          return (
                            <span
                              key={cid}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-soft text-brand-dark text-xs rounded-full border border-brand-border">
                              {info ? (
                                <>
                                  {info.code && (
                                    <span className="font-medium">
                                      {info.code}
                                    </span>
                                  )}
                                  {info.code && " · "}
                                  <span>{info.name}</span>
                                </>
                              ) : (
                                `#${cid}`
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const next = selectedCustomers.filter(
                                    (id) => Number(id) !== Number(cid)
                                  );
                                  setValue("selectedCustomers", next, {
                                    shouldDirty: true,
                                  });
                                }}
                                className="text-brand hover:text-brand-dark ml-0.5">
                                <XIcon className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="relative" ref={customerDropdownRef}>
                      <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        placeholder="Tìm theo tên / mã / SĐT khách hàng"
                        className="w-full border rounded pl-8 pr-3 py-2 text-sm"
                      />
                      {showCustomerDropdown && customerSearchQuery && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto z-10">
                          {customerResults.length > 0 ? (
                            customerResults.map((c) => {
                              const isChecked = selectedCustomers.some(
                                (id) => Number(id) === c.id
                              );
                              return (
                                <label
                                  key={c.id}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-b-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      let next: number[];
                                      if (isChecked) {
                                        next = selectedCustomers.filter(
                                          (id) => Number(id) !== c.id
                                        );
                                      } else {
                                        next = [
                                          ...selectedCustomers.map((id) =>
                                            Number(id)
                                          ),
                                          c.id,
                                        ];
                                        setCustomerInfoMap((prev) => {
                                          const m = new Map(prev);
                                          m.set(c.id, {
                                            id: c.id,
                                            name: c.name,
                                            code: c.code,
                                          });
                                          return m;
                                        });
                                      }
                                      setValue("selectedCustomers", next, {
                                        shouldDirty: true,
                                      });
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">
                                      {c.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {c.code}
                                      {c.contactNumber &&
                                        ` · ${c.contactNumber}`}
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          ) : (
                            <div className="px-3 py-3 text-xs text-gray-500 text-center">
                              Không tìm thấy khách hàng
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      Đã chọn{" "}
                      <span className="font-semibold text-gray-700">
                        {selectedCustomers.length}
                      </span>{" "}
                      khách hàng
                    </p>
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

          {activeTab === "products" && isEditMode && (
            <div className="p-6 space-y-4">
              {allowNonListed === "restrict" &&
                priceBookProducts &&
                priceBookProducts.length === 0 && (
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
                    Bảng giá đang ở chế độ &quot;Chỉ được thêm hàng hóa có trong
                    bảng giá&quot; nhưng chưa có sản phẩm nào. Hãy thêm ít nhất
                    1 sản phẩm trước khi sử dụng.
                  </div>
                )}

              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Tìm theo mã hoặc tên hàng"
                    className="w-full border rounded pl-8 pr-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductSelector(true)}
                  className="px-3 py-2 bg-brand text-white rounded hover:bg-brand-dark text-sm flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Thêm sản phẩm
                </button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                {isLoadingProducts ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    Đang tải...
                  </div>
                ) : !priceBookProducts || priceBookProducts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    {productSearch
                      ? "Không tìm thấy sản phẩm khớp"
                      : "Bảng giá chưa có sản phẩm nào"}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-3 text-left font-medium text-gray-700">
                          Mã hàng
                        </th>
                        <th className="p-3 text-left font-medium text-gray-700">
                          Tên hàng
                        </th>
                        <th className="p-3 text-right font-medium text-gray-700">
                          Giá bán lẻ
                        </th>
                        <th className="p-3 text-right font-medium text-gray-700">
                          Giá bảng giá
                        </th>
                        <th className="p-3 text-center font-medium text-gray-700 w-24">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {priceBookProducts.map((detail) => {
                        const row = detail as unknown as PriceBookProductRow;
                        const isEditingPrice =
                          editingPriceProductId === row.product.id;
                        return (
                          <tr
                            key={row.id}
                            className="hover:bg-gray-50">
                            <td className="p-3">{row.product.code}</td>
                            <td className="p-3">{row.product.name}</td>
                            <td className="p-3 text-right text-gray-500">
                              {Number(
                                row.product.basePrice || 0
                              ).toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                              {isEditingPrice ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={editingPriceValue}
                                    onChange={(e) =>
                                      setEditingPriceValue(
                                        e.target.value.replace(/[^\d]/g, "")
                                      )
                                    }
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const newPrice =
                                          Number(editingPriceValue) || 0;
                                        if (!priceBook) return;
                                        updateProductPrice
                                          .mutateAsync({
                                            priceBookId: priceBook.id,
                                            productId: row.product.id,
                                            price: newPrice,
                                          })
                                          .then(() => {
                                            setEditingPriceProductId(null);
                                            setEditingPriceValue("");
                                          })
                                          .catch(() => {});
                                      } else if (e.key === "Escape") {
                                        setEditingPriceProductId(null);
                                        setEditingPriceValue("");
                                      }
                                    }}
                                    className="w-32 border rounded px-2 py-1 text-right text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newPrice =
                                        Number(editingPriceValue) || 0;
                                      if (!priceBook) return;
                                      updateProductPrice
                                        .mutateAsync({
                                          priceBookId: priceBook.id,
                                          productId: row.product.id,
                                          price: newPrice,
                                        })
                                        .then(() => {
                                          setEditingPriceProductId(null);
                                          setEditingPriceValue("");
                                        })
                                        .catch(() => {});
                                    }}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Lưu">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPriceProductId(null);
                                      setEditingPriceValue("");
                                    }}
                                    className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                    title="Hủy">
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="font-medium text-brand">
                                  {Number(row.price).toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {!isEditingPrice && (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPriceProductId(
                                        row.product.id
                                      );
                                      setEditingPriceValue(
                                        Number(row.price).toString()
                                      );
                                    }}
                                    className="p-1.5 text-gray-500 hover:bg-brand-soft hover:text-brand rounded"
                                    title="Sửa giá">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!priceBook) return;
                                      const result = await Swal.fire({
                                        title: "Xóa sản phẩm khỏi bảng giá?",
                                        text: `Sản phẩm "${row.product.name}" sẽ bị xóa khỏi bảng giá này.`,
                                        icon: "warning",
                                        showCancelButton: true,
                                        confirmButtonText: "Xóa",
                                        cancelButtonText: "Hủy",
                                        confirmButtonColor: "#dc2626",
                                      });
                                      if (!result.isConfirmed) return;
                                      try {
                                        await removeProducts.mutateAsync({
                                          priceBookId: priceBook.id,
                                          productIds: [row.product.id],
                                        });
                                      } catch {
                                        toast.error("Xóa sản phẩm thất bại");
                                      }
                                    }}
                                    className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded"
                                    title="Xóa khỏi bảng giá">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
              disabled={isSubmitting || !!dateRangeError}
              className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>

      {showProductSelector && isEditMode && (
        <PriceBookProductSelector
          priceBookId={priceBook!.id}
          onClose={() => setShowProductSelector(false)}
        />
      )}
    </div>
  );
}
