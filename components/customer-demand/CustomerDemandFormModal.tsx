"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/lib/hooks/useProducts";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import {
  useCreateCustomerDemand,
  useCustomerDemandCustomers,
  useUpdateCustomerDemandMonth,
} from "@/lib/hooks/useCustomerDemand";
import type { Product } from "@/lib/api/products";
import type {
  CustomerDemand,
  CustomerDemandLineInput,
  CustomerDemandUnit,
} from "@/lib/types/customer-demand";
import {
  DemandButton,
  DemandModalShell,
  DemandStatusChip,
  formatDemandMonth,
  formatDemandQty,
} from "./DemandUi";

interface Props {
  open: boolean;
  demand?: CustomerDemand | null;
  monthId?: number | null;
  copySource?: CustomerDemand | null;
  copyMonthId?: number | null;
  onClose: () => void;
}

type LineProduct = Pick<
  Product,
  "id" | "code" | "name" | "unit" | "conversionValue"
>;

type FormLine = {
  key: string;
  id?: number;
  product: LineProduct;
  quantity: string;
  unit: CustomerDemandUnit;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

function initialCustomerLabel(demand?: CustomerDemand | null) {
  if (!demand) return "";
  return `${demand.customer.code ? `${demand.customer.code} · ` : ""}${demand.customer.name}`;
}

function initialLines(
  demand: CustomerDemand | null | undefined,
  monthId: number | null | undefined
): FormLine[] {
  const month = demand?.months.find((item) => item.id === monthId);
  return (month?.lines ?? []).map((line) => ({
    key: `existing-${line.id}`,
    id: line.id,
    product: {
      id: line.product.id,
      code: line.product.code,
      name: line.product.name,
      unit: line.product.unit,
      conversionValue: line.product.conversionValue,
    },
    quantity: line.inputQuantity == null ? "" : String(line.inputQuantity),
    unit: line.inputUnit,
  }));
}

function CustomerDemandFormBody({
  demand,
  monthId,
  copySource,
  copyMonthId,
  onClose,
}: Omit<Props, "open">) {
  const createDemand = useCreateCustomerDemand();
  const updateMonth = useUpdateCustomerDemandMonth();
  const nextLineKey = useRef(0);
  const editMonth = demand?.months.find((month) => month.id === monthId);
  const copyMonth =
    copySource?.months.find((month) => month.id === copyMonthId) ?? null;
  const isCopy = !!copySource && !!copyMonth;
  const sourceDemand = isCopy ? copySource : demand;
  const sourceMonthId = isCopy ? copyMonthId : monthId;
  const [customerQuery, setCustomerQuery] = useState(
    initialCustomerLabel(sourceDemand)
  );
  const [customerId, setCustomerId] = useState<number | null>(
    sourceDemand?.customer.id ?? null
  );
  const [month, setMonth] = useState(
    copyMonth?.month ?? editMonth?.month ?? currentMonth()
  );
  const [note, setNote] = useState(sourceDemand?.note ?? "");
  const [changeNote, setChangeNote] = useState("");
  const [lines, setLines] = useState<FormLine[]>(() =>
    initialLines(sourceDemand, sourceMonthId)
  );
  const [productQuery, setProductQuery] = useState("");
  const [customerQueryDebounced, setCustomerQueryDebounced] = useState("");
  const [productQueryDebounced, setProductQueryDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(
      () => setCustomerQueryDebounced(customerQuery.trim()),
      300
    );
    return () => clearTimeout(timer);
  }, [customerQuery]);

  useEffect(() => {
    const timer = setTimeout(
      () => setProductQueryDebounced(productQuery.trim()),
      300
    );
    return () => clearTimeout(timer);
  }, [productQuery]);

  const { data: customersRes } = useCustomerDemandCustomers(
    customerQueryDebounced.length >= 2 ? customerQueryDebounced : undefined
  );
  const { data: productsRes } = useProducts(
    { search: productQueryDebounced, limit: 10, isActive: true },
    { enabled: productQueryDebounced.length >= 2 }
  );
  const customerResults = Array.isArray(customersRes) ? customersRes : [];
  const productResults = productsRes?.data ?? [];

  const addProduct = (product: Product) => {
    nextLineKey.current += 1;
    setLines((items) => [
      ...items,
      {
        key: `new-${product.id}-${nextLineKey.current}`,
        product: {
          id: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          conversionValue: product.conversionValue,
        },
        quantity: "",
        unit: "BASE",
      },
    ]);
    setProductQuery("");
  };

  const updateLine = (key: string, patch: Partial<FormLine>) => {
    setLines((items) =>
      items.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  };

  const removeLine = (key: string) => {
    setLines((items) => items.filter((line) => line.key !== key));
  };

  const preparedLines: CustomerDemandLineInput[] = lines
    .filter((line) => Number(line.quantity) > 0)
    .map((line) => ({
      ...(line.id ? { id: line.id } : {}),
      productId: line.product.id,
      quantity: Number(line.quantity),
      unit: line.unit,
    }));

  const submit = async () => {
    if (!customerId) return toast.error("Chọn khách hàng");
    if (!month) return toast.error("Chọn tháng cần hàng");
    if (!preparedLines.length) {
      return toast.error("Thêm ít nhất một sản phẩm có số lượng lớn hơn 0");
    }

    try {
      if (!isCopy && demand && monthId) {
        await updateMonth.mutateAsync({
          id: monthId,
          data: {
            customerId,
            month,
            note: note.trim() || undefined,
            changeNote: changeNote.trim() || undefined,
            lines: preparedLines,
          },
        });
        toast.success("Đã cập nhật tháng Demand");
      } else {
        await createDemand.mutateAsync({
          customerId,
          note: note.trim() || undefined,
          months: [{ month, lines: preparedLines }],
        });
        toast.success("Đã tạo Demand khách hàng ở trạng thái hoàn thành");
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể lưu Demand khách hàng"
      );
    }
  };

  const saving = createDemand.isPending || updateMonth.isPending;
  const editing = !isCopy && !!demand && !!editMonth;

  return (
    <DemandModalShell
      open
      onClose={onClose}
      size="form"
      title={
        editing
          ? `Chỉnh sửa Demand tháng ${formatDemandMonth(month)}`
          : isCopy
            ? `Tạo Demand từ phiếu #${copySource?.id}`
            : "Tạo Demand khách hàng (OEM/đặt hộ)"
      }
      subtitle={
        isCopy
          ? "Dữ liệu đã được sao chép vào phiếu mới nhưng chưa được lưu. Chỉnh sửa nếu cần rồi bấm tạo phiếu."
          : "Demand chỉ phục vụ dự kiến đặt hàng; không tạo Order, hóa đơn, công nợ hoặc giữ tồn."
      }
      footer={
        <>
          <DemandButton type="button" variant="ghost" onClick={onClose}>
            Đóng
          </DemandButton>
          <DemandButton
            type="button"
            disabled={saving}
            icon={
              saving ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  strokeWidth={1.5}
                />
              ) : undefined
            }
            onClick={submit}>
            {editing ? "Lưu tháng" : "Tạo phiếu"}
          </DemandButton>
        </>
      }>
      <div className="flex h-full min-h-0 flex-col">
        <div className="grid shrink-0 gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(12rem,.7fr)_minmax(0,1fr)]">
          <div className="relative">
            <label className="cd-field-label">Khách hàng *</label>
            <input
              value={customerQuery}
              onChange={(event) => {
                setCustomerId(null);
                setCustomerQuery(event.target.value);
              }}
              placeholder="Tìm mã hoặc tên khách hàng"
              className="cd-input"
            />
            {!customerId &&
              customerQueryDebounced.length >= 2 && (
                <div className="cd-menu">
                  {customerResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-[var(--cd-muted)]">
                      Không tìm thấy khách hàng
                    </div>
                  ) : (
                    customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setCustomerId(customer.id);
                          setCustomerQuery(
                            `${customer.code ? `${customer.code} · ` : ""}${customer.name}`
                          );
                        }}>
                        {customer.code ? `${customer.code} · ` : ""}
                        {customer.name}
                      </button>
                    ))
                  )}
                </div>
              )}
          </div>
          <div>
            <label className="cd-field-label">Tháng cần hàng *</label>
            <DatePickerInput
              monthOnly
              value={month ? `${month}-01` : ""}
              onChange={(value) => setMonth(value.slice(0, 7))}
              placeholder="Chọn tháng/năm"
              className="cd-input flex items-center justify-between text-left"
            />
          </div>
          <div>
            <label className="cd-field-label">Ghi chú chung</label>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ví dụ: OEM nhãn riêng, khách nhờ đặt hộ"
              className="cd-input"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pb-4">
          <div className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight">
                  Sản phẩm trong tháng {formatDemandMonth(month)}
                </h3>
                {editMonth?.status && (
                  <DemandStatusChip status={editMonth.status} />
                )}
              </div>
              <p className="cd-subtitle">
                Mỗi dòng có đơn vị riêng. Cùng một sản phẩm có thể được thêm
                nhiều lần.
              </p>
            </div>
          </div>

          <div className="relative mb-3 shrink-0">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--cd-muted)]"
              strokeWidth={1.5}
            />
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="Tìm sản phẩm để thêm vào tháng"
              className="cd-input has-icon"
            />
            {productQueryDebounced.length >= 2 && (
              <div className="cd-menu">
                {productResults.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-[var(--cd-muted)]">
                    Không tìm thấy sản phẩm
                  </div>
                ) : (
                  productResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}>
                      {product.code} · {product.name}{" "}
                      {product.conversionValue ? (
                        <span className="text-xs text-[var(--cd-muted)]">
                          ({product.conversionValue} {product.unit ?? "đv"}
                          /thùng)
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="cd-demand-lines min-h-0 flex-1">
            {lines.length === 0 ? (
              <div className="grid min-h-40 place-items-center rounded-[16px] bg-[var(--cd-bg)] px-4 text-center shadow-[inset_0_0_0_1px_var(--cd-hairline)]">
                <div>
                  <Plus
                    className="mx-auto h-6 w-6 text-[var(--cd-cyan)]"
                    strokeWidth={1.4}
                  />
                  <p className="mt-2 text-sm font-medium">
                    Chưa có sản phẩm trong tháng
                  </p>
                  <p className="cd-subtitle mt-1">
                    Tìm và chọn sản phẩm ở ô phía trên.
                  </p>
                </div>
              </div>
            ) : (
              lines.map((line) => {
                const quantity = Number(line.quantity || 0);
                return (
                  <div key={line.key} className="cd-demand-line">
                    <div className="min-w-0">
                      <div className="cd-mono text-[11px] text-[var(--cd-cyan-deep)]">
                        {line.product.code}
                      </div>
                      <div
                        className="cd-line-name"
                        title={line.product.name}>
                        {line.product.name}
                      </div>
                      <div className="cd-subtitle mt-0.5">
                        {formatDemandQty(
                          Number(line.product.conversionValue ?? 1)
                        )}{" "}
                        {line.product.unit ?? "đv"} / thùng
                      </div>
                    </div>
                    <select
                      value={line.unit}
                      onChange={(event) =>
                        updateLine(line.key, {
                          unit: event.target.value as CustomerDemandUnit,
                        })
                      }
                      className="cd-select">
                      <option value="BASE">
                        {line.product.unit ?? "Đơn vị"}
                      </option>
                      <option value="CARTON">Thùng</option>
                    </select>
                    <div>
                      <div className="cd-qty">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.quantity}
                          onChange={(event) => {
                            const raw = event.target.value
                              .replace(/,/g, "")
                              .trim();
                            if (
                              raw === "" ||
                              /^\d*(?:\.\d{0,4})?$/.test(raw)
                            ) {
                              updateLine(line.key, { quantity: raw });
                            }
                          }}
                          placeholder="0"
                          aria-label={`Số lượng ${line.product.name}`}
                          className="cd-qty-input"
                        />
                        <span className="cd-qty-unit">
                          {line.unit === "CARTON"
                            ? "thùng"
                            : (line.product.unit ?? "đv")}
                        </span>
                      </div>
                      {line.unit === "CARTON" && quantity > 0 && (
                        <div className="mt-1 text-[10px] text-[#1a5f6a]">
                          ={" "}
                          {formatDemandQty(
                            quantity * Number(line.product.conversionValue || 0)
                          )}{" "}
                          {line.product.unit ?? "đv"}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      aria-label={`Xóa ${line.product.name}`}
                      title="Xóa dòng"
                      className="cd-icon-btn">
                      <X className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {editMonth?.status === "CONFIRMED" && (
            <div className="mt-3 shrink-0">
              <label className="cd-field-label">
                Lý do thay đổi Demand đã hoàn thành *
              </label>
              <textarea
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
                placeholder="Nhập lý do nếu khách hàng, số lượng, sản phẩm hoặc tháng thay đổi"
                className="cd-textarea"
                rows={2}
              />
            </div>
          )}
        </div>
      </div>
    </DemandModalShell>
  );
}

export function CustomerDemandFormModal({
  open,
  demand,
  monthId,
  copySource,
  copyMonthId,
  onClose,
}: Props) {
  if (!open) return null;
  return (
    <CustomerDemandFormBody
      key={`${demand?.id ?? "new"}-${monthId ?? "new"}-${copySource?.id ?? "nocopy"}-${copyMonthId ?? "nomon"}`}
      demand={demand}
      monthId={monthId}
      copySource={copySource}
      copyMonthId={copyMonthId}
      onClose={onClose}
    />
  );
}
