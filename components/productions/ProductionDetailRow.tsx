"use client";

import { useProduction } from "@/lib/hooks/useProductions";
import { Loader2 } from "lucide-react";

interface ProductionDetailRowProps {
  productionId: number;
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
    case 1:
      return "bg-yellow-100 text-yellow-700";
    case 2:
      return "bg-green-100 text-green-700";
    case 3:
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusText = (status: number) => {
  switch (status) {
    case 1:
      return "Phiếu tạm";
    case 2:
      return "Hoàn thành";
    case 3:
      return "Đã hủy";
    default:
      return "Không xác định";
  }
};

export function ProductionDetailRow({
  productionId,
  colSpan,
}: ProductionDetailRowProps) {
  const { data: production, isLoading } = useProduction(productionId);

  if (isLoading) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600">
              Đang tải thông tin phiếu sản xuất...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  if (!production) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin phiếu sản xuất
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-6 bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sm:max-w-[640px] md:max-w-[768px] lg:max-w-[830px] xl:max-w-[1090px] 2xl:max-w-[1520px]">
          <div className="p-6">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col gap-2">
                  <p className="text-xl font-bold gap-3">{production.code}</p>
                  <h3 className="text-md">
                    Sản phẩm: {production.productName}
                  </h3>
                </div>
                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      production.status
                    )}`}>
                    {getStatusText(production.status)}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Người tạo:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-gray-50">
                      {production.createdByName || "-"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Thời gian sản xuất:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-white">
                      {formatDateTime(production.manufacturedDate || "")}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Kho đầu vào:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-gray-50">
                      {production.sourceBranchName}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Kho đầu ra:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-white">
                      {production.destinationBranchName}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Mã hàng:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-gray-50">
                      {production.productCode}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Số lượng sản xuất:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-white font-semibold">
                      {production.quantity}
                    </span>
                  </div>

                  {/* <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Tổng chi phí:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-gray-50 font-semibold text-green-600">
                      {formatMoney(Number(production.totalCost))}
                    </span>
                  </div> */}

                  {/* <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Tự động trừ NVL:
                    </label>
                    <span
                      className={`w-full px-3 py-2 text-md border rounded inline-block ${
                        production.autoDeductComponents
                          ? "bg-green-50 text-green-700 font-medium"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                      {production.autoDeductComponents ? "Có" : "Không"}
                    </span>
                  </div> */}
                </div>

                {production.note && (
                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Ghi chú:
                    </label>
                    <div className="px-3 py-2 text-md border rounded bg-gray-50">
                      {production.note}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
