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
import { useUsers } from "@/lib/hooks/useUsers";
import { useAuthStore } from "@/lib/store/auth";
import { FilterSearchableSelect } from "@/components/ui/filters";
import {
  LEAD_CATEGORY_LABEL,
  LEAD_SOURCE_LABEL,
  SOURCE_CHANNEL_NAMES,
  SOURCE_PLATFORMS,
  options,
} from "@/lib/leads/constants";
import type { LeadCategory, LeadSource } from "@/lib/types/lead";
import type {
  LeadForm,
  LeadFormField,
  LeadFormFieldType,
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

/** Tạo / sửa form thu thập lead: thông tin, nguồn / kênh / CSKH mặc định, trường + câu hỏi thêm. */
export function LeadFormEditor({
  form,
  onClose,
}: {
  form?: LeadForm;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { data: users } = useUsers();
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
  const [channel, setChannel] = useState(
    form?.channelPid ??
      (form && SOURCE_CHANNEL_NAMES[form.source]
        ? (form.channelName ?? "")
        : ""),
  );
  const [category, setCategory] = useState<LeadCategory | "">(
    form?.category ?? "",
  );
  const [cskhUserId, setCskhUserId] = useState<number | null>(
    form ? form.cskhUserId : userId,
  );
  const [successMessage, setSuccessMessage] = useState(
    form?.successMessage ?? "",
  );
  const [isActive, setIsActive] = useState(form?.isActive ?? true);
  const [fields, setFields] = useState<LeadFormField[]>(
    form?.fields ?? DEFAULT_FIELDS,
  );

  const fixedChannels = source ? SOURCE_CHANNEL_NAMES[source] : undefined;
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
  const missing = !name.trim()
    ? "Nhập tên form"
    : !source
      ? "Chọn nguồn"
      : !(categoryField?.enabled && categoryField.required) && !category
        ? "Chọn phân loại mặc định (form không bắt buộc khách chọn phân loại)"
        : fields.some((f) => !f.label.trim())
          ? "Câu hỏi chưa có nội dung"
          : fields.some(
                (f) =>
                  (f.type === "select" || f.type === "multiselect") &&
                  !f.options?.some((o) => o.trim()),
              )
            ? "Câu hỏi chọn cần ít nhất 1 lựa chọn"
            : null;

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        ...(slug.trim() ? { slug: slug.trim() } : {}),
        title: title.trim(),
        description,
        source: source as LeadSource,
        channelPid: fixedChannels ? "" : channel,
        channelName:
          channelOptions.find((c) => c.value === channel)?.label ?? "",
        category,
        cskhUserId,
        successMessage,
        isActive,
        fields: fields.map((f) => ({
          ...f,
          label: f.label.trim(),
          ...(f.options
            ? { options: f.options.map((o) => o.trim()).filter(Boolean) }
            : {}),
        })),
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
    "w-full border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand";
  const label = "block text-xs font-medium text-gray-600 mb-1";

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand" />
            {form ? `Sửa form — ${form.name}` : "Tạo form thu thập lead"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Tên form (nội bộ) *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={input}
                placeholder="Hội chợ Cafe Show 2026"
              />
            </div>
            <div>
              <label className={label}>Đường dẫn</label>
              <div className="flex items-center rounded border focus-within:ring-2 focus-within:ring-brand">
                <span className="pl-2.5 text-sm text-gray-400">/f/</span>
                <input
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    )
                  }
                  className="w-full rounded px-1 py-1.5 text-sm outline-none"
                  placeholder="tự tạo theo tên form"
                />
              </div>
            </div>
          </div>
          <div>
            <label className={label}>Tiêu đề hiển thị cho khách</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={input}
              placeholder="Mặc định = tên form"
            />
          </div>
          <div>
            <label className={label}>Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={input}
            />
          </div>

          <fieldset className="rounded-lg border p-3 space-y-3">
            <legend className="px-1 text-sm font-semibold">
              Lead tạo từ form
            </legend>
            <div>
              <label className={label}>Nguồn *</label>
              <div className="flex flex-wrap gap-1.5">
                {options(LEAD_SOURCE_LABEL).map((o) => (
                  <button
                    key={o.value}
                    type="button"
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
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Kênh</label>
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
              </div>
              <div>
                <label className={label}>Phân loại mặc định</label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as LeadCategory | "")
                  }
                  className={input}
                >
                  <option value="">— Không —</option>
                  {options(LEAD_CATEGORY_LABEL).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>CSKH phụ trách (nhận báo Lark)</label>
                <FilterSearchableSelect
                  size="form"
                  options={(users ?? []).map((u) => ({
                    value: String(u.id),
                    label: u.name,
                  }))}
                  value={cskhUserId ? String(cskhUserId) : ""}
                  onChange={(v) => setCskhUserId(v ? Number(v) : null)}
                  placeholder="— Chọn —"
                  searchPlaceholder="Tìm nhân sự…"
                />
              </div>
            </div>
          </fieldset>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold">Trường trên form</span>
              <button
                onClick={addQuestion}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm câu hỏi
              </button>
            </div>
            <div className="divide-y rounded-lg border">
              {fields.map((f, i) => {
                const builtin = !f.key.startsWith("q_");
                return (
                  <div
                    key={f.key}
                    className={`flex gap-2 p-2.5 ${builtin && !f.enabled ? "bg-gray-50" : ""}`}
                  >
                    <div className="flex flex-col">
                      <button
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={i === fields.length - 1}
                        onClick={() => move(i, 1)}
                        className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          value={f.label}
                          onChange={(e) => patch(i, { label: e.target.value })}
                          className={`${input} flex-1`}
                          placeholder="Nội dung câu hỏi"
                        />
                        {builtin ? (
                          <span className="w-44 shrink-0 text-[11px] text-gray-400">
                            {BUILTIN_HINT[f.key]}
                          </span>
                        ) : (
                          <select
                            value={f.type ?? "text"}
                            onChange={(e) =>
                              patch(i, {
                                type: e.target.value as LeadFormFieldType,
                              })
                            }
                            className="w-44 shrink-0 border rounded px-2 py-1.5 text-sm"
                          >
                            {(
                              Object.keys(TYPE_LABEL) as LeadFormFieldType[]
                            ).map((t) => (
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
                          className={input}
                          placeholder={"Mỗi dòng 1 lựa chọn"}
                        />
                      )}
                      {f.key === "name" ? (
                        <p className="text-xs text-gray-500">
                          Luôn hiện · bắt buộc
                        </p>
                      ) : (
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          {builtin && (
                            <label className="inline-flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={f.enabled}
                                onChange={(e) =>
                                  patch(i, {
                                    enabled: e.target.checked,
                                    required: e.target.checked && f.required,
                                  })
                                }
                              />
                              Hiện trên form
                            </label>
                          )}
                          <label className="inline-flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={f.required}
                              disabled={!f.enabled}
                              onChange={(e) =>
                                patch(i, { required: e.target.checked })
                              }
                            />
                            Bắt buộc
                          </label>
                          {!builtin && (
                            <button
                              onClick={() =>
                                setFields((fs) => fs.filter((_, j) => j !== i))
                              }
                              className="ml-auto inline-flex items-center gap-1 text-red-600 hover:underline"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Xoá
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className={label}>Lời cảm ơn sau khi gửi</label>
            <textarea
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              rows={2}
              className={input}
              placeholder="Cảm ơn bạn đã gửi thông tin! Chúng tôi sẽ liên hệ trong thời gian sớm nhất."
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Đang mở nhận thông tin
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          {missing && (
            <span className="mr-auto text-xs text-red-600">{missing}</span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full border text-sm hover:bg-gray-50"
          >
            Đóng
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={!!missing || save.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand text-white text-sm font-medium disabled:opacity-50"
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
