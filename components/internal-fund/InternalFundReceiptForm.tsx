"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import { internalFundApi } from "@/lib/api/internal-fund";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreateInternalFundReceiptApproval,
  useInternalFundAccess,
} from "@/lib/hooks/useInternalFund";
import { useBranchStore } from "@/lib/store/branch";

function asBranches(payload: unknown) {
  if (Array.isArray(payload))
    return payload as Array<{ id: number; name: string }>;
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Array<{ id: number; name: string }> }).data;
  }
  return [];
}

const todayInput = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

export function InternalFundReceiptForm({
  onClose,
  transfer = false,
}: {
  onClose: () => void;
  transfer?: boolean;
}) {
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const { data: branchData } = useBranches();
  const access = useInternalFundAccess();
  const branches = useMemo(
    () =>
      asBranches(branchData).filter((branch) =>
        [1, 4, 6, 7].includes(branch.id),
      ),
    [branchData],
  );
  const createApproval = useCreateInternalFundReceiptApproval();
  const [requestedBranchId, setBranchId] = useState(selectedBranch?.id || 6);
  const allowedBranches = branches.filter(
    (branch) =>
      access.data?.[branch.id]?.includes("create_receipt") &&
      access.data?.[branch.id]?.includes("submit_approval"),
  );
  const branchId =
    allowedBranches.find((branch) => branch.id === requestedBranchId)?.id ||
    allowedBranches[0]?.id ||
    0;
  const [clientUuid] = useState(() => crypto.randomUUID());
  const [classification, setClassification] = useState<
    "OTHER" | "REFUND_ADVANCE" | "INTERNAL_TRANSFER"
  >(transfer ? "INTERNAL_TRANSFER" : "OTHER");
  const [destinationBranchId, setDestinationBranchId] = useState(1);
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayInput());
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadCodes, setUploadCodes] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ code: string; url: string; name: string; type: string }>
  >([]);
  const [tempAdvance, setTempAdvance] = useState("");
  const [payerOpenId, setPayerOpenId] = useState("");
  const canSend =
    Boolean(branchId) &&
    (classification !== "INTERNAL_TRANSFER" ||
      (access.data?.[branchId]?.includes("transfer") &&
        access.data?.[destinationBranchId]?.includes("transfer")));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) {
      toast.error("Chưa có quyền hoặc chưa chọn đủ quỹ");
      return;
    }
    const parsedAmount = Number(amount.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Số tiền phải lớn hơn 0");
      return;
    }
    if (!files.length) {
      toast.error("Cần chọn ít nhất một chứng từ");
      return;
    }
    if (
      classification === "INTERNAL_TRANSFER" &&
      branchId === destinationBranchId
    ) {
      toast.error("Quỹ nguồn và quỹ đích phải khác nhau");
      return;
    }
    setUploading(true);
    try {
      let uploaded = uploadedFiles;
      if (!uploadCodes.length) {
        uploaded = await Promise.all(
          files.map((file) => internalFundApi.uploadFile(file, branchId)),
        );
        setUploadedFiles(uploaded);
      }
      const codes = uploadCodes.length ? uploadCodes : uploaded.map((upload) => upload.code);
      setUploadCodes(codes);
      createApproval.mutate(
        {
          clientUuid,
          branchId,
          amount: parsedAmount,
          occurredAt: `${occurredAt}T00:00:00+07:00`,
          description: description.trim() || undefined,
          classification,
          destinationBranchId:
            classification === "INTERNAL_TRANSFER"
              ? destinationBranchId
              : undefined,
          method: "cash",
          attachmentCodes: codes,
          attachmentFiles: uploaded.map((upload) => ({
            code: upload.code,
            url: upload.url,
            name: upload.name,
            type: upload.type,
          })),
          tempAdvance: tempAdvance || undefined,
          payerOpenId: payerOpenId || undefined,
        },
        { onSuccess: onClose },
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload chứng từ thất bại",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <form
        onSubmit={submit}
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {transfer ? "Chuyển tiền nội bộ" : "Phiếu thu nội bộ"}
            </h2>
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
            {classification === "INTERNAL_TRANSFER" ? "Quỹ nguồn" : "Quỹ nhận"}
            <select
              value={branchId}
              onChange={(event) => setBranchId(Number(event.target.value))}
              className="dt-select h-10 w-full"
            >
              {allowedBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
            Loại phiếu
            <select
              value={classification}
              onChange={(event) =>
                setClassification(
                  event.target.value as
                    | "OTHER"
                    | "REFUND_ADVANCE"
                    | "INTERNAL_TRANSFER",
                )
              }
              className="dt-select h-10 w-full"
            >
              <option value="OTHER">Thu quỹ nội bộ</option>
              <option value="REFUND_ADVANCE">Hoàn trả tạm ứng</option>
              <option value="INTERNAL_TRANSFER">Chuyển tiền nội bộ</option>
            </select>
          </label>
          {classification === "INTERNAL_TRANSFER" && (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
              Quỹ đích
              <select
                value={destinationBranchId}
                onChange={(event) =>
                  setDestinationBranchId(Number(event.target.value))
                }
                className="dt-select h-10 w-full"
              >
                <option value={0}>Chọn quỹ đích</option>
                {branches
                  .filter(
                    (branch) =>
                      branch.id !== branchId &&
                      access.data?.[branch.id]?.includes("transfer"),
                  )
                  .map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
            Số tiền
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="dt-input h-10 w-full"
              required
            />
          </label>
          <InternalFinanceDateField
            label="Ngày thu"
            value={occurredAt}
            onChange={(value) => value && setOccurredAt(value)}
          />
          <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
            Người nộp (Lark ID)
            <input
              value={payerOpenId}
              onChange={(event) => setPayerOpenId(event.target.value)}
              placeholder="Tài khoản đang đăng nhập"
              className="dt-input h-10 w-full"
            />
          </label>
          {classification === "REFUND_ADVANCE" && (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
              Tên phiếu tạm ứng
              <input
                value={tempAdvance}
                onChange={(event) => setTempAdvance(event.target.value)}
                required
                className="dt-input h-10 w-full"
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
            Nội dung
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="dt-input w-full"
            />
          </label>
          <div className="sm:col-span-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Chọn chứng từ
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  setFiles(Array.from(event.target.files || []));
                  setUploadCodes([]);
                  setUploadedFiles([]);
                }}
              />
            </label>
            {files.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                {files.map((file) => file.name).join(", ")}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={!canSend || uploading || createApproval.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {uploading || createApproval.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Gửi Approval
          </button>
        </div>
      </form>
    </div>
  );
}
