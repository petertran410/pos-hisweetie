"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Factory as FactoryIcon, Loader2, Save, X } from "lucide-react";
import {
  useCreateFactory,
  useFactory,
  useUpdateFactory,
} from "@/lib/hooks/useFactories";
import { FactoryPayload } from "@/lib/api/factories";
import { toast } from "sonner";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { SearchableSelect } from "@/components/shared/SearchableSelect";

interface FactoryFormProps {
  mode: "create" | "edit";
  factoryId?: number;
  onClose?: () => void;
}

const INPUT_CLASS =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand transition-all";

const COUNTRIES = [
  { code: "VN", name: "Việt Nam" },
  { code: "CN", name: "Trung Quốc" },
  { code: "TH", name: "Thái Lan" },
  { code: "ID", name: "Indonesia" },
  { code: "MY", name: "Malaysia" },
  { code: "KH", name: "Campuchia" },
];

const CURRENCIES = ["VND", "CNY", "USD", "THB"];
const INCOTERMS = ["EXW", "FCA", "FOB", "CFR", "CIF", "DAP", "DDP"];

const STRATEGIC_LEVELS = [
  { value: "STRATEGIC", label: "Chiến lược" },
  { value: "PREFERRED", label: "Ưu tiên" },
  { value: "BACKUP", label: "Dự phòng" },
  { value: "TRIAL", label: "Thử nghiệm" },
];

const CUSTOMS_RISKS = [
  { value: "LOW", label: "Thấp" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HIGH", label: "Cao" },
];

const CARGO_TYPES = [
  { value: "DRY", label: "Hàng khô" },
  { value: "REEFER", label: "Hàng lạnh" },
];

export function FactoryForm({ mode, factoryId, onClose }: FactoryFormProps) {
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
  const [mounted, setMounted] = useState(false);
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
    strategicLevel: "",
    wechat: "",
    email: "",
    moq: undefined,
    leadtimeDays: undefined,
    paymentTerm: "",
    port: "",
    incoterm: "",
    productionLeadtime: undefined,
    shippingLeadtime: undefined,
    customsRisk: "",
    cargoType: "",
    notes: "",
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mode === "edit" && existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        strategicLevel: existing.strategicLevel ?? "",
        wechat: existing.wechat ?? "",
        email: existing.email ?? "",
        moq: existing.moq != null ? Number(existing.moq) : undefined,
        leadtimeDays: existing.leadtimeDays ?? undefined,
        paymentTerm: existing.paymentTerm ?? "",
        port: existing.port ?? "",
        incoterm: existing.incoterm ?? "",
        productionLeadtime: existing.productionLeadtime ?? undefined,
        shippingLeadtime: existing.shippingLeadtime ?? undefined,
        customsRisk: existing.customsRisk ?? "",
        cargoType: existing.cargoType ?? "",
        notes: existing.notes ?? "",
      });
    }
  }, [mode, existing]);

  const closeForm = () => {
    if (onClose) {
      onClose();
      return;
    }
    router.push("/san-pham/nha-may");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      // Field thương mại + logistics: chuỗi rỗng → null để không lưu rác.
      strategicLevel: form.strategicLevel?.trim() || null,
      wechat: form.wechat?.trim() || null,
      email: form.email?.trim() || null,
      moq: form.moq ?? null,
      leadtimeDays: form.leadtimeDays ?? null,
      paymentTerm: form.paymentTerm?.trim() || null,
      port: form.port?.trim() || null,
      incoterm: form.incoterm?.trim() || null,
      productionLeadtime: form.productionLeadtime ?? null,
      shippingLeadtime: form.shippingLeadtime ?? null,
      customsRisk: form.customsRisk?.trim() || null,
      cargoType: form.cargoType?.trim() || null,
      notes: form.notes?.trim() || null,
    };

    try {
      if (mode === "create") {
        await createFactory.mutateAsync(payload);
      } else {
        await updateFactory.mutateAsync({ id: factoryId!, data: payload });
      }
      closeForm();
    } catch {
      // Hook hiển thị thông báo lỗi.
    }
  };

  const isSubmitting = createFactory.isPending || updateFactory.isPending;
  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-5">
        {mode === "edit" && loadingFactory ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand" />
            Đang tải thông tin nhà máy...
          </div>
        ) : (
          <>
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Thông tin cơ bản</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên nhà máy <span className="text-red-500">*</span></label>
                  <input type="text" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nhập tên nhà máy" required className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã nhà máy</label>
                  <input type="text" value={form.code ?? ""} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="VD: NM-CN-001" className={INPUT_CLASS} />
                  <p className="text-xs text-gray-400 mt-1">Không bắt buộc. Để trống thì nhà máy không có mã.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nhà cung cấp quản lý</label>
                  <SearchableSelect
                    value={form.supplierId ?? 0}
                    onChange={(supplierId) =>
                      setForm({
                        ...form,
                        supplierId: supplierId || undefined,
                      })
                    }
                    options={
                      suppliersData?.data?.map((supplier) => ({
                        value: supplier.id,
                        label: supplier.name,
                        sublabel: supplier.code || undefined,
                      })) ?? []
                    }
                    placeholder="Chọn nhà cung cấp"
                    emptyLabel="— Chưa gắn —"
                    searchPlaceholder="Tìm tên hoặc mã nhà cung cấp..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
                  <input type="text" value={form.contactNumber ?? ""} onChange={(event) => setForm({ ...form, contactNumber: event.target.value })} placeholder="Nhập số điện thoại" className={INPUT_CLASS} />
                </div>
              </div>
            </section>

            <section className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Địa chỉ & giao dịch</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Quốc gia</label>
                  <select value={form.country ?? "VN"} onChange={(event) => setForm({ ...form, country: event.target.value })} className={INPUT_CLASS}>
                    {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiền tệ</label>
                  <select value={form.currency ?? "VND"} onChange={(event) => setForm({ ...form, currency: event.target.value })} className={INPUT_CLASS}>
                    {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ</label>
                  <input type="text" value={form.address ?? ""} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Nhập địa chỉ nhà máy" className={INPUT_CLASS} />
                </div>
              </div>
            </section>

            <section className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Thông tin thương mại</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mức độ chiến lược</label>
                  <select value={form.strategicLevel ?? ""} onChange={(event) => setForm({ ...form, strategicLevel: event.target.value })} className={INPUT_CLASS}>
                    <option value="">— Chưa phân loại —</option>
                    {STRATEGIC_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Điều khoản thanh toán</label>
                  <input type="text" value={form.paymentTerm ?? ""} onChange={(event) => setForm({ ...form, paymentTerm: event.target.value })} placeholder="VD: T/T 30% trước, 70% sau" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Wechat</label>
                  <input type="text" value={form.wechat ?? ""} onChange={(event) => setForm({ ...form, wechat: event.target.value })} placeholder="Nhập Wechat ID" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={form.email ?? ""} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Nhập email" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">MOQ mặc định</label>
                  <input type="number" min={0} step="any" value={form.moq ?? ""} onChange={(event) => setForm({ ...form, moq: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="Số lượng tối thiểu" className={INPUT_CLASS} />
                  <p className="text-xs text-gray-400 mt-1">MOQ riêng từng sản phẩm khai báo ở bảng sản phẩm.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Leadtime (ngày)</label>
                  <input type="number" min={0} value={form.leadtimeDays ?? ""} onChange={(event) => setForm({ ...form, leadtimeDays: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="Số ngày" className={INPUT_CLASS} />
                </div>
              </div>
            </section>

            <section className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Logistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cảng đi</label>
                  <input type="text" value={form.port ?? ""} onChange={(event) => setForm({ ...form, port: event.target.value })} placeholder="VD: Thượng Hải" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Incoterm</label>
                  <select value={form.incoterm ?? ""} onChange={(event) => setForm({ ...form, incoterm: event.target.value })} className={INPUT_CLASS}>
                    <option value="">— Chưa chọn —</option>
                    {INCOTERMS.map((term) => <option key={term} value={term}>{term}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Thời gian sản xuất (ngày)</label>
                  <input type="number" min={0} value={form.productionLeadtime ?? ""} onChange={(event) => setForm({ ...form, productionLeadtime: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="Số ngày" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Thời gian vận chuyển (ngày)</label>
                  <input type="number" min={0} value={form.shippingLeadtime ?? ""} onChange={(event) => setForm({ ...form, shippingLeadtime: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="Số ngày" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Rủi ro hải quan</label>
                  <select value={form.customsRisk ?? ""} onChange={(event) => setForm({ ...form, customsRisk: event.target.value })} className={INPUT_CLASS}>
                    <option value="">— Chưa đánh giá —</option>
                    {CUSTOMS_RISKS.map((risk) => <option key={risk.value} value={risk.value}>{risk.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Loại hàng vận chuyển</label>
                  <select value={form.cargoType ?? ""} onChange={(event) => setForm({ ...form, cargoType: event.target.value })} className={INPUT_CLASS}>
                    <option value="">— Chưa chọn —</option>
                    {CARGO_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú logistics</label>
                  <textarea value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} placeholder="Nhập ghi chú vận chuyển, thủ tục..." className={`${INPUT_CLASS} resize-none`} />
                </div>
              </div>
            </section>

            <section className="border-t border-gray-100 pt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả</label>
                <textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} placeholder="Nhập mô tả" className={`${INPUT_CLASS} resize-none`} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.isActive ?? true} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="rounded border-gray-300 text-brand focus:ring-brand" />
                Đang hoạt động
              </label>
            </section>
          </>
        )}
      </div>

      <div className="sticky bottom-0 bg-white border-t px-4 py-3 sm:px-6 sm:py-4 flex justify-end gap-2 flex-shrink-0">
        <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Bỏ qua</button>
        <button type="submit" disabled={isSubmitting || loadingFactory} className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 transition-colors">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSubmitting ? "Đang lưu..." : mode === "create" ? "Tạo nhà máy" : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );

  if (!onClose) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/san-pham/nha-may" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-2xl font-semibold flex items-center gap-2"><FactoryIcon className="w-6 h-6 text-brand" />{mode === "create" ? "Thêm nhà máy" : "Sửa nhà máy"}</h1><p className="text-sm text-gray-500 mt-0.5">Quản lý thông tin nhà máy sản xuất</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 min-h-[500px] flex flex-col">{formContent}</div>
      </div>
    );
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl h-[92dvh] sm:h-auto sm:max-h-[90vh] sm:m-4 flex flex-col overflow-hidden shadow-2xl">
        <div className="sticky top-0 bg-white border-b px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between z-10 flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{mode === "create" ? "Tạo nhà máy" : "Chỉnh sửa nhà máy"}</h2>
          <button onClick={closeForm} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" type="button"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        {formContent}
      </div>
    </div>,
    document.body
  );
}
