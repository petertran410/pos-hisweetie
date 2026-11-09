"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, FileDown, Save, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { productsApi, type Product } from "@/lib/api/products";
import { productionsApi, type Production } from "@/lib/api/productions";
import { manufacturersApi, materialTotal, type ManufacturerMaterial, type OwnMaterial } from "@/lib/api/manufacturers";
import { useBranches } from "@/lib/hooks/useBranches";
import { usePermission } from "@/lib/hooks/usePermissions";
import { NumericInput } from "@/components/ui/NumericInput";
import { PartnerPicker, ProductPicker } from "./ProductionPickers";
import { ManufacturerMaterialsEditor, numericClass } from "./ManufacturerMaterialsEditor";

type OwnDraft = OwnMaterial & { name: string; code: string; product?: Product };
const field = "w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm";
const currencyText = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} đ`;

type ExternalFormProps = {
  sourceBranchId: number; destinationBranchId: number; production?: Production | null; onClose: () => void;
};

export function ExternalProductionForm(props: ExternalFormProps) {
  const detail = useQuery({ queryKey: ["productions", props.production?.id], queryFn: () => productionsApi.getById(props.production!.id), enabled: !!props.production?.id });
  if (props.production && !detail.data) return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="rounded-lg bg-white p-5 text-sm">
        <p>{detail.isError ? "Không tải được chi tiết phiếu" : "Đang tải phiếu..."}</p>
        <button className="mt-3 rounded border px-3 py-2" onClick={props.onClose}>Đóng</button>
      </div>
    </div>, document.body);
  return <ExternalProductionFormContent {...props} production={detail.data ?? props.production} />;
}

function ExternalProductionFormContent({ sourceBranchId, destinationBranchId, production, onClose }: ExternalFormProps) {
  const queryClient = useQueryClient();
  const canCreateTemplate = usePermission("productions", "create");
  const canUpdateTemplate = usePermission("productions", "update");
  const [draftId, setDraftId] = useState(production?.id);
  const [manufacturerId, setManufacturerId] = useState<number | null>(production?.manufacturerId ?? null);
  const [productId, setProductId] = useState<number | null>(production?.productId ?? null);
  const [quantity, setQuantity] = useState(Number(production?.quantity ?? 1));
  const [source, setSource] = useState(sourceBranchId);
  const [dest, setDest] = useState(destinationBranchId);
  const [own, setOwn] = useState<OwnDraft[]>(() => (production?.components ?? []).map((line) => ({
    productId: line.componentProductId, quantity: Number(line.actualGrams), unit: line.unit ?? "unit",
    name: line.componentName, code: line.componentCode,
  })));
  const [supplied, setSupplied] = useState<ManufacturerMaterial[]>(() => (production?.manufacturerMaterials ?? []).map((line) => ({
    productId: line.productId, description: line.description, pricingMode: line.pricingMode,
    quantity: line.quantity == null ? null : Number(line.quantity), unit: line.unit, unitPrice: Number(line.unitPrice), amount: Number(line.amount),
  })));
  const [currency, setCurrency] = useState<"VND" | "CNY">(production?.feeCurrency ?? "VND");
  const [rate, setRate] = useState(Number(production?.feeExchangeRate ?? 1));
  const [fee, setFee] = useState(Number(production?.feeCurrency === "CNY" ? production.feeForeignAmount : production?.processingFee ?? 0));
  const [note, setNote] = useState(production?.note ?? "");
  const [code, setCode] = useState(production?.code ?? "");
  const [templateId, setTemplateId] = useState<number | null>(production?.externalTemplateId ?? null);
  const [templateName, setTemplateName] = useState(production?.externalTemplateName ?? "");
  const [formulaId, setFormulaId] = useState("");
  const product = useQuery({ queryKey: ["products", productId], queryFn: () => productsApi.getProduct(productId!), enabled: !!productId });
  const templates = useQuery({ queryKey: ["manufacturer-templates", manufacturerId, productId], queryFn: () => manufacturersApi.templates(manufacturerId!, productId!), enabled: !!manufacturerId && !!productId });
  const manufacturer = useQuery({ queryKey: ["manufacturer", manufacturerId], queryFn: () => manufacturersApi.get(manufacturerId!), enabled: !!manufacturerId });
  const { data: branches } = useBranches();
  const locked = !!production && production.status !== 1;
  const changeQuantity = (next: number) => {
    if (templateId && quantity > 0) {
      const scale = next / quantity;
      setOwn(own.map((line) => ({ ...line, quantity: Math.round(line.quantity * scale * 10000) / 10000 })));
      setSupplied(supplied.map((line) => ({ ...line, quantity: line.quantity == null ? null : Math.round(Number(line.quantity) * scale * 10000) / 10000 })));
    }
    setQuantity(next);
  };

  const payload = () => ({
    code: code || undefined, isExternal: true, manufacturerId: manufacturerId!,
    productId: productId!, sourceBranchId: source, destinationBranchId: dest, quantity,
    ownMaterials: own.map(({ productId, quantity, unit }) => ({ productId, quantity, unit })),
    manufacturerMaterials: supplied, feeCurrency: currency, note,
    processingFee: currency === "VND" ? fee : undefined,
    feeForeignAmount: currency === "CNY" ? fee : undefined,
    feeExchangeRate: currency === "CNY" ? rate : undefined, externalTemplateId: templateId,
  });
  const save = useMutation({
    mutationFn: async (send: boolean) => {
      if (!manufacturerId || !productId || !(quantity > 0)) throw new Error("Chọn nhà sản xuất, thành phẩm và sản lượng hợp lệ");
      if (send && !confirm("Gửi nguyên liệu và khóa phiếu để sản xuất?")) return false;
      const saved = draftId ? await productionsApi.update(draftId, payload()) : await productionsApi.create(payload());
      setDraftId(saved.id);
      if (send) await productionsApi.send(saved.id, {});
      return true;
    },
    onSuccess: (saved) => {
      if (!saved) return;
      for (const key of ["productions", "products", "manufacturer-accounts", "suppliers", "supplier-debt-timeline"]) queryClient.invalidateQueries({ queryKey: [key] });
      toast.success("Đã lưu phiếu gửi sản xuất"); onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const templateSave = useMutation({
    mutationFn: async (update: boolean) => {
      if (!manufacturerId || !productId || !templateName.trim() || !(quantity > 0)) throw new Error("Nhập tên mẫu, nhà sản xuất, thành phẩm và sản lượng cơ sở");
      const data = payload();
      return manufacturersApi.saveTemplate({
        name: templateName, manufacturerId, productId, baseQuantity: quantity,
        currency, processingFee: fee, exchangeRate: rate,
        ownMaterials: data.ownMaterials, manufacturerMaterials: supplied,
      }, update ? templateId ?? undefined : undefined);
    },
    onSuccess: (saved) => { setTemplateId(saved.id); queryClient.invalidateQueries({ queryKey: ["manufacturer-templates"] }); toast.success("Đã lưu mẫu"); },
    onError: (error: Error) => toast.error(error.message),
  });
  const loadTemplate = async (id: string) => {
    const template = templates.data?.find((item) => item.id === Number(id));
    if (!template) { setTemplateId(null); return; }
    const scale = quantity / Number(template.baseQuantity);
    const rows = await Promise.all(template.lines.filter((line) => line.source === "OWN").map(async (line) => {
      const product = await productsApi.getProduct(line.productId!);
      return { productId: product.id, code: product.code, name: product.name, product, unit: line.unit || product.unit || "unit", quantity: Number(line.quantity) * scale };
    }));
    setOwn(rows);
    setSupplied(template.lines.filter((line) => line.source === "MANUFACTURER").map((line) => ({
      productId: line.productId, description: line.description, pricingMode: line.pricingMode,
      quantity: line.quantity == null ? null : Number(line.quantity) * scale, unit: line.unit,
      unitPrice: Number(line.unitPrice), amount: Number(line.amount),
    })));
    setTemplateId(template.id); setTemplateName(template.name); setCurrency(template.currency);
    setRate(Number(template.exchangeRate)); setFee(Number(template.processingFee));
  };
  const loadFormula = () => {
    const formula = product.data?.formulas?.find((item) => String(item.id) === formulaId) ?? product.data?.formulas?.find((item) => item.isDefault);
    const lines = formula?.components ?? product.data?.comboComponents ?? [];
    setOwn(lines.map((line) => ({
      productId: line.componentProductId, code: line.componentProduct.code, name: line.componentProduct.name,
      product: line.componentProduct, quantity: Number(line.quantity) * quantity,
      unit: line.inputMode === "piece" || line.inputMode === "carton" ? line.componentProduct.unit || "unit" : "g",
    })));
  };
  const suppliedTotal = supplied.reduce((sum, line) => sum + materialTotal(line), 0);
  const payable = currency === "CNY" ? Math.round((suppliedTotal + fee) * rate) : suppliedTotal + fee;
  return createPortal(<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-2 sm:p-5">
    <div role="dialog" aria-modal="true" aria-label="Gửi sản phẩm đi sản xuất" className="flex max-h-[96dvh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
      <header className="flex items-center justify-between border-b px-4 py-3"><h2 className="text-lg font-semibold">{production ? code : "Gửi sản phẩm đi sản xuất"}</h2>
        <button type="button" onClick={onClose} disabled={save.isPending} title="Đóng" className="p-1"><X size={20} /></button></header>
      <div className="min-h-0 space-y-5 overflow-y-auto p-4">
        <fieldset disabled={locked || save.isPending || templateSave.isPending} className="min-w-0 space-y-5 disabled:opacity-80">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="min-w-0 space-y-1 text-sm">Nhà sản xuất<PartnerPicker manufacturer label="Chọn nhà sản xuất" value={manufacturerId}
              onChange={(id) => {
                setManufacturerId(id); setTemplateId(null);
                if (id) manufacturersApi.get(id).then((row) => setCurrency(row.currency)).catch((error: Error) => toast.error(error.message));
              }} /></label>
            <label className="min-w-0 space-y-1 text-sm sm:col-span-2">Thành phẩm nhận về<ProductPicker value={productId}
              onChange={(value) => { setProductId(value.id); setTemplateId(null); }} /></label>
            <label className="space-y-1 text-sm">Sản lượng dự kiến<NumericInput className={numericClass} value={quantity} onValueChange={changeQuantity} maxFractionDigits={4} /></label>
            <label className="text-sm">Kho gửi<select className={field} value={source} onChange={(event) => setSource(Number(event.target.value))}>
              {branches?.filter((branch) => branch.isActive).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <label className="text-sm">Kho nhận<select className={field} value={dest} onChange={(event) => setDest(Number(event.target.value))}>
              {branches?.filter((branch) => branch.isActive).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <label className="text-sm">Mã phiếu<input className={field} value={code} onChange={(event) => setCode(event.target.value)} placeholder="Tự động" /></label>
            <div className="self-end text-sm text-gray-600">{manufacturer.data?.supplier ? `NCC liên kết: ${manufacturer.data.supplier.name}` : "Thanh toán riêng tại NSX"}</div>
          </div>
          <div className="flex flex-wrap items-end gap-2 border-y py-3">
            <label className="min-w-48 flex-1 text-sm">Mẫu phối trộn<select className={field} value={templateId ?? ""} onChange={(event) => { loadTemplate(event.target.value).catch((error: Error) => toast.error(error.message)); }}>
              <option value="">Không chọn mẫu</option>{templates.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <input aria-label="Tên mẫu" className={`${field} max-w-60`} value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Tên mẫu" />
            {canCreateTemplate && <button type="button" className="flex h-9 items-center gap-1 rounded border px-2 text-sm" onClick={() => templateSave.mutate(false)}><Save size={15} />Lưu mẫu mới</button>}
            {!!templateId && canUpdateTemplate && <button type="button" className="flex h-9 items-center gap-1 rounded border px-2 text-sm" onClick={() => templateSave.mutate(true)}><Save size={15} />Cập nhật mẫu</button>}
            {product.data && (product.data.formulas?.length || product.data.comboComponents?.length) ? <>
              <select aria-label="Công thức sản phẩm" className="h-9 max-w-48 rounded border px-2 text-sm" value={formulaId} onChange={(event) => setFormulaId(event.target.value)}>
                <option value="">Công thức mặc định</option>{product.data.formulas?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <button type="button" className="flex h-9 items-center gap-1 rounded border px-2 text-sm" onClick={loadFormula}><FileDown size={15} />Nạp công thức</button>
            </> : null}
          </div>
          <section className="min-w-0 space-y-2">
            <h3 className="text-sm font-semibold">Hàng mình gửi</h3>
            <div className="max-w-xl"><ProductPicker label="Thêm hàng mình gửi" branchId={source} onChange={(product) => {
              if (own.some((line) => line.productId === product.id)) return toast.error("Mã hàng đã có trong phiếu");
              setOwn([...own, { productId: product.id, product, code: product.code, name: product.name, quantity: 1, unit: product.unit || "unit" }]);
            }} /></div>
            <div className="overflow-x-auto border"><table className="w-full min-w-[650px] text-sm">
              <thead className="bg-gray-50 text-left"><tr><th className="p-2">Sản phẩm</th><th className="w-36 p-2">Lượng gửi</th><th className="w-36 p-2">Đơn vị</th><th className="w-32 p-2 text-right">Tồn kho</th><th className="w-10" /></tr></thead>
              <tbody>{own.map((line, index) => <tr key={line.productId} className="border-t">
                <td className="p-2">{line.code} - {line.name}</td>
                <td className="p-2"><NumericInput className={numericClass} value={line.quantity} maxFractionDigits={4} onValueChange={(quantity) => setOwn(own.map((item, position) => position === index ? { ...item, quantity } : item))} /></td>
                <td className="p-2"><select aria-label={`Đơn vị ${line.code}`} className={field} value={line.unit} onChange={(event) => setOwn(own.map((item, position) => position === index ? { ...item, unit: event.target.value } : item))}>
                  {[...new Set([line.unit, line.product?.unit || "unit", ...(line.product?.weight ? ["g", "kg"] : [])])].map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></td>
                <td className="p-2 text-right">{line.product?.inventories?.find((inv) => inv.branchId === source)?.onHand ?? "-"}</td>
                <td className="p-2"><button type="button" title="Xóa nguyên liệu gửi" className="p-1 text-red-600" onClick={() => setOwn(own.filter((_, position) => position !== index))}><Trash2 size={16} /></button></td>
              </tr>)}
              {!own.length && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Chưa có hàng mình gửi</td></tr>}</tbody>
            </table></div>
          </section>
          <ManufacturerMaterialsEditor value={supplied} onChange={setSupplied} currency={currency} />
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-sm">Tiền tệ<select className={field} value={currency} onChange={(event) => setCurrency(event.target.value as "VND" | "CNY")}><option>VND</option><option>CNY</option></select></label>
            <label className="text-sm">Phí gia công cả lô<NumericInput className={numericClass} value={fee} onValueChange={setFee} maxFractionDigits={2} /></label>
            {currency === "CNY" && <label className="text-sm">Tỷ giá CNY/VND<NumericInput className={numericClass} value={rate} onValueChange={setRate} maxFractionDigits={6} /></label>}
            <div className="self-end text-sm">Dự kiến phải trả: <strong className="text-red-700">{currencyText(payable)}</strong></div>
          </div>
          <label className="block text-sm">Ghi chú<textarea className={`${field} mt-1`} rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        </fieldset>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
        <Link href="/san-pham/nha-san-xuat" className="flex items-center gap-1 text-sm text-brand"><ArrowUpRight size={15} />Nhà sản xuất</Link>
        <div className="flex gap-2"><button type="button" className="rounded border px-3 py-2 text-sm" onClick={onClose} disabled={save.isPending}>Đóng</button>
          {!locked && <><button type="button" className="flex items-center gap-1 rounded border px-3 py-2 text-sm" disabled={save.isPending} onClick={() => save.mutate(false)}><Save size={15} />Lưu tạm</button>
          <button type="button" className="flex items-center gap-1 rounded bg-brand px-3 py-2 text-sm text-white disabled:opacity-50" disabled={save.isPending} onClick={() => save.mutate(true)}><Send size={15} />{save.isPending ? "Đang lưu..." : "Gửi sản xuất"}</button></>}
        </div>
      </footer>
    </div>
  </div>, document.body);
}
