"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useBranches } from "@/lib/hooks/useBranches";
import { useInvoices } from "@/lib/hooks/useInvoices";
import type { Invoice } from "@/lib/api/invoices";
import {
  uploadPackingSlipExpenseFiles,
  type UploadedExpenseFile,
} from "@/lib/hooks/usePackingSlips";
import { useBranchStore } from "@/lib/store/branch";
import { useCreateManualReceipt } from "@/lib/hooks/useInternalFinance";
import { InternalFinanceDateField } from "./InternalFinanceDateField";

const BRANCH_IDS = [6, 1, 4, 7];

const toDateInput = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

export function InternalFinanceReceiptForm({
  onClose,
}: {
  onClose: () => void;
}) {
  const { data: branchData } = useBranches();
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const branches = useMemo(
    () => {
      const payload = branchData as
        | { data?: Array<{ id: number; name: string }> }
        | Array<{ id: number; name: string }>
        | undefined;
      const rows = Array.isArray(payload) ? payload : payload?.data || [];
      return rows.filter((branch) => BRANCH_IDS.includes(branch.id));
    },
    [branchData],
  );
  const createReceipt = useCreateManualReceipt();
  const [branchId, setBranchId] = useState(selectedBranch?.id || 6);
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(toDateInput(new Date()));
  const [method, setMethod] = useState("cash");
  const [cashSource, setCashSource] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([]);
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<UploadedExpenseFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const invoiceQuery = useInvoices({
    search: invoiceSearch.trim() || undefined,
    pageSize: 8,
    currentItem: 0,
  });
  const invoicePayload = invoiceQuery.data as unknown;
  const invoiceRows = Array.isArray(invoicePayload)
    ? invoicePayload
    : Array.isArray((invoicePayload as { data?: unknown } | null)?.data)
      ? ((invoicePayload as { data: Invoice[] }).data ?? [])
      : Array.isArray(
          (
            (invoicePayload as { data?: { data?: unknown } } | null)?.data ||
            {}
          ).data,
        )
        ? ((invoicePayload as { data: { data: Invoice[] } }).data.data ?? [])
        : [];

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const result = await uploadPackingSlipExpenseFiles(Array.from(files));
      setAttachments((current) => [...current, ...result.files]);
      if (result.errors.length) {
        toast.error(`Có ${result.errors.length} file không upload được`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload chứng từ thất bại");
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Số tiền phải lớn hơn 0");
      return;
    }
    if (method === "cash" && !cashSource.trim()) {
      toast.error("Cần chọn nguồn tiền mặt");
      return;
    }
    const parsedInvoiceIds = selectedInvoices.map((invoice) => invoice.id);

    createReceipt.mutate(
      {
        branchId,
        amount: parsedAmount,
        occurredAt: `${occurredAt}T00:00:00.000Z`,
        method,
        cashSource: cashSource.trim() || undefined,
        customerId:
          selectedInvoices[0]?.customerId ||
          (customerId ? Number(customerId) : undefined),
        invoiceIds: parsedInvoiceIds.length ? parsedInvoiceIds : undefined,
        description: description.trim() || undefined,
        attachments: attachments.map((file) => ({
          fileUrl: file.fileUrl,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          kind: "EVIDENCE",
        })),
      },
      { onSuccess: onClose },
    );
  };

  const selectInvoice = (invoice: Invoice) => {
    if (selectedInvoices.some((item) => item.id === invoice.id)) return;
    const selectedCustomerId = selectedInvoices[0]?.customerId;
    if (
      selectedCustomerId &&
      invoice.customerId &&
      selectedCustomerId !== invoice.customerId
    ) {
      toast.error("Các hóa đơn phải thuộc cùng một khách hàng");
      return;
    }
    setSelectedInvoices((current) => [...current, invoice]);
    setInvoiceSearch("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <form
        onSubmit={submit}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Tạo phiếu thu thủ công</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Phiếu này mặc định đã qua kiểm tra kế toán và chờ lập phiếu thu.
            </p>
          </div>
          <button type="button" title="Đóng" onClick={onClose} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Chi nhánh
            <select value={branchId} onChange={(event) => setBranchId(Number(event.target.value))} className="dt-select rounded-lg">
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
          <InternalFinanceDateField
            label="Ngày thu"
            value={occurredAt}
            onChange={(value) => value && setOccurredAt(value)}
          />
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Số tiền
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="dt-input rounded-lg" placeholder="0" required />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Hình thức thu
            <select value={method} onChange={(event) => setMethod(event.target.value)} className="dt-select rounded-lg">
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Nguồn tiền
            <select value={cashSource} onChange={(event) => setCashSource(event.target.value)} className="dt-select rounded-lg">
              <option value="">Chọn nguồn tiền</option>
              <option value="Kho Hà Nội">Kho Hà Nội</option>
              <option value="Kho Sài Gòn">Kho Sài Gòn</option>
              <option value="Văn phòng Hà Nội">Văn phòng Hà Nội</option>
              <option value="Văn phòng Sài Gòn">Văn phòng Sài Gòn</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            ID khách hàng nếu chưa chọn hóa đơn
            <input inputMode="numeric" value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="dt-input rounded-lg" placeholder="Không bắt buộc" />
          </label>
          <div className="relative flex flex-col gap-1 text-xs text-gray-600">
            Chọn hóa đơn
            <input
              value={invoiceSearch}
              onChange={(event) => setInvoiceSearch(event.target.value)}
              className="dt-input rounded-lg"
              placeholder="Tìm theo mã hóa đơn"
            />
            {invoiceSearch.trim() && invoiceRows.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-white shadow-lg">
                {invoiceRows.map((invoice) => (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() => selectInvoice(invoice)}
                    className="block w-full border-b px-3 py-2 text-left text-xs hover:bg-gray-50">
                    <span className="font-mono text-gray-900">{invoice.code}</span>
                    <span className="ml-2 text-gray-500">
                      {invoice.customer?.name || `KH #${invoice.customerId || "?"}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedInvoices.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {selectedInvoices.map((invoice) => (
                  <span key={invoice.id} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700">
                    {invoice.code}
                    <button
                      type="button"
                      title={`Bỏ ${invoice.code}`}
                      onClick={() => setSelectedInvoices((current) => current.filter((item) => item.id !== invoice.id))}
                      className="text-gray-500 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <label className="flex flex-col gap-1 text-xs text-gray-600 sm:col-span-2">
            Nội dung
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="dt-input min-h-20 rounded-lg" placeholder="Nội dung thu tiền" />
          </label>
          <div className="sm:col-span-2">
            <div className="mb-1 text-xs text-gray-600">Chứng từ</div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Tải chứng từ
              <input type="file" multiple className="hidden" onChange={(event) => void handleUpload(event.target.files)} />
            </label>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                {attachments.map((file) => <div key={file.fileUrl} className="truncate">{file.fileName}</div>)}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Hủy</button>
          <button type="submit" disabled={createReceipt.isPending || uploading} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {createReceipt.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Tạo phiếu thu
          </button>
        </div>
      </form>
    </div>
  );
}
