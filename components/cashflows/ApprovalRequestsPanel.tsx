"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useApprovalRequests,
  useApprovalRequest,
  useCreateApprovalRequest,
  usePostApprovalCashFlow,
  useReceiptTempAdvances,
} from "@/lib/hooks/useApprovalRequests";
import { approvalRequestsApi } from "@/lib/api/approval-requests";
import { useBranchStore } from "@/lib/store/branch";
import { useCan } from "@/lib/hooks/useCan";
import type {
  ApprovalFormItem,
  ApprovalRequestKind,
} from "@/lib/api/approval-requests";

const KIND_LABELS: Record<ApprovalRequestKind, string> = {
  EXPENSE_HN: "Chi Kho HN",
  EXPENSE_SG: "Chi Kho SG",
  EXPENSE_VP: "Chi VP",
  RECEIPT: "Phiếu Thu",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELED: "Đã rút",
  DELETED: "Đã xóa",
  REVERTED: "Đã thu hồi",
  CREATE_FAILED: "Tạo thất bại",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELED: "bg-gray-100 text-gray-600",
  DELETED: "bg-gray-100 text-gray-600",
  REVERTED: "bg-orange-100 text-orange-700",
  CREATE_FAILED: "bg-red-100 text-red-700",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });

const formatLarkTime = (value?: string) => {
  if (!value) return "-";
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("vi-VN");
};

const BRANCH_NAMES: Record<number, string> = {
  1: "Kho Sài Gòn",
  4: "Văn Phòng Hà Nội",
  6: "Kho Hà Nội",
  7: "Văn Phòng Sài Gòn",
};

const RECEIPT_FROM_LOCATIONS = [
  { value: "msmnlqej-t6tk3qikgcm-0", label: "Kho Hà Nội" },
  { value: "msmnlqej-osblnddobgd-0", label: "Kho Sài Gòn" },
  { value: "msmnlqej-ayuo9uxg81-0", label: "Văn Phòng Hà Nội" },
  { value: "msmnlqf7-6253w1gahex-1", label: "Văn Phòng Sài Gòn" },
];

const RECEIPT_TO_LOCATIONS = [
  { value: "msmnlsb8-4p1ddn0lzf4-0", label: "Kho Hà Nội" },
  { value: "msmnlsb8-8wr2wdb09lx-0", label: "Kho Sài Gòn" },
  { value: "msmnlsb8-5t1nguy4lg2-0", label: "Văn Phòng Hà Nội" },
  { value: "msmnlqf7-dfecjahtjww-7", label: "Văn Phòng Sài Gòn" },
];

const RECEIPT_CASH_SOURCES: Record<number, string> = {
  1: "mmix7h92-vnvw9s8fgxd-0",
  4: "mmix6zt5-jloc41vsx8k-1",
  5: "mmix6zt5-jloc41vsx8k-1",
  6: "mmix7h92-hukohb4on6-0",
  7: "mmix6zt5-9oxlpayncdg-3",
};

const EXPENSE_VP_CASH_SOURCES: Record<number, string> = {
  4: "ml657iu1-7mvb2xfgje6-0",
  5: "ml657iu1-7mvb2xfgje6-0",
  7: "ml657iu1-n0lwb9zjbi-0",
};

const inputClass =
  "dt-input dt-input-sm !rounded-lg w-full";

const createClientUuid = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

function ApprovalComposer({
  branchId,
  branchName,
  onClose,
}: {
  branchId?: number;
  branchName?: string;
  onClose: () => void;
}) {
  const createApproval = useCreateApprovalRequest();
  const [clientUuid] = useState(createClientUuid);
  const defaultKind: ApprovalRequestKind =
    branchId === 6
      ? "EXPENSE_HN"
      : branchId === 1
        ? "EXPENSE_SG"
        : branchId === 4 || branchId === 5 || branchId === 7
          ? "EXPENSE_VP"
          : "RECEIPT";
  const [kind, setKind] = useState<ApprovalRequestKind>(defaultKind);
  const [week, setWeek] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amount, setAmount] = useState("");
  const [detailUrl, setDetailUrl] = useState("");
  const [viewUrl, setViewUrl] = useState("");
  const [vpMethod, setVpMethod] = useState("ml65570v-ih3r0g47mu-0");
  const [vpSource, setVpSource] = useState(
    EXPENSE_VP_CASH_SOURCES[branchId || 4] ||
      "ml657iu1-7mvb2xfgje6-0"
  );
  const [receiptType, setReceiptType] = useState(
    "m3qzoq6o-9zz1b70wu0s-0"
  );
  const [receiptFrom, setReceiptFrom] = useState("");
  const [receiptTo, setReceiptTo] = useState("");
  const [receiptMethod, setReceiptMethod] = useState(
    "md9r0rqr-tlntv5zjg8-1"
  );
  const [receiptContent, setReceiptContent] = useState("");
  const [receiptTempAdvance, setReceiptTempAdvance] = useState("");
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const tempAdvances = useReceiptTempAdvances(
    kind === "RECEIPT" &&
      receiptType === "m5yyxva1-0qljlzdgfq2k-1"
  );
  const allowedKinds = new Set<ApprovalRequestKind>(
    branchId === 6
      ? ["EXPENSE_HN", "RECEIPT"]
      : branchId === 1
        ? ["EXPENSE_SG", "RECEIPT"]
        : branchId === 4 || branchId === 5 || branchId === 7
          ? ["EXPENSE_VP", "RECEIPT"]
          : ["RECEIPT"]
  );

  const add = (
    items: ApprovalFormItem[],
    id: string,
    type: string,
    value: unknown
  ) => {
    items.push({ id, type, value });
  };

  const submit = async () => {
    const amountValue = Number(amount.replace(/,/g, ""));
    if (!branchId || !amountValue || amountValue <= 0) return;
    if (kind === "RECEIPT" && invoiceFiles.length === 0) {
      toast.error("Phiếu Thu phải có ít nhất một file Hóa đơn");
      return;
    }

    const form: ApprovalFormItem[] = [];
    if (kind === "EXPENSE_HN" || kind === "EXPENSE_SG" || kind === "EXPENSE_VP") {
      const ids =
        kind === "EXPENSE_HN"
          ? {
              week: "widget17399397879320001",
              from: "widget17399508033270001",
              to: "widget17399508090490001",
            }
          : {
              week: "widget17399388386300001",
              from: "widget17399508904720001",
              to: "widget17399508961760001",
            };
      add(form, ids.week, "input", week);
      add(form, ids.from, "input", dateFrom);
      add(form, ids.to, "input", dateTo);
      add(
        form,
        "widget17368415755750001",
        "amount",
        amountValue
      );
      add(form, "widget17368416610880001", "input", detailUrl);
      add(form, "widget17371739587940001", "input", viewUrl);
      if (kind === "EXPENSE_VP") {
        add(form, "widget17700954766870001", "radioV2", vpMethod);
        if (vpMethod === "ml65570v-ih3r0g47mu-0") {
          add(form, "widget17700955853050001", "radioV2", vpSource);
        }
      }
    } else {
      add(
        form,
        "widget17321740179360001",
        "radioV2",
        receiptType
      );
      add(form, "widget17321631178550001", "date", dateFrom);
      add(
        form,
        "widget17321728506550001",
        "radioV2",
        receiptMethod
      );
      add(
        form,
        "widget17321628654580001",
        "textarea",
        receiptContent
      );
      add(
        form,
        "widget17321629138780001",
        "amount",
        amountValue
      );
      if (receiptMethod === "md9r0rqr-tlntv5zjg8-1") {
        add(
          form,
          "widget17730449889490001",
          "radioV2",
          RECEIPT_CASH_SOURCES[branchId]
        );
      }
      if (receiptType === "miior6p8-s0rjayqbcv-1") {
        add(form, "widget17863314165550001", "radioV2", receiptFrom);
        add(form, "widget17863314190270001", "radioV2", receiptTo);
      }
      if (receiptType === "m5yyxva1-0qljlzdgfq2k-1") {
        add(
          form,
          "widget17780590040100001",
          "radioV2",
          receiptTempAdvance
        );
      }
      try {
        setUploading(true);
        const [invoiceUploads, documentUploads] = await Promise.all([
          Promise.all(
            invoiceFiles.map((file) =>
              approvalRequestsApi.uploadFile(file, "attachment")
            )
          ),
          Promise.all(
            documentFiles.map((file) =>
              approvalRequestsApi.uploadFile(file, "attachment")
            )
          ),
        ]);
        if (invoiceUploads.length > 0) {
          add(
            form,
            "widget17321767077360001",
            "attachmentV2",
            invoiceUploads.map((item) => item.code)
          );
        }
        if (documentUploads.length > 0) {
          add(
            form,
            "widget17325176953770001",
            "attachmentV2",
            documentUploads.map((item) => item.code)
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Upload file thất bại"
        );
        return;
      } finally {
        setUploading(false);
      }
    }

    try {
      await createApproval.mutateAsync({
        kind,
        clientUuid,
        branchId,
        form,
        sourceType: "CASHFLOW_UI",
      });
      onClose();
    } catch {
      // useCreateApprovalRequest already shows the request error.
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-16"
      onMouseDown={onClose}>
      <div
        className="flex w-full max-w-2xl max-h-[88vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-semibold text-gray-800">
              Tạo Approval
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {branchName || (branchId ? BRANCH_NAMES[branchId] : null) ||
                "Chưa chọn chi nhánh"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            title="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            Mẫu Approval
            <select
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as ApprovalRequestKind)
              }
              className={inputClass}>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                  disabled={!allowedKinds.has(value as ApprovalRequestKind)}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {kind !== "RECEIPT" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Tuần chi
                <input value={week} onChange={(e) => setWeek(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Số tiền
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Ngày bắt đầu
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Ngày kết thúc
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 sm:col-span-2">
                Link chi tiết khoản chi
                <input value={detailUrl} onChange={(e) => setDetailUrl(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 sm:col-span-2">
                Link xem chi tiết phiếu
                <input value={viewUrl} onChange={(e) => setViewUrl(e.target.value)} className={inputClass} />
              </label>
              {kind === "EXPENSE_VP" && (
                <>
                  <label className="flex flex-col gap-1 text-xs text-gray-500">
                    Phương thức thanh toán
                    <select value={vpMethod} onChange={(e) => setVpMethod(e.target.value)} className={inputClass}>
                      <option value="ml65570v-ih3r0g47mu-0">Tiền Mặt</option>
                      <option value="ml65570v-qr4uobqvu9-0">Chuyển Khoản Công Ty</option>
                    </select>
                  </label>
                  {vpMethod === "ml65570v-ih3r0g47mu-0" && (
                    <label className="flex flex-col gap-1 text-xs text-gray-500">
                      Nguồn Tiền Mặt
                      <select value={vpSource} onChange={(e) => setVpSource(e.target.value)} className={inputClass}>
                        <option value="ml657iu1-7mvb2xfgje6-0">Tiền Mặt Văn Phòng HN</option>
                        <option value="ml657iu1-n0lwb9zjbi-0">Tiền Mặt Văn Phòng HCM</option>
                        <option value="ml657iu1-cu8e9ueqx7n-0">Tiền Mặt Kho HN</option>
                        <option value="ml657gkh-6nafl75gzil-1">Tiền Mặt Kho SG</option>
                        <option value="ml657gkh-dmwqcejrc1s-5">Không Chi Tiền Mặt</option>
                      </select>
                    </label>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Phân loại
                <select value={receiptType} onChange={(e) => setReceiptType(e.target.value)} className={inputClass}>
                  <option value="m3qzoq6o-9zz1b70wu0s-0">Khác</option>
                  <option value="miior6p8-s0rjayqbcv-1">Chuyển tiền nội bộ</option>
                  <option value="m5yyxva1-0qljlzdgfq2k-1">Hoàn trả tạm ứng</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Ngày thu
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Hình thức thu
                <select value={receiptMethod} onChange={(e) => setReceiptMethod(e.target.value)} className={inputClass}>
                  <option value="md9r0rqr-tlntv5zjg8-1">Tiền mặt</option>
                  <option value="m3sj5uh2-zttr08nfqcm-1">Chuyển khoản cá nhân</option>
                  <option value="$i18n-m3sj1xiv-4ru39bef6i-1">Chuyển khoản công ty</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Số tiền
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 sm:col-span-2">
                Nội dung thu
                <textarea value={receiptContent} onChange={(e) => setReceiptContent(e.target.value)} className={`${inputClass} min-h-20`} />
              </label>
              {receiptType === "m5yyxva1-0qljlzdgfq2k-1" && (
                <label className="flex flex-col gap-1 text-xs text-gray-500 sm:col-span-2">
                  Phiếu tạm ứng liên quan
                  <select
                    value={receiptTempAdvance}
                    onChange={(e) => setReceiptTempAdvance(e.target.value)}
                    className={inputClass}>
                    <option value="">Chọn phiếu tạm ứng</option>
                    {(tempAdvances.data?.data || []).map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label} · còn lại {Math.abs(item.remaining).toLocaleString("vi-VN")}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1 text-xs text-gray-500 sm:col-span-2">
                Hóa đơn
                <input
                  type="file"
                  multiple
                  onChange={(event) =>
                    setInvoiceFiles(Array.from(event.target.files || []))
                  }
                  className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 sm:col-span-2">
                Chứng từ
                <input
                  type="file"
                  multiple
                  onChange={(event) =>
                    setDocumentFiles(Array.from(event.target.files || []))
                  }
                  className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs"
                />
              </label>
              {receiptType === "miior6p8-s0rjayqbcv-1" && (
                <>
                  <label className="flex flex-col gap-1 text-xs text-gray-500">
                    Nơi đi
                    <select value={receiptFrom} onChange={(e) => setReceiptFrom(e.target.value)} className={inputClass}>
                      <option value="">Chọn nơi đi</option>
                      {RECEIPT_FROM_LOCATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-500">
                    Nơi nhận
                    <select value={receiptTo} onChange={(e) => setReceiptTo(e.target.value)} className={inputClass}>
                      <option value="">Chọn nơi nhận</option>
                      {RECEIPT_TO_LOCATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={createApproval.isPending || uploading || !branchId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
            {createApproval.isPending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {uploading ? "Đang tải file" : "Gửi Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ApprovalRequestsPanel() {
  const { selectedBranch } = useBranchStore();
  const canCreate = useCan("cash_flows", "create");
  const postCashFlow = usePostApprovalCashFlow();
  const [composerOpen, setComposerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [kind, setKind] = useState<ApprovalRequestKind | "">("");
  const [status, setStatus] = useState("");
  const query = useApprovalRequests({
    kind: kind || undefined,
    status: status || undefined,
    branchId: selectedBranch?.id,
    limit: 50,
  });
  const detailQuery = useApprovalRequest(expandedId);

  const rows = useMemo(() => query.data?.data ?? [], [query.data]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex flex-wrap items-end gap-3 border-b p-4">
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-gray-500">Loại Approval</label>
          <select
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as ApprovalRequestKind | "")
            }
            className="dt-select dt-select-sm min-w-44 !rounded-lg">
            <option value="">Tất cả</option>
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-xs text-gray-500">Trạng thái</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="dt-select dt-select-sm min-w-36 !rounded-lg">
            <option value="">Tất cả</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          title="Tải lại danh sách Approval"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          {query.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Tải lại
        </button>

        {canCreate && (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand-dark">
            <Plus className="h-4 w-4" />
            Tạo Approval
          </button>
        )}

        <span className="ml-auto text-sm text-gray-500">
          {query.data?.total ?? 0} yêu cầu
        </span>
      </div>

      {composerOpen && (
        <ApprovalComposer
          branchId={selectedBranch?.id}
          branchName={selectedBranch?.name}
          onClose={() => {
            setComposerOpen(false);
            void query.refetch();
          }}
        />
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b bg-[var(--dt-bg-soft)]">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                Loại
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                Approval
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                Trạng thái
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                Bước hiện tại
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                Cập nhật
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-500">
                CashFlow
              </th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                  Đang tải...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Chưa có yêu cầu Approval
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <Fragment key={row.id}>
                <tr className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium text-gray-800">
                    {KIND_LABELS[row.kind]}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-mono text-xs text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((current) =>
                              current === row.id ? null : row.id,
                            )
                          }
                          title="Xem tiến trình duyệt"
                          className="rounded p-0.5 text-gray-500 hover:bg-gray-100">
                          {expandedId === row.id ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {row.instanceCode || "Chưa có instance"}
                      </span>
                    </div>
                    {row.instanceLink && (
                      <a
                        href={row.instanceLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-brand hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        Mở phiếu
                      </a>
                    )}
                    <div className="mt-0.5 text-xs text-gray-400">
                      {row.clientUuid}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_CLASS[row.status] || "bg-gray-100 text-gray-600"
                      }`}>
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-700">
                    {row.currentNode || "-"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">
                    {formatDate(row.updatedAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {row.cashFlowId ? (
                      `#${row.cashFlowId}`
                    ) : row.status === "APPROVED" && canCreate ? (
                      <button
                        type="button"
                        onClick={() => postCashFlow.mutate(row.id)}
                        disabled={postCashFlow.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand px-2 py-1 font-sans text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50">
                        {postCashFlow.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        {row.kind === "RECEIPT" ? "Ghi thu quỹ" : "Đã Chi"}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
                {expandedId === row.id && (
                  <tr key={`${row.id}-detail`} className="border-b bg-gray-50">
                    <td colSpan={6} className="px-4 py-3">
                      {detailQuery.isLoading ? (
                        <span className="text-xs text-gray-500">
                          Đang tải tiến trình...
                        </span>
                      ) : detailQuery.data ? (
                        <div className="grid gap-3 text-xs text-gray-600 md:grid-cols-3">
                          <div>
                            <div className="font-medium text-gray-800">
                              Người đang xử lý
                            </div>
                            <div className="mt-1 space-y-1">
                              {(detailQuery.data.currentApprovers || []).length >
                              0 ? (
                                detailQuery.data.currentApprovers?.map(
                                  (approver, index) => (
                                    <div key={`${approver.taskId}-${index}`}>
                                      {approver.userId || "Tự động"}
                                    </div>
                                  ),
                                )
                              ) : (
                                <div>-</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              Danh sách bước
                            </div>
                            <div className="mt-1 space-y-1">
                              {(detailQuery.data.taskList || []).length > 0 ? (
                                detailQuery.data.taskList?.map((task, index) => (
                                  <div key={`${task.id || "task"}-${index}`}>
                                    {task.node_name || "-"} ·{" "}
                                    {task.status || "-"}
                                  </div>
                                ))
                              ) : (
                                <div>-</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              Timeline
                            </div>
                            <div className="mt-1 max-h-24 space-y-1 overflow-auto">
                              {(detailQuery.data.timeline || []).length > 0 ? (
                                detailQuery.data.timeline?.map((event, index) => (
                                  <div key={`${event.type || "event"}-${index}`}>
                                    {formatLarkTime(event.create_time)} ·{" "}
                                    {event.type || "-"}
                                  </div>
                                ))
                              ) : (
                                <div>-</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Chưa có chi tiết tiến trình.
                        </span>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
