"use client";

import { useState, useEffect } from "react";
import { useUpdateCustomer } from "@/lib/hooks/useCustomers";
import { toast } from "sonner";
import {
  Pencil,
  Plus,
  MapPin,
  Loader2,
  Trash2,
  Star,
  Phone,
  User,
} from "lucide-react";
import { CustomerAddressFormModal } from "@/components/pos/CustomerAddressFormModal";
import { sanitizeAddresses } from "@/lib/utils/sanitize-address";

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

const initAddresses = (customer: any): any[] => {
  const list = Array.isArray(customer?.addresses) ? customer.addresses : [];
  if (list.length === 0) return [];
  const hasDefault = list.some((a: any) => a.isDefault);
  if (!hasDefault) {
    return list.map((a: any, i: number) => ({ ...a, isDefault: i === 0 }));
  }
  return list;
};

const validateAddressesList = (list: any[]): string | null => {
  if (list.length === 0) return null; // Cho phép 0 address (không auto-save khi rỗng)
  const defaultCount = list.filter((a) => a.isDefault).length;
  if (defaultCount !== 1) return "Phải có đúng 1 địa chỉ mặc định";
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.cityCode && !a.newCityCode) {
      return `Địa chỉ #${i + 1}: Phải điền ít nhất 1 trong 2 loại địa chỉ (cũ hoặc mới)`;
    }
  }
  return null;
};

const formatAddressLine = (a: any): string => {
  const newLine = [a.address, a.newWardName, a.newCityName]
    .filter(Boolean)
    .join(", ");
  if (newLine) return newLine;
  return [a.address, a.wardName, a.districtName, a.cityName]
    .filter(Boolean)
    .join(", ");
};

type ModalState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; index: number };

export function CustomerAddressesTab({
  customer,
  onUpdate,
}: CustomerAddressesTabProps) {
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [cities, setCities] = useState<City[]>([]);
  const [invoiceProvinces, setInvoiceProvinces] = useState<Province[]>([]);
  const [invoiceCommunes, setInvoiceCommunes] = useState<Commune[]>([]);
  const [addresses, setAddresses] = useState<any[]>(() =>
    initAddresses(customer)
  );
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const ADDRESSES_PER_PAGE = 2;
  const [addressPage, setAddressPage] = useState(1);

  const totalAddressPages = Math.max(
    1,
    Math.ceil(addresses.length / ADDRESSES_PER_PAGE)
  );
  const paginatedAddresses = addresses.slice(
    (addressPage - 1) * ADDRESSES_PER_PAGE,
    addressPage * ADDRESSES_PER_PAGE
  );
  const updateCustomer = useUpdateCustomer();

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

  // Sync addresses khi customer prop đổi
  useEffect(() => {
    setAddresses(initAddresses(customer));
  }, [customer]);

  // Call API lưu addresses — dùng chung cho mọi thao tác
  const saveAddresses = async (next: any[]): Promise<boolean> => {
    const err = validateAddressesList(next);
    if (err) {
      toast.error(err);
      return false;
    }
    try {
      const updated = await updateCustomer.mutateAsync({
        id: customer.id,
        data: { addresses: sanitizeAddresses(next) },
      });
      if (onUpdate) onUpdate(updated);
      return true;
    } catch (e: any) {
      toast.error(e.message || "Cập nhật địa chỉ thất bại");
      return false;
    }
  };

  const handleCreateSubmit = async (newAddr: any) => {
    const isFirst = addresses.length === 0;
    const toAdd = {
      ...newAddr,
      isDefault: isFirst || !!newAddr.isDefault,
    };
    const next = toAdd.isDefault
      ? [...addresses.map((a) => ({ ...a, isDefault: false })), toAdd]
      : [...addresses, toAdd];
    const ok = await saveAddresses(next);
    if (ok) {
      setModalState({ open: false });
      setAddressPage(Math.ceil(next.length / ADDRESSES_PER_PAGE));
    }
  };

  const handleEditSubmit = async (updatedAddr: any) => {
    if (!modalState.open || modalState.mode !== "edit") return;
    const idx = modalState.index;
    let next = addresses.map((a, i) =>
      i === idx ? { ...a, ...updatedAddr } : a
    );
    if (updatedAddr.isDefault) {
      next = next.map((a, i) => ({ ...a, isDefault: i === idx }));
    } else if (!next.some((a) => a.isDefault) && next.length > 0) {
      next[0] = { ...next[0], isDefault: true };
    }
    const ok = await saveAddresses(next);
    if (ok) setModalState({ open: false });
  };

  const handleSetDefault = async (index: number) => {
    if (addresses[index]?.isDefault) return;
    const next = addresses.map((a, i) => ({ ...a, isDefault: i === index }));
    await saveAddresses(next);
  };

  const handleRemove = async (index: number) => {
    if (!confirm("Bạn có chắc muốn xóa địa chỉ này?")) return;
    const next = addresses.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((a) => a.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    const ok = await saveAddresses(next);
    if (ok) {
      // Lùi trang nếu trang hiện tại rỗng sau khi xóa
      const maxPage = Math.max(1, Math.ceil(next.length / ADDRESSES_PER_PAGE));
      if (addressPage > maxPage) setAddressPage(maxPage);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Địa chỉ giao hàng
          <span className="text-sm text-gray-500 font-normal ml-2">
            ({addresses.length} địa chỉ)
          </span>
        </h3>
        <button
          onClick={() => setModalState({ open: true, mode: "create" })}
          disabled={updateCustomer.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
          <Plus className="w-4 h-4" />
          Thêm địa chỉ
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Khách hàng chưa có địa chỉ giao hàng.</p>
          <p className="text-sm">Bấm "Thêm địa chỉ" để bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedAddresses.map((addr: any, localIndex: number) => {
            const index = (addressPage - 1) * ADDRESSES_PER_PAGE + localIndex;
            return (
              <div
                key={addr.id ?? index}
                className={`group border rounded-lg p-4 transition-colors ${
                  addr.isDefault
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="font-medium truncate">
                        {addr.label || addr.receiver || `Địa chỉ #${index + 1}`}
                      </span>
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded flex items-center gap-1">
                          <Star className="w-3 h-3" fill="currentColor" />
                          Mặc định
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-700">
                      {(addr.receiver || addr.contactNumber) && (
                        <div className="flex items-center gap-4 text-gray-600">
                          {addr.receiver && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {addr.receiver}
                            </span>
                          )}
                          {addr.contactNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {addr.contactNumber}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-gray-800">
                        {formatAddressLine(addr) || (
                          <span className="italic text-gray-400">
                            Chưa có địa chỉ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(index)}
                        disabled={updateCustomer.isPending}
                        title="Đặt làm mặc định"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50">
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setModalState({ open: true, mode: "edit", index })
                      }
                      disabled={updateCustomer.isPending}
                      title="Chỉnh sửa"
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      disabled={updateCustomer.isPending}
                      title="Xóa"
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {totalAddressPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddressPage((p) => Math.max(1, p - 1))}
                disabled={addressPage <= 1}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                ‹ Trước
              </button>
              <span className="text-sm text-gray-600">
                {addressPage} / {totalAddressPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setAddressPage((p) => Math.min(totalAddressPages, p + 1))
                }
                disabled={addressPage >= totalAddressPages}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                Sau ›
              </button>
            </div>
          )}
        </div>
      )}

      <CustomerAddressFormModal
        isOpen={modalState.open}
        mode={modalState.open ? modalState.mode : "create"}
        initial={
          modalState.open && modalState.mode === "edit"
            ? addresses[modalState.index]
            : undefined
        }
        cities={cities}
        invoiceProvinces={invoiceProvinces}
        invoiceCommunes={invoiceCommunes}
        isSaving={updateCustomer.isPending}
        onClose={() => setModalState({ open: false })}
        onSubmit={
          modalState.open && modalState.mode === "edit"
            ? handleEditSubmit
            : handleCreateSubmit
        }
      />
    </div>
  );
}
