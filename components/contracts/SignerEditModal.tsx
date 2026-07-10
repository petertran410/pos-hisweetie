"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import type {
  CreateContractSignerPayload,
  UpdateContractSignerPayload,
} from "@/lib/types/contract";

export interface SignerFormValues {
  documensoEmail: string;
  name: string;
  department: string;
  code: string;
  isActive: boolean;
}

export interface SignerEditModalProps {
  isOpen: boolean;
  isEdit: boolean;
  initial: SignerFormValues;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateContractSignerPayload | UpdateContractSignerPayload,
  ) => Promise<void> | void;
}

function buildPayload(
  form: SignerFormValues,
  isEdit: boolean,
): CreateContractSignerPayload | UpdateContractSignerPayload {
  const clean: Record<string, unknown> = {};
  clean.documensoEmail = form.documensoEmail.trim();
  if (form.name.trim()) clean.name = form.name.trim();
  else if (!isEdit) clean.name = null;
  if (form.department.trim()) clean.department = form.department.trim();
  else if (!isEdit) clean.department = null;
  if (form.code.trim()) clean.code = form.code.trim();
  else if (!isEdit) clean.code = null;
  clean.isActive = form.isActive;
  return clean as CreateContractSignerPayload | UpdateContractSignerPayload;
}

export default function SignerEditModal({
  isOpen,
  isEdit,
  initial,
  submitting = false,
  onClose,
  onSubmit,
}: SignerEditModalProps) {
  const [mounted, setMounted] = useState(false);
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [form, setForm] = useState<SignerFormValues>(initial);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) setForm(initial);
  }, [isOpen, initial]);

  if (!mounted || !isOpen) return null;

  const busy = submitting || localSubmitting;

  const handleChange =
    (k: keyof SignerFormValues) => (v: string | boolean) => {
      setForm((f) => ({ ...f, [k]: v }));
    };

  const handleSubmit = async () => {
    if (!form.documensoEmail.trim()) {
      alert("Vui lòng nhập email Documenso");
      return;
    }
    setLocalSubmitting(true);
    try {
      await onSubmit(buildPayload(form, isEdit));
    } finally {
      setLocalSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-base font-semibold">
            {isEdit ? "Sửa người ký" : "Thêm người ký"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
            disabled={busy}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-3">
          <Field
            label="Email Documenso"
            required
            hint="Email đăng nhập Documenso của nhân viên. Documenso gửi mail kèm link ký cho email này.">
            <input
              type="email"
              value={form.documensoEmail}
              onChange={(e) => handleChange("documensoEmail")(e.target.value)}
              placeholder="vd: an.nguyen@congty.com"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Họ tên">
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name")(e.target.value)}
              placeholder="vd: Nguyễn Văn An"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Phòng ban">
            <input
              type="text"
              value={form.department}
              onChange={(e) => handleChange("department")(e.target.value)}
              placeholder="vd: Ban Giám đốc"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Mã nội bộ">
            <input
              type="text"
              value={form.code}
              onChange={(e) => handleChange("code")(e.target.value)}
              placeholder="vd: gd"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm pt-1">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => handleChange("isActive")(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Cho phép xuất hiện trong dropdown ký</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm rounded border hover:bg-gray-50 disabled:opacity-40">
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Lưu thay đổi" : "Thêm"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
