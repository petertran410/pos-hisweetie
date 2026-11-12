"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/config/api";
import {
  manufacturersApi,
  type Manufacturer,
  type PayableSummary,
} from "@/lib/api/manufacturers";
import type { Production } from "@/lib/api/productions";
import { usePermission } from "@/lib/hooks/usePermissions";
import {
  MANUFACTURER_VIEWS,
  type ManufacturerView,
} from "./ManufacturerSidebar";
import { PayablePaymentModal } from "./PayablePaymentModal";
import { ProductionCostHistoryPanel } from "./ProductionCostHistoryPanel";

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

const money = (value: unknown) =>
  `${Number(value ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} đ`;
const th =
  "whitespace-nowrap px-3 py-2 text-left text-sm font-semibold text-gray-700";
const td = "px-3 py-2.5 align-top";
const button =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50";

export function ManufacturerDetailPanel({
  id,
  view,
  onEdit,
  embedded = false,
  onViewChange,
}: {
  id: number;
  view: ManufacturerView;
  onEdit: (manufacturer: Manufacturer) => void;
  embedded?: boolean;
  onViewChange?: (view: ManufacturerView) => void;
}) {
  const queryClient = useQueryClient();
  const canUpdate = usePermission("productions", "update");
  const canDelete = usePermission("productions", "delete");
  const canPay = usePermission("cash_flows", "create");
  const canCancelPayment = usePermission("cash_flows", "delete");
  const [paying, setPaying] = useState<{ type: "S" | "M"; id: number } | null>(
    null
  );
  const accounts = useQuery({
    queryKey: ["manufacturer-accounts", id],
    queryFn: () =>
      apiClient.get<AccountsResponse>(`/manufacturers/${id}/accounts`),
  });
  const templates = useQuery({
    queryKey: ["manufacturer-templates", id],
    queryFn: () => manufacturersApi.templates(id),
    enabled: view === "templates",
  });
  const cancel = useMutation({
    mutationFn: manufacturersApi.cancelPayment,
    onSuccess: () => {
      for (const key of [
        "manufacturers",
        "manufacturer-accounts",
        "payables",
        "suppliers",
        "productions",
        "purchase-orders",
        "cashflows",
        "supplier-debt-timeline",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast.success("Đã hủy thanh toán");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const removeTemplate = useMutation({
    mutationFn: manufacturersApi.removeTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer-templates"] });
      toast.success("Đã ngừng dùng mẫu");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const data = accounts.data;
  const totalDebt =
    data?.groups.reduce(
      (sum, group) => sum + Number(group.manufacturerProductionDebt),
      0
    ) ?? 0;
  const heldValue =
    data?.groups.reduce(
      (sum, group) => sum + Number(group.heldMaterialValue),
      0
    ) ?? 0;
  const completed = data?.productions.filter((row) => row.status === 2) ?? [];
  const title = MANUFACTURER_VIEWS.find((item) => item.value === view)!.label;
  const refreshing =
    accounts.isFetching || (view === "templates" && templates.isFetching);
  const refresh = () => {
    void accounts.refetch();
    if (view === "templates") void templates.refetch();
  };

  return (
    <div
      className={`${embedded ? "min-w-0" : "flex min-h-0 flex-1 flex-col"} border border-gray-200 bg-white p-4`}>
      <header className="mb-4 min-w-0 shrink-0 border-b border-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-lg font-bold text-brand">
              {data?.manufacturer.code ?? "Nhà sản xuất"}
            </span>
            {data && (
              <>
                <span className="text-gray-400">-</span>
                <h3 className="min-w-0 break-words text-lg font-semibold text-gray-800">
                  {data.manufacturer.name}
                </h3>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${data.manufacturer.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {data.manufacturer.isActive
                    ? "Đang hoạt động"
                    : "Ngừng hoạt động"}
                </span>
              </>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <span className="mr-2 text-sm font-medium text-gray-600">
              {data?.manufacturer.currency}
            </span>
            <button
              type="button"
              title="Làm mới dữ liệu"
              aria-label="Làm mới dữ liệu"
              className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100"
              disabled={refreshing}
              onClick={refresh}>
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
        {onViewChange ? (
          <div className="mt-1 overflow-x-auto">
            <div
              role="tablist"
              aria-label="Chi tiết nhà sản xuất"
              className="flex min-w-max gap-1">
              {MANUFACTURER_VIEWS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={view === tab.value}
                  onClick={() => onViewChange?.(tab.value)}
                  className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${view === tab.value ? "border-brand text-brand" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
                  {tab.value === "info" ? "Thông tin" : tab.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <h2 className="py-2.5 text-sm font-medium text-brand">{title}</h2>
        )}
      </header>
      <div className={embedded ? "min-w-0" : "min-h-0 flex-1 overflow-auto"}>
        {accounts.isLoading ? (
          <PanelState loading />
        ) : accounts.isError ? (
          <PanelState onRetry={() => accounts.refetch()}>
            Không tải được thông tin nhà sản xuất
          </PanelState>
        ) : (
          data && (
            <>
              {view === "costHistory" && (
                <ProductionCostHistoryPanel manufacturerId={id} />
              )}
              {view === "info" && (
                <div className="space-y-4">
                  <dl className="mb-2 grid grid-cols-1 gap-x-8 pb-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      ["Điện thoại", data.manufacturer.contactNumber],
                      ["Email", data.manufacturer.email],
                      ["Tiền tệ", data.manufacturer.currency],
                      [
                        "Nhà cung cấp liên kết",
                        data.manufacturer.supplier?.name,
                      ],
                      [
                        "Trạng thái",
                        data.manufacturer.isActive
                          ? "Đang hoạt động"
                          : "Ngừng hoạt động",
                      ],
                      ["Địa chỉ", data.manufacturer.address],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="mb-2 flex min-w-0 flex-col gap-2 border-b border-gray-200 pb-1">
                        <dt className="text-gray-500">{label}:</dt>
                        <dd className="min-w-0 break-words text-gray-900">
                          {value || "-"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <SectionHeading>Đối tác thanh toán</SectionHeading>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="border-b border-gray-200 bg-gray-100">
                        <tr>
                          <th className={th}>Đối tác</th>
                          <th className={`${th} text-right`}>Nợ NSX này</th>
                          <th className={`${th} text-right`}>
                            Ứng trước chung
                          </th>
                          <th className={`${th} text-right`}>
                            Tổng nợ đối tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {data.groups.map((group) => (
                          <tr
                            key={`${group.accountType}:${group.accountId}`}
                            className="hover:bg-gray-50">
                            <td className={td}>
                              <div className="font-medium text-gray-900">
                                {group.partnerName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {group.accountType === "S"
                                  ? "Nhà cung cấp"
                                  : "Nhà sản xuất độc lập"}
                              </div>
                            </td>
                            <td
                              className={`${td} text-right tabular-nums text-orange-600`}>
                              {money(group.manufacturerProductionDebt)}
                            </td>
                            <td
                              className={`${td} text-right tabular-nums text-green-700`}>
                              {money(group.availableCredit)}
                            </td>
                            <td
                              className={`${td} text-right tabular-nums font-medium`}>
                              {money(group.totalDebt)}
                            </td>
                          </tr>
                        ))}
                        {!data.groups.length && (
                          <tr>
                            <td colSpan={4}>
                              <PanelState>
                                Chưa có đối tác thanh toán
                              </PanelState>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col gap-6 lg:flex-row">
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1.5 text-sm text-gray-500">
                        Ghi chú nhà sản xuất:
                      </h4>
                      <p className="min-h-28 whitespace-pre-wrap break-words rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
                        {data.manufacturer.note || "-"}
                      </p>
                    </div>
                    <dl className="w-full shrink-0 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm lg:w-96">
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-gray-600">Phiếu gửi sản xuất:</dt>
                        <dd className="font-semibold tabular-nums text-gray-900">
                          {data.productions.length}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-gray-600">Đã hoàn thành:</dt>
                        <dd className="font-semibold tabular-nums text-gray-900">
                          {completed.length}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-t border-gray-200 pt-2">
                        <dt className="text-gray-600">Hàng đang gửi:</dt>
                        <dd className="break-words text-right font-semibold tabular-nums text-brand">
                          {money(heldValue)}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-gray-600">Phải trả NSX:</dt>
                        <dd className="break-words text-right font-semibold tabular-nums text-gray-900">
                          {money(
                            completed.reduce(
                              (sum, row) => sum + Number(row.totalPayable ?? 0),
                              0
                            )
                          )}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-gray-600">Đã thanh toán:</dt>
                        <dd className="break-words text-right font-semibold tabular-nums text-green-600">
                          {money(
                            completed.reduce(
                              (sum, row) => sum + Number(row.paidAmount ?? 0),
                              0
                            )
                          )}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-t-2 border-red-200 pt-2">
                        <dt className="font-bold text-gray-900">
                          Nợ hiện tại của NSX:
                        </dt>
                        <dd className="break-words text-right font-bold tabular-nums text-red-600">
                          {money(totalDebt)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
              {view === "debt" && !data.groups.length && (
                <PanelState>Chưa có công nợ nhà sản xuất</PanelState>
              )}
              {view === "debt" &&
                data.groups.map((group) => (
                  <section
                    key={`${group.accountType}:${group.accountId}`}
                    className="mb-6 last:mb-0">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-gray-800">
                          {group.accountType === "S"
                            ? `Thanh toán qua NCC: ${group.partnerName}`
                            : "Thanh toán riêng NSX"}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                          <span>
                            Nợ NSX này:{" "}
                            <strong className="text-orange-600">
                              {money(group.manufacturerProductionDebt)}
                            </strong>
                          </span>
                          <span>
                            Ứng trước chung:{" "}
                            <strong className="text-green-700">
                              {money(group.availableCredit)}
                            </strong>
                          </span>
                          <span>
                            Tổng nợ đối tác:{" "}
                            <strong className="text-gray-800">
                              {money(group.totalDebt)}
                            </strong>
                          </span>
                        </div>
                      </div>
                      {canPay && (
                        <button
                          type="button"
                          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded bg-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"
                          onClick={() =>
                            setPaying({
                              type: group.accountType,
                              id: group.accountId,
                            })
                          }>
                          <Wallet size={15} />
                          Thanh toán / ứng trước
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full min-w-[680px] text-sm">
                        <thead className="border-b border-gray-200 bg-gray-100">
                          <tr>
                            <th className={th}>Mã thanh toán</th>
                            <th className={th}>Ngày</th>
                            <th className={`${th} text-right`}>Thực chi</th>
                            <th className={th}>Chứng từ phân bổ</th>
                            <th className={th}>Trạng thái</th>
                            <th className="w-12" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {group.batches.length > 0 && (
                            <tr className="bg-amber-50 font-semibold">
                              <td className={td} colSpan={2}>
                                Tổng hiệu lực trong danh sách
                              </td>
                              <td className={`${td} text-right tabular-nums`}>
                                {money(
                                  group.batches
                                    .filter((row) => row.status !== 2)
                                    .reduce(
                                      (sum, row) =>
                                        sum + Number(row.totalAmount),
                                      0
                                    )
                                )}
                              </td>
                              <td colSpan={3} />
                            </tr>
                          )}
                          {group.batches.map((batch) => (
                            <tr key={batch.id} className="hover:bg-gray-50">
                              <td className={`${td} font-medium`}>
                                {batch.cashFlow ? (
                                  <Link
                                    className="text-brand hover:underline"
                                    href={`/tai-chinh/so-quy?Code=${batch.cashFlow.code}`}>
                                    {batch.cashFlow.code}
                                  </Link>
                                ) : (
                                  `Cấn ứng #${batch.id}`
                                )}
                              </td>
                              <td
                                className={`${td} whitespace-nowrap text-gray-600`}>
                                {new Date(batch.transDate).toLocaleDateString(
                                  "vi-VN"
                                )}
                              </td>
                              <td
                                className={`${td} whitespace-nowrap text-right tabular-nums`}>
                                {money(batch.totalAmount)}
                              </td>
                              <td
                                className={`${td} max-w-64 break-words text-gray-600`}>
                                {[
                                  ...new Set(
                                    batch.allocations.map(
                                      (line) => line.targetCode
                                    )
                                  ),
                                ].join(", ") || "Ứng trước"}
                              </td>
                              <td
                                className={`${td} whitespace-nowrap ${batch.status === 2 ? "text-red-600" : "text-green-700"}`}>
                                {batch.status === 2
                                  ? "Đã hủy"
                                  : "Đã thanh toán"}
                              </td>
                              <td className={td}>
                                {canCancelPayment && batch.status !== 2 && (
                                  <button
                                    type="button"
                                    title="Hủy lần thanh toán"
                                    aria-label={`Hủy thanh toán ${batch.cashFlow?.code ?? batch.id}`}
                                    disabled={cancel.isPending}
                                    className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          "Hủy toàn bộ lần thanh toán và các phân bổ liên quan?"
                                        )
                                      )
                                        cancel.mutate(batch.id);
                                    }}>
                                    <X size={15} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {!group.batches.length && (
                            <tr>
                              <td colSpan={6}>
                                <PanelState>Chưa có thanh toán</PanelState>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              {view === "productions" && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-100">
                      <tr>
                        <th className={th}>Mã phiếu</th>
                        <th className={th}>Thành phẩm</th>
                        <th className={th}>Trạng thái</th>
                        <th className={`${th} text-right`}>Phải trả</th>
                        <th className={`${th} text-right`}>Đã trả</th>
                        <th className={`${th} text-right`}>Còn nợ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {data.productions.length > 0 && (
                        <tr className="bg-amber-50 font-semibold">
                          <td className={td} colSpan={3}>
                            Tổng phiếu hoàn thành ({completed.length})
                          </td>
                          <td className={`${td} text-right tabular-nums`}>
                            {money(
                              completed.reduce(
                                (sum, row) =>
                                  sum + Number(row.totalPayable ?? 0),
                                0
                              )
                            )}
                          </td>
                          <td
                            className={`${td} text-right tabular-nums text-green-700`}>
                            {money(
                              completed.reduce(
                                (sum, row) => sum + Number(row.paidAmount ?? 0),
                                0
                              )
                            )}
                          </td>
                          <td
                            className={`${td} text-right tabular-nums text-orange-600`}>
                            {money(
                              completed.reduce(
                                (sum, row) => sum + Number(row.debtAmount ?? 0),
                                0
                              )
                            )}
                          </td>
                        </tr>
                      )}
                      {data.productions.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className={`${td} font-medium`}>
                            <Link
                              className="text-brand hover:underline"
                              href={`/san-pham/san-xuat?Code=${row.code}`}>
                              {row.code}
                            </Link>
                          </td>
                          <td className={`${td} min-w-48 max-w-80 break-words`}>
                            <div>{row.productName}</div>
                            <div className="mt-0.5 text-xs text-gray-400">
                              {row.productCode}
                            </div>
                          </td>
                          <td className={`${td} whitespace-nowrap`}>
                            <ProductionStatus status={row.status} />
                          </td>
                          <td
                            className={`${td} whitespace-nowrap text-right tabular-nums`}>
                            {money(row.totalPayable)}
                          </td>
                          <td
                            className={`${td} whitespace-nowrap text-right tabular-nums text-green-700`}>
                            {row.status === 2 ? money(row.paidAmount) : "-"}
                          </td>
                          <td
                            className={`${td} whitespace-nowrap text-right tabular-nums text-orange-600`}>
                            {row.status === 2 ? money(row.debtAmount) : "-"}
                          </td>
                        </tr>
                      ))}
                      {!data.productions.length && (
                        <tr>
                          <td colSpan={6}>
                            <PanelState>Chưa có phiếu gửi sản xuất</PanelState>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {view === "templates" &&
                (templates.isLoading ? (
                  <PanelState loading />
                ) : templates.isError ? (
                  <PanelState onRetry={() => templates.refetch()}>
                    Không tải được mẫu phối trộn
                  </PanelState>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-100">
                        <tr>
                          <th className={th}>Tên mẫu</th>
                          <th className={`${th} text-right`}>
                            Sản lượng cơ sở
                          </th>
                          <th className={th}>Tiền tệ</th>
                          <th className={`${th} text-right`}>
                            Phí gia công tham khảo
                          </th>
                          <th className="w-12" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {templates.data?.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td
                              className={`${td} max-w-80 break-words font-medium text-gray-900`}>
                              {row.name}
                            </td>
                            <td className={`${td} text-right tabular-nums`}>
                              {Number(row.baseQuantity).toLocaleString("vi-VN")}
                            </td>
                            <td className={`${td} text-gray-500`}>
                              {row.currency}
                            </td>
                            <td className={`${td} text-right tabular-nums`}>
                              {Number(row.processingFee).toLocaleString(
                                "vi-VN",
                                { maximumFractionDigits: 2 }
                              )}{" "}
                              {row.currency === "VND" ? "đ" : "CNY"}
                            </td>
                            <td className={td}>
                              {canDelete && (
                                <button
                                  type="button"
                                  title="Ngừng dùng mẫu"
                                  aria-label={`Ngừng dùng mẫu ${row.name}`}
                                  disabled={removeTemplate.isPending}
                                  className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                  onClick={() => {
                                    if (
                                      confirm("Ngừng dùng mẫu phối trộn này?")
                                    )
                                      removeTemplate.mutate(row.id);
                                  }}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!templates.data?.length && (
                          <tr>
                            <td colSpan={5}>
                              <PanelState>Chưa có mẫu phối trộn</PanelState>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}
            </>
          )
        )}
      </div>
      {canUpdate && data && !accounts.isError && (
        <footer className="mt-4 flex shrink-0 justify-end border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => onEdit(data.manufacturer)}
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded bg-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-dark">
            <Pencil size={15} />
            Chỉnh sửa
          </button>
        </footer>
      )}
      {paying && (
        <PayablePaymentModal
          accountType={paying.type}
          accountId={paying.id}
          onClose={() => setPaying(null)}
        />
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-700">{children}</h3>;
}

export function PanelState({
  children,
  loading,
  onRetry,
}: {
  children?: ReactNode;
  loading?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center gap-2 p-5 text-center text-sm text-gray-400"
      role={loading ? "status" : undefined}>
      {loading ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
          <span className="sr-only">Đang tải</span>
        </>
      ) : (
        children
      )}
      {onRetry && (
        <button type="button" onClick={onRetry} className={button}>
          Thử lại
        </button>
      )}
    </div>
  );
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
