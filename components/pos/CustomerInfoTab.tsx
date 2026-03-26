"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useUpdateCustomer } from "@/lib/hooks/useCustomers";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Pencil, Save, X as XIcon, Calendar } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface CustomerInfoTabProps {
  customer: any;
  onUpdate?: (customer: any) => void;
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

export function CustomerInfoTab({ customer, onUpdate }: CustomerInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateCustomer = useUpdateCustomer();
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      name: customer.name || "",
      contactNumber: customer.contactNumber || "",
      phone: customer.phone || "",
      email: customer.email || "",
      gender:
        customer.gender === true
          ? "true"
          : customer.gender === false
            ? "false"
            : "",
      birthDate: customer.birthDate || "",
      address: customer.address || "",
      cityCode: customer.cityCode || "",
      districtCode: customer.districtCode || "",
      wardCode: customer.wardCode || "",
      comments: customer.comments || "",
    },
  });

  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [birthDate, setBirthDate] = useState<Date | null>(
    customer.birthDate ? new Date(customer.birthDate) : null
  );
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const birthDatePickerRef = useRef<HTMLDivElement>(null);

  const selectedCityCode = watch("cityCode");
  const selectedDistrictCode = watch("districtCode");

  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/petertran410/pos-hisweetie/refs/heads/production/old-location.json"
        );
        const data = await response.json();
        if (Array.isArray(data)) {
          setCities(data);
        }
      } catch (error) {
        console.error("Error loading cities:", error);
        toast.error("Không thể tải dữ liệu Tỉnh/Thành phố");
      }
    };
    loadCities();
  }, []);

  useEffect(() => {
    if (selectedCityCode && cities.length > 0) {
      const city = cities.find((c) => c.code === Number(selectedCityCode));
      if (city) {
        setDistricts(city.districts || []);
      }
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [selectedCityCode, cities]);

  useEffect(() => {
    if (selectedDistrictCode && districts.length > 0) {
      const district = districts.find(
        (d) => d.code === Number(selectedDistrictCode)
      );
      if (district) {
        setWards(district.wards || []);
      }
    } else {
      setWards([]);
    }
  }, [selectedDistrictCode, districts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  const onSubmit = async (data: any) => {
    try {
      const updateData: any = {
        name: data.name,
        contactNumber: data.contactNumber,
        phone: data.phone || null,
        email: data.email || null,
        gender:
          data.gender === "true"
            ? true
            : data.gender === "false"
              ? false
              : null,
        birthDate: birthDate ? birthDate.toISOString() : null,
        address: data.address || null,
        cityCode: data.cityCode || null,
        districtCode: data.districtCode || null,
        wardCode: data.wardCode || null,
        comments: data.comments || null,
      };

      if (data.cityCode) {
        const city = cities.find((c) => c.code === Number(data.cityCode));
        if (city) {
          updateData.cityName = city.name;
        }
      }

      if (data.districtCode) {
        const district = districts.find(
          (d) => d.code === Number(data.districtCode)
        );
        if (district) {
          updateData.districtName = district.name;
        }
      }

      if (data.wardCode) {
        const ward = wards.find((w) => w.code === Number(data.wardCode));
        if (ward) {
          updateData.wardName = ward.name;
        }
      }

      await updateCustomer.mutateAsync({
        id: customer.id,
        data: updateData,
      });

      toast.success("Cập nhật thông tin khách hàng thành công");
      setIsEditing(false);

      if (onUpdate) {
        onUpdate({ ...customer, ...updateData });
      }
    } catch (error: any) {
      toast.error(error.message || "Cập nhật thông tin thất bại");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValue("name", customer.name || "");
    setValue("contactNumber", customer.contactNumber || "");
    setValue("phone", customer.phone || "");
    setValue("email", customer.email || "");
    setValue(
      "gender",
      customer.gender === true
        ? "true"
        : customer.gender === false
          ? "false"
          : ""
    );
    setValue("birthDate", customer.birthDate || "");
    setValue("address", customer.address || "");
    setValue("cityCode", customer.cityCode || "");
    setValue("districtCode", customer.districtCode || "");
    setValue("wardCode", customer.wardCode || "");
    setValue("comments", customer.comments || "");
    setBirthDate(customer.birthDate ? new Date(customer.birthDate) : null);
  };

  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Thông tin cơ bản</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Chỉnh sửa
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Tên khách hàng
            </label>
            <div className="text-base">{customer.name || "Chưa có"}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Điện thoại
            </label>
            <div className="text-base">
              {customer.contactNumber || customer.phone || "Chưa có"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Điện thoại 2
            </label>
            <div className="text-base">{customer.phone || "Chưa có"}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Email
            </label>
            <div className="text-base">{customer.email || "Chưa có"}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Giới tính
            </label>
            <div className="text-base">
              {customer.gender === true
                ? "Nam"
                : customer.gender === false
                  ? "Nữ"
                  : "Chưa có"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Sinh nhật
            </label>
            <div className="text-base">
              {customer.birthDate ? formatDate(customer.birthDate) : "Chưa có"}
            </div>
          </div>

          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Địa chỉ
            </label>
            <div className="text-base">
              {[
                customer.address,
                customer.wardName,
                customer.districtName,
                customer.cityName,
              ]
                .filter(Boolean)
                .join(", ") || "Chưa có"}
            </div>
          </div>

          {customer.comments && (
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Ghi chú
              </label>
              <div className="text-base bg-gray-50 p-3 rounded">
                {customer.comments}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Chỉnh sửa thông tin cơ bản</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
            <XIcon className="w-4 h-4" />
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
            <Save className="w-4 h-4" />
            Lưu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Tên khách hàng <span className="text-red-500">*</span>
          </label>
          <input
            {...register("name", { required: true })}
            className="w-full border rounded px-3 py-2"
            placeholder="Nhập tên khách hàng"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Điện thoại <span className="text-red-500">*</span>
          </label>
          <input
            {...register("contactNumber", { required: true })}
            className="w-full border rounded px-3 py-2"
            placeholder="Nhập số điện thoại"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Điện thoại 2</label>
          <input
            {...register("phone")}
            className="w-full border rounded px-3 py-2"
            placeholder="Nhập số điện thoại phụ"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            {...register("email")}
            type="email"
            className="w-full border rounded px-3 py-2"
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Giới tính</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" value="true" {...register("gender")} />
              <span>Nam</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" value="false" {...register("gender")} />
              <span>Nữ</span>
            </label>
          </div>
        </div>

        <div className="relative" ref={birthDatePickerRef}>
          <label className="block text-sm font-medium mb-2">Sinh nhật</label>
          <button
            type="button"
            onClick={() => setShowBirthDatePicker(!showBirthDatePicker)}
            className="w-full border rounded px-3 py-2 text-left flex items-center justify-between">
            <span className={birthDate ? "" : "text-gray-400"}>
              {birthDate
                ? formatDate(birthDate.toISOString())
                : "Chọn ngày sinh"}
            </span>
            <Calendar className="w-4 h-4 text-gray-400" />
          </button>
          {showBirthDatePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-4 z-10">
              <input
                type="date"
                value={birthDate ? birthDate.toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setBirthDate(new Date(e.target.value));
                  } else {
                    setBirthDate(null);
                  }
                  setShowBirthDatePicker(false);
                }}
                className="border rounded px-3 py-2"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Tỉnh/Thành phố
          </label>
          <SearchableSelect
            options={cities.map((city) => ({
              value: city.code.toString(),
              label: city.name,
            }))}
            value={watch("cityCode")}
            onChange={(value) => {
              setValue("cityCode", value);
              setValue("districtCode", "");
              setValue("wardCode", "");
            }}
            placeholder="Chọn Tỉnh/Thành phố"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Quận/Huyện</label>
          <SearchableSelect
            options={districts.map((district) => ({
              value: district.code.toString(),
              label: district.name,
            }))}
            value={watch("districtCode")}
            onChange={(value) => {
              setValue("districtCode", value);
              setValue("wardCode", "");
            }}
            placeholder="Chọn Quận/Huyện"
            disabled={!selectedCityCode}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Phường/Xã</label>
          <SearchableSelect
            options={wards.map((ward) => ({
              value: ward.code.toString(),
              label: ward.name,
            }))}
            value={watch("wardCode")}
            onChange={(value) => setValue("wardCode", value)}
            placeholder="Chọn Phường/Xã"
            disabled={!selectedDistrictCode}
          />
        </div>

        <div className="col-span-3">
          <label className="block text-sm font-medium mb-2">Địa chỉ</label>
          <input
            {...register("address")}
            className="w-full border rounded px-3 py-2"
            placeholder="Số nhà, tên đường"
          />
        </div>

        <div className="col-span-3">
          <label className="block text-sm font-medium mb-2">Ghi chú</label>
          <textarea
            {...register("comments")}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="Ghi chú về khách hàng"
          />
        </div>
      </div>
    </form>
  );
}
