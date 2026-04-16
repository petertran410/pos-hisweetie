"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface City {
  name: string;
  code: number;
  districts: Array<{
    name: string;
    code: number;
    wards: Array<{ name: string; code: number }>;
  }>;
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

interface Props {
  isOpen: boolean;
  mode: "create" | "edit";
  initial?: any;
  cities: City[];
  invoiceProvinces: Province[];
  invoiceCommunes: Commune[];
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (address: any) => void;
}

const emptyForm = {
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
  isDefault: false,
};

export function CustomerAddressFormModal({
  isOpen,
  mode,
  initial,
  cities,
  invoiceProvinces,
  invoiceCommunes,
  isSaving,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<any>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [showOld, setShowOld] = useState(false);

  // Reset form khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    const next = initial ? { ...emptyForm, ...initial } : { ...emptyForm };
    setForm(next);
    setError(null);
    // Mở sẵn địa chỉ cũ nếu có data
    setShowOld(!!(next.cityCode || next.districtCode || next.wardCode));
  }, [isOpen, initial]);

  // Derive districts theo cityCode
  const districts = useMemo(() => {
    if (!form.cityCode) return [];
    const c = cities.find((x) => String(x.code) === String(form.cityCode));
    return c?.districts || [];
  }, [form.cityCode, cities]);

  // Derive wards theo districtCode
  const wards = useMemo(() => {
    if (!form.districtCode) return [];
    const d = districts.find(
      (x) => String(x.code) === String(form.districtCode)
    );
    return d?.wards || [];
  }, [form.districtCode, districts]);

  // Derive communes theo newCityCode
  const filteredCommunes = useMemo(() => {
    if (!form.newCityCode) return [];
    return invoiceCommunes.filter(
      (x) => String(x.provinceCode) === String(form.newCityCode)
    );
  }, [form.newCityCode, invoiceCommunes]);

  if (!isOpen) return null;

  const set = (field: string, value: any) =>
    setForm((p: any) => ({ ...p, [field]: value }));

  const handleCityChange = (v: string) => {
    const c = cities.find((x) => String(x.code) === String(v));
    setForm((p: any) => ({
      ...p,
      cityCode: v || undefined,
      cityName: c?.name,
      districtCode: undefined,
      districtName: undefined,
      wardCode: undefined,
      wardName: undefined,
    }));
  };

  const handleDistrictChange = (v: string) => {
    const d = districts.find((x) => String(x.code) === String(v));
    setForm((p: any) => ({
      ...p,
      districtCode: v || undefined,
      districtName: d?.name,
      wardCode: undefined,
      wardName: undefined,
    }));
  };

  const handleWardChange = (v: string) => {
    const w = wards.find((x) => String(x.code) === String(v));
    setForm((p: any) => ({
      ...p,
      wardCode: v || undefined,
      wardName: w?.name,
    }));
  };

  const handleNewCityChange = (v: string) => {
    const p = invoiceProvinces.find((x) => x.code === v);
    setForm((prev: any) => ({
      ...prev,
      newCityCode: v || undefined,
      newCityName: p?.name,
      newWardCode: undefined,
      newWardName: undefined,
    }));
  };

  const handleNewWardChange = (v: string) => {
    const c = filteredCommunes.find((x) => x.code === v);
    setForm((p: any) => ({
      ...p,
      newWardCode: v || undefined,
      newWardName: c?.name,
    }));
  };

  const handleSubmit = () => {
    if (!form.cityCode && !form.newCityCode) {
      setError("Phải điền ít nhất 1 trong 2 loại địa chỉ (cũ hoặc mới)");
      return;
    }
    setError(null);
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg w-[720px] max-w-full max-h-[90vh] flex flex-col">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {mode === "create"
              ? "Thêm địa chỉ giao hàng"
              : "Chỉnh sửa địa chỉ giao hàng"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Tên gợi nhớ
              </label>
              <input
                type="text"
                value={form.label || ""}
                onChange={(e) => set("label", e.target.value || undefined)}
                placeholder="VD: Văn phòng, Kho 1"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Người nhận
              </label>
              <input
                type="text"
                value={form.receiver || ""}
                onChange={(e) => set("receiver", e.target.value || undefined)}
                placeholder="Tên người nhận"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Số điện thoại
              </label>
              <input
                type="text"
                value={form.contactNumber || ""}
                onChange={(e) =>
                  set("contactNumber", e.target.value || undefined)
                }
                placeholder="SĐT người nhận"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Địa chỉ chi tiết (số nhà, tên đường)
            </label>
            <input
              type="text"
              value={form.address || ""}
              onChange={(e) => set("address", e.target.value || undefined)}
              placeholder="VD: 123 Nguyễn Trãi"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3 text-gray-700">
              Địa chỉ mới (Tỉnh / Phường — sau sáp nhập)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Tỉnh/Thành phố
                </label>
                <SearchableSelect
                  options={invoiceProvinces.map((p) => ({
                    value: p.code,
                    label: p.name,
                  }))}
                  value={form.newCityCode || ""}
                  onChange={handleNewCityChange}
                  placeholder="Tìm Tỉnh/Thành phố"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Phường/Xã
                </label>
                <SearchableSelect
                  options={filteredCommunes.map((c) => ({
                    value: c.code,
                    label: c.name,
                  }))}
                  value={form.newWardCode || ""}
                  onChange={handleNewWardChange}
                  placeholder="Tìm Phường/Xã"
                  disabled={!form.newCityCode}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setShowOld((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
              {showOld ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              Địa chỉ cũ (Tỉnh / Quận / Phường — trước sáp nhập)
            </button>

            {showOld && (
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Tỉnh/Thành phố
                  </label>
                  <SearchableSelect
                    options={cities.map((c) => ({
                      value: String(c.code),
                      label: c.name,
                    }))}
                    value={form.cityCode || ""}
                    onChange={handleCityChange}
                    placeholder="Chọn Tỉnh/Thành phố"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Quận/Huyện
                  </label>
                  <SearchableSelect
                    options={districts.map((d) => ({
                      value: String(d.code),
                      label: d.name,
                    }))}
                    value={form.districtCode || ""}
                    onChange={handleDistrictChange}
                    placeholder="Chọn Quận/Huyện"
                    disabled={!form.cityCode}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Phường/Xã
                  </label>
                  <SearchableSelect
                    options={wards.map((w) => ({
                      value: String(w.code),
                      label: w.name,
                    }))}
                    value={form.wardCode || ""}
                    onChange={handleWardChange}
                    placeholder="Chọn Phường/Xã"
                    disabled={!form.districtCode}
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Phải điền ít nhất 1 trong 2 loại địa chỉ (cũ hoặc mới)
            </p>
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.isDefault}
                onChange={(e) => set("isDefault", e.target.checked)}
              />
              <span className="text-sm">
                Đặt làm địa chỉ giao hàng mặc định
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50">
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {isSaving
              ? "Đang lưu..."
              : mode === "create"
                ? "Thêm địa chỉ"
                : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
