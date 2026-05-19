"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateCustomer,
  useCustomerGroups,
  useSearchCustomers,
  useUpdateCustomer,
} from "@/lib/hooks/useCustomers";
import { X, Calendar, Plus, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Customer } from "@/lib/types/customer";
import { useBranchStore } from "@/lib/store/branch";
import { sanitizeAddresses } from "@/lib/utils/sanitize-address";
import { SearchableSelect } from "../ui/SearchableSelect";
import { CustomerAddressFormModal } from "../pos/CustomerAddressFormModal";

interface CustomerFormProps {
  customer?: Customer;
  onClose: () => void;
  onSuccess?: (customer?: any) => void;
}

interface City {
  name: string;
  code: number;
  codename: string;
  division_type: string;
  phone_code: number;
  districts: District[];
}

interface District {
  name: string;
  code: number;
  codename: string;
  division_type: string;
  short_codename: string;
  wards: Ward[];
}

interface Ward {
  name: string;
  code: number;
  codename: string;
  division_type: string;
  short_codename: string;
}

interface Province {
  code: string;
  name: string;
}

interface Commune {
  code: string;
  name: string;
  provinceCode: string;
}

const createEmptyAddress = (isDefault = false) => ({
  label: undefined,
  receiver: undefined,
  contactNumber: undefined,
  address: undefined,
  cityCode: undefined,
  cityName: undefined,
  districtCode: undefined,
  districtName: undefined,
  wardCode: undefined,
  wardName: undefined,
  newCityCode: undefined,
  newCityName: undefined,
  newWardCode: undefined,
  newWardName: undefined,
  invoiceBuyerName: undefined,
  invoiceAddress: undefined,
  invoiceCityCode: undefined,
  invoiceCityName: undefined,
  invoiceWardCode: undefined,
  invoiceWardName: undefined,
  invoiceCccdCmnd: undefined,
  invoiceBankAccount: undefined,
  invoiceEmail: undefined,
  invoicePhone: undefined,
  invoiceDvqhnsCode: undefined,
  isDefault,
});

export function CustomerForm({
  customer,
  onClose,
  onSuccess,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const { selectedBranch } = useBranchStore();

  const [cities, setCities] = useState<City[]>([]);
  const [invoiceProvinces, setInvoiceProvinces] = useState<Province[]>([]);
  const [invoiceCommunes, setInvoiceCommunes] = useState<Commune[]>([]);

  const [addresses, setAddresses] = useState<any[]>([]);

  const { data: customerGroupsData } = useCustomerGroups();
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const birthDatePickerRef = useRef<HTMLDivElement>(null);
  const [activeFormTab, setActiveFormTab] = useState<"basic" | "invoice">(
    "basic"
  );

  const [selectedParent, setSelectedParent] = useState<{
    id: number;
    code: string;
    name: string;
  } | null>(null);
  const [parentSearch, setParentSearch] = useState("");
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const parentDropdownRef = useRef<HTMLDivElement>(null);

  const { data: parentSearchData } = useSearchCustomers(
    parentSearch || undefined
  );
  const parentOptions = (parentSearchData?.data || []).filter(
    (c) => !c.parentId && c.id !== customer?.id // Chỉ hiện khách cha (không có parentId) và không phải chính mình
  );

  const [addrModal, setAddrModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    index?: number;
  }>({ open: false, mode: "create" });

  const selectedInvoiceCityCode = watch("invoiceCityCode");

  const filteredInvoiceCommunes = useMemo(() => {
    if (!selectedInvoiceCityCode) return [];
    return invoiceCommunes.filter(
      (c) => String(c.provinceCode) === String(selectedInvoiceCityCode)
    );
  }, [selectedInvoiceCityCode, invoiceCommunes]);

  const formatAddressLine = (a: any): string => {
    const newLine = [a.address, a.newWardName, a.newCityName]
      .filter(Boolean)
      .join(", ");
    if (newLine) return newLine;
    return [a.address, a.wardName, a.districtName, a.cityName]
      .filter(Boolean)
      .join(", ");
  };

  const handleAddFromModal = (addr: any) => {
    const isFirst = addresses.length === 0;
    const toAdd = { ...addr, isDefault: isFirst || !!addr.isDefault };
    const next = toAdd.isDefault
      ? [...addresses.map((a) => ({ ...a, isDefault: false })), toAdd]
      : [...addresses, toAdd];
    setAddresses(next);
    setAddrModal({ open: false, mode: "create" });
  };

  const handleEditFromModal = (addr: any) => {
    if (addrModal.index == null) return;
    const idx = addrModal.index;
    let next = addresses.map((a, i) => (i === idx ? { ...a, ...addr } : a));
    if (addr.isDefault) {
      next = next.map((a, i) => ({ ...a, isDefault: i === idx }));
    } else if (!next.some((a) => a.isDefault) && next.length > 0) {
      next[0] = { ...next[0], isDefault: true };
    }
    setAddresses(next);
    setAddrModal({ open: false, mode: "create" });
  };

  const customerType = watch("type", "0");

  // Load cities (địa chỉ cũ)
  useEffect(() => {
    fetch("/data/old-location.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCities(data);
      })
      .catch(() => {
        toast.error("Không thể tải dữ liệu Tỉnh/Thành phố");
      });
  }, []);

  // Load invoiceProvinces (địa chỉ mới)
  useEffect(() => {
    fetch("/data/new-province-location.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInvoiceProvinces(data);
        } else if (data?.provinces) {
          setInvoiceProvinces(data.provinces);
        }
      })
      .catch(() => {
        setInvoiceProvinces([]);
      });
  }, []);

  // Load invoiceCommunes (địa chỉ mới)
  useEffect(() => {
    fetch("/data/new-commune-location.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInvoiceCommunes(data);
        } else if (data?.communes) {
          setInvoiceCommunes(data.communes);
        }
      })
      .catch(() => {
        setInvoiceCommunes([]);
      });
  }, []);

  // Click outside cho group dropdown + birth picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowGroupDropdown(false);
        setGroupSearchTerm("");
      }
      if (
        birthDatePickerRef.current &&
        !birthDatePickerRef.current.contains(event.target as Node)
      ) {
        setShowBirthDatePicker(false);
      }
      if (
        parentDropdownRef.current &&
        !parentDropdownRef.current.contains(event.target as Node)
      ) {
        setShowParentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Populate khi edit
  useEffect(() => {
    if (customer) {
      setValue("code", customer.code || "");
      setValue("name", customer.name);
      setValue("contactNumber", customer.contactNumber || "");
      setValue("phone", customer.phone || "");
      setValue("email", customer.email || "");
      setValue("type", String(customer.type || 0));
      setValue("organization", customer.organization || "");
      setValue("taxCode", customer.taxCode || "");
      setValue("comments", customer.comments || "");
      setValue(
        "gender",
        customer.gender === null || customer.gender === undefined
          ? ""
          : customer.gender
            ? "true"
            : "false"
      );

      if (customer.birthDate) {
        setBirthDate(new Date(customer.birthDate));
      }

      if (customer.customerGroupDetails?.length) {
        setSelectedGroupIds(
          customer.customerGroupDetails.map((d: any) => d.groupId)
        );
      }

      if (customer.parent) {
        setSelectedParent(customer.parent);
      }

      if (customer.addresses && customer.addresses.length > 0) {
        setAddresses(customer.addresses);
      } else {
        setAddresses([createEmptyAddress(true)]);
      }
    }
  }, [customer, setValue]);

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
    customerGroupsData?.data?.filter((group) =>
      group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
    ) || [];

  const selectedGroups =
    customerGroupsData?.data?.filter((group) =>
      selectedGroupIds.includes(group.id)
    ) || [];

  const handleRemoveAddress = (index: number) => {
    setAddresses((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Đảm bảo còn 1 default
      if (!next.some((a) => a.isDefault) && next.length > 0) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  };

  const handleSetDefault = (index: number) => {
    setAddresses((prev) =>
      prev.map((a, i) => ({ ...a, isDefault: i === index }))
    );
  };

  const validateAddresses = (): string | null => {
    if (addresses.length === 0) {
      return "Phải có ít nhất 1 địa chỉ giao hàng";
    }
    const defaultCount = addresses.filter((a) => a.isDefault).length;
    if (defaultCount !== 1) {
      return "Phải có đúng 1 địa chỉ mặc định";
    }
    for (let i = 0; i < addresses.length; i++) {
      const a = addresses[i];
      if (!a.cityCode && !a.newCityCode) {
        return `Địa chỉ #${i + 1}: Phải điền ít nhất 1 trong 2 loại địa chỉ (cũ hoặc mới)`;
      }
    }
    return null;
  };

  // Thêm hàm này trước onSubmit (hoặc đặt ngoài component)
  const sanitizeAddressForApi = (addr: any) => {
    const allowedFields = [
      "id",
      "label",
      "receiver",
      "contactNumber",
      "address",
      "cityCode",
      "cityName",
      "districtCode",
      "districtName",
      "wardCode",
      "wardName",
      "newCityCode",
      "newCityName",
      "newWardCode",
      "newWardName",
      "locationName",
      "invoiceBuyerName",
      "invoiceAddress",
      "invoiceCityCode",
      "invoiceCityName",
      "invoiceWardCode",
      "invoiceWardName",
      "invoiceCccdCmnd",
      "invoiceBankAccount",
      "invoiceEmail",
      "invoicePhone",
      "invoiceDvqhnsCode",
      "isDefault",
    ];

    const clean: Record<string, any> = {};
    for (const key of allowedFields) {
      const val = addr[key];
      if (val === null || val === undefined || val === "") continue;
      if (key === "id") {
        clean.id = typeof val === "number" ? val : parseInt(val, 10);
      } else if (key === "isDefault") {
        clean.isDefault = Boolean(val);
      } else {
        // Đảm bảo tất cả string fields là string (xử lý cityCode number → string)
        clean[key] = String(val);
      }
    }

    // isDefault phải luôn có
    if (clean.isDefault === undefined) clean.isDefault = false;

    return clean;
  };

  const onSubmit = async (data: any) => {
    const validationError = validateAddresses();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Sanitize addresses — loại bỏ null, extra fields, đảm bảo đúng type
    const cleanedAddresses = addresses.map(sanitizeAddressForApi);

    const formattedData: Record<string, any> = {
      name: data.name || undefined,
      contactNumber: data.contactNumber || undefined,
      branchId: selectedBranch?.id,
      parentId: selectedParent?.id || undefined,
      groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
      code: data.code || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      comments: data.comments || undefined,
      organization: data.organization || undefined,
      taxCode: data.taxCode || undefined,
      type: parseInt(data.type),
      birthDate: birthDate ? birthDate.toISOString() : undefined,
      gender: data.gender === "" ? undefined : data.gender === "true",
      addresses: sanitizeAddresses(addresses),
      invoiceCityCode: data.invoiceCityCode || undefined,
      invoiceCityName: data.invoiceCityName || undefined,
      invoiceWardCode: data.invoiceWardCode || undefined,
      invoiceWardName: data.invoiceWardName || undefined,
      invoiceBuyerName: data.invoiceBuyerName || undefined,
      invoiceAddress: data.invoiceAddress || undefined,
      invoiceCccdCmnd: data.invoiceCccdCmnd || undefined,
      invoiceBankAccount: data.invoiceBankAccount || undefined,
      invoiceEmail: data.invoiceEmail || undefined,
      invoicePhone: data.invoicePhone || undefined,
      invoiceDvqhnsCode: data.invoiceDvqhnsCode || undefined,
    };

    Object.keys(formattedData).forEach((key) => {
      if (formattedData[key] === undefined) {
        delete formattedData[key];
      }
    });

    if (customer) {
      updateCustomer.mutate(
        { id: customer.id, data: formattedData },
        {
          onSuccess: () => {
            onSuccess?.();
            onClose();
          },
        }
      );
    } else {
      createCustomer.mutate(formattedData as any, {
        onSuccess: (createdCustomer) => {
          onSuccess?.(createdCustomer);
          onClose();
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-4xl h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto sm:m-4 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between z-10 flex-shrink-0">
          <h2 className="text-base sm:text-xl font-semibold">
            {customer ? "Chỉnh sửa khách hàng" : "Tạo khách hàng"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Tab navigation */}
          <div className="border-b flex gap-4 sm:gap-6 px-4 sm:px-6 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveFormTab("basic")}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeFormTab === "basic"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              Thông tin cơ bản
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab("invoice")}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeFormTab === "invoice"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              Thông tin xuất hóa đơn
            </button>
          </div>
          {/* ================= TAB 1: THÔNG TIN CƠ BẢN ================= */}
          <div
            className={
              activeFormTab === "basic"
                ? "p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto"
                : "hidden"
            }>
            {/* ── Khách hàng cha ── */}
            {!customer?.parentId &&
              !customer?.children
                ?.length /* Chỉ hiện khi tạo mới hoặc edit khách không phải con */ && (
                <div className="mb-4" ref={parentDropdownRef}>
                  <label className="block text-sm font-medium mb-2">
                    Khách hàng cha
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      (nếu là khách hàng con / chuỗi cửa hàng)
                    </span>
                  </label>
                  {selectedParent ? (
                    <div className="flex items-center gap-2 px-3 py-2 border rounded bg-blue-50">
                      <span className="text-sm font-medium text-blue-700">
                        {selectedParent.code} - {selectedParent.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedParent(null)}
                        className="ml-auto p-1 hover:bg-blue-100 rounded">
                        <X className="w-3 h-3 text-blue-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Tìm khách hàng cha (mã, tên, SĐT)..."
                        value={parentSearch}
                        onChange={(e) => {
                          setParentSearch(e.target.value);
                          setShowParentDropdown(true);
                        }}
                        onFocus={() => setShowParentDropdown(true)}
                        className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                      />
                      {showParentDropdown && parentOptions.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {parentOptions.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedParent({
                                  id: c.id,
                                  code: c.code,
                                  name: c.name,
                                });
                                setParentSearch("");
                                setShowParentDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2">
                              <span className="font-medium">{c.code}</span>
                              <span className="text-gray-400">-</span>
                              <span>{c.name}</span>
                              {c.contactNumber && (
                                <span className="text-gray-400 ml-auto">
                                  {c.contactNumber}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            {/* Nếu đang edit khách con → hiển thị info cha (read-only) */}
            {customer?.parent && (
              <div className="mb-4 px-3 py-2 border rounded bg-gray-50">
                <span className="text-xs text-gray-500">Khách hàng cha: </span>
                <span className="text-sm font-medium">
                  {customer.parent.code} - {customer.parent.name}
                </span>
              </div>
            )}
            {/* Section 1: Thông tin cá nhân (grid 2 cột, tất cả 7 field trong cùng 1 grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("name", { required: true })}
                  placeholder="Bắt buộc"
                  className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Mã khách hàng
                </label>
                <input
                  {...register("code")}
                  placeholder="Tự động"
                  className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Điện thoại 1 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("contactNumber", { required: true })}
                  className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Điện thoại 2
                </label>
                <input
                  {...register("phone")}
                  className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="email@gmail.com"
                  className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                />
              </div>
            </div>

            {/* Section 2: Địa chỉ giao hàng (GIỮ NGUYÊN nội dung, chỉ đảm bảo nằm trong wrapper basic) */}
            <div className="border-t pt-4 sm:pt-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-semibold">
                  Địa chỉ giao hàng <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    ({addresses.length} địa chỉ)
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setAddrModal({ open: true, mode: "create" })}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Thêm địa chỉ
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-6 text-gray-500 border-2 border-dashed rounded-lg text-sm">
                  Chưa có địa chỉ. Bấm "Thêm địa chỉ" để bắt đầu.
                </div>
              ) : (
                <div className="space-y-2">
                  {addresses.map((addr: any, index: number) => (
                    <div
                      key={index}
                      className={`border rounded-lg px-3 py-2.5 flex items-start justify-between gap-3 ${
                        addr.isDefault
                          ? "border-blue-500 bg-blue-50/50"
                          : "border-gray-200"
                      }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {addr.label ||
                              addr.receiver ||
                              `Địa chỉ #${index + 1}`}
                          </span>
                          {addr.isDefault && (
                            <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {addr.receiver && <span>{addr.receiver} · </span>}
                          {addr.contactNumber && (
                            <span>{addr.contactNumber} · </span>
                          )}
                          {formatAddressLine(addr) || (
                            <span className="italic">Chưa có địa chỉ</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(index)}
                            title="Đặt mặc định"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setAddrModal({ open: true, mode: "edit", index })
                          }
                          title="Sửa"
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {addresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAddress(index)}
                            title="Xóa"
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nhóm khách hàng + Ghi chú */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Nhóm khách hàng, ghi chú</h3>
              <div>
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-sm font-medium mb-1">
                    Nhóm khách hàng
                  </label>
                  <div
                    className="w-full border rounded px-3 py-2 min-h-[42px] cursor-text flex flex-wrap gap-2 items-center"
                    onClick={() => setShowGroupDropdown(true)}>
                    {selectedGroups.map((group) => (
                      <span
                        key={group.id}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {group.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveGroup(group.id);
                          }}
                          className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center">
                          ×
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
                          ? "Chọn nhóm khách hàng"
                          : ""
                      }
                      className="flex-1 outline-none min-w-[120px] bg-transparent"
                    />
                  </div>

                  {showGroupDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
                      {filteredGroups.length > 0 ? (
                        filteredGroups.map((group) => {
                          const isSelected = selectedGroupIds.includes(
                            group.id
                          );
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
                          Không tìm thấy nhóm khách hàng
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    {...register("comments")}
                    placeholder="Nhập ghi chú"
                    className="w-full px-3 py-2 border rounded-lg resize-none"
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ================= TAB 2: THÔNG TIN XUẤT HÓA ĐƠN ================= */}
          <div
            className={
              activeFormTab === "invoice"
                ? "p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto"
                : "hidden"
            }>
            {/* Loại khách hàng radio — inline theo hình 4/5 */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-sm font-medium">Loại khách hàng</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="0"
                  {...register("type")}
                  defaultChecked
                />
                <span>Cá nhân</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="1" {...register("type")} />
                <span>Tổ chức/Hộ kinh doanh</span>
              </label>
            </div>

            {/* ============ CÁ NHÂN (type=0) — theo hình 4 ============ */}
            {customerType === "0" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Tên người mua
                  </label>
                  <input
                    {...register("invoiceBuyerName")}
                    placeholder="Nhập tên người mua"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Mã số thuế
                  </label>
                  <input
                    {...register("taxCode")}
                    placeholder="Nhập mã số thuế"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">
                    Địa chỉ
                  </label>
                  <input
                    {...register("invoiceAddress")}
                    placeholder="Nhập địa chỉ"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Tỉnh/Thành phố
                  </label>
                  <SearchableSelect
                    options={(invoiceProvinces || []).map((p) => ({
                      value: p.code,
                      label: p.name,
                    }))}
                    value={watch("invoiceCityCode") || ""}
                    onChange={(value) => {
                      const prov = invoiceProvinces.find(
                        (p) => p.code === value
                      );
                      setValue("invoiceCityCode", value);
                      setValue("invoiceCityName", prov?.name || "");
                      setValue("invoiceWardCode", "");
                      setValue("invoiceWardName", "");
                    }}
                    placeholder="Tìm Tỉnh/Thành phố"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Phường/Xã
                  </label>
                  <SearchableSelect
                    options={filteredInvoiceCommunes.map((c) => ({
                      value: c.code,
                      label: c.name,
                    }))}
                    value={watch("invoiceWardCode") || ""}
                    onChange={(value) => {
                      const com = filteredInvoiceCommunes.find(
                        (c) => c.code === value
                      );
                      setValue("invoiceWardCode", value);
                      setValue("invoiceWardName", com?.name || "");
                    }}
                    placeholder="Tìm Phường/Xã"
                    disabled={!watch("invoiceCityCode")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Số CCCD/CMND
                  </label>
                  <input
                    {...register("invoiceCccdCmnd")}
                    placeholder="Nhập số CCCD/CMND"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Số hộ chiếu
                  </label>
                  <input
                    {...register("invoiceBankAccount")}
                    placeholder="Nhập số hộ chiếu"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register("invoiceEmail")}
                    placeholder="email@gmail.com"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Số điện thoại
                  </label>
                  <input
                    {...register("invoicePhone")}
                    placeholder="Nhập số điện thoại"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* ============ TỔ CHỨC (type=1) — theo hình 5 ============ */}
            {customerType === "1" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Mã số thuế <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("taxCode")}
                    placeholder="Bắt buộc"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Tên công ty
                  </label>
                  <input
                    {...register("organization")}
                    placeholder="Nhập tên công ty"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">
                    Địa chỉ
                  </label>
                  <input
                    {...register("invoiceAddress")}
                    placeholder="Nhập địa chỉ"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Tỉnh/Thành phố
                  </label>
                  <SearchableSelect
                    options={(invoiceProvinces || []).map((p) => ({
                      value: p.code,
                      label: p.name,
                    }))}
                    value={watch("invoiceCityCode") || ""}
                    onChange={(value) => {
                      const prov = invoiceProvinces.find(
                        (p) => p.code === value
                      );
                      setValue("invoiceCityCode", value);
                      setValue("invoiceCityName", prov?.name || "");
                      setValue("invoiceWardCode", "");
                      setValue("invoiceWardName", "");
                    }}
                    placeholder="Tìm Tỉnh/Thành phố"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Phường/Xã
                  </label>
                  <SearchableSelect
                    options={filteredInvoiceCommunes.map((c) => ({
                      value: c.code,
                      label: c.name,
                    }))}
                    value={watch("invoiceWardCode") || ""}
                    onChange={(value) => {
                      const com = filteredInvoiceCommunes.find(
                        (c) => c.code === value
                      );
                      setValue("invoiceWardCode", value);
                      setValue("invoiceWardName", com?.name || "");
                    }}
                    placeholder="Tìm Phường/Xã"
                    disabled={!watch("invoiceCityCode")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Tên người mua
                  </label>
                  <input
                    {...register("invoiceBuyerName")}
                    placeholder="Nhập tên người mua"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Mã ĐVQHNS
                  </label>
                  <input
                    {...register("invoiceDvqhnsCode")}
                    placeholder="Nhập mã đơn vị"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register("invoiceEmail")}
                    placeholder="email@gmail.com"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Số điện thoại
                  </label>
                  <input
                    {...register("invoicePhone")}
                    placeholder="Nhập số điện thoại"
                    className="w-full border rounded px-3 py-2.5 sm:py-2 text-base sm:text-sm"
                  />
                </div>
              </div>
            )}
          </div>
          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t py-3 sm:py-4 px-4 flex justify-end gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 border rounded hover:bg-gray-50 text-sm">
              Hủy
            </button>
            <button
              type="submit"
              disabled={createCustomer.isPending || updateCustomer.isPending}
              className="px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
              {customer ? "Cập nhật" : "Tạo khách hàng"}
            </button>
          </div>
        </form>
      </div>

      <CustomerAddressFormModal
        isOpen={addrModal.open}
        mode={addrModal.mode}
        initial={
          addrModal.mode === "edit" && addrModal.index != null
            ? addresses[addrModal.index]
            : undefined
        }
        cities={cities}
        invoiceProvinces={invoiceProvinces}
        invoiceCommunes={invoiceCommunes}
        onClose={() => setAddrModal({ open: false, mode: "create" })}
        onSubmit={(addr) =>
          addrModal.mode === "create"
            ? handleAddFromModal(addr)
            : handleEditFromModal(addr)
        }
      />
    </div>
  );
}
