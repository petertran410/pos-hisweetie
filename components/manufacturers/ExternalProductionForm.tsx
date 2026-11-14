"use client";

import { useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  CircleDollarSign,
  Factory,
  FileDown,
  Info,
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
import {
  productsApi,
  type Product,
  type ProductFormula,
} from "@/lib/api/products";
import { productionsApi, type Production } from "@/lib/api/productions";
import {
  manufacturersApi,
  materialFromRow,
  materialPayload,
  materialTotal,
  type ManufacturerMaterial,
  type OwnMaterial,
} from "@/lib/api/manufacturers";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  normalizeNsxUnit,
  round2,
  round4,
  scaleNsxQuantity,
  type NsxUnit,
} from "@/lib/utils/nsx-pricing";
import { NumericInput } from "@/components/ui/NumericInput";
import { formatNumber } from "@/lib/utils";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
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

// Cùng chiều cao 42px với ô tìm sản phẩm / ô số / ô ngày (ô chọn mặc định thấp hơn 1px).
const fieldClass =
  "h-[42px] w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:cursor-not-allowed disabled:bg-gray-50";
const labelClass = "block min-w-0 text-sm font-medium text-gray-600";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

// Cùng kiểu phân cách (dấu phẩy) với ô nhập số.
const currencyText = (value: number, currency: "VND" | "CNY") =>
  `${formatNumber(value)} ${currency}`;
const vndText = (value: number) => `${formatNumber(Math.round(value))} đ`;
const plain = (value: number, digits: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: digits });
const stockText = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });

/** Gram của 1 đơn vị kho (thiếu weightUnit coi là gram — cùng quy tắc backend). */
const gramsPerStockUnit = (product?: Product) =>
  Number(product?.weight ?? 0) * (product?.weightUnit === "kg" ? 1000 : 1);

/** Hệ số đổi lượng gửi sang đơn vị kho — cùng quy tắc ownConversion ở backend. */
const stockFactor = (product: Product | undefined, unit: string) => {
  if (!product) return null;
  if (unit === product.unit || unit === "unit") return 1;
  const grams = gramsPerStockUnit(product);
  if (grams > 0 && (unit === "g" || unit === "kg"))
    return (unit === "kg" ? 1000 : 1) / grams;
  return null;
};

/**
 * Hàng có khối lượng (vd thùng 20 kg) gửi theo gram như công thức; hàng
 * không có khối lượng / tính theo chiếc thì theo đơn vị kho.
 */
const defaultOwnUnit = (product: Product) =>
  !product.isPieceUnit && gramsPerStockUnit(product) > 0
    ? "g"
    : product.unit || "unit";
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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
    (production?.manufacturerMaterials ?? []).map(materialFromRow),
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
  // Công thức gửi đi đã nạp (null = nhập tay). Phí / 1 sp chỉ biết khi vừa nạp
  // công thức trong phiên này — dùng để tính lại phí khi đổi sản lượng.
  const [formulaId, setFormulaId] = useState<number | null>(
    production?.formulaId ?? null,
  );
  const [feePerUnit, setFeePerUnit] = useState<number | null>(null);
  // Ngày gửi = ngày ghi trừ tồn hàng mình gửi. Phiếu mới / phiếu tạm mặc định
  // hôm nay, chọn lùi được khi hàng đã gửi đi trước lúc làm phiếu.
  const [sentDate, setSentDate] = useState(
    localDate(production?.sentDate ? new Date(production.sentDate) : new Date()),
  );

  const product = useQuery({
    queryKey: ["products", productId],
    queryFn: () => productsApi.getProduct(productId!),
    enabled: !!productId,
  });
  const manufacturer = useQuery({
    queryKey: ["manufacturer", manufacturerId],
    queryFn: () => manufacturersApi.get(manufacturerId!),
    enabled: !!manufacturerId,
  });
  const { data: branches } = useBranches();
  const activeBranches = branches?.filter((branch) => branch.isActive) ?? [];
  // Phiếu đã gửi / nhận một phần / hoàn thành vẫn sửa được (server ghi lại
  // tồn nguyên liệu, giá thành dự kiến); chỉ phiếu đã hủy là chỉ xem.
  const locked = !!production && production.status === 3;
  const sent = !!production && [2, 4, 5].includes(production.status);
  const hasReceipts =
    !!production?.receipts?.some((item) => item.status === 1) ||
    (production?.status === 2 && production.receivedQuantity != null);
  // Phiếu đã gửi thì tồn đã trừ rồi — chỉ so tồn với phiếu mới / phiếu tạm.
  const checkStock = !production || production.status === 1;
  // Dòng nạp từ phiếu đã lưu chưa có thông tin sản phẩm (đơn vị, khối lượng, tồn).
  const ownProducts = useQueries({
    queries: own
      .filter((line) => !line.product)
      .map((line) => ({
        queryKey: ["products", line.productId],
        queryFn: () => productsApi.getProduct(line.productId),
        staleTime: 60_000,
      })),
  });
  const productOf = (line: OwnDraft) =>
    line.product ??
    ownProducts.find((query) => query.data?.id === line.productId)?.data;

  // Phiếu theo công thức (hoặc phiếu cũ từ mẫu phối trộn): đổi sản lượng thì co
  // giãn hàng mình, nguyên liệu NSX theo lượng và phí gia công (nếu biết phí/sp).
  const changeQuantity = (next: number) => {
    if ((formulaId || production?.externalTemplateId) && quantity > 0 && next > 0) {
      const scale = next / quantity;
      setOwn(
        own.map((line) => ({
          ...line,
          quantity: round4(line.quantity * scale),
        })),
      );
      setSupplied(
        supplied.map((line) => ({
          ...line,
          quantity:
            line.quantity == null || line.pricingMode === "TOTAL"
              ? line.quantity
              : round4(Number(line.quantity) * scale),
        })),
      );
      if (formulaId && feePerUnit != null) setFee(round2(feePerUnit * next));
    }
    setQuantity(next);
  };

  // Ngày → thời điểm gửi: giữ giờ gửi cũ nếu không đổi ngày; ngày khác lấy giờ
  // hiện tại (hôm nay thì đúng bằng lúc bấm gửi).
  const sentDateIso = () => {
    if (!sentDate) return undefined;
    const original = production?.sentDate ? new Date(production.sentDate) : null;
    if (original && localDate(original) === sentDate) return original.toISOString();
    const next = new Date(`${sentDate}T00:00:00`);
    const now = new Date();
    next.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    return next.toISOString();
  };
  // Phiếu đã gửi: sửa ngày gửi qua lưu phiếu. Phiếu tạm: ngày dùng khi bấm gửi.
  const sentDatePayload = () => (sent ? sentDateIso() : undefined);

  const payload = () => ({
    sentDate: sentDatePayload(),
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
    // Map tường minh: server bật forbidNonWhitelisted.
    manufacturerMaterials: supplied.map(materialPayload),
    feeCurrency: currency,
    note,
    processingFee: currency === "VND" ? fee : undefined,
    feeForeignAmount: currency === "CNY" ? fee : undefined,
    feeExchangeRate: currency === "CNY" ? rate : undefined,
    formulaId: formulaId ?? null,
  });

  const save = useMutation({
    mutationFn: async (send: boolean) => {
      if (!manufacturerId || !productId || !(quantity > 0)) {
        throw new Error(
          "Chọn nhà sản xuất, thành phẩm và sản lượng hợp lệ",
        );
      }
      if (
        send &&
        !confirm(
          `Gửi nguyên liệu ngày ${sentDate.split("-").reverse().join("/")}? Hàng mình gửi sẽ trừ tồn kho theo ngày này.`,
        )
      ) {
        return false;
      }
      if (
        sent &&
        !confirm(
          "Lưu thay đổi phiếu đã gửi? Tồn kho nguyên liệu ở kho gửi và giá thành dự kiến sẽ được tính lại.",
        )
      ) {
        return false;
      }
      const saved = draftId
        ? await productionsApi.update(draftId, payload())
        : await productionsApi.create(payload());
      setDraftId(saved.id);
      if (send) await productionsApi.send(saved.id, { sentDate: sentDateIso() });
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
        "production-cost-history",
        "payables",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast.success(
        sent ? "Đã cập nhật phiếu gửi sản xuất" : "Đã lưu phiếu gửi sản xuất",
      );
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Nạp công thức gửi đi: hàng mình, nguyên liệu NSX (× sản lượng), phí gia
  // công (phí/sp × sản lượng) và tiền tệ của công thức.
  const applyFormula = (formula: ProductFormula) => {
    if (
      (own.length || supplied.length) &&
      !confirm(
        `Nạp "${formula.name}" sẽ thay hàng mình gửi, nguyên liệu NSX và phí gia công hiện tại. Tiếp tục?`,
      )
    ) {
      return;
    }
    setOwn(
      formula.components.map((line) => {
        const item = line.componentProduct;
        const piece = line.inputMode === "piece" || line.inputMode === "carton";
        // Cùng quy tắc với ownConversion ở backend: thiếu weightUnit coi là gram.
        const grams =
          Number(item.weight ?? 0) * (item.weightUnit === "kg" ? 1000 : 1);
        return {
          productId: line.componentProductId,
          code: item.code,
          name: item.name,
          product: item,
          quantity: round4(Number(line.quantity) * quantity),
          unit: piece || !(grams > 0) ? item.unit || "unit" : "g",
        };
      }),
    );
    setSupplied(
      (formula.nsxLines ?? []).map((line) => {
        const scaled = scaleNsxQuantity(Number(line.quantity), line.unit, quantity);
        return {
          productId: line.productId,
          productCode: line.product?.code ?? null,
          description: line.product?.name ?? `#${line.productId}`,
          pricingMode: "UNIT_PRICE" as const,
          quantity: scaled.quantity,
          unit: scaled.unit,
          unitPrice: Number(line.unitPrice),
          priceUnit: normalizeNsxUnit(line.priceUnit) as NsxUnit,
          amount: 0,
        };
      }),
    );
    const perUnit = Number(formula.processingFeePerUnit ?? 0);
    setFeePerUnit(perUnit);
    setFee(round2(perUnit * quantity));
    setCurrency(formula.currency === "CNY" ? "CNY" : "VND");
    setFormulaId(formula.id);
  };

  const suppliedTotal = supplied.reduce(
    (sum, line) => sum + materialTotal(line),
    0,
  );
  const payable =
    currency === "CNY"
      ? Math.round((suppliedTotal + fee) * rate)
      : suppliedTotal + fee;
  const externalFormulas =
    product.data?.formulas?.filter((item) => item.isExternal) ?? [];
  const missingFormula =
    !!formulaId && !externalFormulas.some((item) => item.id === formulaId);
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
                  ? "Phiếu đã hủy, chỉ có thể xem"
                  : sent
                    ? "Phiếu đã gửi — sửa sẽ cập nhật tồn kho và giá thành dự kiến"
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
            disabled={locked || save.isPending}
            className="min-w-0 px-4 py-5 disabled:opacity-75 sm:px-6"
          >
            {sent && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p>
                  Phiếu đã gửi: sửa nguyên liệu mình gửi sẽ ghi lại xuất kho tại{" "}
                  <b>{production?.sourceBranchName}</b> (dòng cũ giữ giá vốn lúc gửi).
                  Sửa sản lượng, nguyên liệu NSX hoặc phí sẽ tính lại giá thành dự
                  kiến; các đợt đã nhận không tự đổi tiền.
                </p>
                <p className="mt-1">
                  Giá thành dự kiến hiện tại:{" "}
                  <b>
                    {production?.batchUnitCost != null
                      ? `${formatNumber(production.batchUnitCost)} đ/sp`
                      : "-"}
                  </b>
                  {production?.costAppliedAt &&
                    " · Đã áp giá vốn — nếu giá thành đổi, nút \"Áp dụng giá vốn\" sẽ hiện lại để áp lần nữa."}
                </p>
              </div>
            )}
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
                    disabled={sent}
                    label="Chọn nhà sản xuất"
                    value={manufacturerId}
                    onChange={(id) => {
                      setManufacturerId(id);
                      // Đã nạp công thức thì giữ tiền tệ của công thức.
                      if (id && !formulaId) {
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
                    disabled={sent}
                    label="Chọn thành phẩm nhận về"
                    onChange={(value) => {
                      if (value.id !== productId) {
                        setFormulaId(null);
                        setFeePerUnit(null);
                      }
                      setProductId(value.id);
                    }}
                  />
                </label>
                <label className={`${labelClass} lg:col-span-2`}>
                  <span className="mb-1.5 block">
                    Sản lượng dự kiến{" "}
                    <span className="text-red-500">*</span>
                  </span>
                  <NumericInput
                    className={`${numericClass} h-[42px]`}
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
                    disabled={sent}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Tự động"
                  />
                </label>
                {/* Kho gửi → Kho nhận: một nhóm 6 cột, mũi tên nhỏ ở giữa (không chiếm nguyên cột). */}
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3 lg:col-span-6">
                  <label className={labelClass}>
                    <span className="mb-1.5 block">Kho gửi</span>
                    <select
                      className={fieldClass}
                      value={source}
                      disabled={sent}
                      onChange={(event) => setSource(Number(event.target.value))}
                    >
                      {activeBranches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="hidden items-end justify-center pb-3 text-gray-300 sm:flex">
                    <ArrowRight size={18} />
                  </div>
                  <label className={labelClass}>
                    <span className="mb-1.5 block">Kho nhận</span>
                    <select
                      className={fieldClass}
                      value={dest}
                      disabled={sent}
                      onChange={(event) => setDest(Number(event.target.value))}
                    >
                      {activeBranches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={`${labelClass} lg:col-span-2`}>
                  <span className="mb-1.5 flex items-center gap-1">
                    Ngày gửi
                    <span
                      className="text-gray-400"
                      title="Ngày ghi trừ tồn hàng mình gửi trên thẻ kho. Hàng đã gửi trước lúc làm phiếu thì chọn lùi ngày để tồn kho khớp thực tế."
                    >
                      <Info size={13} />
                    </span>
                  </span>
                  <DatePickerInput
                    value={sentDate}
                    onChange={setSentDate}
                    maxDate={localDate(new Date())}
                    placeholder="Chọn ngày gửi"
                    className="flex h-[42px] w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-left text-sm transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-soft"
                  />
                </div>
                <div className={`${labelClass} lg:col-span-4`}>
                  <span className="mb-1.5 block">Ghi nhận công nợ</span>
                  <div
                    className="flex h-[42px] min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700"
                    title="Đơn vị nhận công nợ của phiếu (theo nhà sản xuất đã chọn)"
                  >
                    <Warehouse size={16} className="shrink-0 text-gray-400" />
                    <span className="truncate">{supplierLabel}</span>
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
                  Công thức gửi sản xuất
                </h3>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,24rem)_auto_minmax(0,1fr)] md:items-end">
                <label className={labelClass}>
                  <span className="mb-1.5 block">Công thức</span>
                  <select
                    aria-label="Công thức gửi sản xuất"
                    className={fieldClass}
                    value={formulaId ?? ""}
                    disabled={!productId}
                    onChange={(event) => {
                      const id = Number(event.target.value);
                      if (!id) {
                        setFormulaId(null);
                        setFeePerUnit(null);
                        return;
                      }
                      const formula = externalFormulas.find((item) => item.id === id);
                      if (formula) applyFormula(formula);
                    }}
                  >
                    <option value="">Nhập tay</option>
                    {missingFormula && (
                      <option value={formulaId!}>
                        {production?.formulaName ?? "Công thức"} (không còn dùng)
                      </option>
                    )}
                    {externalFormulas.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  // Cao bằng ô chọn công thức bên cạnh (42px).
                  className={secondaryButtonClass.replace("h-10", "h-[42px]")}
                  disabled={!formulaId || missingFormula}
                  onClick={() => {
                    const formula = externalFormulas.find((item) => item.id === formulaId);
                    if (formula) applyFormula(formula);
                  }}
                >
                  <FileDown size={15} />
                  Nạp lại
                </button>
                <p className="text-xs text-gray-500 md:pb-3">
                  {!productId
                    ? "Chọn thành phẩm để chọn công thức."
                    : product.data && !externalFormulas.length
                      ? "Thành phẩm chưa có công thức gửi đi — bật \"Dùng cho gửi đi sản xuất\" trong Sửa sản phẩm → Công thức, hoặc nhập tay bên dưới."
                      : "Chọn công thức để nạp hàng mình gửi, nguyên liệu NSX, phí gia công và tiền tệ theo sản lượng."}
                  {production?.externalTemplateName && (
                    <span className="mt-1 block text-gray-400">
                      Mẫu phối trộn (cũ): {production.externalTemplateName}
                    </span>
                  )}
                </p>
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
                              unit: defaultOwnUnit(item),
                            },
                          ]);
                        }}
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[820px] text-sm">
                      <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                        <tr>
                          <th className="px-3 py-2.5">Sản phẩm</th>
                          <th className="w-36 px-3 py-2.5">Lượng gửi</th>
                          <th className="w-32 px-3 py-2.5">Đơn vị</th>
                          <th
                            className="w-36 px-3 py-2.5 text-right"
                            title="Lượng gửi đổi sang đơn vị kho — số sẽ bị trừ khỏi kho gửi">
                            Trừ kho
                          </th>
                          <th className="w-32 px-3 py-2.5 text-right">
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
                                    productOf(line)?.unit || "unit",
                                    ...(gramsPerStockUnit(productOf(line)) > 0
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
                            <OwnStockCells
                              product={productOf(line)}
                              quantity={line.quantity}
                              unit={line.unit}
                              branchId={source}
                              checkStock={checkStock}
                            />
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
                              colSpan={6}
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
                            disabled={!!formulaId || (sent && hasReceipts)}
                            onChange={() => setCurrency(option)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {sent && hasReceipts ? (
                    <p className="mt-1.5 text-xs text-gray-400">
                      Phiếu đã có đợt nhận nên không đổi được tiền tệ.
                    </p>
                  ) : (
                    !!formulaId && (
                      <p className="mt-1.5 text-xs text-gray-400">
                        Tiền tệ theo công thức. Chọn &quot;Nhập tay&quot; để đổi.
                      </p>
                    )
                  )}
                  <label className={`${labelClass} mt-4`}>
                    <span className="mb-1.5 block">Phí gia công cả lô</span>
                    <NumericInput
                      className={numericClass}
                      value={fee}
                      onValueChange={(value) => {
                        setFee(value);
                        setFeePerUnit(null);
                      }}
                      maxFractionDigits={2}
                      formatWhileTyping
                    />
                    {feePerUnit != null && (
                      <span className="mt-1 block text-xs font-normal text-gray-400">
                        = {plain(feePerUnit, 6)} {currency} / sp × {plain(quantity, 4)}
                      </span>
                    )}
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
                          {plain(rate, 6)}
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
              locked ? "grid-cols-1" : sent ? "grid-cols-2" : "grid-cols-3"
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
            {sent && (
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                disabled={save.isPending}
                onClick={() => save.mutate(false)}
              >
                {save.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {save.isPending ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            )}
            {!locked && !sent && (
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

/**
 * Cột "Trừ kho" + "Tồn kho" của một dòng hàng mình gửi: lượng gửi đổi sang
 * đơn vị kho (vd 250 g → 0.0125 Thùng của thùng 20 kg) và cảnh báo thiếu tồn
 * ngay trên form, trước khi bấm gửi.
 */
function OwnStockCells({
  product,
  quantity,
  unit,
  branchId,
  checkStock,
}: {
  product?: Product;
  quantity: number;
  unit: string;
  branchId: number;
  checkStock: boolean;
}) {
  const factor = stockFactor(product, unit);
  const deduct = factor == null ? null : round4(Number(quantity) * factor);
  const rawOnHand = product?.inventories?.find(
    (inventory) => inventory.branchId === branchId,
  )?.onHand;
  // Tồn có thể còn số lẻ dư (2.5999…): so ở 4 số lẻ như backend.
  const onHand = rawOnHand == null ? null : round4(Number(rawOnHand));
  const stockUnit = product?.unit || "";
  const missing =
    checkStock && deduct != null && onHand != null && deduct > onHand
      ? round4(deduct - onHand)
      : 0;
  return (
    <>
      <td className="px-3 py-2.5 text-right">
        {deduct == null ? (
          product ? (
            <span className="text-xs text-amber-700">
              Đơn vị không quy đổi được
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )
        ) : (
          <>
            <span
              className={`font-medium tabular-nums ${missing > 0 ? "text-red-600" : "text-gray-800"}`}>
              {stockText(deduct)} {stockUnit}
            </span>
            {missing > 0 && (
              <span className="block text-xs text-red-600">
                Thiếu {stockText(missing)} {stockUnit}
              </span>
            )}
          </>
        )}
      </td>
      <td className="px-3 py-2.5 text-right font-medium tabular-nums text-gray-600">
        {onHand == null ? "-" : `${stockText(onHand)} ${stockUnit}`}
      </td>
    </>
  );
}
