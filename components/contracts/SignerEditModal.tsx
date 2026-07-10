"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import type {
  CreateContractSignerPayload,
  UpdateContractSignerPayload,
} from "@/lib/types/contract";
import type {
  useCreateSigner,
  useUpdateSigner,
  useDeleteSigner,
} from "@/lib/hooks/useContracts";

export interface SignerInitial {
  documensoEmail: string;
  name: string;
  department: string;
  code: string;
  isActive: boolean;
}

interface FireOpts {
  initial: SignerInitial;
  isEdit: boolean;
  createMutation: ReturnType<typeof useCreateSigner>;
  updateMutation: ReturnType<typeof useUpdateSigner>;
  deleteMutation: ReturnType<typeof useDeleteSigner>;
  editId?: number;
}

// Build payload cho BE: bỏ field rỗng (để optional của DTO hoạt động đúng)
function buildPayload(
  form: SignerInitial,
  isEdit: boolean,
): CreateContractSignerPayload | UpdateContractSignerPayload {
  const clean: Record<string, unknown> = {};
  clean.documensoEmail = form.documensoEmail.trim();
  if (form.name.trim()) clean.name = form.name.trim();
  else if (!isEdit) clean.name = null; // create: cho phép null
  if (form.department.trim()) clean.department = form.department.trim();
  else if (!isEdit) clean.department = null;
  if (form.code.trim()) clean.code = form.code.trim();
  else if (!isEdit) clean.code = null;
  clean.isActive = form.isActive;
  return clean as any;
}

const SignerEditModal = {
  async fire(opts: FireOpts): Promise<void> {
    return new Promise((resolve) => {
      const handleClose = () => {
        cleanup();
        resolve();
      };
      const handleSubmit = async (form: SignerInitial) => {
        const payload = buildPayload(form, opts.isEdit);
        try {
          if (opts.isEdit && opts.editId != null) {
            await opts.updateMutation.mutateAsync({
              id: opts.editId,
              data: payload as UpdateContractSignerPayload,
            });
          } else {
            await opts.createMutation.mutateAsync(
              payload as CreateContractSignerPayload,
            );
          }
          cleanup();
          resolve();
        } catch {
          // hook đã toast lỗi; đóng modal vẫn để user retry
          cleanup();
          resolve();
        }
      };

      const overlay = document.createElement("div");
      overlay.setAttribute("data-signer-modal", "1");
      document.body.appendChild(overlay);
      const cleanup = () => {
        try {
          document.body.removeChild(overlay);
        } catch {}
      };

      const root = (
        <Modal
          initial={opts.initial}
          isEdit={opts.isEdit}
          onClose={handleClose}
          onSubmit={handleSubmit}
        />
      );
      createPortal(root, overlay);
    });
  },
};

export default SignerEditModal;

interface ModalProps {
  initial: SignerInitial;
  isEdit: boolean;
  onClose: () => void;
  onSubmit: (data: SignerInitial) => Promise<void> | void;
}

function Modal({ initial, isEdit, onClose, onSubmit }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<SignerInitial>(initial);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const handleChange = (k: keyof SignerInitial) => (v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const handleSubmit = async () => {
    if (!form.documensoEmail.trim()) {
      alert("Vui lòng nhập email Documenso");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-base font-semibold">
            {isEdit ? "Sửa người ký" : "Thêm người ký"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
            disabled={submitting}>
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
              onChange={(e) =>
                handleChange("department")(e.target.value)
              }
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
            disabled={submitting}
            className="px-4 py-2 text-sm rounded border hover:bg-gray-50 disabled:opacity-40">
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Lưu thay đổi" : "Thêm"}
          </button>
        </div>
      </div>
    </div>
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