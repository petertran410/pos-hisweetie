"use client";

import {
  useCashFlow,
  useRelatedInvoicePayments,
  useCancelCashFlow,
} from "@/lib/hooks/useCashflows";
import { Loader2, Printer, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

interface CashFlowDetailRowProps {
  cashFlowId: number;
  colSpan: number;
}

const formatMoney = (value: number) => {
  return new Intl.NumberFormat("en-US").format(value);
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN");
};

const getStatusColor = (status: number) => {
  switch (status) {
    case 0:
      return "bg-green-100 text-green-700";
    case 1:
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusText = (status: number) => {
  switch (status) {
    case 0:
      return "Đã thanh toán";
    case 1:
      return "Đã hủy";
    default:
      return "Không xác định";
  }
};

const getMethodText = (method: string) => {
  const methodMap: { [key: string]: string } = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản",
    ewallet: "Ví điện tử",
    card: "Thẻ",
  };
  return methodMap[method] || method;
};

export function CashFlowDetailRow({
  cashFlowId,
  colSpan,
}: CashFlowDetailRowProps) {
  const { data: cashFlow, isLoading } = useCashFlow(cashFlowId);
  const { data: invoicePayments } = useRelatedInvoicePayments(cashFlowId);
  const cancelCashFlow = useCancelCashFlow();

  const handleDelete = async () => {
    if (!cashFlow) return;

    if (confirm("Bạn có chắc chắn muốn xóa phiếu thu/chi này?")) {
      try {
        await cancelCashFlow.mutateAsync(cashFlowId);
        toast.success("Xóa phiếu thu/chi thành công");
      } catch (error: any) {
        toast.error(error.message || "Có lỗi xảy ra khi xóa phiếu thu/chi");
      }
    }
  };

  const handleEdit = () => {
    toast.info("Chức năng chỉnh sửa đang được phát triển");
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">Đang tải...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!cashFlow) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 py-8 text-center text-red-500">
          Không tìm thấy phiếu thu/chi
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-6 bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {cashFlow.isReceipt ? "Phiếu thu" : "Phiếu chi"}{" "}
                    <span className="text-blue-600">{cashFlow.code}</span>
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      cashFlow.status
                    )}`}>
                    {getStatusText(cashFlow.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-md font-medium text-gray-500 mb-1.5">
                    Người tạo:
                  </label>
                  <span className="text-md text-gray-900 font-medium">
                    {cashFlow.creatorName || "-"}
                  </span>
                </div>

                <div>
                  <label className="block text-md font-medium text-gray-500 mb-1.5">
                    Người thu:
                  </label>
                  <span className="text-md text-gray-900 font-medium">
                    {cashFlow.creatorName || "-"}
                  </span>
                </div>

                <div>
                  <label className="block text-md font-medium text-gray-500 mb-1.5">
                    Thời gian:
                  </label>
                  <span className="text-md text-gray-900">
                    {formatDateTime(cashFlow.transDate)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-6">
                <div>
                  <label className="block text-md font-medium text-gray-500 mb-1.5">
                    Số tiền:
                  </label>
                  <span className="text-lg font-semibold text-green-600">
                    {formatMoney(Number(cashFlow.amount))}
                  </span>
                </div>

                <div>
                  <label className="block text-md font-medium text-gray-500 mb-1.5">
                    Loại thu:
                  </label>
                  <span className="text-md text-gray-900">
                    {cashFlow.cashFlowGroupName || "-"}
                  </span>
                </div>

                <div>
                  <label className="block text-md font-medium text-gray-500 mb-1.5">
                    Đối tượng nộp:
                  </label>
                  <span className="text-md text-gray-900">
                    {cashFlow.partnerName || "-"}
                  </span>
                </div>

                <div>
                  <label className="block text-md font-medium text-gray-500 mb-1.5">
                    Phương thức thanh toán:
                  </label>
                  <span className="text-md text-gray-900">
                    {getMethodText(cashFlow.method)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-md font-medium text-gray-500 mb-2">
                  Người nộp:
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-md text-gray-900">
                    {cashFlow.partnerName && `${cashFlow.partnerName}`}
                    {cashFlow.partnerId && ` - ${cashFlow.partnerId}`}
                    {cashFlow.contactNumber && ` - ${cashFlow.contactNumber}`}
                    {!cashFlow.partnerName &&
                      !cashFlow.partnerId &&
                      !cashFlow.contactNumber &&
                      "-"}
                  </p>
                  {(cashFlow.address || cashFlow.wardName) && (
                    <p className="text-md text-gray-600 mt-1">
                      {[cashFlow.address, cashFlow.wardName]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {invoicePayments && invoicePayments.length > 0 && (
                <div>
                  <label className="block text-md font-medium text-gray-500 mb-2">
                    Hóa đơn được gắn với phiếu thu:
                  </label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-md font-semibold text-gray-700">
                            Mã hóa đơn
                          </th>
                          <th className="px-4 py-3 text-left text-md font-semibold text-gray-700">
                            Thời gian
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700">
                            Giá trị phiếu
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700">
                            Đã thu trước
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700">
                            Giá trị thu
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700">
                            Còn cần thu
                          </th>
                          <th className="px-4 py-3 text-center text-md font-semibold text-gray-700">
                            Trạng thái
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoicePayments.map((payment: any) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="text-md font-medium text-blue-600">
                                {payment.invoice?.code}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-md text-gray-900">
                              {formatDateTime(payment.paymentDate)}
                            </td>
                            <td className="px-4 py-3 text-right text-md text-gray-900">
                              {formatMoney(
                                Number(payment.invoice?.grandTotal || 0)
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-md text-gray-900">
                              {formatMoney(
                                Number(payment.invoice?.paidAmount || 0) -
                                  Number(payment.amount)
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-md font-medium text-green-600">
                              {formatMoney(Number(payment.amount))}
                            </td>
                            <td className="px-4 py-3 text-right text-md text-gray-900">
                              {formatMoney(
                                Number(payment.invoice?.debtAmount || 0)
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  payment.invoice?.status === 1
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}>
                                {payment.invoice?.status === 1
                                  ? "Hoàn thành"
                                  : "Đang xử lý"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-md font-medium text-gray-500 mb-2">
                  Ghi chú:
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-md text-gray-900">
                    {cashFlow.description || "Chưa có ghi chú"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-md font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Xóa
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    In
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
