"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { EvidenceUploadTiles } from "@/components/internal-finance/EvidenceUploadTiles";
import {
  FinanceFormActions,
  FinanceFormSheet,
} from "@/components/internal-finance/FinanceFormSheet";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import { useBranchStore } from "@/lib/store/branch";
import type { WarehouseReceipt } from "@/lib/api/internal-finance";
import { useBranches } from "@/lib/hooks/useBranches";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import {
  useCreateWarehouseReceipt,
  useUpdateWarehouseReceipt,
} from "@/lib/hooks/useInternalFinance";
import {
  uploadPackingSlipExpenseFiles,
  type UploadedExpenseFile,
} from "@/lib/hooks/usePackingSlips";
import { formatNumberInput } from "@/lib/utils";

const WAREHOUSE_IDS = [6, 1];

type AttachmentPreviewFile = {
  fileUrl: string;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
};

const isImageFile = (file: AttachmentPreviewFile) => {
  const mime = file.fileType?.toLowerCase() || "";
  if (mime.startsWith("image/")) return true;
  const path = file.fileUrl.split("?")[0].toLowerCase();
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/.test(path);
};

const toDateInput = (value?: string | null) => {
  if (!value) {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

type CustomerPick = { id: number; name: string; code?: string | null };

export function WarehouseCashForm({
  receipt,
  onClose,
  keepOpenAfterCreate = false,
}: {
  receipt?: WarehouseReceipt | null;
  onClose: () => void;
  /** Trang riêng /phieu-kho: tạo xong thì làm trống form để nhập phiếu tiếp. */
  keepOpenAfterCreate?: boolean;
}) {
  const headerBranchId = useBranchStore((state) => state.selectedBranch?.id);
  const auto = Boolean(
    receipt?.packingSlip || receipt?.sourceType === "PACKING_SLIP",
  );
  const { data: branchData } = useBranches();
  const access = useFinanceAccess();
  const branches = useMemo(() => {
    const payload = branchData as
      | { data?: Array<{ id: number; name: string }> }
      | Array<{ id: number; name: string }>
      | undefined;
    const rows = Array.isArray(payload) ? payload : payload?.data || [];
    const known = rows.filter((branch) => WAREHOUSE_IDS.includes(branch.id));
    const base = known.length
      ? known
      : [
          { id: 6, name: "Kho Hà Nội" },
          { id: 1, name: "Kho Sài Gòn" },
        ];
    // Chỉ các kho user có quyền; giữ kho của phiếu đang sửa.
    return base.filter(
      (branch) =>
        branch.id === receipt?.branchId ||
        access.can("warehouse_cash", receipt ? "update" : "create", branch.id),
    );
  }, [branchData, access, receipt]);
  const createReceipt = useCreateWarehouseReceipt();
  const updateReceipt = useUpdateWarehouseReceipt();
  // Phiếu mới theo kho đang chọn ở header (nếu được phép), không cố định Kho HN.
  const [branchId, setBranchId] = useState(
    receipt?.branchId ||
      (headerBranchId && WAREHOUSE_IDS.includes(headerBranchId)
        ? headerBranchId
        : 6),
  );
  if (
    !receipt &&
    branches.length &&
    !branches.some((branch) => branch.id === branchId)
  ) {
    setBranchId(branches[0].id);
  }
  const [amount, setAmount] = useState(
    receipt
      ? formatNumberInput(String(Math.round(Number(receipt.amount))))
      : "",
  );
  const [occurredAt, setOccurredAt] = useState(
    toDateInput(receipt?.occurredAt),
  );
  const [description, setDescription] = useState(receipt?.description || "");
  const [note, setNote] = useState(receipt?.note || "");
  const [receiptKind, setReceiptKind] = useState<"CUSTOMER" | "WAREHOUSE_SALE">(
    receipt?.subCategory === "WAREHOUSE_ITEM_SALE" ||
      receipt?.sourceSnapshot?.receiptKind === "WAREHOUSE_SALE"
      ? "WAREHOUSE_SALE"
      : "CUSTOMER",
  );
  const sale = receiptKind === "WAREHOUSE_SALE";
  const [customers, setCustomers] = useState<CustomerPick[]>(
    receipt?.customers || (receipt?.customer ? [receipt.customer] : []),
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");
  const [attachments, setAttachments] = useState<UploadedExpenseFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const previewImages = useMemo<AttachmentPreviewFile[]>(
    () => [...(receipt?.attachments || []), ...attachments].filter(isImageFile),
    [attachments, receipt?.attachments],
  );
  const changePreviewImage = useCallback(
    (direction: "previous" | "next") => {
      if (previewImages.length < 2) return;
      const currentIndex = previewImages.findIndex(
        (file) => file.fileUrl === previewImage,
      );
      if (currentIndex < 0) return;
      const offset = direction === "previous" ? -1 : 1;
      const nextIndex =
        (currentIndex + offset + previewImages.length) % previewImages.length;
      setPreviewImage(previewImages[nextIndex].fileUrl);
    },
    [previewImage, previewImages],
  );

  useEffect(() => {
    if (!previewImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewImage(null);
      if (event.key === "ArrowLeft") changePreviewImage("previous");
      if (event.key === "ArrowRight") changePreviewImage("next");
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [changePreviewImage, previewImage]);
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedCustomerSearch(customerSearch.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const customerQuery = useSearchCustomers(
    debouncedCustomerSearch || undefined,
    { enabled: Boolean(debouncedCustomerSearch) },
  );
  const customerOptions = (
    debouncedCustomerSearch ? customerQuery.data?.data || [] : []
  ).filter((customer) => !customers.some((item) => item.id === customer.id));
  const pending = createReceipt.isPending || updateReceipt.isPending;

  const addCustomer = (customer: CustomerPick) => {
    setCustomers((current) => [...current, customer]);
    setCustomerSearch("");
  };

  const removeCustomer = (customerId: number) => {
    setCustomers((current) => current.filter((item) => item.id !== customerId));
  };

  const resetForNext = () => {
    setAmount("");
    setDescription("");
    setNote("");
    setCustomers([]);
    setCustomerSearch("");
    setAttachments([]);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const result = await uploadPackingSlipExpenseFiles(Array.from(files));
      setAttachments((current) => [...current, ...result.files]);
      if (result.errors.length)
        toast.error(`Có ${result.errors.length} file không upload được`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload chứng từ thất bại",
      );
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (auto && receipt) {
      updateReceipt.mutate(
        { id: receipt.id, payload: { description, note } },
        { onSuccess: onClose },
      );
      return;
    }
    const parsedAmount = Number(amount.replace(/\D/g, ""));
    if (!parsedAmount) {
      toast.error("Số tiền phải lớn hơn 0");
      return;
    }
    if (!sale && !customers.length) {
      toast.error("Cần chọn khách hàng");
      return;
    }
    const attachmentsToSave = attachments.length
      ? [...(receipt?.attachments || []), ...attachments]
      : attachments;
    const payload = {
      branchId,
      amount: parsedAmount,
      occurredAt: new Date(`${occurredAt}T00:00:00`).toISOString(),
      description: description.trim() || undefined,
      note: note.trim() || undefined,
      receiptKind,
      customers: sale
        ? []
        : customers.map((customer) => ({
            customerId: customer.id,
          })),
      ...(attachmentsToSave.length
        ? {
            attachments: attachmentsToSave.map((file) => ({
              fileUrl: file.fileUrl,
              fileName: file.fileName,
              fileType: file.fileType,
              fileSize: file.fileSize,
              kind: "EVIDENCE",
            })),
          }
        : {}),
    };
    if (receipt) {
      updateReceipt.mutate({ id: receipt.id, payload }, { onSuccess: onClose });
    } else {
      createReceipt.mutate(payload, {
        onSuccess: keepOpenAfterCreate ? resetForNext : onClose,
      });
    }
  };

  return (
    <>
      <FinanceFormSheet
        title={receipt ? "Sửa phiếu tiền mặt" : "Tạo phiếu tiền mặt"}
        onClose={onClose}
        onSubmit={submit}
        width="sm:max-w-2xl"
        footer={
          <FinanceFormActions
            onCancel={onClose}
            pending={pending}
            disabled={uploading}
            submitLabel="Lưu"
          />
        }>
        {!auto && (
          <>
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600">
              Chi nhánh
              <select
                value={branchId}
                onChange={(event) => setBranchId(Number(event.target.value))}
                className="dt-select h-10 w-full">
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <InternalFinanceDateField
              label="Ngày thu"
              value={occurredAt}
              onChange={(value) => value && setOccurredAt(value)}
            />
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
              Số tiền
              <input
                inputMode="numeric"
                value={amount}
                onChange={(event) =>
                  setAmount(formatNumberInput(event.target.value))
                }
                className="dt-input h-10 w-full"
                required
              />
            </label>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-gray-600">
                Loại phiếu
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReceiptKind("CUSTOMER")}
                  className={`h-10 rounded-lg border px-3 text-sm ${receiptKind === "CUSTOMER" ? "border-brand bg-brand-soft font-medium text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}>
                  Thu khách
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptKind("WAREHOUSE_SALE")}
                  className={`h-10 rounded-lg border px-3 text-sm ${receiptKind === "WAREHOUSE_SALE" ? "border-brand bg-brand-soft font-medium text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}>
                  Bán đồ kho
                </button>
              </div>
            </div>
            {!sale && (
              <>
                <div className="relative flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
                  Khách hàng
                  <input
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    className="dt-input h-10 w-full font-normal"
                    placeholder="Tìm tên hoặc mã khách"
                  />
                  {debouncedCustomerSearch && customerOptions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-white shadow-lg">
                      {customerOptions.slice(0, 8).map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => addCustomer(customer)}
                          className="block w-full border-b px-3 py-2 text-left text-xs hover:bg-gray-50">
                          {customer.name}
                          {customer.code ? ` · ${customer.code}` : ""}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {customers.map((customer) => (
                      <span
                        key={customer.id}
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-gray-700">
                        {customer.name}
                        <button
                          type="button"
                          title={`Bỏ khách hàng ${customer.name}`}
                          onClick={() => removeCustomer(customer.id)}
                          className="rounded-full text-gray-400 hover:text-gray-700">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
          Nội dung
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="dt-input h-10 w-full font-normal"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
          Ghi chú
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="dt-input w-full font-normal"
          />
        </label>
        {!auto && (
          <EvidenceUploadTiles
            label="Chứng từ"
            files={[...(receipt?.attachments || []), ...attachments]}
            uploading={uploading}
            onFiles={(files) => void handleUpload(files)}
            onPreview={(file) => setPreviewImage(file.fileUrl)}
            // Chỉ bỏ được file vừa tải; chứng từ đã lưu giữ nguyên.
            onRemove={(file) =>
              setAttachments((current) =>
                current.filter((item) => item.fileUrl !== file.fileUrl),
              )
            }
          />
        )}
      </FinanceFormSheet>
      {previewImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setPreviewImage(null)}>
            <button
              type="button"
              title="Đóng ảnh"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
              <X className="h-5 w-5" />
            </button>
            <div
              className="flex max-w-full flex-col items-center gap-4"
              onClick={(event) => event.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="Xem ảnh chứng từ"
                className="max-h-[75vh] max-w-full rounded object-contain"
              />

              {previewImages.length > 1 && (
                <div className="flex max-w-full items-center gap-2 rounded-lg bg-white/90 p-3">
                  <button
                    type="button"
                    title="Ảnh trước"
                    aria-label="Ảnh trước"
                    onClick={() => changePreviewImage("previous")}
                    className="rounded p-2 text-gray-700 hover:bg-gray-100">
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="flex max-w-md gap-2 overflow-x-auto">
                    {previewImages.map((file, index) => (
                      <button
                        key={`${file.fileUrl}-${index}`}
                        type="button"
                        title={`Xem ảnh ${index + 1}`}
                        aria-label={`Xem ảnh ${index + 1}`}
                        onClick={() => setPreviewImage(file.fileUrl)}
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 ${
                          file.fileUrl === previewImage
                            ? "border-brand"
                            : "border-gray-300"
                        }`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={file.fileUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    title="Ảnh sau"
                    aria-label="Ảnh sau"
                    onClick={() => changePreviewImage("next")}
                    className="rounded p-2 text-gray-700 hover:bg-gray-100">
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  <span className="ml-1 whitespace-nowrap text-sm text-gray-700">
                    {Math.max(
                      1,
                      previewImages.findIndex(
                        (file) => file.fileUrl === previewImage,
                      ) + 1,
                    )}{" "}
                    / {previewImages.length}
                  </span>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
