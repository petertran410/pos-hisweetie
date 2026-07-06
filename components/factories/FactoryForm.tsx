"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Factory as FactoryIcon } from "lucide-react";
import {
  useCreateFactory,
  useUpdateFactory,
  useFactory,
} from "@/lib/hooks/useFactories";
import { FactoryPayload } from "@/lib/api/factories";
import { toast } from "sonner";
import { useSuppliers } from "@/lib/hooks/useSuppliers";

interface FactoryFormProps {
  mode: "create" | "edit";
  factoryId?: number;
}

const COUNTRIES = [
  { code: "VN", name: "Việt Nam" },
  { code: "CN", name: "Trung Quốc" },
  { code: "TH", name: "Thái Lan" },
  { code: "ID", name: "Indonesia" },
  { code: "MY", name: "Malaysia" },
  { code: "KH", name: "Campuchia" },
];

const CURRENCIES = ["VND", "CNY", "USD", "THB"];

export function FactoryForm({ mode, factoryId }: FactoryFormProps) {
  const router = useRouter();
  const { data: existing, isLoading: loadingFactory } = useFactory(
    mode === "edit" ? factoryId : undefined
  );
  const { data: suppliersData } = useSuppliers({
    pageSize: 500,
    isActive: true,
  });
  const createFactory = useCreateFactory();
  const updateFactory = useUpdateFactory();

  const [form, setForm] = useState<FactoryPayload>({
    name: "",
    code: "",
    description: "",
    country: "VN",
    currency: "VND",
    contactNumber: "",
    address: "",
    supplierId: undefined,
    isActive: true,
  });

  // Load data khi edit
  useEffect(() => {
    if (mode === "edit" && existing) {
      setForm({
        code: existing.code ?? "",
        name: existing.name,
        description: existing.description ?? "",
        country: existing.country ?? "VN",
        currency: existing.currency ?? "VND",
        contactNumber: existing.contactNumber ?? "",
        address: existing.address ?? "",
        supplierId: existing.supplierId ?? undefined,
        isActive: existing.isActive,
      });
    }
  }, [mode, existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Tên nhà máy không được để trống");
      return;
    }
    const payload: FactoryPayload = {
      ...form,
      code: form.code?.trim() || null,
      name: form.name.trim(),
      description: form.description?.trim() || null,
      country: form.country || null,
      currency: form.currency || "VND",
      contactNumber: form.contactNumber?.trim() || null,
      address: form.address?.trim() || null,
      supplierId: form.supplierId || null,
    };
    try {
      if (mode === "create") {
        await createFactory.mutateAsync(payload);
        router.push("/san-pham/nha-may");
      } else {
        await updateFactory.mutateAsync({ id: factoryId!, data: payload });
        router.push("/san-pham/nha-may");
      }
    } catch (e: any) {
      // toast đã được hook xử lý
    }
  };

  if (mode === "edit" && loadingFactory) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/san-pham/nha-may"
            className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <FactoryIcon className="w-6 h-6 text-brand" />
              {mode === "create" ? "Thêm nhà máy" : "Sửa nhà máy"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Quản lý thông tin nhà máy sản xuất
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border p-6 space-y-5"
        style={{ borderColor: "var(--dt-border)" }}>
        {/* Mã + Tên */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mã nhà máy <span className="text-gray-400">(tùy chọn)</span>
            </label>
            <input
              type="text"
              value={form.code ?? ""}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="VD: NM-CN-001"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              style={{ borderColor: "var(--dt-border)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tên nhà máy <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              style={{ borderColor: "var(--dt-border)" }}
            />
          </div>
        </div>

        {/* NCC + Country */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nhà cung cấp quản lý
            </label>
            <select
              value={form.supplierId ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  supplierId: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
              style={{ borderColor: "var(--dt-border)" }}>
              <option value="">— Chưa gắn —</option>
              {suppliersData?.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Quốc gia
            </label>
            <select
              value={form.country ?? "VN"}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
              style={{ borderColor: "var(--dt-border)" }}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Currency + Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tiền tệ
            </label>
            <select
              value={form.currency ?? "VND"}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
              style={{ borderColor: "var(--dt-border)" }}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Số điện thoại
            </label>
            <input
              type="text"
              value={form.contactNumber ?? ""}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              style={{ borderColor: "var(--dt-border)" }}
            />
          </div>
        </div>

        {/* Địa chỉ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Địa chỉ
          </label>
          <input
            type="text"
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            style={{ borderColor: "var(--dt-border)" }}
          />
        </div>

        {/* Mô tả */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Mô tả
          </label>
          <textarea
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            style={{ borderColor: "var(--dt-border)" }}
          />
        </div>

        {/* Trạng thái */}
        <div className="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            checked={form.isActive ?? true}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="isActive" className="text-sm cursor-pointer">
            Đang hoạt động
          </label>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--dt-border)" }}>
          <Link
            href="/san-pham/nha-may"
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            style={{ borderColor: "var(--dt-border)" }}>
            Hủy
          </Link>
          <button
            type="submit"
            disabled={createFactory.isPending || updateFactory.isPending}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5">
            <Save className="w-4 h-4" />
            {mode === "create" ? "Tạo nhà máy" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}