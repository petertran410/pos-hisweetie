"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { leadFormsApi } from "@/lib/api/leadForms";
import { useNewLocations } from "@/lib/hooks/useNewLocations";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { LEAD_CATEGORY_LABEL, options } from "@/lib/leads/constants";
import type { PublicLeadForm as Form } from "@/lib/types/leadForm";

type Province = { provinceCode: string; provinceName: string; wardCode: string; wardName: string };

/** Form công khai khách điền (link / iframe ?embed=1 / QR). */
export function PublicLeadForm({ slug, embed }: { slug: string; embed: boolean }) {
  // Tự fetch (không qua react-query) để lỗi chỉ hiện trong form, không bật toast chung của app
  const [form, setForm] = useState<{ data?: Form; error?: string }>({});
  useEffect(() => {
    leadFormsApi
      .publicGet(slug)
      .then((data) => setForm({ data }))
      .catch((e: Error) => setForm({ error: e.message }));
  }, [slug]);

  return (
    <div className={embed ? "p-1" : "fixed inset-0 overflow-auto bg-gray-50 px-4 py-8 sm:py-12"}>
      <div className={`mx-auto w-full max-w-xl ${embed ? "" : "rounded-2xl border bg-white p-6 shadow-sm sm:p-8"}`}>
        {!form.data && !form.error ? (
          <p className="py-10 text-center text-sm text-gray-500">
            <Loader2 className="inline h-4 w-4 animate-spin" /> Đang tải…
          </p>
        ) : !form.data ? (
          <p className="py-10 text-center text-sm text-gray-600">{form.error}</p>
        ) : (
          <FormBody form={form.data} />
        )}
      </div>
    </div>
  );
}

function FormBody({ form }: { form: Form }) {
  const { provinces, communes } = useNewLocations();
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [province, setProvince] = useState<Province>({ provinceCode: "", provinceName: "", wardCode: "", wardName: "" });
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const set = (key: string, v: string | string[]) => {
    setValues((s) => ({ ...s, [key]: v }));
    setError("");
  };
  const str = (key: string) => (typeof values[key] === "string" ? (values[key] as string) : "");
  const list = (key: string) => (Array.isArray(values[key]) ? (values[key] as string[]) : []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = form.fields.find((f) =>
      !f.required
        ? false
        : f.key === "province"
          ? !province.provinceCode
          : f.type === "multiselect"
            ? !list(f.key).length
            : !str(f.key).trim()
    );
    if (missing) return setError(`Vui lòng nhập "${missing.label}"`);
    setError("");
    setSending(true);
    try {
      const res = await leadFormsApi.publicSubmit(form.slug, { ...values, province }, honeypot);
      setDone(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (done)
    return (
      <div className="py-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <p className="mt-3 whitespace-pre-line text-gray-700">{done}</p>
      </div>
    );

  const input =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
  const chip = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm transition-colors ${
      active ? "border-brand bg-brand text-white" : "border-gray-300 text-gray-700 hover:border-brand"
    }`;
  const wards = communes.filter((c) => c.provinceCode === province.provinceCode);

  const control = (f: Form["fields"][number]) => {
    if (f.key === "province")
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <FilterSearchableSelect
            size="form"
            options={provinces.map((p) => ({ value: p.code, label: p.name }))}
            value={province.provinceCode}
            onChange={(code) =>
              setProvince({
                provinceCode: code,
                provinceName: provinces.find((p) => p.code === code)?.name ?? "",
                wardCode: "",
                wardName: "",
              })
            }
            placeholder="Tỉnh / thành phố"
            searchPlaceholder="Tìm tỉnh / thành…"
          />
          <FilterSearchableSelect
            size="form"
            options={wards.map((w) => ({ value: w.code, label: w.name }))}
            value={province.wardCode}
            onChange={(code) =>
              setProvince((p) => ({ ...p, wardCode: code, wardName: wards.find((w) => w.code === code)?.name ?? "" }))
            }
            placeholder="Phường / xã"
            searchPlaceholder="Tìm phường / xã…"
          />
        </div>
      );
    if (f.key === "category" || f.type === "select") {
      const opts = f.key === "category" ? options(LEAD_CATEGORY_LABEL) : (f.options ?? []).map((o) => ({ value: o, label: o }));
      return (
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => set(f.key, str(f.key) === o.value ? "" : o.value)}
              className={chip(str(f.key) === o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      );
    }
    if (f.type === "multiselect")
      return (
        <div className="flex flex-wrap gap-2">
          {(f.options ?? []).map((o) => {
            const on = list(f.key).includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => set(f.key, on ? list(f.key).filter((x) => x !== o) : [...list(f.key), o])}
                className={chip(on)}>
                {o}
              </button>
            );
          })}
        </div>
      );
    if (f.key === "need" || f.type === "textarea")
      return <textarea rows={3} value={str(f.key)} onChange={(e) => set(f.key, e.target.value)} className={input} />;
    return (
      <input
        type={f.key === "phone" || f.key === "zaloPhone" ? "tel" : "text"}
        inputMode={f.key === "phone" || f.key === "zaloPhone" ? "tel" : undefined}
        autoComplete={f.key === "name" ? "name" : f.key === "phone" ? "tel" : "off"}
        value={str(f.key)}
        onChange={(e) => set(f.key, e.target.value)}
        className={input}
      />
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{form.title}</h1>
        {form.description && <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{form.description}</p>}
      </div>
      {form.fields.map((f) => (
        <div key={f.key}>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {f.label}
            {f.required && <span className="text-red-500"> *</span>}
          </label>
          {control(f)}
        </div>
      ))}
      {/* Honeypot: người thật không thấy ô này */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-medium text-white disabled:opacity-60">
        {sending && <Loader2 className="h-4 w-4 animate-spin" />}
        Gửi thông tin
      </button>
    </form>
  );
}
