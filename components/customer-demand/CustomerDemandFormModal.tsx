"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useCustomerDemandCustomers } from "@/lib/hooks/useCustomerDemand";
import { useProducts } from "@/lib/hooks/useProducts";
import {
  useCreateCustomerDemand,
  useUpdateCustomerDemand,
} from "@/lib/hooks/useCustomerDemand";
import type { Product } from "@/lib/api/products";
import type {
  CustomerDemand,
  CustomerDemandMonthInput,
  CustomerDemandStatus,
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
  onClose: () => void;
}

type FormProduct = Pick<
  Product,
  "id" | "code" | "name" | "unit" | "conversionValue"
> & {
  inputUnit: CustomerDemandUnit;
};
type FormLine = {
  productId: number;
  quantity: string;
};
type FormMonth = Omit<CustomerDemandMonthInput, "lines"> & {
  lines: FormLine[];
  status?: CustomerDemandStatus;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

function firstUnitForProduct(
  months: Array<{
    lines: Array<{
      productId: number;
      unit?: CustomerDemandUnit;
      inputUnit?: CustomerDemandUnit;
    }>;
  }>,
  productId: number
): CustomerDemandUnit {
  for (const month of months) {
    const line = month.lines.find((item) => item.productId === productId);
    const unit = line?.unit ?? line?.inputUnit;
    if (unit === "CARTON" || unit === "BASE") return unit;
  }
  return "BASE";
}


function initialCustomerLabel(demand?: CustomerDemand | null) {
  if (!demand) return "";
  return `${demand.customer.code ? `${demand.customer.code} · ` : ""}${demand.customer.name}`;
}

function initialMonths(demand?: CustomerDemand | null): FormMonth[] {
  if (!demand) return [{ month: currentMonth(), lines: [] }];
  return demand.months
    .filter((month) => month.status !== "CANCELLED")
    .map((month) => ({
      id: month.id,
      month: month.month,
      status: month.status,
      lines: (month.lines ?? []).map((line) => ({
        productId: line.productId,
        quantity: line.inputQuantity == null ? "" : String(line.inputQuantity),
      })),
      changeNote: "",
    }));
}

function initialProducts(demand?: CustomerDemand | null): FormProduct[] {
  if (!demand) return [];
  const productMap = new Map<number, FormProduct>();
  for (const month of demand.months) {
    for (const line of month.lines ?? []) {
      if (productMap.has(line.productId)) continue;
      productMap.set(line.productId, {
        ...line.product,
        inputUnit: firstUnitForProduct(
          demand.months.map((item) => ({
            lines: (item.lines ?? []).map((entry) => ({
              productId: entry.productId,
              unit: entry.inputUnit,
            })),
          })),
          line.productId
        ),
      });
    }
  }
  return [...productMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function CustomerDemandFormBody({ demand, onClose }: Omit<Props, "open">) {
  const createDemand = useCreateCustomerDemand();
  const updateDemand = useUpdateCustomerDemand();
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(demand?.customer.id ?? null);
  const [customerLabel, setCustomerLabel] = useState(initialCustomerLabel(demand));
  const [note, setNote] = useState(demand?.note ?? "");
  const [months, setMonths] = useState<FormMonth[]>(() => initialMonths(demand));
  const [matrixProducts, setMatrixProducts] = useState<FormProduct[]>(() => initialProducts(demand));
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
  const customerResults = customersRes ?? [];
  const productResults = productsRes?.data ?? [];

  const products = matrixProducts;

  const addMonth = (monthValue?: string) => {
    const last = months[months.length - 1]?.month ?? currentMonth();
    const date = new Date(`${last}-01T00:00:00.000Z`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    const nextMonth = monthValue ?? date.toISOString().slice(0, 7);
    if (months.some((item) => item.month === nextMonth)) {
      toast.error(`Tháng ${nextMonth} đã có trong phiếu`);
      return;
    }
    setMonths((items) => [...items, { month: nextMonth, lines: [] }]);
  };

  const removeMonth = (index: number) => {
    const month = months[index];
    if (month?.status === "CONFIRMED") {
      toast.error(
        "Không xóa tháng đã xác nhận. Hãy hủy tháng đó trên danh sách phiếu."
      );
      return;
    }
    if (month?.status === "CANCELLED") {
      toast.error("Tháng đã hủy được giữ lại để xem lịch sử");
      return;
    }
    if (months.length <= 1) {
      toast.error("Phiếu phải còn ít nhất một tháng");
      return;
    }
    setMonths((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const copyPreviousMonth = () => {
    const previous = months[months.length - 1];
    if (!previous) return addMonth();
    const date = new Date(`${previous.month}-01T00:00:00.000Z`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    const nextMonth = date.toISOString().slice(0, 7);
    if (months.some((item) => item.month === nextMonth)) {
      toast.error(`Tháng ${nextMonth} đã có trong phiếu`);
      return;
    }
    setMonths((items) => [
      ...items,
      {
        month: nextMonth,
        lines: previous.lines.map((line) => ({ ...line })),
      },
    ]);
  };

  const updateQuantity = (
    monthIndex: number,
    product: FormProduct,
    value: string
  ) => {
    setMonths((items) =>
      items.map((month, index) => {
        if (index !== monthIndex) return month;
        const updated: FormLine = {
          productId: product.id,
          quantity: value,
        };
        const otherLines = month.lines.filter(
          (line) => line.productId !== product.id
        );
        return { ...month, lines: [...otherLines, updated] };
      })
    );
  };

  const updateProductUnit = (
    productId: number,
    inputUnit: CustomerDemandUnit
  ) => {
    setMatrixProducts((items) =>
      items.map((item) =>
        item.id === productId ? { ...item, inputUnit } : item
      )
    );
  };

  const addProduct = (product: Product) => {
    setMatrixProducts((items) => {
      if (items.some((item) => item.id === product.id)) return items;
      return [
        ...items,
        {
          id: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          conversionValue: product.conversionValue,
          inputUnit: "BASE" as CustomerDemandUnit,
        },
      ].sort((a, b) => a.name.localeCompare(b.name));
    });
    setProductQuery("");
  };

  const removeProduct = (productId: number) => {
    setMatrixProducts((items) => items.filter((item) => item.id !== productId));
    setMonths((items) =>
      items.map((month) => ({
        ...month,
        lines: month.lines.filter((line) => line.productId !== productId),
      }))
    );
  };

  const submit = async () => {
    const unitByProduct = new Map(
      products.map((product) => [product.id, product.inputUnit])
    );
    const preparedMonths = months.map((month) => ({
      id: month.id,
      month: month.month,
      changeNote: month.changeNote?.trim() || undefined,
      lines: month.lines
        .filter((line) => Number(line.quantity) > 0)
        .map(({ productId, quantity }) => ({
          productId,
          quantity: Number(quantity),
          unit: unitByProduct.get(productId) ?? "BASE",
        })),
    }));
    if (!customerId) return toast.error("Chọn khách hàng");
    if (
      preparedMonths.length === 0 ||
      preparedMonths.some((month) => !month.lines.length)
    ) {
      return toast.error(
        "Mỗi tháng cần có ít nhất một sản phẩm với số lượng lớn hơn 0"
      );
    }
    const monthKeys = preparedMonths.map((month) => month.month);
    if (new Set(monthKeys).size !== monthKeys.length) {
      return toast.error("Không được trùng tháng trong cùng một phiếu");
    }
    const confirmedWithoutNote = months.some((month, index) => {
      if (month.status !== "CONFIRMED" || month.changeNote?.trim()) return false;
      const before = month.lines
        .filter((line) => Number(line.quantity) > 0)
        .map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
          unit: unitByProduct.get(line.productId) ?? "BASE",
        }))
        .sort((a, b) => a.productId - b.productId);
      const after = [...(preparedMonths[index]?.lines ?? [])].sort(
        (a, b) => a.productId - b.productId
      );
      return JSON.stringify(before) !== JSON.stringify(after);
    });
    if (confirmedWithoutNote) {
      return toast.error("Phải nhập lý do khi sửa tháng đã xác nhận");
    }
    try {
      if (demand) {
        await updateDemand.mutateAsync({
          id: demand.id,
          data: {
            customerId,
            note: note.trim() || undefined,
            months: preparedMonths,
          },
        });
        toast.success("Đã cập nhật Demand khách hàng");
      } else {
        await createDemand.mutateAsync({
          customerId,
          note: note.trim() || undefined,
          months: preparedMonths,
        });
        toast.success("Đã tạo Demand khách hàng ở trạng thái nháp");
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

  const saving = createDemand.isPending || updateDemand.isPending;

  return (
    <DemandModalShell
      open
      onClose={onClose}
      size="form"
      title={
        demand
          ? "Chỉnh sửa Demand khách hàng"
          : "Tạo Demand khách hàng (OEM/đặt hộ)"
      }
      subtitle="Demand chỉ phục vụ dự kiến đặt hàng; không tạo Order, hóa đơn, công nợ hoặc giữ tồn."
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
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
              ) : undefined
            }
            onClick={submit}>
            {demand ? "Lưu thay đổi" : "Tạo phiếu nháp"}
          </DemandButton>
        </>
      }>
      <div className="flex h-full min-h-0 flex-col">
        <div className="grid shrink-0 gap-3 px-5 py-4 md:grid-cols-2">
          <div className="relative">
            <label className="cd-field-label">Khách hàng *</label>
            <input
              value={customerId ? customerLabel : customerQuery}
              onChange={(event) => {
                setCustomerId(null);
                setCustomerLabel("");
                setCustomerQuery(event.target.value);
              }}
              placeholder="Tìm mã hoặc tên khách hàng"
              className="cd-input"
            />
            {!customerId && customerQueryDebounced.length >= 2 && (
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
                        setCustomerLabel(
                          `${customer.code ? `${customer.code} · ` : ""}${customer.name}`
                        );
                        setCustomerQuery("");
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
          <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                Sản phẩm và tháng cần hàng
              </h3>
              <p className="cd-subtitle">
                Ô tháng chỉ nhập số lượng. Đơn vị chọn một lần theo từng sản
                phẩm.
              </p>
            </div>
            <div className="flex gap-2">
              <DemandButton
                type="button"
                variant="ghost"
                size="tiny"
                icon={<Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
                onClick={copyPreviousMonth}>
                Sao chép tháng trước
              </DemandButton>
              <DemandButton
                type="button"
                size="tiny"
                icon={<Plus className="h-3.5 w-3.5" strokeWidth={1.5} />}
                onClick={() => addMonth()}>
                Thêm tháng
              </DemandButton>
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
              placeholder="Tìm sản phẩm để thêm vào ma trận"
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

          <div className="min-h-0 flex-1 overflow-auto rounded-[16px] shadow-[inset_0_0_0_1px_var(--cd-hairline)]">
            <table className="cd-table cd-matrix text-sm">
              <thead>
                <tr>
                  <th className="cd-sticky-col min-w-64">Sản phẩm</th>
                  {months.map((month, index) => (
                    <th
                      key={`${month.id ?? "new"}-${index}`}
                      className="min-w-44 align-top">
                      <div className="flex items-center gap-1">
                        <label className="relative min-w-0 flex-1 cursor-pointer">
                          <span className="block truncate text-sm font-semibold normal-case tracking-normal text-[var(--cd-text)]">
                            {formatDemandMonth(month.month)}
                          </span>
                          <input
                            type="month"
                            value={month.month}
                            disabled={month.status === "CANCELLED"}
                            onChange={(event) =>
                              setMonths((items) =>
                                items.map((item, i) =>
                                  i === index
                                    ? { ...item, month: event.target.value }
                                    : item
                                )
                              )
                            }
                            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          />
                        </label>
                        {month.status !== "CONFIRMED" &&
                          month.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => removeMonth(index)}
                              title="Xóa tháng"
                              className="cd-icon-btn h-6 w-6">
                              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          )}
                      </div>
                      {month.status && (
                        <div className="mt-1">
                          <DemandStatusChip status={month.status} />
                        </div>
                      )}
                      {month.status === "CONFIRMED" && (
                        <textarea
                          value={month.changeNote ?? ""}
                          onChange={(event) =>
                            setMonths((items) =>
                              items.map((item, i) =>
                                i === index
                                  ? { ...item, changeNote: event.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder="Lý do nếu sửa tháng đã xác nhận"
                          className="cd-textarea mt-1 text-[11px]"
                          rows={2}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={months.length + 1}
                      className="px-3 py-10 text-center text-sm text-[var(--cd-muted)]">
                      Tìm và thêm ít nhất một sản phẩm.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td className="cd-sticky-col min-w-64 align-top">
                        <div className="font-medium text-[var(--cd-text)]">
                          {product.code} · {product.name}
                        </div>
                        <div className="cd-subtitle mt-0.5">
                          {formatDemandQty(Number(product.conversionValue ?? 1))}{" "}
                          {product.unit ?? "đv"} / thùng
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <select
                            value={product.inputUnit}
                            onChange={(event) =>
                              updateProductUnit(
                                product.id,
                                event.target.value as CustomerDemandUnit
                              )
                            }
                            className="cd-select w-auto">
                            <option value="BASE">
                              {product.unit ?? "Đơn vị"}
                            </option>
                            <option value="CARTON">Thùng</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeProduct(product.id)}
                            className="text-[11px] font-medium text-[#9b2c2c] hover:underline">
                            Xóa
                          </button>
                        </div>
                      </td>
                      {months.map((month, monthIndex) => {
                        const line = month.lines.find(
                          (item) => item.productId === product.id
                        );
                        const qty = Number(line?.quantity || 0);
                        return (
                          <td
                            key={`${product.id}-${monthIndex}`}
                            className="align-top">
                            {month.status === "CANCELLED" ? (
                              <span className="text-[var(--cd-muted)]">
                                Đã hủy
                              </span>
                            ) : (
                              <>
                                <div className="cd-qty">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={line?.quantity ?? ""}
                                    onChange={(event) => {
                                      const raw = event.target.value
                                        .replace(/,/g, "")
                                        .trim();
                                      if (
                                        raw === "" ||
                                        /^\d*(?:\.\d{0,4})?$/.test(raw)
                                      ) {
                                        updateQuantity(
                                          monthIndex,
                                          product,
                                          raw
                                        );
                                      }
                                    }}
                                    placeholder="0"
                                    aria-label={`Số lượng ${product.name} tháng ${formatDemandMonth(month.month)}`}
                                    className="cd-qty-input"
                                  />
                                  <span className="cd-qty-unit">
                                    {product.inputUnit === "CARTON"
                                      ? "thùng"
                                      : (product.unit ?? "đv")}
                                  </span>
                                </div>
                                {product.inputUnit === "CARTON" && qty > 0 && (
                                  <div className="mt-1 text-[10px] text-[#1a5f6a]">
                                    ={" "}
                                    {formatDemandQty(
                                      qty * Number(product.conversionValue || 0)
                                    )}{" "}
                                    {product.unit ?? "đv"}
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DemandModalShell>
  );
}

export function CustomerDemandFormModal({ open, demand, onClose }: Props) {
  if (!open) return null;
  return (
    <CustomerDemandFormBody
      key={demand?.id ?? "new"}
      demand={demand}
      onClose={onClose}
    />
  );
}
