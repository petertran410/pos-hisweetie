"use client";

import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  CircleDollarSign,
  Factory,
  FileDown,
  Layers3,
  Loader2,
  PackagePlus,
  Save,
  Send,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { productsApi, type Product } from "@/lib/api/products";
import { productionsApi, type Production } from "@/lib/api/productions";
import {
  manufacturersApi,
  materialTotal,
  type ManufacturerMaterial,
  type OwnMaterial,
} from "@/lib/api/manufacturers";
import { useBranches } from "@/lib/hooks/useBranches";
import { usePermission } from "@/lib/hooks/usePermissions";
import { NumericInput } from "@/components/ui/NumericInput";
import { PartnerPicker, ProductPicker } from "./ProductionPickers";
import {
  ManufacturerMaterialsEditor,
  numericClass,
} from "./ManufacturerMaterialsEditor";

type OwnDraft = OwnMaterial & {
  name: string;
  code: string;
  product?: Product;
};

const fieldClass =
  "w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:cursor-not-allowed disabled:bg-gray-50";
const labelClass = "block min-w-0 text-sm font-medium text-gray-600";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

const currencyText = (value: number, currency: "VND" | "CNY") =>
  `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ${currency}`;
const vndText = (value: number) =>
  `${Math.round(value).toLocaleString("vi-VN")} đ`;

type ExternalFormProps = {
  sourceBranchId: number;
  destinationBranchId: number;
  production?: Production | null;
  onClose: () => void;
};

export function ExternalProductionForm(props: ExternalFormProps) {
  const detail = useQuery({
    queryKey: ["productions", props.production?.id],
    queryFn: () => productionsApi.getById(props.production!.id),
    enabled: !!props.production?.id,
  });

  if (props.production && !detail.data) {
    return createPortal(
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tải phiếu gửi sản xuất"
          className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 text-sm text-gray-700">
            <div className="flex items-center gap-3">
              {!detail.isError && (
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
              )}
              <p>
                {detail.isError
                  ? "Không tải được chi tiết phiếu"
                  : "Đang tải phiếu…"}
              </p>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              title="Đóng"
              aria-label="Đóng"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <ExternalProductionFormContent
      {...props}
      production={detail.data ?? props.production}
    />
  );
}

function ExternalProductionFormContent({
  sourceBranchId,
  destinationBranchId,
  production,
  onClose,
}: ExternalFormProps) {
  const titleId = useId();
  const queryClient = useQueryClient();
  const canCreateTemplate = usePermission("productions", "create");
  const canUpdateTemplate = usePermission("productions", "update");
  const [draftId, setDraftId] = useState(production?.id);
  const [manufacturerId, setManufacturerId] = useState<number | null>(
    production?.manufacturerId ?? null,
  );
  const [productId, setProductId] = useState<number | null>(
    production?.productId ?? null,
  );
  const [quantity, setQuantity] = useState(Number(production?.quantity ?? 1));
  const [source, setSource] = useState(sourceBranchId);
  const [dest, setDest] = useState(destinationBranchId);
  const [own, setOwn] = useState<OwnDraft[]>(() =>
    (production?.components ?? []).map((line) => ({
      productId: line.componentProductId,
      quantity: Number(line.actualGrams),
      unit: line.unit ?? "unit",
      name: line.componentName,
      code: line.componentCode,
    })),
  );
  const [supplied, setSupplied] = useState<ManufacturerMaterial[]>(() =>
    (production?.manufacturerMaterials ?? []).map((line) => ({
      productId: line.productId,
      description: line.description,
      pricingMode: line.pricingMode,
      quantity: line.quantity == null ? null : Number(line.quantity),
      unit: line.unit,
      unitPrice: Number(line.unitPrice),
      amount: Number(line.amount),
    })),
  );
  const [currency, setCurrency] = useState<"VND" | "CNY">(
    production?.feeCurrency ?? "VND",
  );
  const [rate, setRate] = useState(
    Number(production?.feeExchangeRate ?? 1),
  );
  const [fee, setFee] = useState(
    Number(
      production?.feeCurrency === "CNY"
        ? production.feeForeignAmount
        : (production?.processingFee ?? 0),
    ),
  );
  const [note, setNote] = useState(production?.note ?? "");
  const [code, setCode] = useState(production?.code ?? "");
  const [templateId, setTemplateId] = useState<number | null>(
    production?.externalTemplateId ?? null,
  );
  const [templateName, setTemplateName] = useState(
    production?.externalTemplateName ?? "",
  );
  const [formulaId, setFormulaId] = useState("");

  const product = useQuery({
    queryKey: ["products", productId],
    queryFn: () => productsApi.getProduct(productId!),
    enabled: !!productId,
  });
  const templates = useQuery({
    queryKey: ["manufacturer-templates", manufacturerId, productId],
    queryFn: () => manufacturersApi.templates(manufacturerId!, productId!),
    enabled: !!manufacturerId && !!productId,
  });
  const manufacturer = useQuery({
    queryKey: ["manufacturer", manufacturerId],
    queryFn: () => manufacturersApi.get(manufacturerId!),
    enabled: !!manufacturerId,
  });
  const { data: branches } = useBranches();
  const activeBranches = branches?.filter((branch) => branch.isActive) ?? [];
  const locked = !!production && production.status !== 1;

  const changeQuantity = (next: number) => {
    if (templateId && quantity > 0) {
      const scale = next / quantity;
      setOwn(
        own.map((line) => ({
          ...line,
          quantity: Math.round(line.quantity * scale * 10000) / 10000,
        })),
      );
      setSupplied(
        supplied.map((line) => ({
          ...line,
          quantity:
            line.quantity == null
              ? null
              : Math.round(Number(line.quantity) * scale * 10000) / 10000,
        })),
      );
    }
    setQuantity(next);
  };

  const payload = () => ({
    code: code || undefined,
    isExternal: true,
    manufacturerId: manufacturerId!,
    productId: productId!,
    sourceBranchId: source,
    destinationBranchId: dest,
    quantity,
    ownMaterials: own.map(({ productId, quantity, unit }) => ({
      productId,
      quantity,
      unit,
    })),
    manufacturerMaterials: supplied,
    feeCurrency: currency,
    note,
    processingFee: currency === "VND" ? fee : undefined,
    feeForeignAmount: currency === "CNY" ? fee : undefined,
    feeExchangeRate: currency === "CNY" ? rate : undefined,
    externalTemplateId: templateId,
  });

  const save = useMutation({
    mutationFn: async (send: boolean) => {
      if (!manufacturerId || !productId || !(quantity > 0)) {
        throw new Error(
          "Chọn nhà sản xuất, thành phẩm và sản lượng hợp lệ",
        );
      }
      if (send && !confirm("Gửi nguyên liệu và khóa phiếu để sản xuất?")) {
        return false;
      }
      const saved = draftId
        ? await productionsApi.update(draftId, payload())
        : await productionsApi.create(payload());
      setDraftId(saved.id);
      if (send) await productionsApi.send(saved.id, {});
      return true;
    },
    onSuccess: (saved) => {
      if (!saved) return;
      for (const key of [
        "productions",
        "products",
        "manufacturers",
        "manufacturer-accounts",
        "suppliers",
        "supplier-debt-timeline",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast.success("Đã lưu phiếu gửi sản xuất");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const templateSave = useMutation({
    mutationFn: async (update: boolean) => {
      if (
        !manufacturerId ||
        !productId ||
        !templateName.trim() ||
        !(quantity > 0)
      ) {
        throw new Error(
          "Nhập tên mẫu, nhà sản xuất, thành phẩm và sản lượng cơ sở",
        );
      }
      const data = payload();
      return manufacturersApi.saveTemplate(
        {
          name: templateName,
          manufacturerId,
          productId,
          baseQuantity: quantity,
          currency,
          processingFee: fee,
          exchangeRate: rate,
          ownMaterials: data.ownMaterials,
          manufacturerMaterials: supplied,
        },
        update ? (templateId ?? undefined) : undefined,
      );
    },
    onSuccess: (saved) => {
      setTemplateId(saved.id);
      queryClient.invalidateQueries({
        queryKey: ["manufacturer-templates"],
      });
      toast.success("Đã lưu mẫu");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const loadTemplate = async (id: string) => {
    const template = templates.data?.find((item) => item.id === Number(id));
    if (!template) {
      setTemplateId(null);
      return;
    }
    const scale = quantity / Number(template.baseQuantity);
    const rows = await Promise.all(
      template.lines
        .filter((line) => line.source === "OWN")
        .map(async (line) => {
          const item = await productsApi.getProduct(line.productId!);
          return {
            productId: item.id,
            code: item.code,
            name: item.name,
            product: item,
            unit: line.unit || item.unit || "unit",
            quantity: Number(line.quantity) * scale,
          };
        }),
    );
    setOwn(rows);
    setSupplied(
      template.lines
        .filter((line) => line.source === "MANUFACTURER")
        .map((line) => ({
          productId: line.productId,
          description: line.description,
          pricingMode: line.pricingMode,
          quantity:
            line.quantity == null ? null : Number(line.quantity) * scale,
          unit: line.unit,
          unitPrice: Number(line.unitPrice),
          amount: Number(line.amount),
        })),
    );
    setTemplateId(template.id);
    setTemplateName(template.name);
    setCurrency(template.currency);
    setRate(Number(template.exchangeRate));
    setFee(Number(template.processingFee));
  };

  const loadFormula = () => {
    const formula =
      product.data?.formulas?.find(
        (item) => String(item.id) === formulaId,
      ) ?? product.data?.formulas?.find((item) => item.isDefault);
    const lines = formula?.components ?? product.data?.comboComponents ?? [];
    setOwn(
      lines.map((line) => ({
        productId: line.componentProductId,
        code: line.componentProduct.code,
        name: line.componentProduct.name,
        product: line.componentProduct,
        quantity: Number(line.quantity) * quantity,
        unit:
          line.inputMode === "piece" || line.inputMode === "carton"
            ? line.componentProduct.unit || "unit"
            : "g",
      })),
    );
  };

  const suppliedTotal = supplied.reduce(
    (sum, line) => sum + materialTotal(line),
    0,
  );
  const payable =
    currency === "CNY"
      ? Math.round((suppliedTotal + fee) * rate)
      : suppliedTotal + fee;
  const hasProductFormula =
    !!product.data &&
    (!!product.data.formulas?.length ||
      !!product.data.comboComponents?.length);
  const supplierLabel = manufacturer.data?.supplier?.name
    ? manufacturer.data.supplier.name
    : "Thanh toán riêng tại nhà sản xuất";
  const title = production
    ? code || "Phiếu gửi sản xuất"
    : "Gửi sản phẩm đi sản xuất";

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-[calc(100dvh/0.85)] w-full max-w-[1440px] flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[96dvh] sm:rounded-lg sm:border sm:border-gray-200"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/15 bg-brand-soft text-brand">
              <Factory size={20} />
            </div>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="truncate text-base font-semibold text-gray-900 sm:text-lg"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {locked
                  ? "Phiếu đã khóa, chỉ có thể xem"
                  : draftId
                    ? "Phiếu tạm, có thể tiếp tục chỉnh sửa"
                    : "Phiếu mới"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={save.isPending}
            title="Đóng"
            aria-label="Đóng"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <fieldset
            disabled={locked || save.isPending || templateSave.isPending}
            className="min-w-0 px-4 py-5 disabled:opacity-75 sm:px-6"
          >
            <section aria-labelledby={`${titleId}-general`}>
              <div className="mb-4 flex items-center gap-2">
                <Building2 size={17} className="text-brand" />
                <h3
                  id={`${titleId}-general`}
                  className="text-sm font-semibold text-gray-800"
                >
                  Thông tin phiếu
                </h3>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
                <label className={`${labelClass} lg:col-span-3`}>
                  <span className="mb-1.5 block">
                    Nhà sản xuất <span className="text-red-500">*</span>
                  </span>
                  <PartnerPicker
                    manufacturer
                    label="Chọn nhà sản xuất"
                    value={manufacturerId}
                    onChange={(id) => {
                      setManufacturerId(id);
                      setTemplateId(null);
                      if (id) {
                        manufacturersApi
                          .get(id)
                          .then((row) => setCurrency(row.currency))
                          .catch((error: Error) =>
                            toast.error(error.message),
                          );
                      }
                    }}
                  />
                </label>
                <label className={`${labelClass} lg:col-span-5`}>
                  <span className="mb-1.5 block">
                    Thành phẩm nhận về{" "}
                    <span className="text-red-500">*</span>
                  </span>
                  <ProductPicker
                    value={productId}
                    label="Chọn thành phẩm nhận về"
                    onChange={(value) => {
                      setProductId(value.id);
                      setTemplateId(null);
                    }}
                  />
                </label>
                <label className={`${labelClass} lg:col-span-2`}>
                  <span className="mb-1.5 block">
                    Sản lượng dự kiến{" "}
                    <span className="text-red-500">*</span>
                  </span>
                  <NumericInput
                    className={numericClass}
                    value={quantity}
                    onValueChange={changeQuantity}
                    maxFractionDigits={4}
                    formatWhileTyping
                  />
                </label>
                <label className={`${labelClass} lg:col-span-2`}>
                  <span className="mb-1.5 block">Mã phiếu</span>
                  <input
                    className={fieldClass}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Tự động"
                  />
                </label>
                <label className={`${labelClass} lg:col-span-3`}>
                  <span className="mb-1.5 block">Kho gửi</span>
                  <select
                    className={fieldClass}
                    value={source}
                    onChange={(event) => setSource(Number(event.target.value))}
                  >
                    {activeBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="hidden items-end justify-center pb-3 text-gray-300 lg:flex lg:col-span-1">
                  <ArrowRight size={20} />
                </div>
                <label className={`${labelClass} lg:col-span-3`}>
                  <span className="mb-1.5 block">Kho nhận</span>
                  <select
                    className={fieldClass}
                    value={dest}
                    onChange={(event) => setDest(Number(event.target.value))}
                  >
                    {activeBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 lg:col-span-5">
                  <Warehouse
                    size={18}
                    className="shrink-0 text-gray-400"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">
                      Đơn vị ghi nhận công nợ
                    </p>
                    <p className="truncate text-sm font-medium text-gray-700">
                      {supplierLabel}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section
              aria-labelledby={`${titleId}-recipe`}
              className="mt-6 border-t border-gray-100 pt-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <Layers3 size={17} className="text-brand" />
                <h3
                  id={`${titleId}-recipe`}
                  className="text-sm font-semibold text-gray-800"
                >
                  Mẫu & công thức
                </h3>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
                <label className={`${labelClass} xl:col-span-3`}>
                  <span className="mb-1.5 block">Mẫu phối trộn</span>
                  <select
                    className={fieldClass}
                    value={templateId ?? ""}
                    onChange={(event) => {
                      loadTemplate(event.target.value).catch((error: Error) =>
                        toast.error(error.message),
                      );
                    }}
                  >
                    <option value="">Không chọn mẫu</option>
                    {templates.data?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${labelClass} xl:col-span-3`}>
                  <span className="mb-1.5 block">Tên mẫu</span>
                  <input
                    className={fieldClass}
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    placeholder="Nhập tên khi cần lưu mẫu"
                  />
                </label>
                <div className="flex flex-wrap items-end gap-2 xl:col-span-3">
                  {canCreateTemplate && (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => templateSave.mutate(false)}
                    >
                      <Save size={15} />
                      Lưu mẫu mới
                    </button>
                  )}
                  {!!templateId && canUpdateTemplate && (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => templateSave.mutate(true)}
                    >
                      <Save size={15} />
                      Cập nhật mẫu
                    </button>
                  )}
                </div>
                {hasProductFormula && (
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 md:col-span-2 xl:col-span-3">
                    <label className={labelClass}>
                      <span className="mb-1.5 block">Công thức sản phẩm</span>
                      <select
                        aria-label="Công thức sản phẩm"
                        className={fieldClass}
                        value={formulaId}
                        onChange={(event) => setFormulaId(event.target.value)}
                      >
                        <option value="">Công thức mặc định</option>
                        {product.data?.formulas?.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={loadFormula}
                    >
                      <FileDown size={15} />
                      Nạp
                    </button>
                  </div>
                )}
              </div>
            </section>

            <div className="mt-6 grid min-w-0 gap-6 border-t border-gray-100 pt-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="min-w-0 space-y-6">
                <section
                  aria-labelledby={`${titleId}-own-materials`}
                  className="min-w-0"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <PackagePlus size={17} className="text-brand" />
                      <h3
                        id={`${titleId}-own-materials`}
                        className="text-sm font-semibold text-gray-800"
                      >
                        Hàng mình gửi
                      </h3>
                      <span className="text-xs text-gray-400">
                        {own.length} dòng
                      </span>
                    </div>
                    <div className="w-full sm:w-80">
                      <ProductPicker
                        label="Thêm hàng mình gửi"
                        branchId={source}
                        onChange={(item) => {
                          if (
                            own.some((line) => line.productId === item.id)
                          ) {
                            toast.error("Mã hàng đã có trong phiếu");
                            return;
                          }
                          setOwn([
                            ...own,
                            {
                              productId: item.id,
                              product: item,
                              code: item.code,
                              name: item.name,
                              quantity: 1,
                              unit: item.unit || "unit",
                            },
                          ]);
                        }}
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                        <tr>
                          <th className="px-3 py-2.5">Sản phẩm</th>
                          <th className="w-36 px-3 py-2.5">Lượng gửi</th>
                          <th className="w-32 px-3 py-2.5">Đơn vị</th>
                          <th className="w-28 px-3 py-2.5 text-right">
                            Tồn kho
                          </th>
                          <th className="w-12" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {own.map((line, index) => (
                          <tr
                            key={line.productId}
                            className="align-middle hover:bg-gray-50/70"
                          >
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-gray-800">
                                {line.name}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-gray-400">
                                {line.code}
                              </p>
                            </td>
                            <td className="px-3 py-2.5">
                              <NumericInput
                                className={numericClass}
                                value={line.quantity}
                                maxFractionDigits={4}
                                formatWhileTyping
                                onValueChange={(nextQuantity) =>
                                  setOwn(
                                    own.map((item, position) =>
                                      position === index
                                        ? {
                                            ...item,
                                            quantity: nextQuantity,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <select
                                aria-label={`Đơn vị ${line.code}`}
                                className={fieldClass}
                                value={line.unit}
                                onChange={(event) =>
                                  setOwn(
                                    own.map((item, position) =>
                                      position === index
                                        ? {
                                            ...item,
                                            unit: event.target.value,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              >
                                {[
                                  ...new Set([
                                    line.unit,
                                    line.product?.unit || "unit",
                                    ...(line.product?.weight
                                      ? ["g", "kg"]
                                      : []),
                                  ]),
                                ].map((unit) => (
                                  <option key={unit} value={unit}>
                                    {unit}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-gray-600">
                              {line.product?.inventories
                                ?.find(
                                  (inventory) =>
                                    inventory.branchId === source,
                                )
                                ?.onHand?.toLocaleString("vi-VN") ?? "-"}
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <button
                                type="button"
                                title="Xóa nguyên liệu gửi"
                                aria-label={`Xóa ${line.code}`}
                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                onClick={() =>
                                  setOwn(
                                    own.filter(
                                      (_, position) => position !== index,
                                    ),
                                  )
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!own.length && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-10 text-center"
                            >
                              <div className="sticky left-0 w-[calc(100vw-2rem)] sm:w-auto">
                                <Boxes
                                  size={24}
                                  className="mx-auto mb-2 text-gray-300"
                                />
                                <p className="text-sm text-gray-400">
                                  Chưa có hàng mình gửi
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <ManufacturerMaterialsEditor
                  value={supplied}
                  onChange={setSupplied}
                  currency={currency}
                />
              </div>

              <aside className="min-w-0 self-start border-t border-gray-100 pt-5 lg:sticky lg:top-0 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <section aria-labelledby={`${titleId}-cost`}>
                  <div className="mb-4 flex items-center gap-2">
                    <CircleDollarSign size={17} className="text-brand" />
                    <h3
                      id={`${titleId}-cost`}
                      className="text-sm font-semibold text-gray-800"
                    >
                      Chi phí dự kiến
                    </h3>
                  </div>

                  <fieldset>
                    <legend className="mb-1.5 text-sm font-medium text-gray-600">
                      Tiền tệ
                    </legend>
                    <div className="grid h-11 grid-cols-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
                      {(["VND", "CNY"] as const).map((option) => (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center justify-center rounded-md text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-brand ${
                            currency === option
                              ? "bg-white text-brand-dark shadow-sm ring-1 ring-gray-200"
                              : "text-gray-500"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`${titleId}-currency`}
                            className="sr-only"
                            checked={currency === option}
                            onChange={() => setCurrency(option)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className={`${labelClass} mt-4`}>
                    <span className="mb-1.5 block">Phí gia công cả lô</span>
                    <NumericInput
                      className={numericClass}
                      value={fee}
                      onValueChange={setFee}
                      maxFractionDigits={2}
                      formatWhileTyping
                    />
                  </label>
                  {currency === "CNY" && (
                    <label className={`${labelClass} mt-4`}>
                      <span className="mb-1.5 block">Tỷ giá CNY/VND</span>
                      <NumericInput
                        className={numericClass}
                        value={rate}
                        onValueChange={setRate}
                        maxFractionDigits={6}
                        formatWhileTyping
                      />
                    </label>
                  )}

                  <dl className="mt-5 divide-y divide-gray-100 border-y border-gray-100 text-sm">
                    <div className="flex items-center justify-between gap-3 py-3">
                      <dt className="text-gray-500">NSX bổ sung</dt>
                      <dd className="font-medium text-gray-700">
                        {currencyText(suppliedTotal, currency)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-3">
                      <dt className="text-gray-500">Phí gia công</dt>
                      <dd className="font-medium text-gray-700">
                        {currencyText(fee, currency)}
                      </dd>
                    </div>
                    {currency === "CNY" && (
                      <div className="flex items-center justify-between gap-3 py-3">
                        <dt className="text-gray-500">Tỷ giá</dt>
                        <dd className="font-medium text-gray-700">
                          {rate.toLocaleString("vi-VN")}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-end justify-between gap-3 py-4">
                      <dt className="font-medium text-gray-700">
                        Dự kiến phải trả
                      </dt>
                      <dd className="text-lg font-semibold text-red-700">
                        {vndText(payable)}
                      </dd>
                    </div>
                  </dl>
                </section>

                <label className={`${labelClass} mt-5`}>
                  <span className="mb-1.5 block">Ghi chú</span>
                  <textarea
                    className={`${fieldClass} min-h-28 resize-y font-normal`}
                    rows={4}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ghi chú cho phiếu gửi sản xuất"
                  />
                </label>
              </aside>
            </div>
          </fieldset>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/san-pham/nha-san-xuat"
            className="hidden items-center justify-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark sm:inline-flex sm:justify-start"
          >
            <Factory size={15} />
            Nhà sản xuất
            <ArrowUpRight size={14} />
          </Link>
          <div
            className={`grid w-full gap-2 sm:flex sm:w-auto ${
              locked ? "grid-cols-1" : "grid-cols-3"
            }`}
          >
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={onClose}
              disabled={save.isPending}
            >
              Đóng
            </button>
            {!locked && (
              <>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={save.isPending}
                  onClick={() => save.mutate(false)}
                >
                  <Save size={15} />
                  Lưu tạm
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={save.isPending}
                  onClick={() => save.mutate(true)}
                >
                  {save.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  {save.isPending ? "Đang lưu…" : "Gửi sản xuất"}
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
