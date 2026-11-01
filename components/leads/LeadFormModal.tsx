"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AlertTriangle, Loader2, UserPlus, X } from "lucide-react";
import { leadsApi } from "@/lib/api/leads";
import { useSaveLead } from "@/lib/hooks/useLeads";
import { useUsers } from "@/lib/hooks/useUsers";
import { useNewLocations } from "@/lib/hooks/useNewLocations";
import { useAuthStore } from "@/lib/store/auth";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { LEAD_CATEGORY_LABEL, LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL, SOURCE_PLATFORMS, options } from "@/lib/leads/constants";
import { useQuery } from "@tanstack/react-query";
import type { Lead, LeadCategory, LeadDuplicates, LeadInput, LeadSource, LeadStatus } from "@/lib/types/lead";
import { platformLabel } from "@/lib/chat/platforms";

/**
 * Tạo / sửa lead. Tạo từ hội thoại Smax: `initial` điền sẵn tên, nguồn, SĐT và hội thoại
 * (lead mang sẵn kênh kết nối). SĐT trùng khách / lead khác → cảnh báo (vẫn lưu được).
 */
export function LeadFormModal({
  lead,
  initial,
  onClose,
  onSaved,
}: {
  lead?: Lead;
  initial?: LeadInput;
  onClose: () => void;
  onSaved?: (lead: Lead) => void;
}) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { data: users } = useUsers();
  const { provinces, communes } = useNewLocations();
  const save = useSaveLead();
  const src = lead ?? initial;

  const [name, setName] = useState(src?.name ?? "");
  const [phone, setPhone] = useState(src?.phone ?? "");
  const [zaloPhone, setZaloPhone] = useState(lead?.zaloPhone ?? "");
  const [source, setSource] = useState<LeadSource | "">(src?.source ?? "");
  const [channelPid, setChannelPid] = useState(src?.channelPid ?? "");
  const { data: allChannels } = useQuery({ queryKey: ["leadChannels"], queryFn: () => leadsApi.channels(), staleTime: 5 * 60_000 });
  // Kênh theo nguồn (Fanpage → các fanpage…); kênh đã lưu không còn trên Smax vẫn giữ để hiển thị
  const channelOptions = [
    ...(allChannels ?? []).filter((c) => !source || SOURCE_PLATFORMS[source].includes(c.platform)),
    ...(src?.channelPid && !(allChannels ?? []).some((c) => c.pagePid === src.channelPid)
      ? [{ pagePid: src.channelPid, name: src.channelName ?? src.channelPid, platform: "" }]
      : []),
  ].map((c) => ({ value: c.pagePid, label: c.name }));
  const [category, setCategory] = useState<LeadCategory | "">(src?.category ?? "");
  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? "new");
  const [provinceCode, setProvinceCode] = useState(src?.provinceCode ?? "");
  const [wardCode, setWardCode] = useState(src?.wardCode ?? "");
  const [need, setNeed] = useState(src?.need ?? "");
  const [cskhUserId, setCskhUserId] = useState<number | null>(lead?.cskhUserId ?? userId);
  const [cskhNote, setCskhNote] = useState(lead?.cskhNote ?? "");

  // Cảnh báo trùng SĐT khi đang nhập (debounce)
  const [dups, setDups] = useState<LeadDuplicates | null>(null);
  useEffect(() => {
    const p = phone.trim();
    const t = setTimeout(() => {
      if (p.replace(/\D/g, "").length < 9) return setDups(null);
      leadsApi.checkPhone(p, lead?.id).then(setDups).catch(() => setDups(null));
    }, 400);
    return () => clearTimeout(t);
  }, [phone, lead?.id]);

  const wards = useMemo(() => communes.filter((c) => c.provinceCode === provinceCode), [communes, provinceCode]);
  const missing = !name.trim() ? "Nhập tên" : !source ? "Chọn nguồn" : !category ? "Chọn phân loại" : null;

  const submit = () => {
    if (missing) return;
    const province = provinces.find((p) => p.code === provinceCode);
    const ward = wards.find((w) => w.code === wardCode);
    const body: LeadInput = {
      name: name.trim(),
      phone: phone.trim(),
      zaloPhone: zaloPhone.trim(),
      source: source as LeadSource,
      channelPid,
      channelName: channelOptions.find((c) => c.value === channelPid)?.label ?? "",
      category: category as LeadCategory,
      provinceCode,
      provinceName: province?.name ?? "",
      wardCode: ward ? wardCode : "",
      wardName: ward?.name ?? "",
      need,
      cskhNote,
      ...(cskhUserId ? { cskhUserId } : {}),
      ...(lead ? { status } : {}),
      ...(!lead && initial?.conversation ? { conversation: initial.conversation } : {}),
    };
    save.mutate(
      { id: lead?.id, body },
      {
        onSuccess: ({ lead: saved }) => {
          onSaved?.(saved);
          onClose();
        },
      }
    );
  };

  const input = "w-full border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand";
  const label = "block text-xs font-medium text-gray-600 mb-1";
  const chips = <T extends string>(opts: { value: T; label: string }[], value: string, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-1.5">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => set(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            value === o.value
              ? "bg-brand text-white border-brand shadow-sm"
              : "border-gray-200 text-gray-700 hover:border-brand hover:bg-brand-soft"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}>
      <div
        className="bg-white rounded-lg w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brand" />
              {lead ? `Sửa lead — ${lead.name}` : "Tạo lead"}
            </h2>
            {!lead && initial?.conversation && (
              <p className="text-xs text-gray-500 truncate">
                Gắn sẵn hội thoại {platformLabel(initial.conversation.platform)} ·{" "}
                {initial.conversation.name || initial.conversation.tid}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={label}>Tên *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={input} autoFocus />
            </div>
            <div>
              <label className={label}>SĐT</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>SĐT Zalo cá nhân</label>
              <input
                value={zaloPhone}
                onChange={(e) => setZaloPhone(e.target.value)}
                placeholder={phone ? `Mặc định: ${phone}` : "Mặc định = SĐT"}
                className={input}
              />
            </div>
          </div>

          {dups && (dups.customers.length > 0 || dups.leads.length > 0) && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-medium">SĐT trùng — kiểm tra trước khi tạo thêm:</p>
                {dups.customers.map((c) => (
                  <p key={`c${c.id}`}>
                    Khách hàng{" "}
                    <Link href={`/khach-hang?Code=${encodeURIComponent(c.code ?? "")}`} target="_blank" className="underline">
                      {c.code} · {c.name}
                    </Link>
                  </p>
                ))}
                {dups.leads.map((l) => (
                  <p key={`l${l.id}`}>
                    Lead{" "}
                    <Link href={`/khach-hang/lead?id=${l.id}`} target="_blank" className="underline">
                      {l.name}
                    </Link>{" "}
                    ({LEAD_STATUS_LABEL[l.status]})
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={label}>Nguồn *</label>
            {chips(options(LEAD_SOURCE_LABEL), source, (v: LeadSource) => {
              setSource(v);
              // Kênh không thuộc nguồn mới → bỏ chọn
              const ch = allChannels?.find((c) => c.pagePid === channelPid);
              if (ch && !SOURCE_PLATFORMS[v].includes(ch.platform)) setChannelPid("");
            })}
          </div>
          <div>
            <label className={label}>Kênh</label>
            <FilterSearchableSelect
              size="form"
              options={channelOptions}
              value={channelPid}
              onChange={setChannelPid}
              placeholder={source ? "— Chọn kênh —" : "Chọn nguồn trước"}
            />
          </div>
          <div>
            <label className={label}>Phân loại *</label>
            {chips(options(LEAD_CATEGORY_LABEL), category, setCategory)}
          </div>
          {lead && (
            <div>
              <label className={label}>Trạng thái</label>
              {chips(options(LEAD_STATUS_LABEL), status, setStatus)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Tỉnh/Thành</label>
              <FilterSearchableSelect
                size="form"
                options={provinces.map((p) => ({ value: p.code, label: p.name }))}
                value={provinceCode}
                onChange={(v) => {
                  setProvinceCode(v);
                  setWardCode("");
                }}
                placeholder="— Chọn tỉnh/thành —"
              />
            </div>
            <div>
              <label className={label}>Phường/Xã</label>
              <FilterSearchableSelect
                size="form"
                options={wards.map((w) => ({ value: w.code, label: w.name }))}
                value={wardCode}
                onChange={setWardCode}
                placeholder={provinceCode ? "— Chọn phường/xã —" : "Chọn tỉnh trước"}
              />
            </div>
          </div>

          <div>
            <label className={label}>Nhu cầu</label>
            <textarea value={need} onChange={(e) => setNeed(e.target.value)} rows={2} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>CSKH phụ trách</label>
              <select
                value={cskhUserId ?? ""}
                onChange={(e) => setCskhUserId(e.target.value ? Number(e.target.value) : null)}
                className={input}>
                <option value="">— Chọn —</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Ghi chú CSKH</label>
            <textarea value={cskhNote} onChange={(e) => setCskhNote(e.target.value)} rows={2} className={input} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          {missing && <span className="mr-auto text-xs text-red-600">{missing}</span>}
          <button onClick={onClose} className="px-4 py-1.5 rounded-full border text-sm hover:bg-gray-50">
            Đóng
          </button>
          <button
            onClick={submit}
            disabled={!!missing || save.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand text-white text-sm font-medium disabled:opacity-50">
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {lead ? "Lưu" : "Tạo lead"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
