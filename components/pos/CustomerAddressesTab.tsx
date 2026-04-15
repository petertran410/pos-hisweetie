"use client";

import { useState, useEffect, useMemo } from "react";
import { useUpdateCustomer } from "@/lib/hooks/useCustomers";
import { toast } from "sonner";
import { Pencil, Save, X as XIcon, Plus, MapPin, Loader2 } from "lucide-react";
import { CustomerAddressItem } from "@/components/customers/CustomerAddressItem";

interface CustomerAddressesTabProps {
  customer: any;
  onUpdate?: (customer: any) => void;
}

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

const initAddresses = (customer: any) => {
  const list = Array.isArray(customer?.addresses) ? customer.addresses : [];
  if (list.length === 0) return [createEmptyAddress(true)];
  // Đảm bảo có đúng 1 default
  const hasDefault = list.some((a: any) => a.isDefault);
  if (!hasDefault) {
    return list.map((a: any, i: number) => ({ ...a, isDefault: i === 0 }));
  }
  return list;
};

export function CustomerAddressesTab({
  customer,
  onUpdate,
}: CustomerAddressesTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const updateCustomer = useUpdateCustomer();

  const [cities, setCities] = useState<City[]>([]);
  const [invoiceProvinces, setInvoiceProvinces] = useState<Province[]>([]);
  const [invoiceCommunes, setInvoiceCommunes] = useState<Commune[]>([]);

  const [addresses, setAddresses] = useState<any[]>(() =>
    initAddresses(customer)
  );

  const customerType = useMemo(
    () => customer?.type?.toString() || "0",
    [customer?.type]
  );

  // Load 3 file JSON 1 lần khi mount
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      try {
        const [citiesRes, provincesRes, communesRes] = await Promise.all([
          fetch("/data/old-location.json").then((r) => r.json()),
          fetch("/data/new-province-location.json").then((r) => r.json()),
          fetch("/data/new-commune-location.json").then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (Array.isArray(citiesRes)) setCities(citiesRes);
        if (Array.isArray(provincesRes)) setInvoiceProvinces(provincesRes);
        else if (provincesRes?.provinces)
          setInvoiceProvinces(provincesRes.provinces);
        if (Array.isArray(communesRes)) setInvoiceCommunes(communesRes);
        else if (communesRes?.communes)
          setInvoiceCommunes(communesRes.communes);
      } catch {
        if (!cancelled) toast.error("Không thể tải dữ liệu địa chỉ");
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };
    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset addresses khi customer prop đổi (sau save / refetch)
  useEffect(() => {
    if (!isEditing) {
      setAddresses(initAddresses(customer));
    }
  }, [customer, isEditing]);

  const handleAddAddress = () => {
    setAddresses((prev) => [...prev, createEmptyAddress(false)]);
  };

  const handleUpdateAddress = (index: number, addr: any) => {
    setAddresses((prev) => prev.map((a, i) => (i === index ? addr : a)));
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses((prev) => {
      const next = prev.filter((_, i) => i !== index);
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
    if (addresses.length === 0) return "Phải có ít nhất 1 địa chỉ giao hàng";
    const defaultCount = addresses.filter((a) => a.isDefault).length;
    if (defaultCount !== 1) return "Phải có đúng 1 địa chỉ mặc định";
    for (let i = 0; i < addresses.length; i++) {
      const a = addresses[i];
      if (!a.cityCode && !a.newCityCode) {
        return `Địa chỉ #${i + 1}: Phải điền ít nhất 1 trong 2 loại địa chỉ (cũ hoặc mới)`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validateAddresses();
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const updated = await updateCustomer.mutateAsync({
        id: customer.id,
        data: { addresses },
      });
      toast.success("Cập nhật địa chỉ thành công");
      setIsEditing(false);
      if (onUpdate) onUpdate(updated);
    } catch (e: any) {
      toast.error(e.message || "Cập nhật địa chỉ thất bại");
    }
  };

  const handleCancel = () => {
    setAddresses(initAddresses(customer));
    setIsEditing(false);
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  // === VIEW MODE ===
  if (!isEditing) {
    const list = Array.isArray(customer?.addresses) ? customer.addresses : [];
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Địa chỉ giao hàng
            <span className="text-sm text-gray-500 font-normal ml-2">
              ({list.length} địa chỉ)
            </span>
          </h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Chỉnh sửa
          </button>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
            Khách hàng chưa có địa chỉ giao hàng. Bấm "Chỉnh sửa" để thêm.
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((addr: any) => (
              <div
                key={addr.id}
                className={`border rounded-lg p-4 ${
                  addr.isDefault ? "border-blue-500 bg-blue-50" : ""
                }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="font-medium">
                      {addr.label || addr.receiver || "Địa chỉ giao hàng"}
                    </span>
                    {addr.isDefault && (
                      <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded">
                        Mặc định
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {addr.receiver && (
                    <div>
                      <span className="text-gray-500">Người nhận: </span>
                      <span>{addr.receiver}</span>
                    </div>
                  )}
                  {addr.contactNumber && (
                    <div>
                      <span className="text-gray-500">SĐT: </span>
                      <span>{addr.contactNumber}</span>
                    </div>
                  )}

                  {(addr.cityName || addr.districtName || addr.wardName) && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Địa chỉ cũ: </span>
                      <span>
                        {[
                          addr.address,
                          addr.wardName,
                          addr.districtName,
                          addr.cityName,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {(addr.newCityName || addr.newWardName) && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Địa chỉ mới: </span>
                      <span>
                        {[addr.address, addr.newWardName, addr.newCityName]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // === EDIT MODE ===
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Chỉnh sửa địa chỉ giao hàng
          <span className="text-sm text-gray-500 font-normal ml-2">
            ({addresses.length} địa chỉ)
          </span>
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddAddress}
            className="px-3 py-2 border rounded hover:bg-gray-50 flex items-center gap-1 text-sm">
            <Plus className="w-4 h-4" />
            Thêm địa chỉ
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={updateCustomer.isPending}
            className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50">
            <XIcon className="w-4 h-4" />
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateCustomer.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
            {updateCustomer.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Lưu
          </button>
        </div>
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
  );
}
