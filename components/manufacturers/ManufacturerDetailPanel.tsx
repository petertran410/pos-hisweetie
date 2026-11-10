"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Pencil, RefreshCw, Trash2, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/config/api";
import { manufacturersApi, type Manufacturer, type PayableSummary } from "@/lib/api/manufacturers";
import type { Production } from "@/lib/api/productions";
import { usePermission } from "@/lib/hooks/usePermissions";
import { MANUFACTURER_VIEWS, type ManufacturerView } from "./ManufacturerSidebar";
import { PayablePaymentModal } from "./PayablePaymentModal";

interface AccountGroup extends PayableSummary {
  manufacturerProductionDebt: number;
  heldMaterialValue: number;
  batches: Array<{
    id: number;
    totalAmount: number;
    status: number;
    transDate: string;
    cashFlow?: { id: number; code: string } | null;
    allocations: Array<{ targetCode: string; amount: number }>;
  }>;
}
interface AccountsResponse {
  manufacturer: Manufacturer;
  productions: Production[];
  groups: AccountGroup[];
}

const money = (value: unknown) => `${Number(value ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} đ`;
const th = "whitespace-nowrap px-3 py-2 text-left font-medium text-gray-600";
const td = "px-3 py-2.5 align-top";
const button = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50";

export function ManufacturerDetailPanel({ id, view, onBack, onEdit }: {
  id: number;
  view: ManufacturerView;
  onBack: () => void;
  onEdit: (manufacturer: Manufacturer) => void;
}) {
  const queryClient = useQueryClient();
  const canUpdate = usePermission("productions", "update");
  const canDelete = usePermission("productions", "delete");
  const canPay = usePermission("cash_flows", "create");
  const canCancelPayment = usePermission("cash_flows", "delete");
  const [paying, setPaying] = useState<{ type: "S" | "M"; id: number } | null>(null);
  const accounts = useQuery({
    queryKey: ["manufacturer-accounts", id],
    queryFn: () => apiClient.get<AccountsResponse>(`/manufacturers/${id}/accounts`),
  });
  const templates = useQuery({
    queryKey: ["manufacturer-templates", id],
    queryFn: () => manufacturersApi.templates(id),
    enabled: view === "templates",
  });
  const cancel = useMutation({
    mutationFn: manufacturersApi.cancelPayment,
    onSuccess: () => {
      for (const key of ["manufacturer-accounts", "payables", "suppliers", "productions", "purchase-orders", "cashflows", "supplier-debt-timeline"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast.success("Đã hủy thanh toán");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const removeTemplate = useMutation({
    mutationFn: manufacturersApi.removeTemplate,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["manufacturer-templates"] }); toast.success("Đã ngừng dùng mẫu"); },
    onError: (error: Error) => toast.error(error.message),
  });
  const data = accounts.data;
  const totalDebt = data?.groups.reduce((sum, group) => sum + Number(group.manufacturerProductionDebt), 0) ?? 0;
  const heldValue = data?.groups.reduce((sum, group) => sum + Number(group.heldMaterialValue), 0) ?? 0;
  const completed = data?.productions.filter((row) => row.status === 2) ?? [];
  const title = MANUFACTURER_VIEWS.find((item) => item.value === view)!.label;

  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} className={`${button} shrink-0 border-transparent px-1.5`} title="Quay lại danh sách">
            <ChevronLeft size={16} /><span className="hidden sm:inline">Quay lại</span>
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {data && <p className="mt-0.5 break-words text-xs text-gray-500">{data.manufacturer.code} · {data.manufacturer.name}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" title="Làm mới dữ liệu" aria-label="Làm mới dữ liệu" className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50" disabled={accounts.isFetching}
            onClick={() => { accounts.refetch(); if (view === "templates") templates.refetch(); }}>
            <RefreshCw size={15} className={accounts.isFetching ? "animate-spin" : ""} />
          </button>
          {canUpdate && data && <button type="button" className={button} onClick={() => onEdit(data.manufacturer)}><Pencil size={15} />Chỉnh sửa</button>}
        </div>
      </header>
      {data && !accounts.isError && (
        <div className="flex shrink-0 flex-wrap gap-x-8 gap-y-1 border-b bg-gray-50 px-4 py-2 text-sm">
          <span className="text-gray-500">Phiếu sản xuất: <strong className="font-semibold text-gray-900">{data.productions.length}</strong></span>
          <span className="text-gray-500">Hàng đang gửi: <strong className="font-semibold text-brand-dark">{money(heldValue)}</strong></span>
          <span className="text-gray-500">Nợ NSX: <strong className="font-semibold text-orange-600">{money(totalDebt)}</strong></span>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        {accounts.isLoading ? (
          <PanelState loading />
        ) : accounts.isError ? (
          <PanelState onRetry={() => accounts.refetch()}>Không tải được thông tin nhà sản xuất</PanelState>
        ) : data && (
          <>
            {view === "info" && (
              <div>
                <dl className="grid grid-cols-1 gap-x-10 px-4 py-2 sm:grid-cols-2">
                  {[
                    ["Mã nhà sản xuất", data.manufacturer.code],
                    ["Tên nhà sản xuất", data.manufacturer.name],
                    ["Điện thoại", data.manufacturer.contactNumber],
                    ["Email", data.manufacturer.email],
                    ["Nhà cung cấp liên kết", data.manufacturer.supplier?.name],
                    ["Tiền tệ", data.manufacturer.currency],
                    ["Địa chỉ", data.manufacturer.address],
                    ["Trạng thái", data.manufacturer.isActive ? "Đang hoạt động" : "Ngừng hoạt động"],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3 border-b border-gray-100 py-3 text-sm">
                      <dt className="text-gray-500">{label}</dt><dd className="break-words font-medium text-gray-800">{value || "-"}</dd>
                    </div>
                  ))}
                </dl>
                {data.manufacturer.note && <div className="border-b px-4 py-3 text-sm"><p className="mb-1 text-gray-500">Ghi chú</p><p className="whitespace-pre-wrap break-words text-gray-800">{data.manufacturer.note}</p></div>}
                <SectionHeading>Đối tác thanh toán</SectionHeading>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-gray-50"><tr><th className={th}>Đối tác</th><th className={`${th} text-right`}>Nợ NSX này</th><th className={`${th} text-right`}>Ứng trước chung</th><th className={`${th} text-right`}>Tổng nợ đối tác</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.groups.map((group) => <tr key={`${group.accountType}:${group.accountId}`} className="hover:bg-gray-50">
                        <td className={td}><div className="font-medium text-gray-900">{group.partnerName}</div><div className="text-xs text-gray-500">{group.accountType === "S" ? "Nhà cung cấp" : "Nhà sản xuất độc lập"}</div></td>
                        <td className={`${td} text-right tabular-nums text-orange-600`}>{money(group.manufacturerProductionDebt)}</td>
                        <td className={`${td} text-right tabular-nums text-green-700`}>{money(group.availableCredit)}</td>
                        <td className={`${td} text-right tabular-nums font-medium`}>{money(group.totalDebt)}</td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {view === "debt" && data.groups.map((group) => (
              <section key={`${group.accountType}:${group.accountId}`} className="border-b last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-gray-800">{group.accountType === "S" ? `Thanh toán qua NCC: ${group.partnerName}` : "Thanh toán riêng NSX"}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                      <span>Nợ NSX này: <strong className="text-orange-600">{money(group.manufacturerProductionDebt)}</strong></span>
                      <span>Ứng trước chung: <strong className="text-green-700">{money(group.availableCredit)}</strong></span>
                      <span>Tổng nợ đối tác: <strong className="text-gray-800">{money(group.totalDebt)}</strong></span>
                    </div>
                  </div>
                  {canPay && <button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
                    onClick={() => setPaying({ type: group.accountType, id: group.accountId })}><Wallet size={15} />Thanh toán / ứng trước</button>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="bg-gray-50"><tr><th className={th}>Mã thanh toán</th><th className={th}>Ngày</th><th className={`${th} text-right`}>Thực chi</th><th className={th}>Chứng từ phân bổ</th><th className={th}>Trạng thái</th><th className="w-12" /></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.batches.length > 0 && <tr className="bg-amber-50 font-semibold">
                        <td className={td} colSpan={2}>Tổng hiệu lực trong danh sách</td>
                        <td className={`${td} text-right tabular-nums`}>{money(group.batches.filter((row) => row.status !== 2).reduce((sum, row) => sum + Number(row.totalAmount), 0))}</td>
                        <td colSpan={3} />
                      </tr>}
                      {group.batches.map((batch) => <tr key={batch.id} className="hover:bg-gray-50">
                        <td className={`${td} font-medium`}>{batch.cashFlow ? <Link className="text-brand hover:underline" href={`/tai-chinh/so-quy?Code=${batch.cashFlow.code}`}>{batch.cashFlow.code}</Link> : `Cấn ứng #${batch.id}`}</td>
                        <td className={`${td} whitespace-nowrap text-gray-600`}>{new Date(batch.transDate).toLocaleDateString("vi-VN")}</td>
                        <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(batch.totalAmount)}</td>
                        <td className={`${td} max-w-64 break-words text-gray-600`}>{[...new Set(batch.allocations.map((line) => line.targetCode))].join(", ") || "Ứng trước"}</td>
                        <td className={`${td} whitespace-nowrap ${batch.status === 2 ? "text-red-600" : "text-green-700"}`}>{batch.status === 2 ? "Đã hủy" : "Đã thanh toán"}</td>
                        <td className={td}>{canCancelPayment && batch.status !== 2 && <button type="button" title="Hủy lần thanh toán" aria-label={`Hủy thanh toán ${batch.cashFlow?.code ?? batch.id}`} disabled={cancel.isPending}
                          className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50" onClick={() => { if (confirm("Hủy toàn bộ lần thanh toán và các phân bổ liên quan?")) cancel.mutate(batch.id); }}><X size={15} /></button>}</td>
                      </tr>)}
                      {!group.batches.length && <tr><td colSpan={6}><PanelState>Chưa có thanh toán</PanelState></td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
            {view === "productions" && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50"><tr><th className={th}>Mã phiếu</th><th className={th}>Thành phẩm</th><th className={th}>Trạng thái</th><th className={`${th} text-right`}>Phải trả</th><th className={`${th} text-right`}>Đã trả</th><th className={`${th} text-right`}>Còn nợ</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.productions.length > 0 && <tr className="bg-amber-50 font-semibold">
                      <td className={td} colSpan={3}>Tổng phiếu hoàn thành ({completed.length})</td>
                      <td className={`${td} text-right tabular-nums`}>{money(completed.reduce((sum, row) => sum + Number(row.totalPayable ?? 0), 0))}</td>
                      <td className={`${td} text-right tabular-nums text-green-700`}>{money(completed.reduce((sum, row) => sum + Number(row.paidAmount ?? 0), 0))}</td>
                      <td className={`${td} text-right tabular-nums text-orange-600`}>{money(completed.reduce((sum, row) => sum + Number(row.debtAmount ?? 0), 0))}</td>
                    </tr>}
                    {data.productions.map((row) => <tr key={row.id} className="hover:bg-gray-50">
                      <td className={`${td} font-medium`}><Link className="text-brand hover:underline" href={`/san-pham/san-xuat?Code=${row.code}`}>{row.code}</Link></td>
                      <td className={`${td} min-w-48 max-w-80 break-words`}><div>{row.productName}</div><div className="mt-0.5 text-xs text-gray-400">{row.productCode}</div></td>
                      <td className={`${td} whitespace-nowrap`}><ProductionStatus status={row.status} /></td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(row.totalPayable)}</td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums text-green-700`}>{row.status === 2 ? money(row.paidAmount) : "-"}</td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums text-orange-600`}>{row.status === 2 ? money(row.debtAmount) : "-"}</td>
                    </tr>)}
                    {!data.productions.length && <tr><td colSpan={6}><PanelState>Chưa có phiếu gửi sản xuất</PanelState></td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            {view === "templates" && (
              templates.isLoading ? <PanelState loading /> : templates.isError ? <PanelState onRetry={() => templates.refetch()}>Không tải được mẫu phối trộn</PanelState> :
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-50"><tr><th className={th}>Tên mẫu</th><th className={`${th} text-right`}>Sản lượng cơ sở</th><th className={th}>Tiền tệ</th><th className={`${th} text-right`}>Phí gia công tham khảo</th><th className="w-12" /></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {templates.data?.map((row) => <tr key={row.id} className="hover:bg-gray-50">
                        <td className={`${td} max-w-80 break-words font-medium text-gray-900`}>{row.name}</td>
                        <td className={`${td} text-right tabular-nums`}>{Number(row.baseQuantity).toLocaleString("vi-VN")}</td>
                        <td className={`${td} text-gray-500`}>{row.currency}</td>
                        <td className={`${td} text-right tabular-nums`}>{Number(row.processingFee).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} {row.currency === "VND" ? "đ" : "CNY"}</td>
                        <td className={td}>{canDelete && <button type="button" title="Ngừng dùng mẫu" aria-label={`Ngừng dùng mẫu ${row.name}`} disabled={removeTemplate.isPending}
                          className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50" onClick={() => { if (confirm("Ngừng dùng mẫu phối trộn này?")) removeTemplate.mutate(row.id); }}><Trash2 size={15} /></button>}</td>
                      </tr>)}
                      {!templates.data?.length && <tr><td colSpan={5}><PanelState>Chưa có mẫu phối trộn</PanelState></td></tr>}
                    </tbody>
                  </table>
                </div>
            )}
          </>
        )}
      </div>
      {paying && <PayablePaymentModal accountType={paying.type} accountId={paying.id} onClose={() => setPaying(null)} />}
    </>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="border-b px-4 pb-2 pt-4 text-sm font-semibold text-gray-800">{children}</h3>;
}

export function PanelState({ children, loading, onRetry }: { children?: ReactNode; loading?: boolean; onRetry?: () => void }) {
  return <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-5 text-center text-sm text-gray-400" role={loading ? "status" : undefined}>
    {loading ? <><Loader2 className="h-6 w-6 animate-spin text-brand" /><span className="sr-only">Đang tải</span></> : children}
    {onRetry && <button type="button" onClick={onRetry} className={button}>Thử lại</button>}
  </div>;
}

function ProductionStatus({ status }: { status: number }) {
  const labels: Record<number, { text: string; color: string }> = {
    1: { text: "Phiếu tạm", color: "text-amber-700" },
    2: { text: "Hoàn thành", color: "text-green-700" },
    3: { text: "Đã hủy", color: "text-red-600" },
    4: { text: "Đã gửi", color: "text-brand-dark" },
  };
  const state = labels[status];
  return <span className={state?.color}>{state?.text ?? "-"}</span>;
}
