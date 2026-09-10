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
  CustomerDemandUnit,
} from "@/lib/types/customer-demand";

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
  status?: string;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

function formatMonthLabel(value: string) {
  const [year, month] = (value || "").split("-");
  if (!year || !month) return value || "—";
  return `${month}/${year}`;
}

function firstUnitForProduct(
  months: Array<{ lines: Array<{ productId: number; unit?: CustomerDemandUnit; inputUnit?: CustomerDemandUnit }> }>,
  productId: number
): CustomerDemandUnit {
  for (const month of months) {
    const line = month.lines.find((item) => item.productId === productId);
    const unit = line?.unit ?? line?.inputUnit;
    if (unit === "CARTON" || unit === "BASE") return unit;
  }
  return "BASE";
}

export function CustomerDemandFormModal({ open, demand, onClose }: Props) {
  const createDemand = useCreateCustomerDemand();
  const updateDemand = useUpdateCustomerDemand();
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerLabel, setCustomerLabel] = useState("");
  const [note, setNote] = useState("");
  const [months, setMonths] = useState<FormMonth[]>([]);
  const [matrixProducts, setMatrixProducts] = useState<FormProduct[]>([]);
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
    open && customerQueryDebounced.length >= 2
      ? customerQueryDebounced
      : undefined
  );
  const { data: productsRes } = useProducts(
    { search: productQueryDebounced, limit: 10, isActive: true },
    { enabled: open && productQueryDebounced.length >= 2 }
  );
  const customerResults = customersRes ?? [];
  const productResults = productsRes?.data ?? [];

  useEffect(() => {
    if (!open) return;
    if (!demand) {
      setCustomerId(null);
      setCustomerLabel("");
      setCustomerQuery("");
      setNote("");
      setMonths([{ month: currentMonth(), lines: [] }]);
      setMatrixProducts([]);
      setProductQuery("");
      return;
    }
    setCustomerId(demand.customer.id);
    setCustomerLabel(
      `${demand.customer.code ? `${demand.customer.code} · ` : ""}${demand.customer.name}`
    );
    setCustomerQuery("");
    setNote(demand.note ?? "");
    const nextMonths = demand.months
      .filter((month) => month.status !== "CANCELLED")
      .map((month) => ({
        id: month.id,
        month: month.month,
        status: month.status,
        lines: (month.lines ?? []).map((line) => ({
          productId: line.productId,
          quantity:
            line.inputQuantity == null ? "" : String(line.inputQuantity),
        })),
        changeNote: "",
      }));
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
    setMonths(nextMonths);
    setMatrixProducts(
      [...productMap.values()].sort((a, b) => a.name.localeCompare(b.name))
    );
    setProductQuery("");
  }, [open, demand]);

  const products = matrixProducts;

  if (!open) return null;

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
      <div className="flex h-[92vh] max-h-[96vh] w-full max-w-[92rem] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {demand
                ? "Chỉnh sửa Demand khách hàng"
                : "Tạo Demand khách hàng (OEM/đặt hộ)"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Demand chỉ phục vụ dự kiến đặt hàng; không tạo Order, hóa đơn,
              công nợ hoặc giữ tồn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid shrink-0 gap-4 border-b px-5 py-3 md:grid-cols-[1fr_1fr]">
          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Khách hàng *
            </label>
            <input
              value={customerId ? customerLabel : customerQuery}
              onChange={(event) => {
                setCustomerId(null);
                setCustomerLabel("");
                setCustomerQuery(event.target.value);
              }}
              placeholder="Tìm mã hoặc tên khách hàng"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            {!customerId && customerQueryDebounced.length >= 2 && (
              <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded border bg-white shadow-lg">
                {customerResults.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      setCustomerId(customer.id);
                      setCustomerLabel(
                        `${customer.code ? `${customer.code} · ` : ""}${customer.name}`
                      );
                      setCustomerQuery("");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                    {customer.code ? `${customer.code} · ` : ""}
                    {customer.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Ghi chú chung
            </label>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ví dụ: OEM nhãn riêng, khách nhờ đặt hộ"
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-3">
          <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">
                Sản phẩm và tháng cần hàng
              </h3>
              <p className="text-xs text-gray-500">
                Ô tháng chỉ nhập số lượng. Đơn vị chọn một lần theo từng sản
                phẩm.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyPreviousMonth}
                className="flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs hover:bg-gray-50">
                <Copy className="h-3.5 w-3.5" />
                Sao chép tháng trước
              </button>
              <button
                type="button"
                onClick={() => addMonth()}
                className="bg-brand flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-white">
                <Plus className="h-3.5 w-3.5" />
                Thêm tháng
              </button>
            </div>
          </div>

          <div className="relative mb-3 shrink-0">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="Tìm sản phẩm để thêm vào ma trận"
              className="w-full rounded border py-2 pr-3 pl-8 text-sm"
            />
            {productQueryDebounced.length >= 2 && (
              <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded border bg-white shadow-lg">
                {productResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                    {product.code} · {product.name}{" "}
                    {product.conversionValue ? (
                      <span className="text-xs text-gray-400">
                        ({product.conversionValue} {product.unit ?? "đv"}
                        /thùng)
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-30 min-w-64 border-b border-r bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600">
                    Sản phẩm
                  </th>
                  {months.map((month, index) => (
                    <th
                      key={`${month.id ?? "new"}-${index}`}
                      className="sticky top-0 z-20 min-w-32 border-b bg-gray-50 px-2 py-2 text-left align-top">
                      <div className="flex items-center gap-1">
                        <label className="relative min-w-0 flex-1 cursor-pointer">
                          <span className="block truncate text-sm font-semibold text-gray-900">
                            {formatMonthLabel(month.month)}
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
                              className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                      </div>
                      {month.status && (
                        <div className="mt-0.5 text-[10px] text-gray-500">
                          {month.status === "CONFIRMED"
                            ? "Đã xác nhận"
                            : month.status === "CANCELLED"
                              ? "Đã hủy"
                              : "Nháp"}
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
                          className="mt-1 w-full rounded border px-1.5 py-1 text-[11px]"
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
                      className="px-3 py-10 text-center text-sm text-gray-400">
                      Tìm và thêm ít nhất một sản phẩm.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50/60">
                      <td className="sticky left-0 z-10 min-w-64 border-b border-r bg-white px-3 py-2 align-top">
                        <div className="font-medium text-gray-900">
                          {product.code} · {product.name}
                        </div>
                        <div className="mt-0.5 text-[11px] text-gray-500">
                          {Number(
                            product.conversionValue ?? 1
                          ).toLocaleString("vi-VN")}{" "}
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
                            className="rounded border bg-white px-1.5 py-1 text-xs">
                            <option value="BASE">
                              {product.unit ?? "Đơn vị"}
                            </option>
                            <option value="CARTON">Thùng</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeProduct(product.id)}
                            className="text-[11px] text-red-600 hover:underline">
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
                            className="border-b px-2 py-2 align-top">
                            {month.status === "CANCELLED" ? (
                              <span className="text-gray-400">Đã hủy</span>
                            ) : (
                              <>
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
                                  placeholder="—"
                                  className="w-full rounded border px-2 py-1.5 text-right text-sm"
                                />
                                {product.inputUnit === "CARTON" && qty > 0 && (
                                  <div className="mt-1 text-[10px] text-teal-700">
                                    ={" "}
                                    {(
                                      qty * Number(product.conversionValue || 0)
                                    ).toLocaleString("vi-VN")}{" "}
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

        <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
            Đóng
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="bg-brand flex items-center gap-1.5 rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {demand ? "Lưu thay đổi" : "Tạo phiếu nháp"}
          </button>
        </div>
      </div>
    </div>
  );
}
