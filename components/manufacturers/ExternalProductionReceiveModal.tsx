"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, X } from "lucide-react";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { NumericInput } from "@/components/ui/NumericInput";
import { formatNumber } from "@/lib/utils";
import type { Production, ProductionReceipt } from "@/lib/api/productions";
import {
  materialFromRow,
  materialPayload,
  materialTotal,
  type ManufacturerMaterial,
} from "@/lib/api/manufacturers";
import {
  useReceiveProduction,
  useUpdateProductionReceipt,
} from "@/lib/hooks/useProductions";
import { round2, round4, scaleNsxQuantity } from "@/lib/utils/nsx-pricing";
import {
  ManufacturerMaterialsEditor,
  numericClass,
} from "./ManufacturerMaterialsEditor";

// Cùng kiểu phân cách (dấu phẩy) với ô nhập số.
const vnd = (amount: number) => `${formatNumber(amount)} đ`;
const qty = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Chia dòng NSX theo tỷ lệ số lượng (kg mất số lẻ thì đổi sang g, giữ đơn giá). */
function scaleLines(lines: ManufacturerMaterial[], ratio: number) {
  return lines.map((line) => {
    if (line.pricingMode === "TOTAL")
      return { ...line, amount: round2(Number(line.amount) * ratio) };
    if (!line.priceUnit)
      return { ...line, quantity: round4(Number(line.quantity ?? 0) * ratio) };
    return {
      ...line,
      ...scaleNsxQuantity(Number(line.quantity ?? 0), line.unit ?? "g", ratio),
    };
  });
}

/** Đợt nhận ảo cho phiếu hoàn thành trước khi có đợt nhận (server chuyển thành "Đợt 1"). */
export function legacyReceipt(
  production: Production,
): ProductionReceipt | null {
  if (
    production.status !== 2 ||
    production.receipts?.length ||
    production.receivedQuantity == null
  )
    return null;
  return {
    id: 0,
    productionId: production.id,
    seq: 1,
    code: `${production.code}-1`,
    status: 1,
    receivedDate: production.completedDate ?? production.updatedAt,
    quantity: production.receivedQuantity,
    processingFee: production.processingFee ?? 0,
    feeForeignAmount: production.feeForeignAmount,
    feeExchangeRate: production.feeExchangeRate,
    manufacturerMaterialCost: production.manufacturerMaterialCost ?? 0,
    totalPayable: production.totalPayable ?? 0,
    manufacturerMaterials: production.manufacturerMaterials ?? [],
    createdByName: production.createdByName,
    createdAt: production.createdAt,
  };
}

/**
 * Nhận một đợt thành phẩm của phiếu gửi NSX, hoặc sửa một đợt đã nhận.
 * Mặc định: số lượng = còn lại; dòng NSX và phí chia theo tỷ lệ số lượng.
 */
export function ExternalProductionReceiveModal({
  production,
  receipt,
  onClose,
}: {
  production: Production;
  /** Có → sửa đợt này; không → nhận đợt mới. */
  receipt?: ProductionReceipt | null;
  onClose: () => void;
}) {
  const editing = !!receipt;
  const cny = production.feeCurrency === "CNY";
  const planned = Number(production.quantity);
  const others = (production.receipts ?? [])
    .filter((item) => item.status === 1 && item.id !== receipt?.id)
    .reduce((sum, item) => sum + Number(item.quantity), 0);
  const remaining = Math.max(0, round4(planned - others));

  // Gốc để co giãn: đợt đang sửa (lượng của đợt) hoặc dự kiến của phiếu (cả lô).
  const baseQuantity = editing ? Number(receipt.quantity) : planned;
  const baseLines = (
    editing
      ? receipt.manufacturerMaterials
      : (production.manufacturerMaterials ?? [])
  ).map(materialFromRow);
  const baseFee =
    Number(
      editing
        ? cny
          ? receipt.feeForeignAmount
          : receipt.processingFee
        : cny
          ? production.feeForeignAmount
          : production.processingFee,
    ) || 0;
  const initialQuantity = editing ? baseQuantity : remaining || planned;
  const ratioOf = (value: number) =>
    baseQuantity > 0 ? value / baseQuantity : 1;

  const [quantity, setQuantity] = useState(initialQuantity);
  const [supplied, setSupplied] = useState<ManufacturerMaterial[]>(() =>
    editing ? baseLines : scaleLines(baseLines, ratioOf(initialQuantity)),
  );
  const [fee, setFee] = useState(() =>
    editing ? baseFee : round2(baseFee * ratioOf(initialQuantity)),
  );
  const [linesTouched, setLinesTouched] = useState(false);
  const [feeTouched, setFeeTouched] = useState(false);
  const [rate, setRate] = useState(
    Number(receipt?.feeExchangeRate ?? production.feeExchangeRate ?? 1),
  );
  const [date, setDate] = useState(
    localDate(receipt ? new Date(receipt.receivedDate) : new Date()),
  );
  const [note, setNote] = useState(receipt?.note ?? "");
  const [finish, setFinish] = useState(false);

  const receive = useReceiveProduction();
  const update = useUpdateProductionReceipt();
  const pending = receive.isPending || update.isPending;

  const changeQuantity = (value: number) => {
    setQuantity(value);
    // Chưa sửa tay thì dòng NSX và phí đi theo số lượng.
    if (!linesTouched) setSupplied(scaleLines(baseLines, ratioOf(value)));
    if (!feeTouched) setFee(round2(baseFee * ratioOf(value)));
  };

  const totalAfter = round4(others + quantity);
  const autoComplete = planned > 0 && totalAfter >= planned;
  const over = totalAfter > planned;
  const showFinish = !autoComplete && !production.receivingClosed;
  const materials = supplied.reduce(
    (sum, line) => sum + materialTotal(line),
    0,
  );
  const payable = cny ? Math.round((materials + fee) * rate) : materials + fee;
  const materialShare =
    planned > 0
      ? (Number(production.materialValue ?? 0) * quantity) / planned
      : 0;
  const plannedPayable =
    Number(production.processingFee ?? 0) +
    Number(production.manufacturerMaterialCost ?? 0);
  const unitCost =
    production.batchUnitCost != null
      ? Number(production.batchUnitCost)
      : planned > 0
        ? (Number(production.materialValue ?? 0) + plannedPayable) / planned
        : 0;

  const submit = () => {
    if (!(quantity > 0) || !date) {
      alert("Nhập số lượng nhận và ngày nhận hợp lệ");
      return;
    }
    if (cny && payable > 0 && !(rate > 0)) {
      alert("Nhập tỷ giá hợp lệ");
      return;
    }
    // Giữ giờ cũ của đợt nếu không đổi ngày; ngày mới lấy giờ hiện tại.
    const keep =
      receipt && localDate(new Date(receipt.receivedDate)) === date
        ? new Date(receipt.receivedDate)
        : null;
    const completed = keep ?? new Date(`${date}T00:00:00`);
    if (!keep) {
      const now = new Date();
      completed.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }
    const data = {
      completedDate: completed.toISOString(),
      receivedQuantity: quantity,
      manufacturerMaterials: supplied.map(materialPayload),
      processingFee: cny ? undefined : fee,
      feeForeignAmount: cny ? fee : undefined,
      feeExchangeRate: cny ? rate : undefined,
      note: note.trim(),
      finish: showFinish && finish ? true : undefined,
    };
    const options = { onSuccess: onClose };
    if (receipt)
      update.mutate(
        { id: production.id, receiptId: receipt.id, data },
        options,
      );
    else receive.mutate({ id: production.id, data }, options);
  };

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-2 sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Sửa đợt nhận" : "Nhận thành phẩm"}
        className="flex max-h-[95dvh] w-full max-w-5xl flex-col rounded-lg bg-white">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">
            {editing
              ? `Sửa đợt nhận ${receipt.code}`
              : `Nhận thành phẩm ${production.code}`}
          </h2>
          <button title="Đóng" onClick={onClose} disabled={pending}>
            <X size={20} />
          </button>
        </header>
        <fieldset
          disabled={pending}
          className="min-h-0 space-y-4 overflow-y-auto p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm">
              <div className="font-medium">
                {production.productCode} - {production.productName}
              </div>
              <div className="text-gray-500">
                {production.manufacturer?.name}
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 px-4 py-2 text-sm">
              <div>
                <dt className="text-gray-500">Dự kiến</dt>
                <dd className="font-semibold tabular-nums">{qty(planned)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">
                  {editing ? "Các đợt khác" : "Đã nhận"}
                </dt>
                <dd className="font-semibold tabular-nums text-green-700">
                  {qty(others)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Còn lại</dt>
                <dd className="font-semibold tabular-nums text-amber-700">
                  {qty(remaining)}
                </dd>
              </div>
            </dl>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Số lượng nhận đợt này
              <NumericInput
                className={numericClass}
                value={quantity}
                onValueChange={changeQuantity}
                maxFractionDigits={4}
                formatWhileTyping
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
            <label className="text-sm">
              Ghi chú
              <input
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
              />
            </label>
          </div>
          {over && (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0" />
              Tổng đã nhận ({qty(totalAfter)}) vượt sản lượng dự kiến (
              {qty(planned)}).
            </p>
          )}
          <ManufacturerMaterialsEditor
            value={supplied}
            onChange={(lines) => {
              setLinesTouched(true);
              setSupplied(lines);
            }}
            currency={cny ? "CNY" : "VND"}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Phí gia công đợt này ({cny ? "CNY" : "VND"})
              <NumericInput
                className={numericClass}
                value={fee}
                onValueChange={(value) => {
                  setFeeTouched(true);
                  setFee(value);
                }}
                maxFractionDigits={2}
                formatWhileTyping
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
                  formatWhileTyping
                />
              </label>
            )}
          </div>
          <dl className="grid gap-2 border-y py-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-gray-500">Phải trả NSX đợt này</dt>
              <dd className="font-medium text-red-700">{vnd(payable)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">NL mình phân bổ cho đợt</dt>
              <dd className="font-medium">{vnd(materialShare)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Giá thành áp dụng / sp</dt>
              <dd className="font-medium">{vnd(unitCost)}</dd>
            </div>
          </dl>
          {autoComplete ? (
            <p className="text-sm text-green-700">
              Đợt này nhận đủ sản lượng dự kiến — phiếu sẽ tự hoàn thành.
            </p>
          ) : (
            showFinish && (
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={finish}
                  onChange={(event) => setFinish(event.target.checked)}
                />
                <span>
                  Đợt cuối — hoàn tất phiếu (NSX không trả thêm, còn{" "}
                  {qty(Math.max(0, round4(planned - totalAfter)))} sp coi là hao
                  hụt)
                </span>
              </label>
            )
          )}
        </fieldset>
        <footer className="flex justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            disabled={pending}
            className="rounded border px-3 py-2 text-sm">
            Đóng
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="flex items-center gap-1 rounded bg-brand px-3 py-2 text-sm text-white disabled:opacity-50">
            <Check size={16} />
            {pending ? "Đang lưu..." : editing ? "Lưu đợt nhận" : "Nhận hàng"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
