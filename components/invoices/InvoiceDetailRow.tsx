"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInvoice, useUpdateInvoice } from "@/lib/hooks/useInvoices";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { INVOICE_STATUS, InvoiceDetail } from "@/lib/types/invoice";
import Swal from "sweetalert2";
import { tr } from "date-fns/locale";

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

    const hasPayments = invoice.payments && invoice.payments.length > 0;

    if (hasPayments) {
      const result = await Swal.fire({
        title: "Xác nhận hủy hóa đơn",
        html: `
        <p>Hóa đơn này có <strong>${
          invoice.payments?.length || 0
        }</strong> phiếu thanh toán.</p>
        <p class="text-red-600 font-bold mt-2">Bạn có muốn hủy cả phiếu thanh toán không?</p>
      `,
        icon: "warning",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Có - Hủy phiếu thanh toán",
        denyButtonText: "Không - Giữ phiếu thanh toán",
        cancelButtonText: "Hủy bỏ",
        confirmButtonColor: "#dc2626",
        denyButtonColor: "#059669",
        cancelButtonColor: "#6b7280",
      });

      if (result.isDismissed) {
        return;
      }

      const cancelPayments = result.isConfirmed;

      try {
        setIsSaving(true);
        await updateInvoice.mutateAsync({
          id: invoice.id,
          data: {
            status: INVOICE_STATUS.CANCELLED,
            cancelPayments: cancelPayments,
          },
        });

        if (cancelPayments) {
          toast.success("Đã hủy hóa đơn và phiếu thanh toán");
        } else {
          toast.success("Đã hủy hóa đơn, giữ nguyên phiếu thanh toán");
        }
      } catch (error) {
        toast.error("Không thể hủy hóa đơn");
      } finally {
        setIsSaving(false);
      }
    } else {
      const result = await Swal.fire({
        title: "Xác nhận hủy hóa đơn",
        text: "Bạn có chắc chắn muốn hủy hóa đơn này?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xác nhận",
        cancelButtonText: "Hủy bỏ",
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
      });

      if (result.isConfirmed) {
        try {
          setIsSaving(true);
          await updateInvoice.mutateAsync({
            id: invoice.id,
            data: { status: INVOICE_STATUS.CANCELLED },
          });
          toast.success("Đã hủy hóa đơn thành công");
        } catch (error) {
          toast.error("Không thể hủy hóa đơn");
        } finally {
          setIsSaving(false);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!invoice) return;

    try {
      setIsSaving(true);
      await updateInvoice.mutateAsync({
        id: invoice.id,
        data: { status: selectedStatus },
      });
      toast.success("Lưu hóa đơn thành công");
    } catch (error) {
      toast.error("Không thể lưu hóa đơn");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProcessInvoice = () => {
    if (!invoice) return;
    router.push(`/ban-hang?invoiceId=${invoice.id}`);
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

  const isCompleted = invoice.status === INVOICE_STATUS.COMPLETED;
  const isCancelled = invoice.status === INVOICE_STATUS.CANCELLED;
  const canEdit = !isCompleted && !isCancelled;

  return (
    <tr>
      <td colSpan={colSpan} className="py-2 bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sm:max-w-[640px] md:max-w-[768px] lg:max-w-[830px] xl:max-w-[1090px] 2xl:max-w-[1520px]">
          <div className="p-6">
            <div className="border-b border-gray-200 pb-4 mb-6 ">
              <div className="flex items-center mb-3 content-center gap-2 text-xl">
                <p className="font-bold gap-3">{invoice.code}</p>
                {"-"}
                <h3 className="">
                  {invoice.customer?.name || "Khách vãng lai"}
                </h3>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Người tạo:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-gray-50">
                      {invoice.creator?.name || "-"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Người bán:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-white">
                      {invoice.soldBy?.name || invoice.creator?.name || "-"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Ngày bán:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-gray-50">
                      {formatDateTime(invoice.purchaseDate)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Chi nhánh xử lý:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-white">
                      {invoice.branch?.name || "-"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Bảng giá:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-white">
                      Bảng giá chung
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Trạng thái:
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) =>
                        setSelectedStatus(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 text-md border rounded bg-white"
                      disabled={!canEdit}>
                      <option value={INVOICE_STATUS.PROCESSING}>
                        Đang xử lý
                      </option>
                      <option value={INVOICE_STATUS.COMPLETED}>
                        Hoàn thành
                      </option>
                      <option value={INVOICE_STATUS.CANCELLED}>Đã hủy</option>
                      <option value={INVOICE_STATUS.FAILED_DELIVERY}>
                        Không giao được
                      </option>
                    </select>
                  </div>

                  <div className="col-span-4">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Ghi chú hóa đơn:
                    </label>
                    <textarea
                      value={invoice.description || ""}
                      readOnly
                      className="w-full px-3 py-2 text-md border rounded bg-gray-50 resize-none"
                      rows={2}
                      placeholder="Không có ghi chú"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <label className="block text-md font-medium text-gray-700 mb-1">
                        Địa chỉ giao hàng:
                      </label>
                      <p className="text-md text-gray-900 font-medium">
                        {invoice.delivery?.address ||
                          invoice.customer?.address ||
                          "-"}
                      </p>
                      <p className="text-md text-gray-600 mt-1">
                        {[
                          invoice.delivery?.wardName ||
                            invoice.customer?.wardName,
                          invoice.delivery?.locationName ||
                            invoice.customer?.districtName,
                          invoice.delivery?.cityName ||
                            invoice.customer?.cityName,
                        ]
                          .filter(Boolean)
                          .join(", ")}
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
                      <thead className="bg-gray-100">
                        <tr>
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
                            Giá bán
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Giảm giá
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Thành tiền
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoice.details?.map((item: InvoiceDetail) => (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-md font-medium text-blue-600">
                                {item.productCode}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-md font-medium text-gray-900">
                                  {item.productName}
                                </p>
                                {item.note && (
                                  <p className="text-md text-gray-500 mt-1 italic">
                                    {item.note}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-md font-medium text-gray-900">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-md text-gray-900">
                                {formatMoney(Number(item.price))}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-md text-red-600">
                                {item.discount && Number(item.discount) > 0
                                  ? `- ${formatMoney(Number(item.discount))}`
                                  : "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-md font-bold text-blue-600">
                                {formatMoney(Number(item.totalPrice))}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-6">
                  <div className="w-96">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center text-md">
                        <span className="text-gray-600">Tổng tiền hàng:</span>
                        <span className="font-semibold text-gray-900">
                          {formatMoney(Number(invoice.totalAmount))}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-md">
                        <span className="text-gray-600">Giảm giá hóa đơn:</span>
                        <span className="font-semibold text-red-600">
                          - {formatMoney(Number(invoice.discount))}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-md">
                        <span className="text-gray-600">Phí ship:</span>
                        <span className="font-semibold text-gray-900">0</span>
                      </div>

                      <div className="border-t border-gray-300 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-md font-bold text-gray-900">
                            Tổng cộng:
                          </span>
                          <span className="text-md font-bold text-blue-600">
                            {formatMoney(Number(invoice.grandTotal))}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-md pt-2 border-t border-gray-200">
                        <span className="text-gray-600">Khách đã trả:</span>
                        <span className="font-semibold text-green-600">
                          {formatMoney(Number(invoice.paidAmount))}
                        </span>
                      </div>

                      <div className="flex justify-between items-center rounded-b-lg border-t-2 border-red-200 pt-2">
                        <span className="text-lg font-bold text-gray-900">
                          Khách cần trả:
                        </span>
                        <span className="text-lg font-bold text-red-600">
                          {formatMoney(Number(invoice.debtAmount))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      hidden={
                        isSaving || invoice.status === INVOICE_STATUS.CANCELLED
                      }
                      className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSaving ? "Đang xử lý..." : "Hủy"}
                    </button>
                    <button
                      onClick={handleProcessInvoice}
                      hidden={
                        isSaving ||
                        invoice.status === INVOICE_STATUS.CANCELLED ||
                        invoice.status === INVOICE_STATUS.COMPLETED
                      }
                      className="px-4 py-2 text-md font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      Xử lý hóa đơn
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSaving ? "Đang lưu..." : "Lưu"}
                    </button>
                    <button className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      Kết thúc
                    </button>
                    <button className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      In
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
