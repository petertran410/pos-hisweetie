"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Search, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useCustomers } from "@/lib/hooks/useCustomers";
import {
  useCreateContractFromTemplate,
  useContractTemplates,
  useContractTemplateFields,
  useContractSigners,
} from "@/lib/hooks/useContracts";
import type { Customer } from "@/lib/types/customer";
import type {
  ContractSigner,
  ContractTemplateField,
} from "@/lib/types/contract";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/** Bỏ dấu + lowercase để so khớp label "mềm". */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

/** Đoán giá trị prefill từ label field dựa trên dữ liệu khách hàng. */
function guessFromCustomer(label: string, c: Customer): string {
  const n = normalize(label);
  const has = (...keys: string[]) => keys.some((k) => n.includes(k));
  if (has("ma so thue", "mst", "tax")) return c.taxCode || "";
  if (has("email", "thu dien tu")) return c.email || "";
  if (has("so dien thoai", "sdt", "dien thoai", "phone", "tel", "mobile"))
    return c.phone || c.contactNumber || "";
  if (has("dia chi", "address")) return c.invoiceAddress || "";
  // "tên" để cuối vì dễ trùng (tên công ty, họ tên, tên khách...).
  if (has("ten", "name", "khach hang", "cong ty", "don vi")) return c.name || "";
  return "";
}

export function ContractCreateModal({ isOpen, onClose, onSuccess }: Props) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [templateId, setTemplateId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  // Map fieldId -> value (động theo template).
  const [values, setValues] = useState<Record<number, string>>({});
  // Email Documenso user cho "BÊN A" (NV ký sau, áp dụng khi HĐ 2 bên).
  const [signerEmail, setSignerEmail] = useState("");

  const createTpl = useCreateContractFromTemplate();
  const { data: templates, isLoading: loadingTemplates } =
    useContractTemplates(isOpen);
  const { data: fields, isLoading: loadingFields } =
    useContractTemplateFields(isOpen ? templateId : "");
  const { data: signers, isLoading: loadingSigners } =
    useContractSigners(isOpen);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useCustomers(
    debounced
      ? { name: debounced, pageSize: 10, currentItem: 0 }
      : { pageSize: 10, currentItem: 0 }
  );
  const customers = data?.data || [];

  // Khi đổi template hoặc đổi khách → khởi tạo lại values + auto-prefill.
  useEffect(() => {
    if (!fields) return;
    setValues((prev) => {
      const next: Record<number, string> = {};
      for (const f of fields) {
        // Giữ giá trị nhân viên đã gõ nếu còn field đó; nếu chưa có thì đoán.
        if (prev[f.fieldId] !== undefined) {
          next[f.fieldId] = prev[f.fieldId];
        } else if (selected) {
          next[f.fieldId] = guessFromCustomer(f.label, selected);
        } else {
          next[f.fieldId] = "";
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selected]);

  // Auto-fill signer mặc định (user đầu tiên trong list).
  useEffect(() => {
    if (signers && signers.length && !signerEmail) {
      setSignerEmail(signers[0].documensoEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signers]);

  const handleSelect = (c: Customer) => {
    setSelected(c);
    setTitle(`Hợp đồng - ${c.name}`);
    // values sẽ tự re-init qua effect ở trên (selected đổi).
    if (fields) {
      const next: Record<number, string> = {};
      for (const f of fields) next[f.fieldId] = guessFromCustomer(f.label, c);
      setValues(next);
    }
  };

  const reset = () => {
    setSearch("");
    setDebounced("");
    setSelected(null);
    setTemplateId("");
    setTitle("");
    setValues({});
    setSignerEmail("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const noEmail = !!selected && !selected.email;

  const handleSubmit = async () => {
    if (!selected) return toast.error("Vui lòng chọn khách hàng");
    if (!templateId) return toast.error("Vui lòng chọn loại hợp đồng");
    if (noEmail) return toast.error("Khách hàng chưa có email");
    const prefillFields = (fields || [])
      .map((f) => ({ fieldId: f.fieldId, value: values[f.fieldId] ?? "" }))
      .filter((p) => p.value !== "");
    try {
      await createTpl.mutateAsync({
        customerId: selected.id,
        templateId: Number(templateId),
        title: title || undefined,
        prefillFields,
        companySignerEmail: signerEmail || undefined,
      });
      handleClose();
      onSuccess?.();
    } catch {
      /* toast đã hiển thị trong hook */
    }
  };

  const submitting = createTpl.isPending;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-base font-semibold">Tạo hợp đồng</h2>
          <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Loại hợp đồng (template) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Loại hợp đồng <span className="text-red-500">*</span>
            </label>
            <select
              value={templateId}
              onChange={(e) =>
                setTemplateId(e.target.value ? Number(e.target.value) : "")
              }
              disabled={loadingTemplates}
              className="w-full border rounded px-3 py-2 text-sm bg-white">
              <option value="">
                {loadingTemplates ? "Đang tải..." : "-- Chọn loại hợp đồng --"}
              </option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            {!loadingTemplates && (templates?.length || 0) === 0 && (
              <div className="mt-1 text-xs text-orange-600">
                Chưa có template nào trên Documenso. Vui lòng tạo template trước.
              </div>
            )}
          </div>

          {/* NV ký BÊN A (chọn từ Documenso user) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Người đại diện ký BÊN A (công ty)
            </label>
            <select
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              disabled={loadingSigners}
              className="w-full border rounded px-3 py-2 text-sm bg-white">
              <option value="">
                {loadingSigners
                  ? "Đang tải..."
                  : "-- Chọn người ký BÊN A --"}
              </option>
              {(signers || []).map((s: ContractSigner) => (
                <option key={s.id} value={s.documensoEmail}>
                  {s.name || s.documensoEmail}
                  {s.department ? ` — ${s.department}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Dùng cho HĐ 2 bên ký. Documenso sẽ tự apply chữ ký cá nhân của
              user này khi họ ký.
            </p>
          </div>

          {/* Chọn khách hàng */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Khách hàng <span className="text-red-500">*</span>
            </label>
            {selected ? (
              <div className="flex items-center justify-between border rounded px-3 py-2 bg-gray-50">
                <div>
                  <div className="text-sm font-medium">{selected.name}</div>
                  <div className="text-xs text-gray-500">
                    {selected.code} · {selected.email || "Chưa có email"}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-blue-600 hover:underline">
                  Đổi
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên khách hàng..."
                  className="w-full border rounded pl-8 pr-3 py-2 text-sm"
                />
                {(isLoading || customers.length > 0) && (
                  <div className="mt-1 border rounded max-h-48 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tìm...
                      </div>
                    ) : (
                      customers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelect(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-b-0">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-gray-500">
                            {c.code} · {c.email || "Chưa có email"}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {noEmail && (
            <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Khách hàng này chưa có email. Vui lòng cập nhật email trước khi
                gửi hợp đồng.
              </span>
            </div>
          )}

          {/* Tiêu đề */}
          <div>
            <label className="block text-sm font-medium mb-1">Tiêu đề</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hợp đồng..."
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          {/* Field động theo template (phần công ty điền) */}
          <div className="space-y-3">
            <div className="text-xs text-gray-500">
              Thông tin điền sẵn vào hợp đồng (sửa được). Các ô để trống còn lại
              khách hàng sẽ tự điền khi ký.
            </div>

            {!templateId && (
              <div className="text-xs text-gray-400">
                Chọn loại hợp đồng để hiện các ô cần điền.
              </div>
            )}

            {!!templateId && loadingFields && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải các ô...
              </div>
            )}

            {!!templateId &&
              !loadingFields &&
              (fields?.length || 0) === 0 && (
                <div className="text-xs text-orange-600">
                  Template này không có ô nào để công ty điền. Khách hàng sẽ điền
                  toàn bộ khi ký.
                </div>
              )}

            {!!templateId &&
              !loadingFields &&
              (fields || []).map((f) => (
                <DynamicField
                  key={f.fieldId}
                  field={f}
                  value={values[f.fieldId] ?? ""}
                  onChange={(v) =>
                    setValues((prev) => ({ ...prev, [f.fieldId]: v }))
                  }
                />
              ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded border hover:bg-gray-50">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !selected || !templateId || noEmail}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Gửi khách ký điện tử
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Render 1 ô nhập theo type field của Documenso. */
function DynamicField({
  field,
  value,
  onChange,
}: {
  field: ContractTemplateField;
  value: string;
  onChange: (v: string) => void;
}) {
  const type = (field.type || "TEXT").toUpperCase();

  // Loại field khách tự thao tác lúc ký (chữ ký...) — không cho công ty prefill.
  if (type === "SIGNATURE" || type === "INITIALS" || type === "FREE_SIGNATURE") {
    return (
      <div>
        <label className="block text-xs text-gray-600 mb-1">{field.label}</label>
        <div className="text-xs text-gray-400 italic">
          (Ô chữ ký — khách hàng sẽ ký khi nhận hợp đồng)
        </div>
      </div>
    );
  }

  if (type === "CHECKBOX") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "")}
          className="w-4 h-4"
        />
        <span className="text-gray-700">{field.label}</span>
      </label>
    );
  }

  let inputType: string = "text";
  if (type === "DATE") inputType = "date";
  else if (type === "NUMBER") inputType = "number";
  else if (type === "EMAIL") inputType = "email";

  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{field.label}</label>
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-3 py-1.5 text-sm"
      />
    </div>
  );
}