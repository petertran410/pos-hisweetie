"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { NumericInput } from "@/components/ui/NumericInput";
import { productionsApi, type Production } from "@/lib/api/productions";
import {
  materialFromRow,
  materialPayload,
  materialTotal,
  type ManufacturerMaterial,
} from "@/lib/api/manufacturers";
import {
  ManufacturerMaterialsEditor,
  numericClass,
} from "./ManufacturerMaterialsEditor";

const vnd = (amount: number) =>
  `${amount.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} đ`;
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function ExternalProductionReceiveModal({
  production,
  onClose,
}: {
  production: Production;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(Number(production.quantity));
  const [supplied, setSupplied] = useState<ManufacturerMaterial[]>(
    (production.manufacturerMaterials ?? []).map(materialFromRow)
  );
  const cny = production.feeCurrency === "CNY";
  const [fee, setFee] = useState(
    Number(cny ? production.feeForeignAmount : (production.processingFee ?? 0))
  );
  const [rate, setRate] = useState(Number(production.feeExchangeRate ?? 1));
  const [date, setDate] = useState(today());
  const materials = supplied.reduce(
    (sum, line) => sum + materialTotal(line),
    0
  );
  const payable = cny ? Math.round((materials + fee) * rate) : materials + fee;
  const totalCost = Number(production.materialValue ?? 0) + payable;
  const unitCost = quantity > 0 ? totalCost / quantity : 0;
  const receive = useMutation({
    mutationFn: () => {
      if (!(quantity > 0) || !date)
        throw new Error("Nhập số lượng nhận và ngày nhận hợp lệ");
      if (cny && payable > 0 && !(rate > 0))
        throw new Error("Nhập tỷ giá hợp lệ");
      const now = new Date();
      const completed = new Date(`${date}T00:00:00`);
      completed.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      return productionsApi.receive(production.id, {
        completedDate: completed.toISOString(),
        receivedQuantity: quantity,
        manufacturerMaterials: supplied.map(materialPayload),
        processingFee: cny ? undefined : fee,
        feeForeignAmount: cny ? fee : undefined,
        feeExchangeRate: cny ? rate : undefined,
      });
    },
    onSuccess: () => {
      for (const key of [
        "productions",
        "production-cost-history",
        "products",
        "suppliers",
        "manufacturers",
        "manufacturer-accounts",
        "payables",
        "supplier-debt-timeline",
      ])
        queryClient.invalidateQueries({ queryKey: [key] });
      toast.success("Đã nhận thành phẩm và ghi nhận công nợ");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-2 sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nhận thành phẩm"
        className="flex max-h-[95dvh] w-full max-w-5xl flex-col rounded-lg bg-white">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">
            Nhận thành phẩm {production.code}
          </h2>
          <button title="Đóng" onClick={onClose} disabled={receive.isPending}>
            <X size={20} />
          </button>
        </header>
        <fieldset
          disabled={receive.isPending}
          className="min-h-0 space-y-4 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="text-sm">
              <div className="font-medium">
                {production.productCode} - {production.productName}
              </div>
              <div className="text-gray-500">
                {production.manufacturer?.name}
              </div>
            </div>
            <label className="text-sm">
              Số lượng thực nhận
              <NumericInput
                className={numericClass}
                value={quantity}
                onValueChange={setQuantity}
                maxFractionDigits={4}
              />
            </label>
            <div className="text-sm">
              <label className="mb-1 block">Ngày nhận</label>
              <DatePickerInput
                value={date}
                onChange={setDate}
                placeholder="Chọn ngày nhận"
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-soft"
              />
            </div>
          </div>
          <ManufacturerMaterialsEditor
            value={supplied}
            onChange={setSupplied}
            currency={cny ? "CNY" : "VND"}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Phí gia công cả lô ({cny ? "CNY" : "VND"})
              <NumericInput
                className={numericClass}
                value={fee}
                onValueChange={setFee}
                maxFractionDigits={2}
              />
            </label>
            {cny && (
              <label className="text-sm">
                Tỷ giá CNY/VND
                <NumericInput
                  className={numericClass}
                  value={rate}
                  onValueChange={setRate}
                  maxFractionDigits={6}
                />
              </label>
            )}
          </div>
          <dl className="grid gap-2 border-y py-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Giá vốn hàng mình đã gửi</dt>
              <dd className="font-medium">
                {vnd(Number(production.materialValue ?? 0))}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Phải trả NSX</dt>
              <dd className="font-medium text-red-700">{vnd(payable)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Giá thành cả lô</dt>
              <dd className="font-medium">{vnd(totalCost)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Giá thành / đơn vị nhận</dt>
              <dd className="font-medium">{vnd(unitCost)}</dd>
            </div>
          </dl>
        </fieldset>
        <footer className="flex justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            disabled={receive.isPending}
            className="rounded border px-3 py-2 text-sm">
            Đóng
          </button>
          <button
            onClick={() => receive.mutate()}
            disabled={receive.isPending}
            className="flex items-center gap-1 rounded bg-brand px-3 py-2 text-sm text-white disabled:opacity-50">
            <Check size={16} />
            {receive.isPending ? "Đang nhận..." : "Nhận và hoàn thành"}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
