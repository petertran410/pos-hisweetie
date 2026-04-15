"use client";

import { useEffect, useState } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface City {
  name: string;
  code: number;
  districts: District[];
}

interface District {
  name: string;
  code: number;
  wards: Ward[];
}

interface Ward {
  name: string;
  code: number;
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

interface CustomerAddressItemProps {
  address: any;
  index: number;
  cities: City[];
  invoiceProvinces: Province[];
  invoiceCommunes: Commune[];
  customerType: string;
  canRemove: boolean;
  onUpdate: (index: number, address: any) => void;
  onRemove: (index: number) => void;
  onSetDefault: (index: number) => void;
}

export function CustomerAddressItem({
  address,
  index,
  cities,
  invoiceProvinces,
  invoiceCommunes,
  customerType,
  canRemove,
  onUpdate,
  onRemove,
  onSetDefault,
}: CustomerAddressItemProps) {
  const [showInvoiceInfo, setShowInvoiceInfo] = useState(
    !!(
      address.invoiceBuyerName ||
      address.invoiceAddress ||
      address.invoiceCityCode ||
      address.invoiceWardCode ||
      address.invoiceCccdCmnd ||
      address.invoiceBankAccount ||
      address.invoiceEmail ||
      address.invoicePhone ||
      address.invoiceDvqhnsCode
    )
  );

  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [filteredCommunes, setFilteredCommunes] = useState<Commune[]>([]);
  const [filteredInvoiceCommunes, setFilteredInvoiceCommunes] = useState<
    Commune[]
  >([]);

  // Derive districts khi cityCode (cũ) đổi
  useEffect(() => {
    if (address.cityCode && cities.length > 0) {
      const city = cities.find(
        (c) => String(c.code) === String(address.cityCode)
      );
      setDistricts(city?.districts || []);
    } else {
      setDistricts([]);
    }
  }, [address.cityCode, cities]);

  // Derive wards khi districtCode đổi
  useEffect(() => {
    if (address.districtCode && districts.length > 0) {
      const district = districts.find(
        (d) => String(d.code) === String(address.districtCode)
      );
      setWards(district?.wards || []);
    } else {
      setWards([]);
    }
  }, [address.districtCode, districts]);

  // Derive communes khi newCityCode (mới) đổi
  useEffect(() => {
    if (address.newCityCode && invoiceCommunes.length > 0) {
      const filtered = invoiceCommunes.filter(
        (c) => String(c.provinceCode) === String(address.newCityCode)
      );
      setFilteredCommunes(filtered);
    } else {
      setFilteredCommunes([]);
    }
  }, [address.newCityCode, invoiceCommunes]);

  // Derive invoiceCommunes khi invoiceCityCode đổi
  useEffect(() => {
    if (address.invoiceCityCode && invoiceCommunes.length > 0) {
      const filtered = invoiceCommunes.filter(
        (c) => String(c.provinceCode) === String(address.invoiceCityCode)
      );
      setFilteredInvoiceCommunes(filtered);
    } else {
      setFilteredInvoiceCommunes([]);
    }
  }, [address.invoiceCityCode, invoiceCommunes]);

  const updateField = (field: string, value: any) => {
    onUpdate(index, { ...address, [field]: value });
  };

  const handleCityCodeChange = (value: string) => {
    const city = cities.find((c) => String(c.code) === String(value));
    onUpdate(index, {
      ...address,
      cityCode: value || undefined,
      cityName: city?.name || undefined,
      districtCode: undefined,
      districtName: undefined,
      wardCode: undefined,
      wardName: undefined,
    });
  };

  const handleDistrictCodeChange = (value: string) => {
    const district = districts.find((d) => String(d.code) === String(value));
    onUpdate(index, {
      ...address,
      districtCode: value || undefined,
      districtName: district?.name || undefined,
      wardCode: undefined,
      wardName: undefined,
    });
  };

  const handleWardCodeChange = (value: string) => {
    const ward = wards.find((w) => String(w.code) === String(value));
    onUpdate(index, {
      ...address,
      wardCode: value || undefined,
      wardName: ward?.name || undefined,
    });
  };

  const handleNewCityCodeChange = (value: string) => {
    const province = invoiceProvinces.find((p) => p.code === value);
    onUpdate(index, {
      ...address,
      newCityCode: value || undefined,
      newCityName: province?.name || undefined,
      newWardCode: undefined,
      newWardName: undefined,
    });
  };

  const handleNewWardCodeChange = (value: string) => {
    const commune = filteredCommunes.find((c) => c.code === value);
    onUpdate(index, {
      ...address,
      newWardCode: value || undefined,
      newWardName: commune?.name || undefined,
    });
  };

  const handleInvoiceCityCodeChange = (value: string) => {
    const province = invoiceProvinces.find((p) => p.code === value);
    onUpdate(index, {
      ...address,
      invoiceCityCode: value || undefined,
      invoiceCityName: province?.name || undefined,
      invoiceWardCode: undefined,
      invoiceWardName: undefined,
    });
  };

  const handleInvoiceWardCodeChange = (value: string) => {
    const commune = filteredInvoiceCommunes.find((c) => c.code === value);
    onUpdate(index, {
      ...address,
      invoiceWardCode: value || undefined,
      invoiceWardName: commune?.name || undefined,
    });
  };

  return (
    <div
      className={`border rounded-lg p-4 space-y-4 ${
        address.isDefault ? "border-blue-400 bg-blue-50/30" : "border-gray-200"
      }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">Địa chỉ #{index + 1}</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="defaultAddress"
              checked={!!address.isDefault}
              onChange={() => onSetDefault(index)}
            />
            <span className="text-sm text-gray-700">Đặt làm mặc định</span>
          </label>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1 text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Tên gợi nhớ</label>
          <input
            type="text"
            value={address.label || ""}
            onChange={(e) => updateField("label", e.target.value || undefined)}
            placeholder="VD: Văn phòng, Kho 1"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Người nhận</label>
          <input
            type="text"
            value={address.receiver || ""}
            onChange={(e) =>
              updateField("receiver", e.target.value || undefined)
            }
            placeholder="Tên người nhận"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Số điện thoại
          </label>
          <input
            type="text"
            value={address.contactNumber || ""}
            onChange={(e) =>
              updateField("contactNumber", e.target.value || undefined)
            }
            placeholder="SĐT người nhận"
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Địa chỉ chi tiết (số nhà, tên đường)
        </label>
        <input
          type="text"
          value={address.address || ""}
          onChange={(e) => updateField("address", e.target.value || undefined)}
          placeholder="VD: 123 Nguyễn Trãi"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* Địa chỉ cũ - 3 cấp */}
      <div className="border-t pt-3">
        <p className="text-sm font-medium mb-3 text-gray-700">
          Địa chỉ cũ (Tỉnh / Quận / Phường — trước sáp nhập)
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Tỉnh/Thành phố
            </label>
            <SearchableSelect
              options={cities.map((c) => ({
                value: String(c.code),
                label: c.name,
              }))}
              value={address.cityCode || ""}
              onChange={handleCityCodeChange}
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
              value={address.districtCode || ""}
              onChange={handleDistrictCodeChange}
              placeholder="Chọn Quận/Huyện"
              disabled={!address.cityCode}
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
              value={address.wardCode || ""}
              onChange={handleWardCodeChange}
              placeholder="Chọn Phường/Xã"
              disabled={!address.districtCode}
            />
          </div>
        </div>
      </div>

      {/* Địa chỉ mới - 2 cấp */}
      <div className="border-t pt-3">
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
              value={address.newCityCode || ""}
              onChange={handleNewCityCodeChange}
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
              value={address.newWardCode || ""}
              onChange={handleNewWardCodeChange}
              placeholder="Tìm Phường/Xã"
              disabled={!address.newCityCode}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Phải điền ít nhất 1 trong 2 loại địa chỉ (cũ hoặc mới)
        </p>
      </div>

      {/* Toggle thông tin xuất hóa đơn theo địa chỉ */}
      <div className="border-t pt-3">
        <button
          type="button"
          onClick={() => setShowInvoiceInfo(!showInvoiceInfo)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
          {showInvoiceInfo ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Thông tin xuất hóa đơn riêng cho địa chỉ này
        </button>

        {showInvoiceInfo && (
          <div className="mt-3 grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded">
            {customerType === "0" && (
              <>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">
                    Tên người mua
                  </label>
                  <input
                    type="text"
                    value={address.invoiceBuyerName || ""}
                    onChange={(e) =>
                      updateField(
                        "invoiceBuyerName",
                        e.target.value || undefined
                      )
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Số CCCD/CMND
                  </label>
                  <input
                    type="text"
                    value={address.invoiceCccdCmnd || ""}
                    onChange={(e) =>
                      updateField(
                        "invoiceCccdCmnd",
                        e.target.value || undefined
                      )
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Số hộ chiếu
                  </label>
                  <input
                    type="text"
                    value={address.invoiceBankAccount || ""}
                    onChange={(e) =>
                      updateField(
                        "invoiceBankAccount",
                        e.target.value || undefined
                      )
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </>
            )}

            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">
                Địa chỉ xuất hóa đơn
              </label>
              <input
                type="text"
                value={address.invoiceAddress || ""}
                onChange={(e) =>
                  updateField("invoiceAddress", e.target.value || undefined)
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Tỉnh/Thành phố (mới)
              </label>
              <SearchableSelect
                options={invoiceProvinces.map((p) => ({
                  value: p.code,
                  label: p.name,
                }))}
                value={address.invoiceCityCode || ""}
                onChange={handleInvoiceCityCodeChange}
                placeholder="Tìm Tỉnh/Thành phố"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Phường/Xã (mới)
              </label>
              <SearchableSelect
                options={filteredInvoiceCommunes.map((c) => ({
                  value: c.code,
                  label: c.name,
                }))}
                value={address.invoiceWardCode || ""}
                onChange={handleInvoiceWardCodeChange}
                placeholder="Tìm Phường/Xã"
                disabled={!address.invoiceCityCode}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={address.invoiceEmail || ""}
                onChange={(e) =>
                  updateField("invoiceEmail", e.target.value || undefined)
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Số điện thoại
              </label>
              <input
                type="text"
                value={address.invoicePhone || ""}
                onChange={(e) =>
                  updateField("invoicePhone", e.target.value || undefined)
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>

            {customerType === "1" && (
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">
                  Mã ĐVQHNS
                </label>
                <input
                  type="text"
                  value={address.invoiceDvqhnsCode || ""}
                  onChange={(e) =>
                    updateField(
                      "invoiceDvqhnsCode",
                      e.target.value || undefined
                    )
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
