"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInvoice, useUpdateInvoice } from "@/lib/hooks/useInvoices";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  INVOICE_STATUS,
  INVOICE_STATUS_NUMBER_TO_STRING,
} from "@/lib/types/invoice";

interface InvoiceDetailRowProps {
  invoiceId: number;
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

export function InvoiceDetailRow({
  invoiceId,
  colSpan,
}: InvoiceDetailRowProps) {
  const router = useRouter();
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const updateInvoice = useUpdateInvoice();
  const [selectedStatus, setSelectedStatus] = useState<number>(
    INVOICE_STATUS.PROCESSING
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (invoice) {
      setSelectedStatus(invoice.status || INVOICE_STATUS.PROCESSING);
    }
  }, [invoice]);

  const handleCancel = async () => {
    if (!invoice) return;

    if (confirm("Bạn có chắc chắn muốn hủy hóa đơn này?")) {
      try {
        setIsSaving(true);
        await updateInvoice.mutateAsync({
          id: invoice.id,
          data: { invoiceStatus: INVOICE_STATUS.CANCELLED },
        });
        toast.success("Đã hủy hóa đơn thành công");
      } catch (error) {
        toast.error("Không thể hủy hóa đơn");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSave = async () => {
    if (!invoice) return;

    try {
      setIsSaving(true);
      await updateInvoice.mutateAsync({
        id: invoice.id,
        data: { invoiceStatus: selectedStatus },
      });
      toast.success("Lưu hóa đơn thành công");
    } catch (error) {
      toast.error("Không thể lưu hóa đơn");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Đang tải thông tin hóa đơn...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!invoice) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin hóa đơn
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-blue-50">
      <td colSpan={colSpan} className="p-0">
        <div className="bg-blue-50 border-y-2 border-blue-200">
          <div className="sm:max-w-[640px] md:max-w-[768px] lg:max-w-[1024px] xl:max-w-[1280px] 2xl:max-w-[1570px]">
            <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Thông tin khách hàng
                    </h4>
                    <div className="space-y-2 text-md">
                      <p className="text-gray-600">
                        <span className="font-medium">Tên:</span>{" "}
                        {invoice.customer?.name || "Khách vãng lai"}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">SĐT:</span>{" "}
                        {invoice.customer?.contactNumber ||
                          invoice.customer?.phone ||
                          "-"}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Email:</span>{" "}
                        {invoice.customer?.email || "-"}
                      </p>
                      <p className="text-gray-600 flex items-start gap-1">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {[
                          invoice.delivery?.address ||
                            invoice.customer?.address,
                          invoice.delivery?.wardName,
                          invoice.delivery?.locationName ||
                            invoice.customer?.cityName,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Trạng thái
                    </h4>
                    <select
                      value={selectedStatus}
                      onChange={(e) =>
                        setSelectedStatus(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 border rounded-lg">
                      <option value={INVOICE_STATUS.PROCESSING}>
                        Đang xử lý
                      </option>
                      <option value={INVOICE_STATUS.COMPLETED}>
                        Hoàn thành
                      </option>
                      <option value={INVOICE_STATUS.CANCELLED}>Đã hủy</option>
                      <option value={INVOICE_STATUS.NOT_DELIVERED}>
                        Không giao được
                      </option>
                    </select>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Thông tin thanh toán
                    </h4>
                    <div className="space-y-2 text-md">
                      <p className="text-gray-600">
                        <span className="font-medium">Tổng tiền:</span>{" "}
                        {formatMoney(Number(invoice.grandTotal))} đ
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Đã thanh toán:</span>{" "}
                        {formatMoney(Number(invoice.paidAmount))} đ
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Còn nợ:</span>{" "}
                        {formatMoney(Number(invoice.debtAmount))} đ
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-gray-700">
                      Danh sách sản phẩm
                    </h4>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Mã hàng
                          </th>
                          <th className="px-4 py-3 text-left text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Tên hàng
                          </th>
                          <th className="px-4 py-3 text-center text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Số lượng
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Đơn giá
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Giảm giá
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Thành tiền
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoice.details?.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-md text-gray-900">
                              {item.productCode}
                            </td>
                            <td className="px-4 py-3 text-md text-gray-900">
                              {item.productName}
                            </td>
                            <td className="px-4 py-3 text-center text-md text-gray-900">
                              {Number(item.quantity)}
                            </td>
                            <td className="px-4 py-3 text-right text-md text-gray-900">
                              {formatMoney(Number(item.price))} đ
                            </td>
                            <td className="px-4 py-3 text-right text-md text-gray-900">
                              {formatMoney(Number(item.discount))} đ
                            </td>
                            <td className="px-4 py-3 text-right text-md text-gray-900 font-medium">
                              {formatMoney(Number(item.totalPrice))} đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={
                      isSaving || invoice.status === INVOICE_STATUS.CANCELLED
                    }
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    Hủy hóa đơn
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                    {isSaving ? "Đang lưu..." : "Lưu"}
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
