"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { leadsApi } from "@/lib/api/leads";
import { leadFormsApi } from "@/lib/api/leadForms";
import { useNewLocations } from "@/lib/hooks/useNewLocations";
import { FilterSearchableSelect } from "@/components/ui/filters";
import {
  LEAD_CATEGORY_LABEL,
  LEAD_SOURCE_LABEL,
  SOURCE_CHANNEL_NAMES,
  SOURCE_PLATFORMS,
  options,
} from "@/lib/leads/constants";
import type { LeadSource } from "@/lib/types/lead";
import type {
  LeadForm,
  LeadFormField,
  LeadFormFieldType,
  LeadFormProvince,
} from "@/lib/types/leadForm";

// Trường Lead có sẵn (cùng mặc định backend); Họ tên luôn bật + bắt buộc
const DEFAULT_FIELDS: LeadFormField[] = [
  { key: "name", label: "Họ tên", enabled: true, required: true },
  { key: "phone", label: "Số điện thoại", enabled: true, required: true },
  { key: "zaloPhone", label: "SĐT Zalo", enabled: false, required: false },
  { key: "province", label: "Khu vực", enabled: true, required: false },
  { key: "category", label: "Bạn là", enabled: true, required: true },
  { key: "need", label: "Nhu cầu", enabled: true, required: false },
];
const BUILTIN_HINT: Record<string, string> = {
  name: "Tên lead",
  phone: "SĐT lead (gộp lead trùng SĐT)",
  zaloPhone: "SĐT Zalo cá nhân",
  province: "Tỉnh / thành + phường / xã",
  category: "Phân loại lead",
  need: "Nhu cầu",
};
const TYPE_LABEL: Record<LeadFormFieldType, string> = {
  text: "Trả lời ngắn",
  textarea: "Đoạn văn",
  select: "Chọn 1",
  multiselect: "Chọn nhiều",
};
// Họ tên, SĐT: khách luôn tự nhập (không ẩn, không giá trị mặc định) — khớp backend
const NO_DEFAULT_KEYS = ["name", "phone"];
type Visibility = "off" | "show" | "hidden";
const visibility = (f: LeadFormField): Visibility =>
  !f.enabled ? "off" : f.hidden ? "hidden" : "show";
const hasDefault = (v: LeadFormField["defaultValue"]) =>
  Array.isArray(v) ? v.length > 0 : typeof v === "string" ? !!v.trim() : !!v?.provinceCode;

/** Ô nhập giá trị mặc định theo loại trường (khu vực: tỉnh + phường). */
function DefaultValueInput({
  field: f,
  onChange,
  className,
}: {
  field: LeadFormField;
  onChange: (v: LeadFormField["defaultValue"]) => void;
  className: string;
}) {
  const { provinces, communes } = useNewLocations();
  const v = f.defaultValue;
  const str = typeof v === "string" ? v : "";
  if (f.key === "province") {
    const p = v && typeof v === "object" && !Array.isArray(v) ? (v as LeadFormProvince) : null;
    const wards = communes.filter((c) => c.provinceCode === p?.provinceCode);
    return (
      <div className="grid flex-1 grid-cols-2 gap-2">
        <FilterSearchableSelect
          size="form"
          options={provinces.map((x) => ({ value: x.code, label: x.name }))}
          value={p?.provinceCode ?? ""}
          onChange={(code) =>
            onChange(
              code
                ? { provinceCode: code, provinceName: provinces.find((x) => x.code === code)?.name ?? null, wardCode: null, wardName: null }
                : undefined,
            )
          }
          placeholder="— Không —"
          searchPlaceholder="Tìm tỉnh / thành…"
        />
        <FilterSearchableSelect
          size="form"
          options={wards.map((w) => ({ value: w.code, label: w.name }))}
          value={p?.wardCode ?? ""}
          onChange={(code) =>
            p &&
            onChange({ ...p, wardCode: code || null, wardName: wards.find((w) => w.code === code)?.name ?? null })
          }
          placeholder={p ? "— Phường / xã —" : "Chọn tỉnh trước"}
          searchPlaceholder="Tìm phường / xã…"
        />
      </div>
    );
  }
  if (f.key === "category" || f.type === "select") {
    const opts =
      f.key === "category"
        ? options(LEAD_CATEGORY_LABEL)
        : (f.options ?? []).map((o) => o.trim()).filter(Boolean).map((o) => ({ value: o, label: o }));
    return (
      <select value={str} onChange={(e) => onChange(e.target.value || undefined)} className={className}>
        <option value="">— Không —</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (f.type === "multiselect") {
    const picked = Array.isArray(v) ? v : [];
    const opts = (f.options ?? []).map((o) => o.trim()).filter(Boolean);
    if (!opts.length) return <span className="text-xs text-gray-400">Thêm lựa chọn trước</span>;
    return (
      <div className="flex flex-1 flex-wrap gap-1.5">
        {opts.map((o) => {
          const on = picked.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(on ? picked.filter((x) => x !== o) : [...picked, o])}
              className={`rounded border px-2 py-0.5 text-xs ${on ? "border-brand bg-brand text-white" : "border-gray-300 text-gray-700 hover:border-brand"}`}>
              {o}
            </button>
          );
        })}
      </div>
    );
  }
  if (f.key === "need" || f.type === "textarea")
    return <textarea rows={2} value={str} onChange={(e) => onChange(e.target.value)} className={className} placeholder="— Không —" />;
  return (
    <input
      type={f.key === "zaloPhone" ? "tel" : "text"}
      value={str}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      placeholder="— Không —"
    />
  );
}

/** Tạo / sửa form thu thập lead: thông tin, nguồn / kênh mặc định, trường + câu hỏi thêm. */
export function LeadFormEditor({
  form,
  onClose,
}: {
  form?: LeadForm;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: allChannels } = useQuery({
    queryKey: ["leadChannels"],
    queryFn: () => leadsApi.channels(),
    staleTime: 5 * 60_000,
  });

  const [name, setName] = useState(form?.name ?? "");
  const [slug, setSlug] = useState(form?.slug ?? "");
  const [title, setTitle] = useState(form?.title ?? "");
  const [description, setDescription] = useState(form?.description ?? "");
  const [source, setSource] = useState<LeadSource | "">(form?.source ?? "");
  // pagePid kênh Smax; nguồn có danh sách kênh cố định (Trực tiếp) → tên kênh
  // Nguồn "Khác": kênh gõ tay (tạo giá trị mới) → lưu tên kênh
  const [channel, setChannel] = useState(
    form?.channelPid ??
      (form && (SOURCE_CHANNEL_NAMES[form.source] || form.source === "other")
        ? (form.channelName ?? "")
        : ""),
  );
  const [successMessage, setSuccessMessage] = useState(
    form?.successMessage ?? "",
  );
  const [isActive, setIsActive] = useState(form?.isActive ?? true);
  const [fields, setFields] = useState<LeadFormField[]>(
    form?.fields ?? DEFAULT_FIELDS,
  );

  const fixedChannels = source ? SOURCE_CHANNEL_NAMES[source] : undefined;
  const freeChannel = source === "other";
  const { data: usedChannelNames } = useQuery({
    queryKey: ["leadChannelNames", source],
    queryFn: () => leadsApi.channelNames(source),
    enabled: freeChannel,
    staleTime: 60_000,
  });
  const channelOptions = fixedChannels
    ? fixedChannels.map((n) => ({ value: n, label: n }))
    : (allChannels ?? [])
        .filter((c) => source && SOURCE_PLATFORMS[source].includes(c.platform))
        .map((c) => ({ value: c.pagePid, label: c.name }));

  const patch = (i: number, p: Partial<LeadFormField>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...p } : f)));
  const move = (i: number, d: -1 | 1) =>
    setFields((fs) => {
      const next = [...fs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  const addQuestion = () =>
    setFields((fs) => [
      ...fs,
      {
        key: `q_${Date.now().toString(36)}`,
        label: "",
        enabled: true,
        required: false,
        type: "text",
      },
    ]);

  const categoryField = fields.find((f) => f.key === "category");
  const categoryFromForm =
    categoryField?.enabled &&
    (categoryField.hidden ? hasDefault(categoryField.defaultValue) : categoryField.required);
  const fieldId = (key: string) => `lf-field-${key}`;
  const hiddenNoDefault = fields.find((f) => f.enabled && f.hidden && !hasDefault(f.defaultValue));
  const noLabel = fields.find((f) => !f.label.trim());
  const noOptions = fields.find(
    (f) => (f.type === "select" || f.type === "multiselect") && !f.options?.some((o) => o.trim()),
  );
  // Lỗi đầu tiên + phần tử cần cuộn tới (chỉ hiện sau khi bấm lưu)
  const issue: { msg: string; target: string } | null = !name.trim()
    ? { msg: "Nhập tên form", target: "lf-name" }
    : !source
      ? { msg: "Chọn nguồn cho lead", target: "lf-source" }
      : hiddenNoDefault
        ? {
            msg: `Trường ẩn "${hiddenNoDefault.label || "câu hỏi"}" cần giá trị mặc định`,
            target: fieldId(hiddenNoDefault.key),
          }
        : !categoryFromForm
          ? {
              // Lead bắt buộc có phân loại: lấy từ trường "Bạn là" (bắt buộc, hoặc ẩn + giá trị mặc định)
              msg: `Trường "${categoryField?.label || "Phân loại lead"}" cần bật bắt buộc, hoặc ẩn kèm giá trị mặc định`,
              target: fieldId("category"),
            }
          : noLabel
            ? { msg: "Câu hỏi chưa có nội dung", target: fieldId(noLabel.key) }
            : noOptions
              ? { msg: "Câu hỏi chọn cần ít nhất 1 lựa chọn", target: fieldId(noOptions.key) }
              : null;
  const [tried, setTried] = useState(false);
  const showIssue = tried ? issue : null;
  const submit = () => {
    if (!issue) return save.mutate();
    setTried(true);
    const el = document.getElementById(issue.target);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    (el?.querySelector("input, select, textarea, button") as HTMLElement | null ?? el)?.focus?.({ preventScroll: true });
  };
  const shownCount = fields.filter((f) => f.enabled && !f.hidden).length;
  const hiddenCount = fields.filter((f) => f.enabled && f.hidden).length;

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        ...(slug.trim() ? { slug: slug.trim() } : {}),
        title: title.trim(),
        description,
        source: source as LeadSource,
        channelPid: fixedChannels || freeChannel ? "" : channel,
        channelName: freeChannel
          ? channel.trim()
          : (channelOptions.find((c) => c.value === channel)?.label ?? ""),
        successMessage,
        isActive,
        fields: fields.map((f) => {
          const opts = f.options?.map((o) => o.trim()).filter(Boolean);
          // Giá trị mặc định: chỉ trường đang bật (trừ Họ tên, SĐT); lựa chọn đã xoá → bỏ
          let def = f.enabled && !NO_DEFAULT_KEYS.includes(f.key) ? f.defaultValue : undefined;
          if (typeof def === "string") def = def.trim() || undefined;
          if (f.type === "select" && typeof def === "string" && !opts?.includes(def)) def = undefined;
          if (f.type === "multiselect" && Array.isArray(def)) def = def.filter((o) => opts?.includes(o));
          return {
            ...f,
            label: f.label.trim(),
            ...(opts ? { options: opts } : {}),
            hidden: !!f.hidden && f.enabled && !NO_DEFAULT_KEYS.includes(f.key),
            defaultValue: hasDefault(def) ? def : undefined,
          };
        }),
      };
      return form
        ? leadFormsApi.update(form.id, body)
        : leadFormsApi.create(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadForms"] });
      toast.success(form ? "Đã lưu form" : "Đã tạo form");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được form"),
  });

  const input =
    "w-full border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand";
  const label = "block text-xs font-medium text-gray-600 mb-1";
  const section = "rounded-lg border border-gray-200 p-4 space-y-3";
  const sectionTitle = (n: number, text: string, hint?: string) => (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-dark">
          {n}
        </span>
        {text}
      </h3>
      {hint && <p className="mt-0.5 pl-7 text-xs text-gray-500">{hint}</p>}
    </div>
  );
  const err = (target: string) => showIssue?.target === target;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lf-title"
        className="bg-white rounded-lg w-full max-w-3xl max-h-[92vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 id="lf-title" className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand" aria-hidden="true" />
            {form ? `Sửa form — ${form.name}` : "Tạo form thu thập lead"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4 bg-gray-50/60">
          {/* 1. Thông tin form */}
          <section className={`${section} bg-white`}>
            {sectionTitle(1, "Thông tin form")}
            <div className="grid grid-cols-2 gap-3">
              <div id="lf-name">
                <label htmlFor="lf-name-input" className={label}>
                  Tên form (nội bộ) <span className="text-red-500">*</span>
                </label>
                <input
                  id="lf-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={err("lf-name")}
                  className={`${input} ${err("lf-name") ? "border-red-400 ring-1 ring-red-300" : ""}`}
                  placeholder="Hội chợ Cafe Show 2026"
                />
                {err("lf-name") && <p className="mt-1 text-xs text-red-600">{showIssue!.msg}</p>}
              </div>
              <div>
                <label htmlFor="lf-slug" className={label}>Đường dẫn</label>
                <div className="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-brand">
                  <span className="pl-2.5 text-sm text-gray-400">/f/</span>
                  <input
                    id="lf-slug"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                      )
                    }
                    className="w-full rounded-md px-1 py-1.5 text-sm outline-none"
                    placeholder="tự tạo theo tên form"
                  />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="lf-form-title" className={label}>Tiêu đề hiển thị cho khách</label>
              <input
                id="lf-form-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={input}
                placeholder="Mặc định = tên form"
              />
            </div>
            <div>
              <label htmlFor="lf-desc" className={label}>Mô tả</label>
              <textarea
                id="lf-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={input}
                placeholder="Hiện dưới tiêu đề form (không bắt buộc)"
              />
            </div>
          </section>

          {/* 2. Lead tạo từ form */}
          <section className={`${section} bg-white`}>
            {sectionTitle(2, "Lead tạo từ form", "Nguồn, kênh của lead khi khách gửi form · báo lead mới vào nhóm Lark nhận lead")}
            <div id="lf-source">
              <span className={label}>
                Nguồn <span className="text-red-500">*</span>
              </span>
              <div role="radiogroup" aria-label="Nguồn" className="flex flex-wrap gap-1.5">
                {options(LEAD_SOURCE_LABEL).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={source === o.value}
                    onClick={() => {
                      setSource(o.value);
                      setChannel("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      source === o.value
                        ? "bg-brand text-white border-brand shadow-sm"
                        : "border-gray-200 text-gray-700 hover:border-brand hover:bg-brand-soft"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {err("lf-source") && <p className="mt-1 text-xs text-red-600">{showIssue!.msg}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lf-channel" className={label}>Kênh</label>
                {freeChannel ? (
                  <>
                    <input
                      id="lf-channel"
                      list="lead-form-free-channels"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      maxLength={255}
                      className={input}
                      placeholder="Chọn hoặc gõ tên kênh mới"
                    />
                    <datalist id="lead-form-free-channels">
                      {(usedChannelNames ?? []).map((n) => (
                        <option key={n} value={n} />
                      ))}
                    </datalist>
                    <p className="mt-1 text-[11px] text-gray-500">Gõ tên mới để tạo kênh</p>
                  </>
                ) : (
                  <FilterSearchableSelect
                    size="form"
                    options={channelOptions}
                    value={channel}
                    onChange={setChannel}
                    placeholder={
                      !source
                        ? "Chọn nguồn trước"
                        : channelOptions.length
                          ? "— Chọn kênh —"
                          : "Không có kênh"
                    }
                  />
                )}
              </div>
            </div>
          </section>

          {/* 3. Trường trên form */}
          <section className={`${section} bg-white`}>
            {sectionTitle(
              3,
              "Trường trên form",
              `${shownCount} trường hiện cho khách${hiddenCount ? ` · ${hiddenCount} trường ẩn (lead tự nhận giá trị mặc định)` : ""}`,
            )}
            <ul className="space-y-2">
              {fields.map((f, i) => {
                const builtin = !f.key.startsWith("q_");
                const vis = visibility(f);
                const canDefault = f.enabled && !NO_DEFAULT_KEYS.includes(f.key);
                const fieldErr = err(fieldId(f.key));
                return (
                  <li
                    key={f.key}
                    id={fieldId(f.key)}
                    className={`rounded-lg border p-3 transition-colors ${
                      fieldErr
                        ? "border-red-300 bg-red-50/40"
                        : vis === "off"
                          ? "border-dashed border-gray-200 bg-gray-50"
                          : vis === "hidden"
                            ? "border-amber-200 bg-amber-50/40"
                            : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                          aria-label={`Đưa "${f.label || "câu hỏi"}" lên`}
                          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={i === fields.length - 1}
                          onClick={() => move(i, 1)}
                          aria-label={`Đưa "${f.label || "câu hỏi"}" xuống`}
                          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={f.label}
                            onChange={(e) => patch(i, { label: e.target.value })}
                            aria-label="Nội dung câu hỏi"
                            className={`${input} flex-1 font-medium ${vis === "off" ? "text-gray-400" : ""}`}
                            placeholder="Nội dung câu hỏi"
                          />
                          {builtin ? (
                            <span
                              title={BUILTIN_HINT[f.key]}
                              className="w-40 shrink-0 truncate rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-600"
                            >
                              {BUILTIN_HINT[f.key]}
                            </span>
                          ) : (
                            <select
                              value={f.type ?? "text"}
                              onChange={(e) =>
                                patch(i, {
                                  type: e.target.value as LeadFormFieldType,
                                  defaultValue: undefined,
                                })
                              }
                              aria-label="Loại câu hỏi"
                              className="w-40 shrink-0 rounded-md border px-2 py-1.5 text-sm"
                            >
                              {(Object.keys(TYPE_LABEL) as LeadFormFieldType[]).map((t) => (
                                <option key={t} value={t}>
                                  {TYPE_LABEL[t]}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        {(f.type === "select" || f.type === "multiselect") && (
                          <textarea
                            value={(f.options ?? []).join("\n")}
                            onChange={(e) =>
                              patch(i, { options: e.target.value.split("\n") })
                            }
                            rows={3}
                            aria-label="Các lựa chọn"
                            className={input}
                            placeholder={"Mỗi dòng 1 lựa chọn"}
                          />
                        )}
                        {f.key === "name" ? (
                          <p className="text-xs text-gray-500">Luôn hiện · bắt buộc</p>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                            <div
                              role="radiogroup"
                              aria-label={`Hiển thị "${f.label || "câu hỏi"}"`}
                              className="inline-flex rounded-md border bg-white p-0.5"
                            >
                              {(
                                [
                                  ...(builtin ? [["off", "Tắt"]] : []),
                                  ["show", "Hiện"],
                                  ...(NO_DEFAULT_KEYS.includes(f.key) ? [] : [["hidden", "Ẩn"]]),
                                ] as [Visibility, string][]
                              ).map(([v, text]) => (
                                <button
                                  key={v}
                                  type="button"
                                  role="radio"
                                  aria-checked={vis === v}
                                  onClick={() =>
                                    patch(i, {
                                      enabled: v !== "off",
                                      hidden: v === "hidden",
                                      required: v === "show" && f.required,
                                    })
                                  }
                                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                                    vis === v
                                      ? v === "hidden"
                                        ? "bg-amber-500 text-white"
                                        : v === "off"
                                          ? "bg-gray-500 text-white"
                                          : "bg-brand text-white"
                                      : "text-gray-600 hover:bg-gray-100"
                                  }`}
                                >
                                  {text}
                                </button>
                              ))}
                            </div>
                            {vis === "show" && (
                              <label className="inline-flex cursor-pointer items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={f.required}
                                  onChange={(e) => patch(i, { required: e.target.checked })}
                                />
                                Bắt buộc
                              </label>
                            )}
                            {vis === "hidden" && (
                              <span className="text-amber-700">Khách không thấy · lead tự nhận giá trị bên dưới</span>
                            )}
                            {vis === "off" && <span className="text-gray-400">Không thu thập</span>}
                            {!builtin && (
                              <button
                                type="button"
                                onClick={() =>
                                  setFields((fs) => fs.filter((_, j) => j !== i))
                                }
                                className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-1 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Xoá câu hỏi
                              </button>
                            )}
                          </div>
                        )}
                        {canDefault && (
                          <div className="flex items-start gap-2 text-xs">
                            <span
                              className={`w-28 shrink-0 pt-2 ${vis === "hidden" ? "font-medium text-amber-700" : "text-gray-600"}`}
                            >
                              {vis === "hidden" ? (
                                <>
                                  Giá trị gửi kèm <span className="text-red-500">*</span>
                                </>
                              ) : (
                                "Điền sẵn"
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <DefaultValueInput
                                field={f}
                                onChange={(v) => patch(i, { defaultValue: v })}
                                className={`${input} flex-1`}
                              />
                              {fieldErr ? (
                                <p className="mt-1 text-red-600">{showIssue!.msg}</p>
                              ) : vis === "show" ? (
                                <p className="mt-1 text-[11px] text-gray-400">Không bắt buộc — khách sửa được</p>
                              ) : null}
                            </div>
                          </div>
                        )}
                        {fieldErr && !canDefault && (
                          <p className="text-xs text-red-600">{showIssue!.msg}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={addQuestion}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand/50 py-2 text-sm font-medium text-brand hover:bg-brand-soft"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Thêm câu hỏi
            </button>
          </section>

          {/* 4. Sau khi gửi */}
          <section className={`${section} bg-white`}>
            {sectionTitle(4, "Sau khi khách gửi")}
            <div>
              <label htmlFor="lf-success" className={label}>Lời cảm ơn</label>
              <textarea
                id="lf-success"
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                rows={2}
                className={input}
                placeholder="Cảm ơn bạn đã gửi thông tin! Chúng tôi sẽ liên hệ trong thời gian sớm nhất."
              />
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Đang mở nhận thông tin
              <span className="text-xs text-gray-500">(tắt = link form báo đã đóng)</span>
            </label>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <p role="alert" aria-live="polite" className="mr-auto text-xs text-red-600">
            {showIssue?.msg}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full border text-sm hover:bg-gray-50"
          >
            Đóng
          </button>
          <button
            onClick={submit}
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {form ? "Lưu" : "Tạo form"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
