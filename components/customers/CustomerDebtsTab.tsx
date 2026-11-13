import {
  useCustomerDebtTimeline,
  useExportCustomerDebt,
  useExportCustomerDebtTimeline,
} from "@/lib/hooks/useCustomers";
import { formatCurrency } from "@/lib/utils";
import { FileDown, HandCoins, Loader2, Wallet } from "lucide-react";
import {
  DateCell,
  MoneyChange,
  TAB_BUTTON_PRIMARY,
  TAB_BUTTON_SECONDARY,
  TabEmpty,
  TabLoading,
  TabPagination,
  TabTable,
  Td,
  Th,
  Tr,
} from "./CustomerTabUI";
import { useState } from "react";
import { CustomerPaymentModal } from "./CustomerPaymentModal";
import Link from "next/link";
import { CodeLink } from "../shared/CodeLink";
import { ExportDebtModal, ExportDebtOptions } from "./ExportDebtModal";
import { PermissionGate } from "../permissions/PermissionGate";

interface CustomerDebtsTabProps {
  customerId: number;
  customerDebt: number;
  hidePaymentButton?: boolean;
  includeChildren?: boolean;
  /** Ẩn toàn bộ cụm nút thao tác (Lịch sử TT, Công nợ, Thanh toán) — dùng khi
   * chỉ cần hiển thị bảng công nợ để chụp màn hình gửi khách. */
  hideActions?: boolean;
  /** Ẩn dòng "Nợ hiện tại" khi nơi nhúng đã hiển thị số nợ (vd header chi tiết khách). */
  hideSummary?: boolean;
}

export function CustomerDebtsTab({
  customerId,
  customerDebt,
  hidePaymentButton = false,
  includeChildren = false,
  hideActions = false,
  hideSummary = false,
}: CustomerDebtsTabProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useCustomerDebtTimeline(
    customerId,
    includeChildren,
  );

  const { exportToFile: exportTimeline, isExporting: exportingTimeline } =
    useExportCustomerDebtTimeline();
  const { exportToFile: exportDebt, isExporting: exportingDebt } =
    useExportCustomerDebt();
  const [showExportDebtModal, setShowExportDebtModal] = useState(false);

  const timeline = data?.data || [];
  const totalPages = Math.ceil(timeline.length / limit);
  const paginatedTimeline = timeline.slice((page - 1) * limit, page * limit);

  const getPaymentType = (code: string) => {
    if (code.startsWith("TTDH")) return "Thanh toán đơn hàng";
    if (code.startsWith("TTHD")) return "Thanh toán hóa đơn";
    if (code.startsWith("TT")) return "Thu tiền khách";
    return "Thanh toán";
  };

  const handleExportDebt = async (opts: ExportDebtOptions) => {
    const { preset, fromDate, toDate, ...rest } = opts;

    // Tính date range từ preset
    let from: string | undefined;
    let to: string | undefined;

    if (preset === "custom") {
      from = fromDate;
      to = toDate;
    } else if (preset !== "all_time") {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const toStr = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      if (preset === "today") {
        from = to = toStr(now);
      } else if (preset === "this_week") {
        const day = now.getDay() || 7;
        const mon = new Date(now);
        mon.setDate(now.getDate() - day + 1);
        from = toStr(mon);
        to = toStr(now);
      } else if (preset === "last_7_days") {
        const d = new Date(now);
        d.setDate(now.getDate() - 6);
        from = toStr(d);
        to = toStr(now);
      } else if (preset === "last_30_days") {
        const d = new Date(now);
        d.setDate(now.getDate() - 29);
        from = toStr(d);
        to = toStr(now);
      } else if (preset === "this_month") {
        from = toStr(new Date(now.getFullYear(), now.getMonth(), 1));
        to = toStr(now);
      } else if (preset === "last_month") {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        from = toStr(first);
        to = toStr(last);
      }
    }

    await exportDebt(customerId, { fromDate: from, toDate: to, ...rest });
    setShowExportDebtModal(false);
  };

  if (isLoading) return <TabLoading />;

  const debtNumber = Number(customerDebt) || 0;
  const showToolbar = !hideSummary || !hideActions;

  return (
    <>
      <div className="space-y-3">
        {showToolbar && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {!hideSummary ? (
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-500">Nợ hiện tại</span>
                <span
                  className={`text-lg font-semibold tabular-nums ${
                    debtNumber > 0 ? "text-orange-600" : "text-gray-500"
                  }`}>
                  {formatCurrency(customerDebt)}
                </span>
              </div>
            ) : (
              <span />
            )}
            {!hideActions && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => exportTimeline(customerId, includeChildren)}
                  disabled={exportingTimeline}
                  title="Xuất file lịch sử thanh toán"
                  className={TAB_BUTTON_SECONDARY}>
                  {exportingTimeline ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  Xuất lịch sử TT
                </button>

                <button
                  onClick={() => setShowExportDebtModal(true)}
                  disabled={exportingDebt}
                  title="Xuất file công nợ"
                  className={TAB_BUTTON_SECONDARY}>
                  {exportingDebt ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  Xuất công nợ
                </button>

                {!hidePaymentButton && (
                  <PermissionGate resource="cash_flows" action="create">
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className={TAB_BUTTON_PRIMARY}>
                      <HandCoins className="h-4 w-4" />
                      Thanh toán
                    </button>
                  </PermissionGate>
                )}
              </div>
            )}
          </div>
        )}

        {timeline.length === 0 ? (
          <TabEmpty
            icon={Wallet}
            title="Chưa có giao dịch nào"
            description="Hóa đơn, thanh toán và cấn trừ công nợ của khách sẽ hiện ở đây."
          />
        ) : (
          <TabTable
            footer={
              <TabPagination
                page={page}
                totalPages={totalPages}
                total={timeline.length}
                unit="giao dịch"
                onChange={setPage}
              />
            }>
            <thead>
              <tr>
                <Th>Mã phiếu</Th>
                <Th>Thời gian</Th>
                <Th className="hidden sm:table-cell">Loại</Th>
                {/* Chỉ cần khi xem cả khách con — còn lại luôn là chính khách này */}
                {includeChildren && (
                  <Th className="hidden md:table-cell">Khách hàng</Th>
                )}
                <Th className="hidden md:table-cell">Chi nhánh</Th>
                <Th align="right">Giá trị</Th>
                <Th align="right">Dư nợ</Th>
              </tr>
            </thead>
            <tbody>
              {paginatedTimeline.map((item: any) => {
                const isInvoice = item.type === "invoice";
                const isDebtOffset = item.type === "debt_offset";
                const isReturnOrder = item.type === "return_order";
                const isExpense = item.type === "expense";
                // Bán hàng / chi tiền cho khách làm tăng nợ; còn lại làm giảm nợ
                const increasesDebt = isInvoice || isExpense;
                const snapshot = Number(item.debtSnapshot) || 0;
                const linkClass = "font-medium text-brand hover:underline";
                const typeLabel = isInvoice
                  ? "Bán hàng"
                  : isDebtOffset
                    ? "Cấn trừ công nợ"
                    : isReturnOrder
                      ? "Trả hàng"
                      : isExpense
                        ? "Thanh toán"
                        : getPaymentType(item.code);

                return (
                  <Tr key={`${item.type}-${item.id}`}>
                    <Td className="whitespace-nowrap">
                      {item.type === "invoice" ? (
                        <Link
                          href={`/don-hang/hoa-don?Code=${item.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClass}
                          onClick={(e) => e.stopPropagation()}>
                          {item.code}
                        </Link>
                      ) : item.type === "payment" ? (
                        <Link
                          href={`/tai-chinh/so-quy?Code=${item.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClass}
                          onClick={(e) => e.stopPropagation()}>
                          {item.code}
                        </Link>
                      ) : item.type === "debt_offset" ? (
                        <CodeLink
                          entity="debt-offset"
                          code={item.code}
                          className={linkClass}
                        />
                      ) : item.type === "return_order" ? (
                        <CodeLink
                          entity="return-order"
                          code={item.code}
                          className={linkClass}
                        />
                      ) : (
                        <span className="font-medium text-brand">
                          {item.code}
                        </span>
                      )}
                      <div className="text-xs text-gray-500 sm:hidden">
                        {typeLabel}
                      </div>
                    </Td>
                    <Td>
                      <DateCell value={item.date} />
                    </Td>
                    <Td className="hidden whitespace-nowrap text-gray-900 sm:table-cell">
                      {typeLabel}
                    </Td>
                    {includeChildren && (
                      <Td className="hidden md:table-cell">
                        {item.customerName || "—"}
                      </Td>
                    )}
                    <Td className="hidden whitespace-nowrap md:table-cell">
                      {item.branch?.name || "—"}
                    </Td>
                    <Td align="right">
                      <MoneyChange
                        direction={increasesDebt ? "increase" : "decrease"}
                        formatted={formatCurrency(item.amount)}
                      />
                    </Td>
                    <Td
                      align="right"
                      className={`whitespace-nowrap font-semibold tabular-nums ${
                        snapshot > 0
                          ? "text-orange-600"
                          : snapshot < 0
                            ? "text-green-600"
                            : "text-gray-400"
                      }`}>
                      {formatCurrency(item.debtSnapshot)}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TabTable>
        )}
      </div>

      {showExportDebtModal && (
        <ExportDebtModal
          isExporting={exportingDebt}
          onClose={() => setShowExportDebtModal(false)}
          onConfirm={handleExportDebt}
        />
      )}

      {showPaymentModal && (
        <CustomerPaymentModal
          customerId={customerId}
          customerDebt={customerDebt}
          includeChildren={includeChildren}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </>
  );
}
