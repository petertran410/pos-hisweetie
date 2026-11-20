"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  Ban,
  ChevronDown,
  ClipboardList,
  History,
  Loader2,
  PackageMinus,
  PackagePlus,
  Pencil,
  Printer,
  Scale,
} from "lucide-react";
import {
  STOCK_SLIP_LABEL,
  type ManufacturerStockSlip,
  type StockSlipType,
} from "@/lib/api/manufacturer-stock";
import { printTemplatesApi } from "@/lib/api/print-templates";
import {
  useCancelManufacturerStockSlip,
  useManufacturerStock,
  useManufacturerStockMoves,
  useManufacturerStockSlips,
} from "@/lib/hooks/useManufacturerStock";
import { usePermission } from "@/lib/hooks/usePermissions";
import { formatNumber } from "@/lib/utils";
import { printEntity } from "@/lib/utils/print";
import { stockWithGrams } from "@/lib/utils/stock-units";
import { CodeLink } from "../shared/CodeLink";
import { ManufacturerStockSlipModal } from "./ManufacturerStockSlipModal";

const qty = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });
const vnd = (value: unknown) =>
  `${formatNumber(Math.round(Number(value ?? 0)))} đ`;
const day = (value: string) => new Date(value).toLocaleDateString("vi-VN");
const th =
  "whitespace-nowrap px-3 py-2 text-left text-sm font-semibold text-gray-700";
const td = "px-3 py-2.5 align-top";
const primary =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded bg-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-dark disabled:opacity-50";
const secondary =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50";
const small =
  "inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50";

const TYPE_BADGE: Record<StockSlipType, string> = {
  SEND: "bg-brand-soft text-brand-dark",
  RETURN: "bg-green-100 text-green-700",
  ADJUST: "bg-amber-100 text-amber-700",
  OPENING: "bg-gray-100 text-gray-700",
};

/**
 * Tab "Tồn NL tại NSX": nguyên liệu mình gửi trước cho NSX dùng dần, các phiếu
 * Gửi / Trả về kho / Điều chỉnh, và thẻ kho tại NSX của từng mã.
 */
export function ManufacturerStockPanel({
  manufacturerId,
  manufacturerName,
  manufacturerActive,
  highlightCode,
}: {
  manufacturerId: number;
  manufacturerName: string;
  manufacturerActive: boolean;
  /** Mã phiếu mở từ link (thẻ kho sản phẩm) — tô sáng trong danh sách phiếu. */
  highlightCode?: string | null;
}) {
  const canCreate = usePermission("productions", "create");
  const canUpdate = usePermission("productions", "update");
  const canDelete = usePermission("productions", "delete");
  const canViewCost = usePermission("products", "view_cost_price");
  const stock = useManufacturerStock(manufacturerId);
  const slips = useManufacturerStockSlips(manufacturerId);
  const cancel = useCancelManufacturerStockSlip();
  const [showEmpty, setShowEmpty] = useState(false);
  const [cardProduct, setCardProduct] = useState<number | null>(null);
  const [modal, setModal] = useState<{
    type: StockSlipType;
    slip?: ManufacturerStockSlip;
  } | null>(null);
  const rows = stock.data?.data ?? [];
  const visible = rows.filter(
    (row) => showEmpty || Math.abs(row.units) > 0.00005,
  );
  const hasStock = rows.some((row) => row.units > 0.00005);

  const confirmCancel = async (slip: ManufacturerStockSlip) => {
    const result = await Swal.fire({
      title: `Hủy phiếu ${slip.code}?`,
      html:
        slip.type === "SEND"
          ? `Nguyên liệu được cộng lại vào kho <b>${slip.branchName}</b> và trừ khỏi tồn tại NSX. Không hủy được nếu đã dùng cho phiếu gửi sản xuất.`
          : slip.type === "RETURN"
            ? `Nguyên liệu bị trừ khỏi kho <b>${slip.branchName}</b> và trả lại tồn tại NSX.`
            : slip.type === "OPENING"
              ? "Lượng đã khai báo bị trừ khỏi tồn tại NSX (kho của bạn không đổi). Không hủy được nếu đã dùng cho phiếu gửi sản xuất."
              : "Tồn tại NSX trở lại như trước khi điều chỉnh.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hủy phiếu",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (result.isConfirmed) cancel.mutate(slip.id);
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Tồn nguyên liệu tại NSX
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Nguyên liệu gửi trước để NSX dùng dần. Phiếu gửi sản xuất chọn
              &quot;Lấy từ: Tồn NSX&quot; sẽ trừ vào đây.
            </p>
          </div>
          {canCreate && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={primary}
                disabled={!manufacturerActive}
                title={
                  manufacturerActive
                    ? undefined
                    : "Nhà sản xuất đã ngừng hoạt động"
                }
                onClick={() => setModal({ type: "SEND" })}>
                <PackagePlus size={15} />
                Gửi nguyên liệu
              </button>
              <button
                type="button"
                className={secondary}
                disabled={!hasStock}
                onClick={() => setModal({ type: "RETURN" })}>
                <PackageMinus size={15} />
                Trả về kho
              </button>
              <button
                type="button"
                className={secondary}
                disabled={!rows.length}
                onClick={() => setModal({ type: "ADJUST" })}>
                <Scale size={15} />
                Điều chỉnh
              </button>
              <button
                type="button"
                className={secondary}
                disabled={!manufacturerActive}
                title="Hàng đã ở NSX từ trước và kho của bạn đã trừ rồi: chỉ cộng tồn NSX, không trừ kho"
                onClick={() => setModal({ type: "OPENING" })}>
                <ClipboardList size={15} />
                Khai báo tồn đầu
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-100">
              <tr>
                <th className={th}>Mã hàng</th>
                <th className={th}>Tên hàng</th>
                <th className={`${th} text-right`}>Tồn tại NSX</th>
                {canViewCost && (
                  <th className={`${th} text-right`}>Giá vốn BQ</th>
                )}
                {canViewCost && <th className={`${th} text-right`}>Giá trị</th>}
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {stock.isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand" />
                  </td>
                </tr>
              ) : (
                <>
                  {canViewCost && visible.length > 0 && (
                    <tr className="bg-amber-50 font-semibold">
                      <td className={td} colSpan={4}></td>
                      <td className={`${td} text-right tabular-nums`}>
                        {vnd(stock.data?.totalValue)}
                      </td>
                      <td />
                    </tr>
                  )}
                  {visible.map((row) => (
                    <Fragment key={row.productId}>
                      <tr
                        className={
                          cardProduct === row.productId
                            ? "bg-brand-soft"
                            : "hover:bg-gray-50"
                        }>
                        <td className={`${td} font-mono text-xs text-gray-600`}>
                          {row.productCode}
                        </td>
                        <td
                          className={`${td} min-w-48 break-words font-medium text-gray-800`}>
                          {row.productName}
                        </td>
                        <td
                          className={`${td} whitespace-nowrap text-right font-medium tabular-nums ${row.units < -0.00005 ? "text-red-600" : "text-gray-900"}`}>
                          {stockWithGrams(
                            row.units,
                            row.unit,
                            row.gramsPerUnit,
                          )}
                        </td>
                        {canViewCost && (
                          <td
                            className={`${td} whitespace-nowrap text-right tabular-nums`}>
                            {vnd(row.avgCost)}
                          </td>
                        )}
                        {canViewCost && (
                          <td
                            className={`${td} whitespace-nowrap text-right tabular-nums`}>
                            {vnd(row.value)}
                          </td>
                        )}
                        <td className={`${td} text-right`}>
                          <button
                            type="button"
                            className={small}
                            aria-expanded={cardProduct === row.productId}
                            onClick={() =>
                              setCardProduct(
                                cardProduct === row.productId
                                  ? null
                                  : row.productId,
                              )
                            }>
                            <History size={13} />
                            Thẻ kho
                          </button>
                        </td>
                      </tr>
                      {cardProduct === row.productId && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50 px-3 py-3">
                            <StockCard
                              manufacturerId={manufacturerId}
                              productId={row.productId}
                              unit={row.unit}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {!visible.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-gray-400">
                        {rows.length
                          ? "Nguyên liệu gửi trước đã dùng hết"
                          : "Chưa gửi nguyên liệu nào cho NSX này"}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
        {rows.some((row) => Math.abs(row.units) <= 0.00005) && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showEmpty}
              onChange={(event) => setShowEmpty(event.target.checked)}
            />
            Hiện cả mã đã dùng hết
          </label>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Phiếu nguyên liệu
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-100">
              <tr>
                <th className={th}>Mã phiếu</th>
                <th className={th}>Loại</th>
                <th className={th}>Ngày</th>
                <th className={th}>Kho</th>
                <th className={th}>Nguyên liệu</th>
                {canViewCost && <th className={`${th} text-right`}>Giá trị</th>}
                <th className={th}>Trạng thái</th>
                <th className="w-52" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {slips.isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand" />
                  </td>
                </tr>
              ) : (
                (slips.data ?? []).map((slip) => (
                  <tr
                    key={slip.id}
                    className={
                      slip.code === highlightCode
                        ? "bg-brand-soft"
                        : slip.status === 2
                          ? "bg-gray-50/60 text-gray-400"
                          : "hover:bg-gray-50"
                    }>
                    <td
                      className={`${td} whitespace-nowrap font-medium text-brand ${slip.code === highlightCode ? "border-l-2 border-brand" : ""}`}>
                      {slip.code}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[slip.type]}`}>
                        {STOCK_SLIP_LABEL[slip.type]}
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {day(slip.date)}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {slip.branchName ?? "-"}
                    </td>
                    <td className={`${td} min-w-56`}>
                      {slip.lines.map((line) => (
                        <div key={line.id} className="break-words">
                          {line.productName}:{" "}
                          <span className="tabular-nums">
                            {slip.type === "ADJUST"
                              ? `${Number(line.units) > 0 ? "+" : ""}${qty(Number(line.units))} (thực tế ${qty(Number(line.quantity))} ${line.unit})`
                              : `${qty(Number(line.quantity))} ${line.unit}`}
                          </span>
                        </div>
                      ))}
                    </td>
                    {canViewCost && (
                      <td
                        className={`${td} whitespace-nowrap text-right tabular-nums`}>
                        {vnd(slip.totalValue)}
                      </td>
                    )}
                    <td className={`${td} whitespace-nowrap`}>
                      {slip.status === 2 ? (
                        <span className="text-red-600">Đã hủy</span>
                      ) : (
                        <span className="text-green-700">Hiệu lực</span>
                      )}
                    </td>
                    <td className={`${td} text-right`}>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <SlipPrintButton slipId={slip.id} />
                        {slip.status === 1 && canUpdate && (
                          <button
                            type="button"
                            className={small}
                            onClick={() => setModal({ type: slip.type, slip })}>
                            <Pencil size={13} />
                            Sửa
                          </button>
                        )}
                        {slip.status === 1 && canDelete && (
                          <button
                            type="button"
                            className={`${small} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
                            disabled={cancel.isPending}
                            onClick={() => void confirmCancel(slip)}>
                            <Ban size={13} />
                            Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!slips.isLoading && !slips.data?.length && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400">
                    Chưa có phiếu nguyên liệu nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <ManufacturerStockSlipModal
          manufacturerId={manufacturerId}
          manufacturerName={manufacturerName}
          type={modal.type}
          slip={modal.slip}
          stock={rows}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/** Thẻ kho tại NSX của một mã: phiếu nguyên liệu + phiếu gửi sản xuất dùng tồn. */
function StockCard({
  manufacturerId,
  productId,
  unit,
}: {
  manufacturerId: number;
  productId: number;
  unit: string | null;
}) {
  const moves = useManufacturerStockMoves(manufacturerId, productId);
  if (moves.isLoading)
    return <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand" />;
  if (moves.isError)
    return <p className="text-sm text-red-600">Không tải được thẻ kho</p>;
  const data = moves.data?.data ?? [];
  if (!data.length)
    return <p className="text-sm text-gray-400">Chưa có biến động</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs font-medium text-gray-500">
        <tr>
          <th className="px-2 py-1.5">Ngày</th>
          <th className="px-2 py-1.5">Chứng từ</th>
          <th className="px-2 py-1.5">Diễn giải</th>
          <th className="px-2 py-1.5 text-right">Thay đổi</th>
          <th className="px-2 py-1.5 text-right">Tồn sau</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {data.map((move) => (
          <tr key={`${move.kind}-${move.refId}`}>
            <td className="whitespace-nowrap px-2 py-1.5">{day(move.date)}</td>
            <td className="whitespace-nowrap px-2 py-1.5">
              {move.kind === "production" ? (
                <CodeLink entity="production" code={move.refCode} />
              ) : (
                <span className="font-medium text-brand">{move.refCode}</span>
              )}
            </td>
            <td className="px-2 py-1.5 text-gray-600">{move.description}</td>
            <td
              className={`whitespace-nowrap px-2 py-1.5 text-right font-medium tabular-nums ${move.units < 0 ? "text-red-600" : "text-green-700"}`}>
              {move.units > 0 ? "+" : ""}
              {qty(move.units)} {unit}
            </td>
            <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
              {qty(move.balanceAfter)} {unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** In phiếu nguyên liệu NSX (mẫu không có giá / tiền). Nhiều mẫu thì chọn trong menu. */
function SlipPrintButton({ slipId }: { slipId: number }) {
  const { data: templates } = useQuery({
    queryKey: ["print-templates", "manufacturer_stock"],
    queryFn: () =>
      printTemplatesApi.getAll({
        templateFor: "manufacturer_stock",
        isActive: true,
      }),
  });
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const print = async (templateId?: number) => {
    setOpen(false);
    setPrinting(true);
    try {
      await printEntity("manufacturer_stock", slipId, templateId);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "In thất bại");
    } finally {
      setPrinting(false);
    }
  };
  const many = (templates?.length ?? 0) > 1;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={small}
        disabled={printing}
        onClick={() =>
          many ? setOpen(!open) : void print(templates?.[0]?.id)
        }>
        {printing ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Printer size={13} />
        )}
        In
        {many && <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-20 mb-1 min-w-48 rounded-lg border border-gray-200 bg-white py-1 text-left shadow-lg">
          {(templates as Array<{ id: number; name: string }>).map(
            (template) => (
              <button
                key={template.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-soft"
                onClick={() => void print(template.id)}>
                {template.name}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
