"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateCustomer,
  useCustomerGroups,
  useUpdateCustomer,
} from "@/lib/hooks/useCustomers";
import { X, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Customer } from "@/lib/types/customer";
import { useRouter } from "next/navigation";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

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

export function CustomerForm({
  customer,
  onClose,
  onSuccess,
}: CustomerFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [invoiceProvinces, setInvoiceProvinces] = useState<Province[]>([]);
  const [invoiceCommunes, setInvoiceCommunes] = useState<Commune[]>([]);
  const [filteredInvoiceCommunes, setFilteredInvoiceCommunes] = useState<
    Commune[]
  >([]);
  const [isPopulating, setIsPopulating] = useState(false);
  const [citiesLoaded, setCitiesLoaded] = useState(false);
  const [invoiceDataLoaded, setInvoiceDataLoaded] = useState(false);

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
  const selectedCityCode = watch("cityCode");
  const selectedDistrictCode = watch("districtCode");
  const selectedInvoiceCityCode = watch("invoiceCityCode");

  const checkInvoiceDataLoaded = () => {
    if (invoiceProvinces.length > 0 && invoiceCommunes.length > 0) {
      setInvoiceDataLoaded(true);
    }
  };

  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/petertran410/pos-hisweetie/refs/heads/build_customer/old-location.json"
        );

        if (!response.ok) {
          throw new Error("Failed to load cities");
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setCities(data);
          setCitiesLoaded(true);
        } else {
          console.error("Invalid cities data structure:", data);
          setCities([]);
          setCitiesLoaded(true);
        }
      } catch (error) {
        console.error("Error loading cities:", error);
        toast.error("Không thể tải dữ liệu Tỉnh/Thành phố");
        setCities([]);
        setCitiesLoaded(true);
      }
    };

    loadCities();
  }, []);

  useEffect(() => {
    const loadInvoiceProvinces = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/petertran410/pos-hisweetie/refs/heads/build_customer/new-province-location.json"
        );

        if (!response.ok) {
          throw new Error("Failed to load invoice provinces");
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setInvoiceProvinces(data);
        } else if (data && Array.isArray(data.provinces)) {
          setInvoiceProvinces(data.provinces);
        } else {
          console.error("Invalid provinces data structure:", data);
          setInvoiceProvinces([]);
        }

        checkInvoiceDataLoaded();
      } catch (error) {
        console.error("Error loading invoice provinces:", error);
        setInvoiceProvinces([]);
        checkInvoiceDataLoaded();
      }
    };

    loadInvoiceProvinces();
  }, []);

  useEffect(() => {
    const loadInvoiceCommunes = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/petertran410/pos-hisweetie/refs/heads/build_customer/new-commune-location.json"
        );

        if (!response.ok) {
          throw new Error("Failed to load invoice communes");
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setInvoiceCommunes(data);
        } else if (data && Array.isArray(data.communes)) {
          setInvoiceCommunes(data.communes);
        } else {
          console.error("Invalid communes data structure:", data);
          setInvoiceCommunes([]);
        }

        checkInvoiceDataLoaded();
      } catch (error) {
        console.error("Error loading invoice communes:", error);
        setInvoiceCommunes([]);
        checkInvoiceDataLoaded();
      }
    };

    loadInvoiceCommunes();
  }, []);

  useEffect(() => {
    if (selectedInvoiceCityCode && invoiceCommunes.length > 0) {
      const filtered = invoiceCommunes.filter(
        (commune) =>
          String(commune.provinceCode) === String(selectedInvoiceCityCode)
      );
      setFilteredInvoiceCommunes(filtered);
    } else {
      setFilteredInvoiceCommunes([]);
    }
  }, [selectedInvoiceCityCode, invoiceCommunes]);

  useEffect(() => {
    if (selectedInvoiceCityCode && invoiceCommunes.length > 0) {
      const filtered = invoiceCommunes.filter(
        (commune) => commune.provinceCode === selectedInvoiceCityCode
      );
      setFilteredInvoiceCommunes(filtered);
    } else {
      setFilteredInvoiceCommunes([]);
    }
  }, [selectedInvoiceCityCode, invoiceCommunes]);

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

  useEffect(() => {
    if (selectedCityCode && !isPopulating) {
      const city = cities.find(
        (c) => String(c.code) === String(selectedCityCode)
      );
      if (city) {
        setDistricts(city.districts || []);

        const currentDistrictCode = watch("districtCode");
        if (
          !currentDistrictCode ||
          !city.districts.find(
            (d) => String(d.code) === String(currentDistrictCode)
          )
        ) {
          setValue("districtCode", "");
          setValue("wardCode", "");
          setWards([]);
        }
      }
    } else if (!selectedCityCode && !isPopulating) {
      setDistricts([]);
      setWards([]);
    }
  }, [selectedCityCode, cities, setValue, isPopulating, watch]);

  useEffect(() => {
    if (selectedDistrictCode && !isPopulating) {
      const district = districts.find(
        (d) => String(d.code) === String(selectedDistrictCode)
      );
      if (district) {
        setWards(district.wards || []);

        const currentWardCode = watch("wardCode");
        if (
          !currentWardCode ||
          !district.wards.find(
            (w) => String(w.code) === String(currentWardCode)
          )
        ) {
          setValue("wardCode", "");
        }
      }
    } else if (!selectedDistrictCode && !isPopulating) {
      setWards([]);
    }
  }, [selectedDistrictCode, districts, setValue, isPopulating, watch]);

  useEffect(() => {
    if (customer) {
      setIsPopulating(true);

      setValue("code", customer.code || "");
      setValue("name", customer.name);
      setValue("contactNumber", customer.contactNumber || "");
      setValue("phone", customer.phone || "");

      if (customer.birthDate) {
        setBirthDate(new Date(customer.birthDate));
      }

      setValue(
        "gender",
        customer.gender === null ? "" : customer.gender ? "true" : "false"
      );
      setValue("email", customer.email || "");
      setValue("address", customer.address || "");
      setValue("type", String(customer.type || 0));
      setValue("organization", customer.organization || "");
      setValue("taxCode", customer.taxCode || "");
      setValue("invoiceBuyerName", customer.invoiceBuyerName || "");
      setValue("invoiceAddress", customer.invoiceAddress || "");
      setValue("invoiceCccdCmnd", customer.invoiceCccdCmnd || "");
      // setValue("invoiceBankAccount", customer.invoiceBankAccount || "");
      setValue("invoiceEmail", customer.invoiceEmail || "");
      setValue("invoicePhone", customer.invoicePhone || "");
      setValue("invoiceDvqhnsCode", customer.invoiceDvqhnsCode || "");
      setValue("comments", customer.comments || "");

      if (customer.cityCode && cities.length > 0) {
        const city = cities.find(
          (c) => String(c.code) === String(customer.cityCode)
        );

        if (city) {
          setDistricts(city.districts || []);
          setValue("cityCode", customer.cityCode);

          if (customer.districtCode) {
            const district = city.districts.find(
              (d) => String(d.code) === String(customer.districtCode)
            );

            if (district) {
              setWards(district.wards || []);

              setTimeout(() => {
                setValue("districtCode", customer.districtCode);

                if (customer.wardCode) {
                  setTimeout(() => {
                    setValue("wardCode", customer.wardCode);
                  }, 50);
                }
              }, 50);
            }
          }
        }
      }

      if (customer.invoiceCityCode && invoiceCommunes.length > 0) {
        setValue("invoiceCityCode", customer.invoiceCityCode);

        const filtered = invoiceCommunes.filter(
          (commune) =>
            String(commune.provinceCode) === String(customer.invoiceCityCode)
        );
        setFilteredInvoiceCommunes(filtered);

        if (customer.invoiceWardCode) {
          setValue("invoiceWardCode", customer.invoiceWardCode);
        }
      }

      setValue("comments", customer.comments || "");

      if (
        customer.customerGroupDetails &&
        customer.customerGroupDetails.length > 0
      ) {
        const groupIds = customer.customerGroupDetails.map(
          (detail: any) => detail.groupId
        );
        setSelectedGroupIds(groupIds);
      }

      setTimeout(() => {
        setIsPopulating(false);
      }, 150);
    }
  }, [
    customer,
    cities,
    citiesLoaded,
    invoiceProvinces,
    invoiceCommunes,
    invoiceDataLoaded,
    setValue,
  ]);

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

  const onSubmit = async (data: any) => {
    const cityName = cities.find(
      (c) => String(c.code) === String(data.cityCode)
    )?.name;
    const districtName = districts.find(
      (d) => String(d.code) === String(data.districtCode)
    )?.name;
    const wardName = wards.find(
      (w) => String(w.code) === String(data.wardCode)
    )?.name;

    const invoiceCityName = invoiceProvinces.find(
      (p) => p.code === data.invoiceCityCode
    )?.name;
    const invoiceWardName = filteredInvoiceCommunes.find(
      (c) => c.code === data.invoiceWardCode
    )?.name;

    const formattedData = {
      ...data,
      groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
      code: data.code || undefined,
      cityCode: data.cityCode ? String(data.cityCode) : undefined,
      cityName: cityName || undefined,
      districtCode: data.districtCode ? String(data.districtCode) : undefined,
      districtName: districtName || undefined,
      wardCode: data.wardCode ? String(data.wardCode) : undefined,
      wardName: wardName || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      address: data.address || undefined,
      comments: data.comments || undefined,
      invoiceCityCode: data.invoiceCityCode || undefined,
      invoiceCityName: invoiceCityName || undefined,
      invoiceWardCode: data.invoiceWardCode || undefined,
      invoiceWardName: invoiceWardName || undefined,
      invoiceAddress: data.invoiceAddress || undefined,
      invoiceBuyerName: data.invoiceBuyerName || undefined,
      invoiceCccdCmnd: data.invoiceCccdCmnd || undefined,
      invoiceBankAccount: data.invoiceBankAccount || undefined,
      invoiceEmail: data.invoiceEmail || undefined,
      invoicePhone: data.invoicePhone || undefined,
      invoiceDvqhnsCode: data.invoiceDvqhnsCode || undefined,
      organization: data.organization || undefined,
      taxCode: data.taxCode || undefined,
      type: parseInt(data.type),
      birthDate: birthDate ? birthDate.toISOString() : undefined,
      gender: data.gender === "" ? undefined : data.gender === "true",
    };

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
      createCustomer.mutate(formattedData, {
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
                Điện thoại 1
              </label>
              <input
                {...register("contactNumber")}
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
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
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
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-gray-500 py-1">
                          {day}
                        </div>
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

                        const isToday =
                          dayNumber === new Date().getDate() &&
                          currentDate.getMonth() === new Date().getMonth() &&
                          currentDate.getFullYear() ===
                            new Date().getFullYear();

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
                                : isToday
                                ? "border border-blue-600 text-blue-600"
                                : "hover:bg-gray-100"
                            }`}>
                            {dayNumber}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-3 border-t flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setBirthDate(new Date());
                          setShowBirthDatePicker(false);
                        }}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                        Hôm nay
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Giới tính
              </label>
              <select
                {...register("gender")}
                className="w-full border rounded px-3 py-2">
                <option value="">Chọn giới tính</option>
                <option value="true">Nam</option>
                <option value="false">Nữ</option>
              </select>
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
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Địa chỉ</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Khu vực
                </label>
                <input
                  {...register("address")}
                  placeholder="Nhập địa chỉ"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tỉnh/Thành phố
                </label>
                <SearchableSelect
                  options={cities.map((city) => ({
                    value: city.code,
                    label: city.name,
                  }))}
                  value={selectedCityCode || ""}
                  onChange={(value) => setValue("cityCode", value)}
                  placeholder="Chọn Tỉnh/Thành phố"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Quận/Huyện
                </label>
                <SearchableSelect
                  options={districts.map((district) => ({
                    value: district.code,
                    label: district.name,
                  }))}
                  value={selectedDistrictCode || ""}
                  onChange={(value) => setValue("districtCode", value)}
                  placeholder="Chọn Quận/Huyện"
                  disabled={!selectedCityCode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phường/Xã
                </label>
                <SearchableSelect
                  options={wards.map((ward) => ({
                    value: ward.code,
                    label: ward.name,
                  }))}
                  value={watch("wardCode") || ""}
                  onChange={(value) => setValue("wardCode", value)}
                  placeholder="Chọn Phường/Xã"
                  disabled={!selectedDistrictCode}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Nhóm khách hàng, ghi chú</h3>

            <div className="space-y-4">
              {/* Multi-select với tags */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium mb-2">
                  Nhóm khách hàng
                </label>

                {/* Input container với tags */}
                <div
                  className="w-full border rounded px-3 py-2 min-h-[42px] cursor-text flex flex-wrap gap-2 items-center"
                  onClick={() => setShowGroupDropdown(true)}>
                  {/* Tags hiển thị các nhóm đã chọn */}
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

                  {/* Input search */}
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

                {/* Dropdown danh sách nhóm */}
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

              {/* Ghi chú */}
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

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Thông tin xuất hóa đơn</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Loại khách hàng
              </label>
              <div className="flex gap-4">
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
                  <span>Tổ chức/ Hộ kinh doanh</span>
                </label>
              </div>
            </div>

            {customerType === "0" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Tên người mua
                  </label>
                  <input
                    {...register("invoiceBuyerName")}
                    placeholder="Nhập tên người mua"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Địa chỉ
                  </label>
                  <input
                    {...register("invoiceAddress")}
                    placeholder="Nhập địa chỉ"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tỉnh/Thành phố
                  </label>
                  <SearchableSelect
                    options={(invoiceProvinces || []).map((province) => ({
                      value: province.code,
                      label: province.name,
                    }))}
                    value={selectedInvoiceCityCode || ""}
                    onChange={(value) => setValue("invoiceCityCode", value)}
                    placeholder="Tìm Tỉnh/Thành phố"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phường/Xã
                  </label>
                  <SearchableSelect
                    options={filteredInvoiceCommunes.map((commune) => ({
                      value: commune.code,
                      label: commune.name,
                    }))}
                    value={watch("invoiceWardCode") || ""}
                    onChange={(value) => setValue("invoiceWardCode", value)}
                    placeholder="Tìm Phường/Xã"
                    disabled={!selectedInvoiceCityCode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Số CCCD/CMND
                  </label>
                  <input
                    {...register("invoiceCccdCmnd")}
                    placeholder="Nhập số CCCD/CMND"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Số hộ chiếu
                  </label>
                  <input
                    {...register("invoiceBankAccount")}
                    placeholder="Nhập số hộ chiếu"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register("invoiceEmail")}
                    placeholder="email@gmail.com"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Số điện thoại
                  </label>
                  <input
                    {...register("invoicePhone")}
                    placeholder="Nhập số điện thoại"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            )}

            {customerType === "1" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Mã số thuế
                  </label>
                  <input
                    {...register("taxCode")}
                    placeholder="Bắt buộc"
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

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Địa chỉ
                  </label>
                  <input
                    {...register("invoiceAddress")}
                    placeholder="Nhập địa chỉ"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tỉnh/Thành phố
                  </label>
                  <SearchableSelect
                    options={(invoiceProvinces || []).map((province) => ({
                      value: province.code,
                      label: province.name,
                    }))}
                    value={selectedInvoiceCityCode || ""}
                    onChange={(value) => setValue("invoiceCityCode", value)}
                    placeholder="Tìm Tỉnh/Thành phố"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phường/Xã
                  </label>
                  <SearchableSelect
                    options={filteredInvoiceCommunes.map((commune) => ({
                      value: commune.code,
                      label: commune.name,
                    }))}
                    value={watch("invoiceWardCode") || ""}
                    onChange={(value) => setValue("invoiceWardCode", value)}
                    placeholder="Tìm Phường/Xã"
                    disabled={!selectedInvoiceCityCode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tên người mua
                  </label>
                  <input
                    {...register("invoiceBuyerName")}
                    placeholder="Nhập tên người mua"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Mã ĐVQHNS
                  </label>
                  <input
                    {...register("invoiceDvqhnsCode")}
                    placeholder="Nhập mã đơn vị"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register("invoiceEmail")}
                    placeholder="email@gmail.com"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Số điện thoại
                  </label>
                  <input
                    {...register("invoicePhone")}
                    placeholder="Nhập số điện thoại"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                {/* <div>
                  <label className="block text-sm font-medium mb-2">
                    Ngân hàng
                  </label>
                  <select
                    {...register("invoiceBankAccount")}
                    className="w-full border rounded px-3 py-2">
                    <option value="">Chọn ngân hàng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Số tài khoản ngân hàng
                  </label>
                  <input
                    {...register("invoiceBankAccountNumber")}
                    placeholder="Nhập số tài khoản ngân hàng"
                    className="w-full border rounded px-3 py-2"
                  />
                </div> */}
              </div>
            )}
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
              disabled={createCustomer.isPending || updateCustomer.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {createCustomer.isPending || updateCustomer.isPending
                ? "Đang lưu..."
                : customer
                ? "Cập nhật"
                : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
