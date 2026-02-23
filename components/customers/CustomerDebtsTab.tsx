import { useCustomerDebtTimeline } from "@/lib/hooks/useCustomers";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { CustomerPaymentModal } from "./CustomerPaymentModal";

interface CustomerDebtsTabProps {
  customerId: number;
  customerDebt: number;
}

export function CustomerDebtsTab({
  customerId,
  customerDebt,
}: CustomerDebtsTabProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data, isLoading } = useCustomerDebtTimeline(customerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const timeline = data?.data || [];

  const getPaymentType = (code: string) => {
    if (code.startsWith("TTDH")) return "Thanh toán đơn hàng";
    if (code.startsWith("TTHD")) return "Thanh toán hóa đơn";
    if (code.startsWith("TT")) return "Thu tiền khách";
    return "Thanh toán";
  };

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
            {customerDebt > 0 && (
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
                  Chi nhánh
                </th>
                <th className="px-4 py-3 text-right text-md font-medium">
                  Giá trị
                </th>
                <th className="px-4 py-3 text-right text-md font-medium">
                  Dư nợ khách hàng
                </th>
                <th className="px-4 py-3 text-center text-md font-medium">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {timeline.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500">
                    Chưa có giao dịch nào
                  </td>
                </tr>
              ) : (
                timeline.map((item: any) => {
                  const isInvoice = item.type === "invoice";
                  const isPayment = item.type === "payment";

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
                        {isInvoice ? "Bán hàng" : getPaymentType(item.code)}
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
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === 4 || item.status === 0
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                          {item.statusValue || "Đã xử lý"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
