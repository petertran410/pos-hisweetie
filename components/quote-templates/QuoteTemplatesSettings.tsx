"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Power, PowerOff, Save, Star, Trash2, Undo2 } from "lucide-react";
import { CustomTooltip } from "@/components/ui/CustomTooltip";
import { confirmAction } from "@/lib/chat/confirm";
import {
  useQuoteTemplates,
  useSaveQuoteTemplate,
  useSetDefaultQuoteTemplate,
  useSetQuoteTemplateActive,
} from "@/lib/hooks/useQuoteTemplates";
import { useQuote, useQuotes } from "@/lib/hooks/useQuotes";
import { applyTiers, renderTitle } from "@/lib/quotes/pricing";
import type {
  QuoteItem,
  QuoteLayout,
  QuoteRegion,
  QuoteTemplateConfig,
  QuoteTemplatePayload,
  QuoteTierDef,
} from "@/lib/types/quote";
import { QUOTE_LAYOUT_LABEL, QUOTE_REGION_LABEL } from "@/lib/types/quote";
import { QuotePreview } from "@/components/quotes/QuotePreview";
import { QuotePreviewBrand } from "@/components/quotes/QuotePreviewBrand";

const UNITS = ["thùng", "túi", "hộp", "gói", "bao", "kg"];

const toPayload = (t: QuoteTemplateConfig): QuoteTemplatePayload => ({
  name: t.name,
  tiers: t.tiers,
  titlePattern: t.titlePattern,
  greeting: t.greeting,
  intro: t.intro,
  note: t.note,
  closing: t.closing,
  showMargin: t.showMargin,
});

function ToolButton({
  title,
  onClick,
  disabled,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <CustomTooltip content={title} delayMs={200}>
      <button
        aria-label={title}
        aria-disabled={disabled}
        onClick={disabled ? undefined : onClick}
        className={`p-2 border rounded-lg ${
          disabled ? "opacity-40 cursor-not-allowed" : danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-gray-50"
        }`}>
        {children}
      </button>
    </CustomTooltip>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border p-0.5 bg-gray-50">
      {(Object.keys(options) as T[]).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className={`flex-1 px-2 py-1 text-sm rounded-md whitespace-nowrap ${
            value === k ? "bg-white shadow-sm font-medium text-brand" : "text-gray-600 hover:text-gray-900"
          }`}>
          {options[k]}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-gray-600">{label}</div>
      {children}
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

function TierDefsEditor({ tiers, onChange }: { tiers: QuoteTierDef[]; onChange: (t: QuoteTierDef[]) => void }) {
  const set = (i: number, p: Partial<QuoteTierDef>) => onChange(tiers.map((t, k) => (k === i ? { ...t, ...p } : t)));
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="text-left font-medium px-2 py-1.5">Nhãn cột giá</th>
            <th className="text-left font-medium px-2 py-1.5 w-20">SL từ</th>
            <th className="text-left font-medium px-2 py-1.5 w-20">SL đến</th>
            <th className="text-left font-medium px-2 py-1.5 w-24">ĐVT</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {tiers.map((t, i) => (
            <tr key={t.key} className="border-t">
              <td className="px-2 py-1">
                <input
                  value={t.label}
                  onChange={(e) => set(i, { label: e.target.value })}
                  aria-label="Nhãn cột giá"
                  className="w-full border rounded-md px-2 py-1"
                />
              </td>
              {(["minQty", "maxQty"] as const).map((f) => (
                <td key={f} className="px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    value={t[f] ?? ""}
                    placeholder="—"
                    aria-label={f === "minQty" ? "Số lượng từ" : "Số lượng đến"}
                    onChange={(e) => set(i, { [f]: e.target.value === "" ? null : Number(e.target.value) })}
                    className="w-full border rounded-md px-2 py-1"
                  />
                </td>
              ))}
              <td className="px-2 py-1">
                <select
                  value={t.unit}
                  aria-label="Đơn vị khung"
                  onChange={(e) => set(i, { unit: e.target.value })}
                  className="w-full border rounded-md px-1.5 py-1 bg-white">
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </td>
              <td className="px-1 py-1">
                <button
                  aria-label="Xoá cột giá"
                  disabled={tiers.length <= 1}
                  onClick={() => onChange(tiers.filter((_, k) => k !== i))}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-30">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t px-2 py-1.5">
        <button
          onClick={() => {
            const last = tiers[tiers.length - 1];
            onChange([
              ...tiers,
              {
                key: `k${Date.now()}`,
                label: `Khung ${tiers.length + 1}`,
                minQty: last?.maxQty != null ? last.maxQty + 1 : null,
                maxQty: null,
                unit: last?.unit ?? "thùng",
              },
            ]);
          }}
          className="text-xs text-brand hover:underline flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Thêm cột giá
        </button>
      </div>
    </div>
  );
}

/** Báo giá minh hoạ cho phần xem trước: vài dòng thật trong Thư viện. */
function sampleQuote(form: QuoteTemplatePayload, region: QuoteRegion, libItems: QuoteItem[]) {
  const today = new Date().toISOString().slice(0, 10);
  const until = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  return {
    code: "BG000123",
    title: renderTitle(form.titlePattern, region),
    greeting: form.greeting,
    intro: form.intro,
    closing: form.closing,
    note: form.note,
    showMargin: form.showMargin,
    appliedFrom: today,
    validUntil: until,
    customer: null,
    items: libItems.slice(0, 6).map((it) => applyTiers(it, form.tiers)),
  };
}

export function QuoteTemplatesSettings() {
  const { data: templates = [], isLoading } = useQuoteTemplates();
  const save = useSaveQuoteTemplate();
  const setDefault = useSetDefaultQuoteTemplate();
  const setActive = useSetQuoteTemplateActive();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  /** Mẫu đang sửa; id null = mẫu mới chưa lưu. */
  const [form, setForm] = useState<QuoteTemplatePayload | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [region, setRegion] = useState<QuoteRegion>("HN");
  /** Chỉ để xem trước — kiểu trình bày chọn lúc xuất báo giá, không lưu theo mẫu. */
  const [previewLayout, setPreviewLayout] = useState<QuoteLayout>("classic");

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates.find((t) => t.isDefault) ?? templates[0] ?? null,
    [templates, selectedId]
  );
  const original = editingId == null ? null : templates.find((t) => t.id === editingId) ?? null;
  const dirty = !!form && (original ? JSON.stringify(toPayload(original)) !== JSON.stringify(form) : true);

  // Chọn mẫu khác → nạp vào form (khi không đang sửa dở).
  useEffect(() => {
    if (!selected || (form && dirty)) return;
    if (editingId !== selected.id) {
      setEditingId(selected.id);
      setForm(toPayload(selected));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const guard = async () =>
    !dirty || (await confirmAction("Bỏ các thay đổi chưa lưu của mẫu này?", { confirmText: "Bỏ thay đổi" }));

  const open = async (t: QuoteTemplateConfig) => {
    if (!(await guard())) return;
    setSelectedId(t.id);
    setEditingId(t.id);
    setForm(toPayload(t));
  };

  const startNew = async (from?: QuoteTemplatePayload) => {
    if (!(await guard())) return;
    const base = from ?? (selected ? toPayload(selected) : null);
    if (!base) return;
    setEditingId(null);
    setForm({ ...structuredClone(base), name: from ? `${base.name} (bản sao)` : "Mẫu mới" });
  };

  const submit = async () => {
    if (!form) return;
    if (!form.name.trim()) return toast.error("Nhập tên mẫu");
    if (!form.tiers.length || form.tiers.some((t) => !t.label.trim())) return toast.error("Cột giá cần có nhãn");
    const saved = await save.mutateAsync({ id: editingId ?? undefined, payload: form });
    toast.success(editingId ? `Đã lưu mẫu “${saved.name}”` : `Đã tạo mẫu “${saved.name}”`);
    setSelectedId(saved.id);
    setEditingId(saved.id);
    setForm(toPayload(saved));
  };

  const toggleActive = async () => {
    if (!original) return;
    const stop = original.isActive;
    if (
      stop &&
      !(await confirmAction(
        `Ngừng sử dụng mẫu “${original.name}”? Mẫu sẽ ẩn khỏi form tạo báo giá; báo giá đã tạo không bị ảnh hưởng. Có thể dùng lại sau.`,
        { title: "Ngừng sử dụng mẫu", confirmText: "Ngừng sử dụng" }
      ))
    )
      return;
    await setActive.mutateAsync({ id: original.id, isActive: !stop });
    toast.success(stop ? `Đã ngừng sử dụng “${original.name}”` : `Đã dùng lại “${original.name}”`);
  };

  const patch = (p: Partial<QuoteTemplatePayload>) => setForm((f) => (f ? { ...f, ...p } : f));
  // Sản phẩm minh hoạ: mẫu thư viện đầu tiên; giá theo khung của mẫu đang sửa.
  const { data: lib } = useQuotes({ tab: "library", pageSize: 1 });
  const libId = lib?.data[0]?.id ?? null;
  const { data: libQuote } = useQuote(libId);
  const preview = form ? sampleQuote(form, region, libQuote?.items ?? []) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b bg-white px-6 py-3 shrink-0">
        <h1 className="text-lg font-bold whitespace-nowrap">Mẫu báo giá</h1>
        <span className="ml-2 text-xs text-gray-400">{templates.length}</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b bg-white shrink-0">
        <label htmlFor="qt-select" className="text-sm font-medium whitespace-nowrap">
          Mẫu
        </label>
        <select
          id="qt-select"
          value={editingId ?? ""}
          onChange={(e) => {
            const t = templates.find((x) => x.id === Number(e.target.value));
            if (t) open(t);
          }}
          className="border rounded-lg px-3 py-1.5 text-sm min-w-[240px]">
          {editingId == null && <option value="">{form?.name || "(Mẫu mới chưa lưu)"} — chưa lưu</option>}
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.isDefault ? " (Mặc định)" : ""}
              {t.isActive ? "" : " (Ngừng sử dụng)"}
            </option>
          ))}
        </select>
        {original && !original.isActive && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Ngừng sử dụng</span>
        )}
        <ToolButton title="Thêm mẫu" onClick={() => startNew()} disabled={!selected && !form}>
          <Plus className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Nhân bản mẫu" onClick={() => form && startNew(form)} disabled={!form}>
          <Copy className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          title={
            original?.isDefault
              ? "Đang là mẫu mặc định"
              : original && !original.isActive
                ? "Dùng lại mẫu trước khi đặt mặc định"
                : "Đặt làm mẫu mặc định"
          }
          disabled={!original || original.isDefault || !original.isActive || dirty}
          onClick={async () => {
            if (!original) return;
            await setDefault.mutateAsync(original.id);
            toast.success(`“${original.name}” là mẫu mặc định khi tạo báo giá`);
          }}>
          <Star className={`w-4 h-4 ${original?.isDefault ? "fill-amber-400 text-amber-500" : ""}`} />
        </ToolButton>
        <ToolButton
          title={
            original?.isDefault
              ? "Không ngừng sử dụng được mẫu mặc định"
              : original && !original.isActive
                ? "Dùng lại mẫu"
                : "Ngừng sử dụng mẫu"
          }
          danger={!!original?.isActive}
          disabled={!original || original.isDefault}
          onClick={toggleActive}>
          {original && !original.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
        </ToolButton>
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
          Xem trước theo miền
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as QuoteRegion)}
            aria-label="Miền xem trước"
            className="border rounded-lg px-2 py-1 text-sm">
            {(Object.keys(QUOTE_REGION_LABEL) as QuoteRegion[]).map((r) => (
              <option key={r} value={r}>
                {QUOTE_REGION_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">Đang tải…</div>
      ) : !form ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Chưa có mẫu báo giá.
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Form sửa mẫu */}
          <div className="w-1/2 border-r bg-white flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <Field label="Tên mẫu">
                <input
                  value={form.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-1.5 text-sm font-medium"
                />
              </Field>
              <Field
                label="Khung giá mặc định"
                hint="Mỗi khung là một cột giá. Để trống SL = không giới hạn số lượng (ví dụ Giá lẻ, Giá CTV).">
                <TierDefsEditor tiers={form.tiers} onChange={(tiers) => patch({ tiers })} />
              </Field>
              <Field label="Tiêu đề" hint="{MIEN} được thay bằng tên miền của báo giá (HÀ NỘI / SÀI GÒN), bỏ trống khi Toàn quốc.">
                <input
                  value={form.titlePattern}
                  onChange={(e) => patch({ titlePattern: e.target.value })}
                  className="w-full border rounded-lg px-3 py-1.5 text-sm font-medium"
                />
              </Field>
              <Field label="Kính gửi">
                <input
                  value={form.greeting}
                  onChange={(e) => patch({ greeting: e.target.value })}
                  className="w-full border rounded-lg px-3 py-1.5 text-sm"
                />
              </Field>
              <Field label="Lời mở đầu">
                <textarea
                  value={form.intro}
                  onChange={(e) => patch({ intro: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-1.5 text-sm"
                />
              </Field>
              <Field label="Chính sách / ghi chú mặc định">
                <textarea
                  value={form.note}
                  onChange={(e) => patch({ note: e.target.value })}
                  rows={3}
                  placeholder="VD: Miễn phí giao hàng nội thành cho đơn từ 10 thùng…"
                  className="w-full border rounded-lg px-3 py-1.5 text-sm"
                />
              </Field>
              <Field label="Lời kết">
                <textarea
                  value={form.closing}
                  onChange={(e) => patch({ closing: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-1.5 text-sm"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.showMargin} onChange={(e) => patch({ showMargin: e.target.checked })} />
                In cột “Lợi nhuận” (Mẫu 1, khi có từ 2 cột giá)
              </label>
              {original && (
                <p className="text-xs text-gray-500">
                  Sửa lần cuối: {original.updatedBy.name} · {new Date(original.updatedAt).toLocaleString("vi-VN")}
                </p>
              )}
            </div>
            <div className="border-t p-3 flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 mr-auto">
                {dirty ? "Có thay đổi chưa lưu" : "Đã lưu"} · Báo giá đã tạo không đổi khi sửa mẫu.
              </span>
              {dirty && original && (
                <button
                  onClick={() => setForm(toPayload(original))}
                  className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 flex items-center gap-1.5">
                  <Undo2 className="w-4 h-4" /> Huỷ thay đổi
                </button>
              )}
              <button
                onClick={submit}
                disabled={!dirty || save.isPending}
                className="px-3 py-1.5 text-sm rounded-lg bg-brand text-white hover:bg-brand-dark flex items-center gap-1.5 disabled:opacity-50">
                <Save className="w-4 h-4" /> {editingId ? "Lưu mẫu" : "Tạo mẫu"}
              </button>
            </div>
          </div>

          {/* Xem trước trực tiếp */}
          <div className="w-1/2 bg-gray-100 p-4 overflow-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">Xem trước · 6 sản phẩm từ Thư viện</span>
              <div className="ml-auto w-64">
                <Segmented<QuoteLayout> value={previewLayout} options={QUOTE_LAYOUT_LABEL} onChange={setPreviewLayout} />
              </div>
            </div>
            {preview && (
              <div className="w-fit shadow-sm" style={{ zoom: 0.62 }}>
                {previewLayout === "brand" ? <QuotePreviewBrand quote={preview} /> : <QuotePreview quote={preview} />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
