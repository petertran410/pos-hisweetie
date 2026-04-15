"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateCustomer,
  useCustomerGroups,
  useUpdateCustomer,
} from "@/lib/hooks/useCustomers";
import { X, Calendar, Plus } from "lucide-react";
import { toast } from "sonner";
import { Customer } from "@/lib/types/customer";
import { useBranchStore } from "@/lib/store/branch";
import { CustomerAddressItem } from "./CustomerAddressItem";

interface CustomerFormProps {
  customer?: Customer;
  onClose: () => void;
  onSuccess?: () => void;
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

  const [addresses, setAddresses] = useState<any[]>([createEmptyAddress(true)]);

  const { data: customerGroupsData } = useCustomerGroups();
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const birthDatePickerRef = useRef<HTMLDivElement>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

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

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleBirthDateSelect = (date: Date) => {
    setBirthDate(date);
    setShowBirthDatePicker(false);
  };

  // Handlers cho danh sách địa chỉ
  const handleAddAddress = () => {
    setAddresses((prev) => [...prev, createEmptyAddress(false)]);
  };

  const handleUpdateAddress = (index: number, addr: any) => {
    setAddresses((prev) => prev.map((a, i) => (i === index ? addr : a)));
  };

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
      addresses: cleanedAddresses,
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
          onError: (error: any) => {
            toast.error(error.message || "Có lỗi xảy ra");
          },
        }
      );
    } else {
      createCustomer.mutate(formattedData as any, {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
        onError: (error: any) => {
          toast.error(error.message || "Có lỗi xảy ra");
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold">
            {customer ? "Chỉnh sửa khách hàng" : "Tạo khách hàng"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tên khách hàng <span className="text-red-500">*</span>
              </label>
              <input
                {...register("name", { required: true })}
                placeholder="Bắt buộc"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mã khách hàng
              </label>
              <input
                {...register("code")}
                placeholder="Tự động"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Điện thoại 1 <span className="text-red-500">*</span>
              </label>
              <input
                {...register("contactNumber", { required: true })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Điện thoại 2
              </label>
              <input
                {...register("phone")}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                {...register("email")}
                placeholder="email@gmail.com"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Giới tính
              </label>
              <select
                {...register("gender")}
                className="w-full border rounded px-3 py-2">
                <option value="">Chọn</option>
                <option value="true">Nam</option>
                <option value="false">Nữ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sinh nhật
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={formatDateDisplay(birthDate)}
                  onClick={() => setShowBirthDatePicker(!showBirthDatePicker)}
                  placeholder="DD/MM/YYYY"
                  className="w-full border rounded px-3 py-2 pr-10 cursor-pointer"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                {showBirthDatePicker && (
                  <div
                    ref={birthDatePickerRef}
                    className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-4 z-50 w-[320px]">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b">
                      <button
                        type="button"
                        onClick={() => {
                          const newDate = birthDate
                            ? new Date(birthDate)
                            : new Date();
                          newDate.setMonth(newDate.getMonth() - 1);
                          setBirthDate(newDate);
                        }}
                        className="p-1 hover:bg-gray-100 rounded">
                        ‹
                      </button>
                      <div className="flex items-center gap-2 relative">
                        <button
                          type="button"
                          onClick={() => {
                            setShowMonthPicker(!showMonthPicker);
                            setShowYearPicker(false);
                          }}
                          className="px-3 py-1 hover:bg-gray-100 rounded font-medium">
                          Tháng{" "}
                          {(birthDate?.getMonth() ?? new Date().getMonth()) + 1}
                        </button>
                        <span className="text-gray-400">/</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowYearPicker(!showYearPicker);
                            setShowMonthPicker(false);
                          }}
                          className="px-3 py-1 hover:bg-gray-100 rounded font-medium">
                          {birthDate?.getFullYear() ?? new Date().getFullYear()}
                        </button>

                        {showMonthPicker && (
                          <div className="absolute top-full mt-2 bg-white border rounded-lg shadow-lg p-3 z-50 left-0">
                            <div className="grid grid-cols-3 gap-2">
                              {Array.from({ length: 12 }, (_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    const newDate = birthDate
                                      ? new Date(birthDate)
                                      : new Date();
                                    newDate.setMonth(i);
                                    setBirthDate(newDate);
                                    setShowMonthPicker(false);
                                  }}
                                  className={`px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                                    (birthDate?.getMonth() ??
                                      new Date().getMonth()) === i
                                      ? "bg-blue-600 text-white hover:bg-blue-700"
                                      : ""
                                  }`}>
                                  T{i + 1}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {showYearPicker && (
                          <div className="absolute top-full mt-2 bg-white border rounded-lg shadow-lg p-3 z-50 right-0 max-h-[240px] overflow-y-auto w-[200px]">
                            <div className="grid grid-cols-3 gap-2">
                              {Array.from({ length: 100 }, (_, i) => {
                                const year = new Date().getFullYear() - i;
                                return (
                                  <button
                                    key={year}
                                    type="button"
                                    onClick={() => {
                                      const newDate = birthDate
                                        ? new Date(birthDate)
                                        : new Date();
                                      newDate.setFullYear(year);
                                      setBirthDate(newDate);
                                      setShowYearPicker(false);
                                    }}
                                    className={`px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                                      (birthDate?.getFullYear() ??
                                        new Date().getFullYear()) === year
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : ""
                                    }`}>
                                    {year}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newDate = birthDate
                            ? new Date(birthDate)
                            : new Date();
                          newDate.setMonth(newDate.getMonth() + 1);
                          setBirthDate(newDate);
                        }}
                        className="p-1 hover:bg-gray-100 rounded">
                        ›
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                      {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
                        <div key={d}>{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 42 }, (_, i) => {
                        const currentDate = birthDate ?? new Date();
                        const firstDay = new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth(),
                          1
                        );
                        const startDay = firstDay.getDay();
                        const dayNumber = i - startDay + 1;
                        const daysInMonth = new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth() + 1,
                          0
                        ).getDate();

                        if (dayNumber < 1 || dayNumber > daysInMonth) {
                          return <div key={i} className="w-8 h-8" />;
                        }

                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const newDate = new Date(
                                currentDate.getFullYear(),
                                currentDate.getMonth(),
                                dayNumber
                              );
                              handleBirthDateSelect(newDate);
                            }}
                            className={`w-8 h-8 rounded text-sm transition-colors ${
                              dayNumber === currentDate.getDate()
                                ? "bg-blue-600 text-white font-medium"
                                : "hover:bg-gray-100"
                            }`}>
                            {dayNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Loại khách hàng + Thông tin doanh nghiệp */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Loại khách hàng</h3>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="0"
                  {...register("type")}
                  defaultChecked
                />
                <span>Cá nhân</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" value="1" {...register("type")} />
                <span>Tổ chức/Hộ kinh doanh</span>
              </label>
            </div>

            {customerType === "1" && (
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tên công ty
                  </label>
                  <input
                    {...register("organization")}
                    placeholder="Nhập tên công ty"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Danh sách địa chỉ giao hàng */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                Địa chỉ giao hàng <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 font-normal ml-2">
                  ({addresses.length} địa chỉ)
                </span>
              </h3>
              <button
                type="button"
                onClick={handleAddAddress}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Thêm địa chỉ
              </button>
            </div>

            <div className="space-y-4">
              {addresses.map((addr, index) => (
                <CustomerAddressItem
                  key={index}
                  address={addr}
                  index={index}
                  cities={cities}
                  invoiceProvinces={invoiceProvinces}
                  invoiceCommunes={invoiceCommunes}
                  customerType={customerType}
                  canRemove={addresses.length > 1}
                  onUpdate={handleUpdateAddress}
                  onRemove={handleRemoveAddress}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          </div>

          {/* Nhóm khách hàng + Ghi chú */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Nhóm khách hàng, ghi chú</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium mb-2">
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
                      selectedGroups.length === 0 ? "Chọn nhóm khách hàng" : ""
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
                        Không tìm thấy nhóm khách hàng
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
                  className="w-full border rounded px-3 py-2 resize-none"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50">
              Hủy
            </button>
            <button
              type="submit"
              disabled={createCustomer.isPending || updateCustomer.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {customer ? "Cập nhật" : "Tạo khách hàng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
