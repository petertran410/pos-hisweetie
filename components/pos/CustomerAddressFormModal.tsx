"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  ChevronDown,
  MapPin,
  User,
  Phone,
  Search,
  Loader2,
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { AddressAutocompleteInput } from "@/components/pos/AddressAutocompleteInput";
import { extractAddressParts, TrackAsiaPrediction } from "@/lib/api/trackasia";
import { createPortal } from "react-dom";

/**
 * Chuẩn hóa tên địa giới để so khớp: bỏ dấu cách thừa, hạ chữ thường,
 * và lược bỏ tiền tố hành chính (Tỉnh/Thành phố/Phường/Xã/Thị trấn...).
 */
function normalizeAdminName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(
      /^(tỉnh|thành phố|tp\.?|phường|xã|thị trấn|quận|huyện|thị xã)\s+/,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
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

const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-gray-700";
const INPUT_CLASS =
  "h-[42px] w-full rounded-lg border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_var(--dt-color-primary-ring)]";
const LABEL_SUGGESTIONS = ["Nhà riêng", "Văn phòng", "Cửa hàng", "Kho"];

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
      (x) => String(x.code) === String(form.districtCode),
    );
    return d?.wards || [];
  }, [form.districtCode, districts]);

  // Derive communes theo newCityCode
  const filteredCommunes = useMemo(() => {
    if (!form.newCityCode) return [];
    return invoiceCommunes.filter(
      (x) => String(x.provinceCode) === String(form.newCityCode),
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

  // Chọn 1 gợi ý từ TrackAsia: điền số nhà/đường + tự map Tỉnh/Phường mới.
  const handleSelectSuggestion = (prediction: TrackAsiaPrediction) => {
    const { streetAddress, provinceName, wardName } =
      extractAddressParts(prediction);

    const province = provinceName
      ? invoiceProvinces.find(
          (p) =>
            normalizeAdminName(p.name) === normalizeAdminName(provinceName),
        )
      : undefined;

    const ward =
      province && wardName
        ? invoiceCommunes.find(
            (c) =>
              String(c.provinceCode) === String(province.code) &&
              normalizeAdminName(c.name) === normalizeAdminName(wardName),
          )
        : undefined;

    setForm((p: any) => ({
      ...p,
      address: streetAddress || p.address,
      ...(province
        ? {
            newCityCode: province.code,
            newCityName: province.name,
            // Đổi tỉnh thì reset phường nếu phường không khớp tỉnh mới.
            newWardCode: ward?.code,
            newWardName: ward?.name,
          }
        : {}),
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

  const newAddressLine = [form.address, form.newWardName, form.newCityName]
    .filter(Boolean)
    .join(", ");
  const oldAddressLine = [
    form.address,
    form.wardName,
    form.districtName,
    form.cityName,
  ]
    .filter(Boolean)
    .join(", ");
  const hasAnyRegion = !!(form.newCityCode || form.cityCode);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl">
        {/* ===== Header ===== */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900">
                {mode === "create"
                  ? "Thêm địa chỉ giao hàng"
                  : "Chỉnh sửa địa chỉ giao hàng"}
              </h3>
              <p className="truncate text-xs text-gray-500">
                Người nhận và nơi giao hàng của khách
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="-mr-2 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ===== Body ===== */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3 sm:space-y-4 sm:p-5">
          {/* ── Người nhận ── */}
          <section className="rounded-xl border bg-white p-4 sm:p-5">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Người nhận
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="col-span-2">
                <label className={LABEL_CLASS}>Tên gợi nhớ</label>
                <input
                  type="text"
                  value={form.label || ""}
                  onChange={(e) => set("label", e.target.value || undefined)}
                  placeholder="VD: Văn phòng, Kho 1"
                  className={INPUT_CLASS}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {LABEL_SUGGESTIONS.map((s) => {
                    const active = form.label === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set("label", active ? undefined : s)}
                        className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                          active
                            ? "border-brand bg-brand-soft font-medium text-brand"
                            : "bg-white text-gray-600 hover:border-brand-border-strong hover:bg-gray-50"
                        }`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={LABEL_CLASS}>Người nhận</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.receiver ?? ""}
                    onChange={(e) => set("receiver", e.target.value)}
                    placeholder="Tên người nhận"
                    className={`${INPUT_CLASS} pl-9`}
                  />
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={LABEL_CLASS}>Số điện thoại</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={form.contactNumber || ""}
                    onChange={(e) =>
                      set("contactNumber", e.target.value || undefined)
                    }
                    placeholder="SĐT người nhận"
                    className={`${INPUT_CLASS} pl-9`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── Địa chỉ ── */}
          <section
            className={`rounded-xl border bg-white p-4 sm:p-5 ${
              error && !hasAnyRegion ? "border-red-300" : ""
            }`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Địa chỉ giao hàng
              </h4>
              <span className="text-right text-[11px] text-gray-400">
                Cần ít nhất 1 trong 2 loại địa chỉ
              </span>
            </div>

            <div>
              <label className={LABEL_CLASS}>Số nhà, tên đường</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <AddressAutocompleteInput
                  value={form.address || ""}
                  onChange={(text) => set("address", text || undefined)}
                  onSelect={handleSelectSuggestion}
                  placeholder="VD: 123 Nguyễn Trãi"
                  className={`${INPUT_CLASS} pl-9 pr-9`}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Gõ để xem gợi ý — chọn gợi ý sẽ tự điền Tỉnh và Phường mới.
              </p>
            </div>

            {/* Địa chỉ mới */}
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Địa chỉ mới
                </span>
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                  Sau sáp nhập
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <SearchableSelect
                  variant="form"
                  options={(invoiceProvinces || []).map((p) => ({
                    value: p.code,
                    label: p.name,
                  }))}
                  value={form.newCityCode || ""}
                  onChange={handleNewCityChange}
                  placeholder="Tỉnh/Thành phố"
                  searchPlaceholder="Tìm Tỉnh/Thành phố..."
                />
                <SearchableSelect
                  variant="form"
                  options={filteredCommunes.map((c) => ({
                    value: c.code,
                    label: c.name,
                  }))}
                  value={form.newWardCode || ""}
                  onChange={handleNewWardChange}
                  placeholder={
                    form.newCityCode ? "Phường/Xã" : "Chọn Tỉnh trước"
                  }
                  searchPlaceholder="Tìm Phường/Xã..."
                  disabled={!form.newCityCode}
                />
              </div>
            </div>

            {/* Địa chỉ cũ — thu gọn */}
            <div className="mt-4 rounded-lg border">
              <button
                type="button"
                onClick={() => setShowOld((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Địa chỉ cũ</span>
                  <span className="text-xs text-gray-500">
                    Tỉnh / Quận / Phường — trước sáp nhập
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                    showOld ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showOld && (
                <div className="grid grid-cols-1 gap-3 border-t p-3 sm:grid-cols-3">
                  <SearchableSelect
                    variant="form"
                    options={cities.map((c) => ({
                      value: String(c.code),
                      label: c.name,
                    }))}
                    value={form.cityCode || ""}
                    onChange={handleCityChange}
                    placeholder="Tỉnh/Thành phố"
                    searchPlaceholder="Tìm Tỉnh/Thành phố..."
                  />
                  <SearchableSelect
                    variant="form"
                    options={districts.map((d) => ({
                      value: String(d.code),
                      label: d.name,
                    }))}
                    value={form.districtCode || ""}
                    onChange={handleDistrictChange}
                    placeholder="Quận/Huyện"
                    searchPlaceholder="Tìm Quận/Huyện..."
                    disabled={!form.cityCode}
                  />
                  <SearchableSelect
                    variant="form"
                    options={wards.map((w) => ({
                      value: String(w.code),
                      label: w.name,
                    }))}
                    value={form.wardCode || ""}
                    onChange={handleWardChange}
                    placeholder="Phường/Xã"
                    searchPlaceholder="Tìm Phường/Xã..."
                    disabled={!form.districtCode}
                  />
                </div>
              )}
            </div>

            {/* Xem trước địa chỉ đầy đủ */}
            {hasAnyRegion && (
              <div className="mt-4 space-y-1 rounded-lg bg-brand-soft px-3 py-2.5 text-xs">
                {form.newCityCode && (
                  <p className="text-gray-700">
                    <span className="font-medium text-brand">Mới:</span>{" "}
                    {newAddressLine}
                  </p>
                )}
                {form.cityCode && (
                  <p className="text-gray-700">
                    <span className="font-medium text-brand">Cũ:</span>{" "}
                    {oldAddressLine}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ── Mặc định ── */}
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3.5 sm:px-5">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900">
                Đặt làm địa chỉ mặc định
              </span>
              <span className="block text-xs text-gray-500">
                Tự chọn địa chỉ này khi tạo đơn cho khách
              </span>
            </span>
            <input
              type="checkbox"
              className="peer sr-only"
              checked={!!form.isDefault}
              onChange={(e) => set("isDefault", e.target.checked)}
            />
            <span
              aria-hidden
              className="relative h-6 w-11 shrink-0 rounded-full bg-gray-200 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* ===== Footer ===== */}
        <div className="flex shrink-0 justify-end gap-2 border-t bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-10 rounded-lg border px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving
              ? "Đang lưu..."
              : mode === "create"
                ? "Thêm địa chỉ"
                : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
