import { useCustomerDebtTimeline } from "@/lib/hooks/useCustomers";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { CustomerPaymentModal } from "./CustomerPaymentModal";

interface CustomerDebtsTabProps {
  customerId: number;
  customerDebt: number;
  hidePaymentButton?: boolean;
}

export function CustomerDebtsTab({
  customerId,
  customerDebt,
  hidePaymentButton = false,
}: CustomerDebtsTabProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 8;

  const { data, isLoading } = useCustomerDebtTimeline(customerId);

  const timeline = data?.data || [];
  const totalPages = Math.ceil(timeline.length / limit);
  const paginatedTimeline = timeline.slice((page - 1) * limit, page * limit);

  const getPaymentType = (code: string) => {
    if (code.startsWith("TTDH")) return "Thanh toán đơn hàng";
    if (code.startsWith("TTHD")) return "Thanh toán hóa đơn";
    if (code.startsWith("TT")) return "Thu tiền khách";
    return "Thanh toán";
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
            {!hidePaymentButton && customerDebt > 0 && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                💵 Thanh toán
              </button>
            )}
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

                  return (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-blue-600 hover:underline cursor-pointer">
                          {item.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-md">
                        {new Date(item.date).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-md">
                        {isInvoice
                          ? "Bán hàng"
                          : isDebtOffset
                            ? "Cấn trừ công nợ"
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
                            <div className="text-red-600 font-medium">
                              {formatCurrency(item.amount)}
                            </div>
                          </div>
                        )}
                        {isPayment && (
                          <span className="text-green-600 font-medium">
                            -{formatCurrency(item.amount)}
                          </span>
                        )}
                        {isDebtOffset && (
                          <span className="text-green-600 font-medium">
                            -{formatCurrency(item.amount)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-md text-right font-medium">
                        <span
                          className={
                            item.debtSnapshot > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }>
                          {formatCurrency(item.debtSnapshot)}
                        </span>
                      </td>
                      {/* <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === 4 || item.status === 0
                              ? "bg-green-100 text-green-800"
                              : item.status === 3
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                          }`}>
                          {item.statusValue}
                        </span>
                      </td> */}
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

      {showPaymentModal && (
        <CustomerPaymentModal
          customerId={customerId}
          customerDebt={customerDebt}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </>
  );
}
