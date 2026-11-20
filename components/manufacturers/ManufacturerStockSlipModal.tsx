"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ClipboardList,
  PackageMinus,
  PackagePlus,
  Scale,
  Trash2,
  X,
} from "lucide-react";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { NumericInput } from "@/components/ui/NumericInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { productsApi, type Product } from "@/lib/api/products";
import {
  STOCK_SLIP_LABEL,
  type ManufacturerStockRow,
  type ManufacturerStockSlip,
  type StockSlipType,
} from "@/lib/api/manufacturer-stock";
import { useBranches } from "@/lib/hooks/useBranches";
import { usePermission } from "@/lib/hooks/usePermissions";
import {
  useCreateManufacturerStockSlip,
  useUpdateManufacturerStockSlip,
} from "@/lib/hooks/useManufacturerStock";
import { useBranchStore } from "@/lib/store/branch";
import { round4 } from "@/lib/utils/nsx-pricing";
import {
  defaultOwnUnit,
  stockFactor,
  unitOptions,
} from "@/lib/utils/stock-units";
import { numericClass } from "./ManufacturerMaterialsEditor";
import { ProductPicker } from "./ProductionPickers";

const qty = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateClass =
  "flex h-[42px] w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-soft";

/** Thông tin quy đổi của một mã (từ sản phẩm, hoặc từ dòng tồn NSX). */
type UnitInfo = Pick<
  Product,
  "unit" | "weight" | "weightUnit" | "isPieceUnit"
> & {
  inventories?: Product["inventories"];
};

interface Line {
  productId: number;
  code: string;
  name: string;
  info?: UnitInfo;
  quantity: number;
  unit: string;
  /** Khai báo tồn đầu: giá vốn / 1 đơn vị kho. */
  unitCost?: number;
}

const TITLE: Record<StockSlipType, string> = {
  SEND: "Gửi nguyên liệu cho NSX",
  RETURN: "NSX trả nguyên liệu về kho",
  ADJUST: "Điều chỉnh tồn tại NSX",
  OPENING: "Khai báo tồn đầu tại NSX",
};
const ICON = {
  SEND: PackagePlus,
  RETURN: PackageMinus,
  ADJUST: Scale,
  OPENING: ClipboardList,
};
const QUANTITY_LABEL: Record<StockSlipType, string> = {
  SEND: "Lượng gửi",
  RETURN: "Lượng trả",
  ADJUST: "Thực tế còn",
  OPENING: "Lượng đang ở NSX",
};
const DATE_LABEL: Record<StockSlipType, string> = {
  SEND: "Ngày gửi",
  RETURN: "Ngày trả",
  ADJUST: "Ngày kiểm",
  OPENING: "Ngày khai báo",
};
const HINT: Record<StockSlipType, string> = {
  SEND: 'Nguyên liệu trừ khỏi kho gửi và nằm ở NSX để các phiếu gửi sản xuất sau chọn "Lấy từ: Tồn NSX".',
  RETURN: "Nguyên liệu được cộng lại vào kho nhận và trừ khỏi tồn tại NSX.",
  ADJUST:
    "Nhập lượng thực tế còn ở NSX. Phần chênh lệch ghi vào tồn NSX (âm là hao hụt); không đổi tồn kho của mình.",
  OPENING:
    "Dùng cho hàng đã nằm ở NSX từ trước và kho của bạn đã trừ rồi. Phiếu chỉ cộng tồn tại NSX theo giá vốn khai báo, không trừ tồn kho. Giá vốn mặc định lấy theo giá vốn hiện tại, sửa được.",
};

const infoFromStock = (row: ManufacturerStockRow): UnitInfo => ({
  unit: row.unit ?? undefined,
  weight: row.gramsPerUnit,
  weightUnit: "g",
  isPieceUnit: false,
});

/**
 * Tạo / sửa phiếu nguyên liệu tại NSX.
 * - Gửi: trừ kho gửi, cộng tồn NSX (giá vốn = giá vốn kho gửi).
 * - Trả: trừ tồn NSX, cộng kho nhận.
 * - Điều chỉnh: nhập lượng thực tế còn tại NSX, chênh lệch là hao hụt / dư.
 * - Khai báo tồn đầu: hàng đã ở NSX từ trước, kho đã trừ — chỉ cộng tồn NSX.
 */
export function ManufacturerStockSlipModal({
  manufacturerId,
  manufacturerName,
  type,
  slip,
  stock,
  onClose,
}: {
  manufacturerId: number;
  manufacturerName: string;
  type: StockSlipType;
  slip?: ManufacturerStockSlip | null;
  /** Tồn NSX hiện tại (đã gồm phiếu đang sửa). */
  stock: ManufacturerStockRow[];
  onClose: () => void;
}) {
  const editing = !!slip;
  const Icon = ICON[type];
  /** Gửi / Trả mới chạm kho mình; Điều chỉnh / Khai báo tồn đầu chỉ đổi tồn NSX. */
  const usesBranch = type === "SEND" || type === "RETURN";
  /** Gửi / Khai báo tồn đầu chọn mã bất kỳ; Trả / Điều chỉnh chọn trong tồn NSX. */
  const anyProduct = type === "SEND" || type === "OPENING";
  const canViewCost = usePermission("products", "view_cost_price");
  const { data: branches } = useBranches();
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const branchOptions = (branches ?? [])
    .filter((branch) => branch.isActive || branch.id === slip?.branchId)
    .map((branch) => ({ value: String(branch.id), label: branch.name }));
  const [branchId, setBranchId] = useState(() =>
    String(slip?.branchId ?? (usesBranch ? (selectedBranch?.id ?? "") : "")),
  );
  const [date, setDate] = useState(
    localDate(slip ? new Date(slip.date) : new Date()),
  );
  const [note, setNote] = useState(slip?.note ?? "");
  const stockById = new Map(stock.map((row) => [row.productId, row]));
  /** Lượng đơn vị kho (có dấu theo tồn NSX) của phiếu đang sửa, theo mã. */
  const oldUnits = new Map(
    (slip?.lines ?? []).map((line) => [line.productId, Number(line.units)]),
  );
  const oldSystem = new Map(
    (slip?.lines ?? []).map((line) => [
      line.productId,
      line.systemUnits == null ? null : Number(line.systemUnits),
    ]),
  );
  const [lines, setLines] = useState<Line[]>(() =>
    (slip?.lines ?? []).map((line) => {
      const row = stockById.get(line.productId);
      return {
        productId: line.productId,
        code: line.productCode,
        name: line.productName,
        info: anyProduct || !row ? undefined : infoFromStock(row),
        quantity: Number(line.quantity),
        unit: line.unit,
        unitCost: type === "OPENING" ? Number(line.unitCost) : undefined,
      };
    }),
  );
  // Phiếu gửi đang sửa: lấy thông tin sản phẩm (quy đổi + tồn kho gửi) cho các dòng cũ.
  const products = useQueries({
    queries: lines
      .filter((line) => !line.info)
      .map((line) => ({
        queryKey: ["products", line.productId],
        queryFn: () => productsApi.getProduct(line.productId),
      })),
  });
  const fetched = new Map(
    products.flatMap((query) =>
      query.data ? [[query.data.id, query.data] as const] : [],
    ),
  );
  const infoOf = (line: Line): UnitInfo | undefined =>
    line.info ?? fetched.get(line.productId);

  const create = useCreateManufacturerStockSlip();
  const update = useUpdateManufacturerStockSlip();
  const pending = create.isPending || update.isPending;
  const branchName = branchOptions.find(
    (option) => option.value === branchId,
  )?.label;

  /** Tồn NSX không tính phiếu đang sửa (để biết còn bao nhiêu để trả / hệ thống lúc kiểm). */
  const nsxAvailable = (productId: number) =>
    round4(
      Number(stockById.get(productId)?.units ?? 0) -
        (oldUnits.get(productId) ?? 0),
    );
  const systemOf = (productId: number) =>
    oldSystem.get(productId) ?? nsxAvailable(productId);
  const branchOnHand = (line: Line) => {
    const onHand = infoOf(line)?.inventories?.find(
      (inv) => inv.branchId === Number(branchId),
    )?.onHand;
    if (onHand == null) return null;
    // Phiếu đang sửa đã trừ kho phần cũ: cộng lại để biết gửi tối đa được bao nhiêu.
    return round4(
      Number(onHand) + Math.max(0, oldUnits.get(line.productId) ?? 0),
    );
  };

  /** Giá vốn gợi ý: kho đang chọn ở header, không có thì kho đầu tiên có giá vốn. */
  const defaultCost = (info?: UnitInfo) => {
    const inventories = info?.inventories ?? [];
    const own = inventories.find((inv) => inv.branchId === selectedBranch?.id);
    const cost =
      Number(own?.cost ?? 0) ||
      Number(inventories.find((inv) => Number(inv.cost) > 0)?.cost ?? 0);
    return Math.round(cost * 100) / 100;
  };

  const addLine = (
    productId: number,
    code: string,
    name: string,
    info?: UnitInfo,
  ) => {
    if (lines.some((line) => line.productId === productId)) {
      toast.error("Mã hàng đã có trong phiếu");
      return;
    }
    const unit = info ? defaultOwnUnit(info) : "unit";
    const factor = info ? stockFactor(info, unit) : null;
    // Trả: mặc định trả hết phần còn ở NSX; Điều chỉnh: mặc định = tồn hệ thống.
    const units =
      type === "RETURN"
        ? nsxAvailable(productId)
        : type === "ADJUST"
          ? systemOf(productId)
          : 0;
    const quantity = anyProduct ? 1 : factor ? round4(units / factor) : units;
    setLines([
      ...lines,
      {
        productId,
        code,
        name,
        info,
        quantity,
        unit,
        unitCost: type === "OPENING" ? defaultCost(info) : undefined,
      },
    ]);
  };
  const patch = (index: number, value: Partial<Line>) =>
    setLines(
      lines.map((line, position) =>
        position === index ? { ...line, ...value } : line,
      ),
    );

  const rows = lines.map((line) => {
    const info = infoOf(line);
    const factor = info ? stockFactor(info, line.unit) : null;
    const units =
      factor == null ? null : round4(Number(line.quantity) * factor);
    let available: number | null = null;
    let diff: number | null = null;
    if (type === "SEND") available = branchOnHand(line);
    if (type === "RETURN") available = nsxAvailable(line.productId);
    if (type === "ADJUST" && units != null)
      diff = round4(units - systemOf(line.productId));
    const short =
      available != null && units != null && units > available
        ? round4(units - available)
        : 0;
    return {
      line,
      info,
      units,
      available,
      diff,
      short,
      stockUnit: info?.unit || "",
    };
  });
  const anyShort = rows.some((row) => row.short > 0);

  const submit = () => {
    if (usesBranch && !branchId) {
      toast.error(type === "SEND" ? "Chọn kho gửi" : "Chọn kho nhận");
      return;
    }
    if (!lines.length) {
      toast.error("Thêm ít nhất một nguyên liệu");
      return;
    }
    if (rows.some((row) => row.units == null)) {
      toast.error("Có dòng chưa quy đổi được sang đơn vị kho");
      return;
    }
    if (
      type !== "ADJUST" &&
      rows.some((row) => !(Number(row.line.quantity) > 0))
    ) {
      toast.error("Lượng phải lớn hơn 0");
      return;
    }
    if (
      type === "OPENING" &&
      lines.some((line) => !(Number(line.unitCost) >= 0))
    ) {
      toast.error("Nhập giá vốn cho từng nguyên liệu");
      return;
    }
    // Giữ giờ cũ nếu không đổi ngày; ngày mới lấy giờ hiện tại.
    const keep =
      slip && localDate(new Date(slip.date)) === date
        ? new Date(slip.date)
        : null;
    const at = keep ?? new Date(`${date}T00:00:00`);
    if (!keep) {
      const now = new Date();
      at.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }
    const data = {
      ...(editing
        ? {}
        : { type, branchId: usesBranch ? Number(branchId) : null }),
      date: at.toISOString(),
      note: note.trim() || null,
      lines: lines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        unit: line.unit,
        ...(type === "OPENING" ? { unitCost: Number(line.unitCost ?? 0) } : {}),
      })),
    };
    const options = { onSuccess: onClose };
    if (slip) update.mutate({ slipId: slip.id, data }, options);
    else create.mutate({ manufacturerId, data }, options);
  };

  const pickable = stock.filter((row) =>
    type === "RETURN" ? nsxAvailable(row.productId) > 0 : true,
  );
  const quantityLabel = QUANTITY_LABEL[type];
  const showCost = type === "OPENING" && canViewCost;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-2 sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={TITLE[type]}
        className="flex max-h-[95dvh] w-full max-w-5xl flex-col rounded-lg bg-white">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Icon className="h-5 w-5 text-brand" />
            {editing ? `Sửa phiếu ${slip.code}` : TITLE[type]}
          </h2>
          <button title="Đóng" onClick={onClose} disabled={pending}>
            <X size={20} />
          </button>
        </header>
        <fieldset
          disabled={pending}
          className="min-h-0 space-y-4 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="rounded bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-dark">
              {STOCK_SLIP_LABEL[type]}
            </span>
            <span>
              Nhà sản xuất: <b className="text-gray-800">{manufacturerName}</b>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {usesBranch && (
              <div className="text-sm">
                <label className="mb-1 block">
                  {type === "SEND" ? "Kho gửi" : "Kho nhận"}
                </label>
                <SearchableSelect
                  variant="form"
                  options={branchOptions}
                  value={branchId}
                  onChange={setBranchId}
                  placeholder="Chọn kho"
                  disabled={editing}
                />
                {editing && (
                  <p className="mt-1 text-xs text-gray-400">
                    Muốn đổi kho thì hủy phiếu và tạo lại.
                  </p>
                )}
              </div>
            )}
            <div className="text-sm">
              <label className="mb-1 block">{DATE_LABEL[type]}</label>
              <DatePickerInput
                value={date}
                onChange={setDate}
                maxDate={localDate(new Date())}
                placeholder="Chọn ngày"
                className={dateClass}
              />
            </div>
            <label className="text-sm">
              Ghi chú
              <input
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                className="mt-1 h-[42px] w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-800">
              Nguyên liệu{" "}
              <span className="font-normal text-gray-400">
                {lines.length} dòng
              </span>
            </h3>
            <div className="w-full sm:w-80">
              {anyProduct ? (
                <ProductPicker
                  label={
                    type === "SEND"
                      ? "Thêm nguyên liệu gửi"
                      : "Thêm nguyên liệu đang ở NSX"
                  }
                  branchId={
                    type === "SEND" && branchId ? Number(branchId) : undefined
                  }
                  onChange={(product) =>
                    addLine(product.id, product.code, product.name, product)
                  }
                />
              ) : (
                <SearchableSelect
                  variant="form"
                  value=""
                  placeholder={
                    pickable.length
                      ? "Thêm nguyên liệu đang ở NSX"
                      : "NSX chưa có tồn nguyên liệu"
                  }
                  options={pickable.map((row) => ({
                    value: String(row.productId),
                    label: `${row.productCode} - ${row.productName}`,
                  }))}
                  onChange={(value) => {
                    const row = stockById.get(Number(value));
                    if (row)
                      addLine(
                        row.productId,
                        row.productCode,
                        row.productName,
                        infoFromStock(row),
                      );
                  }}
                  disabled={!pickable.length}
                />
              )}
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                <tr>
                  <th className="px-3 py-2.5">Sản phẩm</th>
                  {type === "ADJUST" && (
                    <th className="w-36 px-3 py-2.5 text-right">
                      Tồn hệ thống
                    </th>
                  )}
                  <th className="w-36 px-3 py-2.5">{quantityLabel}</th>
                  <th className="w-44 px-3 py-2.5">Đơn vị</th>
                  <th className="w-36 px-3 py-2.5 text-right">
                    {type === "ADJUST" ? "Chênh lệch" : "Quy đổi kho"}
                  </th>
                  {usesBranch && (
                    <th className="w-36 px-3 py-2.5 text-right">
                      {type === "SEND" ? "Tồn kho gửi" : "Còn tại NSX"}
                    </th>
                  )}
                  {showCost && (
                    <th className="w-44 px-3 py-2.5 text-right">
                      Giá vốn / đơn vị kho
                    </th>
                  )}
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(
                  (
                    { line, info, units, available, diff, short, stockUnit },
                    index,
                  ) => (
                    <tr
                      key={line.productId}
                      className="align-middle hover:bg-gray-50/70">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-800">{line.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-gray-400">
                          {line.code}
                        </p>
                      </td>
                      {type === "ADJUST" && (
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                          {qty(systemOf(line.productId))} {stockUnit}
                        </td>
                      )}
                      <td className="px-3 py-2.5">
                        <NumericInput
                          className={numericClass}
                          value={line.quantity}
                          maxFractionDigits={4}
                          formatWhileTyping
                          onValueChange={(value) =>
                            patch(index, { quantity: value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div
                          className="inline-flex rounded-lg border border-gray-200 p-0.5"
                          role="group"
                          aria-label={`Đơn vị ${line.code}`}>
                          {unitOptions(info, line.unit).map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              aria-pressed={line.unit === unit}
                              onClick={() => patch(index, { unit })}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium ${line.unit === unit ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                              {unit === "unit" ? stockUnit || "đơn vị" : unit}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {units == null ? (
                          info ? (
                            <span className="text-xs text-amber-700">
                              Không quy đổi được
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )
                        ) : type === "ADJUST" ? (
                          <span
                            className={`font-medium ${diff! < 0 ? "text-red-600" : diff! > 0 ? "text-green-700" : "text-gray-500"}`}>
                            {diff! > 0 ? "+" : ""}
                            {qty(diff!)} {stockUnit}
                            {diff! < 0 && (
                              <span className="block text-xs font-normal">
                                Hao hụt
                              </span>
                            )}
                          </span>
                        ) : (
                          <>
                            <span
                              className={`font-medium ${short > 0 ? "text-red-600" : "text-gray-800"}`}>
                              {qty(units)} {stockUnit}
                            </span>
                            {short > 0 && (
                              <span className="block text-xs text-red-600">
                                Thiếu {qty(short)} {stockUnit}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      {usesBranch && (
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums text-gray-600">
                          {available == null
                            ? "-"
                            : `${qty(available)} ${stockUnit}`}
                        </td>
                      )}
                      {showCost && (
                        <td className="px-3 py-2.5">
                          <NumericInput
                            className={numericClass}
                            value={line.unitCost ?? 0}
                            maxFractionDigits={2}
                            formatWhileTyping
                            onValueChange={(value) =>
                              patch(index, { unitCost: value })
                            }
                          />
                          {stockUnit && (
                            <span className="mt-0.5 block text-right text-xs text-gray-400">
                              đ / {stockUnit}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          title="Xóa dòng"
                          aria-label={`Xóa ${line.code}`}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          onClick={() =>
                            setLines(
                              lines.filter((_, position) => position !== index),
                            )
                          }>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ),
                )}
                {!lines.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-gray-400">
                      Chưa có nguyên liệu nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {anyShort && (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0" />
              {type === "SEND"
                ? `Có dòng vượt tồn ở ${branchName ?? "kho gửi"} — lưu sẽ bị từ chối.`
                : "Có dòng trả nhiều hơn lượng còn ở NSX — lưu sẽ bị từ chối."}
            </p>
          )}
          <p className="text-xs text-gray-500">{HINT[type]}</p>
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
            {pending ? "Đang lưu..." : "Lưu"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
