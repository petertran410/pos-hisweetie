import {
  useCustomerDebtTimeline,
  useExportCustomerDebt,
  useExportCustomerDebtTimeline,
} from "@/lib/hooks/useCustomers";
import { formatCurrency } from "@/lib/utils";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { CustomerPaymentModal } from "./CustomerPaymentModal";
import Link from "next/link";
import { ExportDebtModal, ExportDebtOptions } from "./ExportDebtModal";

interface CustomerDebtsTabProps {
  customerId: number;
  customerDebt: number;
  hidePaymentButton?: boolean;
  includeChildren?: boolean;
}

export function CustomerDebtsTab({
  customerId,
  customerDebt,
  hidePaymentButton = false,
  includeChildren = false,
}: CustomerDebtsTabProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useCustomerDebtTimeline(
    customerId,
    includeChildren
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-md text-gray-600">
            Nợ hiện tại:{" "}
            <span className="font-semibold text-red-600">
              {formatCurrency(customerDebt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTimeline(customerId, includeChildren)}
              disabled={exportingTimeline}
              className="px-3 py-2 border rounded hover:bg-gray-50 flex items-center gap-1.5 text-sm text-gray-700 disabled:opacity-50">
              {exportingTimeline ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Lịch sử TT
            </button>

            <button
              onClick={() => setShowExportDebtModal(true)}
              disabled={exportingDebt}
              className="px-3 py-2 border rounded hover:bg-gray-50 flex items-center gap-1.5 text-sm text-gray-700 disabled:opacity-50">
              {exportingDebt ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Công nợ
            </button>

            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
              💵 Thanh toán
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-md font-medium">
                  Mã phiếu
                </th>
                <th className="px-4 py-3 text-left text-md font-medium">
                  Thời gian
                </th>
                <th className="px-4 py-3 text-left text-md font-medium">
                  Loại
                </th>
                <th className="px-4 py-3 text-left text-md font-medium">
                  Khách hàng
                </th>
                <th className="px-4 py-3 text-left text-md font-medium">
                  Chi nhánh
                </th>
                <th className="px-4 py-3 text-right text-md font-medium">
                  Giá trị
                </th>
                <th className="px-4 py-3 text-right text-md font-medium">
                  Dư nợ khách hàng
                </th>
                {/* <th className="px-4 py-3 text-center text-md font-medium">
                  Trạng thái
                </th> */}
              </tr>
            </thead>
            <tbody>
              {timeline.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500">
                    Chưa có giao dịch nào
                  </td>
                </tr>
              ) : (
                paginatedTimeline.map((item: any) => {
                  const isInvoice = item.type === "invoice";
                  const isPayment = item.type === "payment";
                  const isDebtOffset = item.type === "debt_offset";
                  const isReturnOrder = item.type === "return_order";
                  const isExpense = item.type === "expense";

                  return (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {item.type === "invoice" ? (
                          <>
                            <Link
                              href={`/don-hang/hoa-don?Code=${item.code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-md font-medium text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}>
                              {item.code}
                            </Link>
                          </>
                        ) : item.type === "payment" ? (
                          <>
                            <Link
                              href={`/so-quy?Code=${item.code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-md font-medium text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}>
                              {item.code}
                            </Link>
                          </>
                        ) : (
                          <span className="text-md font-medium text-blue-600 hover:underline cursor-pointer">
                            {item.code}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-md">
                        {new Date(item.date).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-md font-medium">
                        {isInvoice
                          ? "Bán hàng"
                          : isDebtOffset
                            ? "Cấn trừ công nợ"
                            : isReturnOrder // THÊM
                              ? "Trả hàng"
                              : isExpense // THÊM
                                ? "Thanh toán"
                                : getPaymentType(item.code)}
                      </td>
                      <td className="px-4 py-3 text-md">
                        {item.customerName ? (
                          <div>
                            <div className="font-medium">
                              {item.customerName}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-md">
                        {item.branch?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-md text-right">
                        {isInvoice && (
                          <div>
                            <div className="text-green-600 font-medium">
                              {formatCurrency(item.amount)}
                            </div>
                          </div>
                        )}
                        {isPayment && (
                          <span className="text-red-600 font-medium">
                            -{formatCurrency(item.amount)}
                          </span>
                        )}
                        {isDebtOffset && (
                          <span className="text-red-600 font-medium">
                            -{formatCurrency(item.amount)}
                          </span>
                        )}
                        {/* THÊM: Hiển thị cho return_order */}
                        {isReturnOrder && (
                          <span className="text-red-600 font-medium">
                            -{formatCurrency(item.amount)}
                          </span>
                        )}
                        {/* THÊM: Hiển thị cho expense (phiếu chi) */}
                        {isExpense && (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(item.amount)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-md text-right font-medium">
                        <span
                          className={
                            item.debtSnapshot > 0
                              ? "text-red-600"
                              : item.debtSnapshot < 0
                                ? "text-red-600"
                                : "text-red-600"
                          }>
                          {formatCurrency(item.debtSnapshot)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-600">
              Tổng: {timeline.length} giao dịch
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">
                Trước
              </button>
              <span className="text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">
                Sau
              </button>
            </div>
          </div>
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
