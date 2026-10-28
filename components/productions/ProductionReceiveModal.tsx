"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { NumericInput } from "@/components/ui/NumericInput";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { formatNumberInput, parseNumberInput } from "@/lib/utils";
import {
  useApplyProductionCost,
  useProductionCostPreview,
  useReceiveProduction,
} from "@/lib/hooks/useProductions";
import type { Production } from "@/lib/api/productions";

const vnd = (v: number) =>
  `${(Math.round(v * 100) / 100).toLocaleString("vi-VN")} đ`;

const todayStr = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Ghép ngày được chọn (YYYY-MM-DD) với giờ hiện tại để thẻ kho sắp đúng thứ
 * tự trong ngày (gửi ngày trần sẽ thành 00:00 và đứng trước mọi giao dịch).
 */
const dateWithNow = (value: string) => {
  const now = new Date();
  const [y, m, d] = value.split("-").map(Number);
  return new Date(
    y,
    m - 1,
    d,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ).toISOString();
};

/**
 * Nhận thành phẩm từ nhà máy = tạo phiếu nhập hàng (giá trị = phí sản xuất),
 * phiếu chuyển Hoàn thành, kèm bước xác nhận giá vốn; hoặc chỉ áp giá vốn cho
 * phiếu đã hoàn thành mà lúc nhận bỏ qua.
 */
export function ProductionReceiveModal({
  production,
  mode,
  onClose,
}: {
  production: Production;
  mode: "receive" | "applyCost";
  onClose: () => void;
}) {
  const isReceive = mode === "receive";
  const [receivedQuantity, setReceivedQuantity] = useState(
    Number(production.quantity),
  );
  const [debouncedQuantity, setDebouncedQuantity] = useState(receivedQuantity);
  const [completedDate, setCompletedDate] = useState(todayStr());
  const [applyCost, setApplyCost] = useState(true);
  // null = chưa sửa → dùng giá đề xuất.
  const [editedCost, setEditedCost] = useState<number | null>(null);
  const [scope, setScope] = useState<"receiveBranch" | "allBranches">(
    "receiveBranch",
  );

  // Phí chốt lúc nhận = giá trị phiếu nhập. Mặc định = phí ước tính.
  const isCnyFee = production.feeCurrency === "CNY";
  const [feeVnd, setFeeVnd] = useState(Number(production.processingFee ?? 0));
  const [feeForeign, setFeeForeign] = useState(
    Number(production.feeForeignAmount ?? 0),
  );
  const [feeRate, setFeeRate] = useState(
    Number(production.feeExchangeRate ?? 0),
  );
  const processingFee = isCnyFee
    ? Math.round(feeForeign * feeRate)
    : Math.round(feeVnd);
  const [debouncedFee, setDebouncedFee] = useState(processingFee);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuantity(receivedQuantity);
      setDebouncedFee(processingFee);
    }, 300);
    return () => clearTimeout(t);
  }, [receivedQuantity, processingFee]);

  const { data: preview, isLoading } = useProductionCostPreview(
    production.id,
    isReceive ? debouncedQuantity : undefined,
    !isReceive || debouncedQuantity > 0,
    isReceive ? debouncedFee : undefined,
  );
  const receive = useReceiveProduction();
  const applyCostMutation = useApplyProductionCost();
  const isPending = receive.isPending || applyCostMutation.isPending;

  const newCost = editedCost ?? preview?.proposedCost ?? 0;
  const sentDay = production.sentDate?.slice(0, 10);

  const handleSubmit = () => {
    if (isReceive) {
      if (receivedQuantity <= 0) {
        alert("Số lượng nhận phải lớn hơn 0");
        return;
      }
      if (isCnyFee && feeRate <= 0) {
        alert("Tỷ giá phí CNY phải lớn hơn 0");
        return;
      }
      receive.mutate(
        {
          id: production.id,
          data: {
            completedDate: dateWithNow(completedDate),
            receivedQuantity,
            newCost: applyCost && newCost > 0 ? newCost : undefined,
            costScope: scope,
            ...(isCnyFee
              ? { feeForeignAmount: feeForeign, feeExchangeRate: feeRate }
              : { processingFee: feeVnd }),
          },
        },
        { onSuccess: onClose },
      );
      return;
    }
    if (!preview || newCost <= 0) return;
    applyCostMutation.mutate(
      {
        id: production.id,
        data: { newCost, scope, expectedOldCost: preview.oldCost },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-semibold">
            {isReceive ? "Nhận hàng từ nhà máy" : "Áp giá vốn thành phẩm"} —{" "}
            {production.code}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4 text-sm">
          <div className="rounded border bg-gray-50 px-3 py-2">
            <div className="font-medium">{production.productName}</div>
            <div className="text-gray-500">
              Nhập vào kho {production.destinationBranchName}
              {production.factory?.name
                ? ` · từ ${production.factory.name}`
                : ""}
            </div>
          </div>

          {isReceive && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Ngày nhận
                </label>
                <DatePickerInput
                  value={completedDate}
                  onChange={setCompletedDate}
                  minDate={sentDay}
                  className="w-full flex items-center justify-between border border-gray-300 rounded px-2 py-1.5 text-sm text-left hover:border-gray-400"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Số lượng thành phẩm nhận
                </label>
                <NumericInput
                  value={receivedQuantity}
                  onValueChange={setReceivedQuantity}
                  maxFractionDigits={4}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Phiếu: {Number(production.quantity).toLocaleString("vi-VN")}
                </p>
              </div>
              <div className="col-span-2">
                <label className="block font-medium text-gray-700 mb-1">
                  Phí sản xuất chốt{isCnyFee ? " (CNY)" : ""}
                </label>
                {isCnyFee ? (
                  <div className="grid grid-cols-2 gap-2">
                    <NumericInput
                      value={feeForeign}
                      onValueChange={setFeeForeign}
                      maxFractionDigits={2}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 shrink-0">
                        Tỷ giá
                      </span>
                      <NumericInput
                        value={feeRate}
                        onValueChange={setFeeRate}
                        maxFractionDigits={2}
                        className="w-full min-w-0 border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={feeVnd ? formatNumberInput(String(feeVnd)) : ""}
                    onChange={(e) =>
                      setFeeVnd(
                        parseNumberInput(formatNumberInput(e.target.value)),
                      )
                    }
                    placeholder="0"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Sẽ tạo phiếu nhập hàng vào kho{" "}
                  {production.destinationBranchName}, giá trị ={" "}
                  <span className="font-medium text-gray-700">
                    {vnd(processingFee)}
                  </span>{" "}
                  (cộng vào nợ {production.supplier?.name || "NCC"}).
                </p>
              </div>
            </div>
          )}

          {isLoading || !preview ? (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tính giá
              thành...
            </div>
          ) : (
            <>
              <div className="rounded border divide-y">
                <Row
                  label="Giá vốn nguyên liệu đã gửi"
                  value={vnd(preview.materialValue)}
                />
                <Row
                  label="Phí sản xuất lô"
                  value={vnd(preview.processingFee)}
                />
                <Row
                  label="Tổng giá thành"
                  value={vnd(preview.totalCost)}
                  bold
                />
                <div className="flex items-center justify-between px-3 py-2 bg-brand-soft">
                  <span className="font-medium">
                    Giá thành / sp (
                    {preview.receivedQuantity.toLocaleString("vi-VN")} sp)
                  </span>
                  <span className="text-base font-bold text-brand">
                    {vnd(preview.unitCost)}
                  </span>
                </div>
              </div>

              {isReceive && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyCost}
                    onChange={(e) => setApplyCost(e.target.checked)}
                  />
                  Cập nhật giá vốn thành phẩm ngay
                </label>
              )}

              {(applyCost || !isReceive) && (
                <div className="space-y-3">
                  <div className="rounded border divide-y">
                    <Row
                      label={`Giá vốn hiện tại (tồn khác: ${preview.otherQuantity.toLocaleString("vi-VN")})`}
                      value={vnd(preview.oldCost)}
                    />
                    <Row
                      label="Giá vốn bình quân đề xuất"
                      value={vnd(preview.proposedCost)}
                      bold
                    />
                  </div>
                  {preview.oldCost <= 0 && (
                    <p className="text-xs text-gray-500">
                      Tồn cũ chưa có giá vốn nên không đưa vào bình quân.
                    </p>
                  )}
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Giá vốn mới sẽ ghi
                    </label>
                    <NumericInput
                      value={newCost}
                      onValueChange={setEditedCost}
                      maxFractionDigits={2}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  {preview.branchCount > 1 && (
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={scope === "receiveBranch"}
                          onChange={() => setScope("receiveBranch")}
                        />
                        Chỉ kho nhận ({preview.receiveBranchName})
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={scope === "allBranches"}
                          onChange={() => setScope("allBranches")}
                        />
                        Tất cả chi nhánh có sản phẩm này ({preview.branchCount})
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    Báo cáo lãi lỗ dùng giá vốn hiện tại cho cả hóa đơn cũ, nên
                    đổi giá vốn sẽ đổi lợi nhuận các hóa đơn đã bán sản phẩm
                    này.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-100">
            {isReceive ? "Đóng" : "Để sau"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || (!isReceive && (!preview || newCost <= 0))}
            className="px-4 py-2 text-sm text-white bg-brand rounded hover:bg-brand-dark disabled:opacity-50">
            {isPending
              ? "Đang lưu..."
              : isReceive
                ? "Nhận hàng & tạo phiếu nhập"
                : "Xác nhận áp giá vốn"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 ${
        bold ? "font-semibold" : ""
      }`}>
      <span className={bold ? "" : "text-gray-600"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
