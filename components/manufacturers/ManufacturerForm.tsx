"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { manufacturersApi, type Manufacturer } from "@/lib/api/manufacturers";
import { PartnerPicker } from "./ProductionPickers";

const inputClass =
  "w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-gray-50";

export function ManufacturerForm({
  value,
  onClose,
}: {
  value: Manufacturer | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(value?.name ?? "");
  const [contactNumber, setContact] = useState(value?.contactNumber ?? "");
  const [email, setEmail] = useState(value?.email ?? "");
  const [address, setAddress] = useState(value?.address ?? "");
  const [note, setNote] = useState(value?.note ?? "");
  const [currency, setCurrency] = useState<"VND" | "CNY">(
    value?.currency ?? "VND",
  );
  const [supplierId, setSupplierId] = useState<number | null>(
    value?.supplierId ?? null,
  );
  const [isActive, setActive] = useState(value?.isActive ?? true);
  const save = useMutation({
    mutationFn: () => {
      const data = {
        name: name.trim(),
        contactNumber,
        email,
        address,
        note,
        currency,
        supplierId,
        isActive,
      };
      return value
        ? manufacturersApi.update(value.id, { ...data, code: value.code })
        : manufacturersApi.create(data);
    },
    onSuccess: () => {
      for (const key of [
        "manufacturers",
        "manufacturer",
        "manufacturer-accounts",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast.success("Đã lưu nhà sản xuất");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    nameRef.current?.focus();
    return () => previous?.focus();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!save.isPending && name.trim()) save.mutate();
  };

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-2 sm:p-5">
      <form
        ref={formRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            if (!save.isPending) onClose();
          }
          if (event.key !== "Tab") return;
          const focusable = formRef.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex='0']",
          );
          if (!focusable?.length) return;
          const first = focusable[0],
            last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/15 bg-brand-soft text-brand">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-base font-semibold text-gray-900 sm:text-lg"
              >
                {value ? "Chỉnh sửa nhà sản xuất" : "Thêm nhà sản xuất"}
              </h2>
              {value && (
                <p className="mt-0.5 text-xs font-medium text-gray-400">
                  {value.code}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            title="Đóng"
            aria-label="Đóng"
            disabled={save.isPending}
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X size={19} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <fieldset
            disabled={save.isPending}
            className="min-w-0 px-4 py-5 sm:px-6"
          >
            <section aria-labelledby={`${titleId}-basic`}>
              <h3
                id={`${titleId}-basic`}
                className="mb-4 text-sm font-semibold text-gray-800"
              >
                Thông tin cơ bản
              </h3>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block min-w-0 text-sm font-medium text-gray-600">
                  <span className="mb-1.5 block">
                    Tên nhà sản xuất <span className="text-red-500">*</span>
                  </span>
                  <input
                    ref={nameRef}
                    required
                    maxLength={200}
                    className={inputClass}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Tên nhà sản xuất"
                    autoComplete="organization"
                  />
                </label>
                <label className="block min-w-0 text-sm font-medium text-gray-600">
                  <span className="mb-1.5 block">Mã nhà sản xuất</span>
                  <input
                    readOnly
                    className={`${inputClass} bg-gray-50 text-gray-500`}
                    value={value?.code ?? ""}
                    placeholder="Tự động"
                    tabIndex={-1}
                  />
                </label>
                <label className="block min-w-0 text-sm font-medium text-gray-600">
                  <span className="mb-1.5 block">Điện thoại</span>
                  <span className="relative block">
                    <Phone
                      size={15}
                      className="pointer-events-none absolute left-3 top-3 text-gray-400"
                    />
                    <input
                      type="tel"
                      maxLength={40}
                      className={`${inputClass} pl-9`}
                      value={contactNumber}
                      onChange={(event) => setContact(event.target.value)}
                      placeholder="Số điện thoại"
                      autoComplete="tel"
                    />
                  </span>
                </label>
                <label className="block min-w-0 text-sm font-medium text-gray-600">
                  <span className="mb-1.5 block">Email</span>
                  <span className="relative block">
                    <Mail
                      size={15}
                      className="pointer-events-none absolute left-3 top-3 text-gray-400"
                    />
                    <input
                      type="email"
                      maxLength={200}
                      className={`${inputClass} pl-9`}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="email@example.com"
                      autoComplete="email"
                    />
                  </span>
                </label>
                <label className="block min-w-0 text-sm font-medium text-gray-600 sm:col-span-2">
                  <span className="mb-1.5 block">Địa chỉ</span>
                  <span className="relative block">
                    <MapPin
                      size={15}
                      className="pointer-events-none absolute left-3 top-3 text-gray-400"
                    />
                    <input
                      maxLength={500}
                      className={`${inputClass} pl-9`}
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="Địa chỉ nhà sản xuất"
                      autoComplete="street-address"
                    />
                  </span>
                </label>
              </div>
            </section>
            <section
              aria-labelledby={`${titleId}-trading`}
              className="mt-5 border-t border-gray-100 pt-5"
            >
              <h3
                id={`${titleId}-trading`}
                className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800"
              >
                <Link2 size={16} className="text-gray-400" />
                Liên kết & giao dịch
              </h3>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="mb-1.5 text-sm font-medium text-gray-600">
                    Nhà cung cấp liên kết
                  </p>
                  <PartnerPicker
                    value={supplierId}
                    label="Chọn NCC nếu có"
                    onChange={setSupplierId}
                    disabled={save.isPending}
                  />
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-gray-600">
                    Tiền tệ
                  </legend>
                  <div className="grid h-[42px] grid-cols-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
                    {(["VND", "CNY"] as const).map((option) => (
                      <label
                        key={option}
                        className={`relative flex cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-brand ${currency === option ? "bg-white text-brand-dark shadow-sm ring-1 ring-gray-200" : "text-gray-500"}`}
                      >
                        <input
                          type="radio"
                          name={`${titleId}-currency`}
                          className="sr-only"
                          value={option}
                          checked={currency === option}
                          onChange={() => setCurrency(option)}
                        />
                        {currency === option && <Check size={13} />}
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block min-w-0 text-sm font-medium text-gray-600 sm:col-span-2">
                  <span className="mb-1.5 block">Ghi chú</span>
                  <textarea
                    maxLength={2000}
                    className={`${inputClass} min-h-24 resize-y font-normal`}
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ghi chú về nhà sản xuất"
                  />
                </label>
              </div>
            </section>
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
              <span className="text-sm font-medium text-gray-700">
                Trạng thái hoạt động
              </span>
              <label className="relative flex cursor-pointer items-center gap-2.5 text-sm text-gray-500">
                <span>{isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Đang hoạt động"
                  className="peer sr-only"
                  checked={isActive}
                  onChange={(event) => setActive(event.target.checked)}
                />
                <span className="relative h-6 w-10 shrink-0 rounded-full bg-gray-200 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2" />
              </label>
            </div>
          </fieldset>
        </div>
        <footer className="relative z-10 flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={save.isPending}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Bỏ qua
          </button>
          <button
            type="submit"
            disabled={save.isPending || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {save.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {save.isPending ? "Đang lưu..." : "Lưu nhà sản xuất"}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
