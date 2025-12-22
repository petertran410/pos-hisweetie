"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useCreateCustomer } from "@/lib/hooks/useCustomers";
import { X } from "lucide-react";
import { toast } from "sonner";

interface CustomerFormProps {
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

export function CustomerForm({ onClose, onSuccess }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();
  const createCustomer = useCreateCustomer();

  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [invoiceProvinces, setInvoiceProvinces] = useState<Province[]>([]);
  const [invoiceCommunes, setInvoiceCommunes] = useState<Commune[]>([]);
  const [filteredInvoiceCommunes, setFilteredInvoiceCommunes] = useState<
    Commune[]
  >([]);

  const customerType = watch("type", "0");
  const selectedCityCode = watch("cityCode");
  const selectedDistrictCode = watch("districtCode");
  const selectedInvoiceCityCode = watch("invoiceCityCode");

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/giaodienblog/provinces/refs/heads/main/district.json"
    )
      .then((res) => res.json())
      .then((data) => setCities(data))
      .catch((error) => {
        console.error("Error fetching cities:", error);
        toast.error("Không thể tải danh sách tỉnh/thành phố");
      });

    fetch("https://production.cas.so/address-kit/2025-07-01/provinces")
      .then((res) => res.json())
      .then((data) => setInvoiceProvinces(data.provinces))
      .catch((error) =>
        console.error("Error fetching invoice provinces:", error)
      );

    fetch("https://production.cas.so/address-kit/2025-07-01/communes")
      .then((res) => res.json())
      .then((data) => setInvoiceCommunes(data.communes))
      .catch((error) =>
        console.error("Error fetching invoice communes:", error)
      );
  }, []);

  useEffect(() => {
    if (selectedCityCode) {
      const city = cities.find(
        (c) => String(c.code) === String(selectedCityCode)
      );
      if (city) {
        setDistricts(city.districts || []);
        setValue("districtCode", "");
        setValue("wardCode", "");
        setWards([]);
      }
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [selectedCityCode, cities, setValue]);

  useEffect(() => {
    if (selectedDistrictCode) {
      const district = districts.find(
        (d) => String(d.code) === String(selectedDistrictCode)
      );
      if (district) {
        setWards(district.wards || []);
        setValue("wardCode", "");
      }
    } else {
      setWards([]);
    }
  }, [selectedDistrictCode, districts, setValue]);

  useEffect(() => {
    if (selectedInvoiceCityCode) {
      const filtered = invoiceCommunes.filter(
        (c) => c.provinceCode === selectedInvoiceCityCode
      );
      setFilteredInvoiceCommunes(filtered);
      setValue("invoiceWardCode", "");
    } else {
      setFilteredInvoiceCommunes([]);
    }
  }, [selectedInvoiceCityCode, invoiceCommunes, setValue]);

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
      cityCode: data.cityCode ? String(data.cityCode) : undefined,
      cityName: cityName || undefined,
      districtCode: data.districtCode ? String(data.districtCode) : undefined,
      districtName: districtName || undefined,
      wardCode: data.wardCode ? String(data.wardCode) : undefined,
      wardName: wardName || undefined,
      invoiceCityName: invoiceCityName || undefined,
      invoiceWardName: invoiceWardName || undefined,
      type: parseInt(data.type),
      birthDate: data.birthDate || undefined,
      gender: data.gender === "" ? undefined : data.gender === "true",
    };

    createCustomer.mutate(formattedData, {
      onSuccess: () => {
        toast.success("Tạo khách hàng thành công");
        onSuccess?.();
        onClose();
      },
      onError: (error: any) => {
        toast.error(error.message || "Có lỗi xảy ra");
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold">Tạo khách hàng</h2>
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
              <input
                type="date"
                {...register("birthDate")}
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

            <div>
              <label className="block text-sm font-medium mb-2">Facebook</label>
              <input
                {...register("facebook")}
                placeholder="facebook.com/username"
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
                <select
                  {...register("cityCode")}
                  className="w-full border rounded px-3 py-2">
                  <option value="">Chọn Tỉnh/Thành phố</option>
                  {cities.map((city) => (
                    <option key={city.code} value={city.code}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Quận/Huyện
                </label>
                <select
                  {...register("districtCode")}
                  className="w-full border rounded px-3 py-2"
                  disabled={!selectedCityCode}>
                  <option value="">Chọn Quận/Huyện</option>
                  {districts.map((district) => (
                    <option key={district.code} value={district.code}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phường/Xã
                </label>
                <select
                  {...register("wardCode")}
                  className="w-full border rounded px-3 py-2"
                  disabled={!selectedDistrictCode}>
                  <option value="">Chọn Phường/Xã</option>
                  {wards.map((ward) => (
                    <option key={ward.code} value={ward.code}>
                      {ward.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ghi chú</label>
            <textarea
              {...register("comments")}
              placeholder="Nhập ghi chú"
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
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
                  <select
                    {...register("invoiceCityCode")}
                    className="w-full border rounded px-3 py-2">
                    <option value="">Tìm Tỉnh/Thành phố</option>
                    {invoiceProvinces.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phường/Xã
                  </label>
                  <select
                    {...register("invoiceWardCode")}
                    className="w-full border rounded px-3 py-2"
                    disabled={!selectedInvoiceCityCode}>
                    <option value="">Tìm Phường/Xã</option>
                    {filteredInvoiceCommunes.map((commune) => (
                      <option key={commune.code} value={commune.code}>
                        {commune.name}
                      </option>
                    ))}
                  </select>
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
                  <select
                    {...register("invoiceCityCode")}
                    className="w-full border rounded px-3 py-2">
                    <option value="">Tìm Tỉnh/Thành phố</option>
                    {invoiceProvinces.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phường/Xã
                  </label>
                  <select
                    {...register("invoiceWardCode")}
                    className="w-full border rounded px-3 py-2"
                    disabled={!selectedInvoiceCityCode}>
                    <option value="">Tìm Phường/Xã</option>
                    {filteredInvoiceCommunes.map((commune) => (
                      <option key={commune.code} value={commune.code}>
                        {commune.name}
                      </option>
                    ))}
                  </select>
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

                <div>
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
                </div>
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
              disabled={createCustomer.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {createCustomer.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
