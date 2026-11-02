"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, Loader2, MessageCircle, Pencil, Send, Trash2, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { leadsApi } from "@/lib/api/leads";
import { useLead, useSaveLead } from "@/lib/hooks/useLeads";
import { useCan } from "@/lib/hooks/useCan";
import { useAuthStore } from "@/lib/store/auth";
import { useChatSidebarStore } from "@/lib/store/chatSidebar";
import { confirmAction } from "@/lib/chat/confirm";
import { platformLabel } from "@/lib/chat/platforms";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { ThreadKindLogo } from "@/components/chat/ThreadKindIcon";
import { LEAD_CATEGORY_LABEL, LEAD_SOURCE_LABEL, LEAD_STATUS_COLOR, LEAD_STATUS_LABEL, leadCode } from "@/lib/leads/constants";
import type { HandoverStepKey, LeadConversation, LeadDetail } from "@/lib/types/lead";
import { LeadFormModal } from "./LeadFormModal";
import { HANDOVER_STEP_LABEL, LeadHandoverModal } from "./LeadHandoverModal";

type Tab = "info" | "channels" | "history";

/** Chi tiết lead (mở khi bấm dòng): thông tin + thao tác, kênh kết nối, lịch sử chuyển giao. */
export function LeadDetailRow({ leadId, colSpan }: { leadId: number; colSpan: number }) {
  const { data: lead, isLoading } = useLead(leadId);
  const [tab, setTab] = useState<Tab>("info");
  // Khung chi tiết đứng yên khi bảng cuộn ngang: sticky + rộng bằng vùng nhìn thấy của bảng
  const wrapperRef = useRef<HTMLDivElement>(null);
  const loaded = !!lead;
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    let scrollEl = el?.parentElement ?? null;
    while (scrollEl && !["auto", "scroll"].includes(getComputedStyle(scrollEl).overflowX)) {
      scrollEl = scrollEl.parentElement;
    }
    if (!el || !scrollEl) return;
    const box = scrollEl;
    const update = () => {
      el.style.width = `${box.clientWidth}px`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [loaded]);

  if (isLoading || !lead) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-6 text-sm text-gray-500">
          <Loader2 className="inline h-4 w-4 animate-spin" /> Đang tải lead…
        </td>
      </tr>
    );
  }
  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Thông tin" },
    { key: "channels", label: `Kênh kết nối (${lead.conversations.length})` },
    { key: "history", label: `Lịch sử chuyển giao (${lead.handovers.length})` },
  ];

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div ref={wrapperRef} className="sticky left-0" style={{ width: 0 }}>
          <div className="m-2 rounded-lg border-2 border-brand bg-white">
            <div className="flex items-center gap-3 px-4 pt-3">
              <h3 className="text-lg font-semibold">{lead.name}</h3>
              <span className="text-sm text-gray-500">{leadCode(lead.id)}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLOR[lead.status]}`}>
                {LEAD_STATUS_LABEL[lead.status]}
              </span>

            </div>
            <div className="flex border-b px-4">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    tab === t.key ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {tab === "info" && <InfoTab lead={lead} />}
              {tab === "channels" && <ChannelsTab lead={lead} />}
              {tab === "history" && <HistoryTab lead={lead} />}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function InfoTab({ lead }: { lead: LeadDetail }) {
  const queryClient = useQueryClient();
  const canUpdate = useCan("leads", "update");
  const canAssign = useCan("leads", "assign");
  const save = useSaveLead();
  const [editing, setEditing] = useState(false);
  const [handingOver, setHandingOver] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const closed = lead.status === "converted" || lead.status === "cancelled";

  // Lý do khoá "Chuyển giao" về phía lead (Sale / kênh Zalo của Sale kiểm tra trong modal)
  const check = useQuery({
    queryKey: ["leadHandoverCheck", lead.id, null, ""],
    queryFn: () => leadsApi.handoverCheck(lead.id),
    enabled: canAssign,
  });
  // Khách POS trùng SĐT → gắn lead vào khách đó thay vì tạo mới
  const dups = useQuery({
    queryKey: ["leadPhoneDups", lead.id, lead.phone],
    queryFn: () => leadsApi.checkPhone(lead.phone!, lead.id),
    enabled: !!lead.phone && !lead.customerId,
  });
  const convert = useMutation({
    mutationFn: (customerId: number) => leadsApi.convert(lead.id, customerId),
    onSuccess: () => {
      toast.success("Lead đã thành khách hàng");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Không chuyển thành khách được"),
  });

  const rows: [string, React.ReactNode][] = [
    ["SĐT", lead.phone || "—"],
    ["SĐT Zalo", lead.zaloPhone || "—"],
    ["Nguồn", LEAD_SOURCE_LABEL[lead.source]],
    ["Kênh", lead.channelName || "—"],
    ["Phân loại", LEAD_CATEGORY_LABEL[lead.category]],
    ["Khu vực", [lead.wardName, lead.provinceName].filter(Boolean).join(", ") || "—"],
    ["CSKH", lead.cskhUser?.name ?? "—"],
    [
      "Sale PIC",
      lead.salePic ? `${lead.salePic.name}${lead.salePicFromCustomer ? " (theo khách hàng)" : ""}` : "—",
    ],
    ["Ngày tạo", new Date(lead.createdAt).toLocaleString("vi-VN")],
    [
      "Khách hàng POS",
      lead.customers.length ? (
        <span className="flex flex-col">
          {lead.customers.map((c) => (
            <Link key={c.id} href={`/khach-hang?Code=${encodeURIComponent(c.code ?? "")}`} className="text-brand hover:underline">
              {c.code} - {c.name}
              {c.id === lead.customerId ? " (đã chuyển đổi)" : ""}
            </Link>
          ))}
        </span>
      ) : (
        "—"
      ),
    ],
  ];
  // Gắn lead vào khách: khách đã gắn hội thoại của lead, rồi khách trùng SĐT
  const candidates = [
    ...lead.customers.map((c) => ({ ...c, reason: "đã gắn hội thoại của lead" })),
    ...(dups.data?.customers ?? [])
      .filter((d) => !lead.customers.some((c) => c.id === d.id))
      .map((c) => ({ ...c, reason: "trùng SĐT" })),
  ];
  const handoverBlocked = check.data?.reasons[0];

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-4">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-gray-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {lead.need && (
        <div>
          <p className="text-xs text-gray-500">Nhu cầu</p>
          <p className="whitespace-pre-wrap">{lead.need}</p>
        </div>
      )}
      {lead.cskhNote && (
        <div>
          <p className="text-xs text-gray-500">Ghi chú CSKH</p>
          <p className="whitespace-pre-wrap">{lead.cskhNote}</p>
        </div>
      )}
      {lead.formSubmissions.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-gray-500">Thông tin khách gửi qua form ({lead.formSubmissions.length})</p>
          <div className="grid gap-2 md:grid-cols-2">
            {lead.formSubmissions.map((s) => (
              <div key={s.id} className="rounded-lg border bg-gray-50 px-3 py-2">
                <p className="mb-1 text-xs text-gray-500">
                  {s.form.name} ·{" "}
                  {new Date(s.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                  {s.merged && " · gửi lại (gộp)"}
                </p>
                {s.answers.map((a) => (
                  <p key={a.key}>
                    <span className="text-gray-500">{a.label}:</span> {a.value}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        {canUpdate && (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 hover:bg-gray-50">
            <Pencil className="h-4 w-4" /> Sửa
          </button>
        )}
        {canUpdate && !lead.customerId && !closed && (
          <>
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={async () => {
                  const ok = await confirmAction(`Gắn lead "${lead.name}" vào khách ${c.code} · ${c.name} (${c.reason})?`, {
                    title: "Lead thành khách hàng",
                    confirmText: "Gắn",
                  });
                  if (ok) convert.mutate(c.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 px-3 py-1.5 text-green-700 hover:bg-green-50">
                <UserCheck className="h-4 w-4" /> Gắn khách {c.code}
              </button>
            ))}
            <button
              onClick={() => setCreatingCustomer(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 px-3 py-1.5 text-green-700 hover:bg-green-50">
              <UserCheck className="h-4 w-4" /> Tạo khách từ lead
            </button>
            <button
              onClick={async () => {
                const ok = await confirmAction(`Huỷ lead "${lead.name}"?`, { title: "Huỷ lead", confirmText: "Huỷ lead", danger: true });
                if (ok) save.mutate({ id: lead.id, body: { status: "cancelled" } });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Huỷ lead
            </button>
          </>
        )}
        {canAssign && (
          <span className="ml-auto flex items-center gap-2">
            {handoverBlocked && <span className="text-xs text-red-600">{check.data!.reasons.join("; ")}</span>}
            <button
              onClick={() => setHandingOver(true)}
              disabled={!check.data || !!handoverBlocked}
              title={handoverBlocked ?? "Gửi Lark cho Sale, kết bạn + tin chào Zalo từ kênh của Sale"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 font-medium text-white disabled:opacity-50">
              <Send className="h-4 w-4" /> Chuyển giao Sale
            </button>
          </span>
        )}
      </div>

      {editing && <LeadFormModal lead={lead} onClose={() => setEditing(false)} />}
      {handingOver && <LeadHandoverModal lead={lead} onClose={() => setHandingOver(false)} />}
      {creatingCustomer && (
        <CustomerForm
          initialValues={{
            name: lead.name,
            contactNumber: lead.phone ?? undefined,
            newCityCode: lead.provinceCode ?? undefined,
            newCityName: lead.provinceName ?? undefined,
            newWardCode: lead.wardCode ?? undefined,
            newWardName: lead.wardName ?? undefined,
          }}
          onClose={() => setCreatingCustomer(false)}
          onSuccess={(customer?: { id?: number }) => {
            setCreatingCustomer(false);
            if (customer?.id) convert.mutate(customer.id);
          }}
        />
      )}
    </div>
  );
}

/** Mở hội thoại của lead trong khung chat (hội thoại chưa gắn khách POS). */
function ChannelsTab({ lead }: { lead: LeadDetail }) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const canUpdate = useCan("leads", "update");
  const open = (c: LeadConversation) => {
    const st = useChatSidebarStore.getState();
    st.openLoose(
      {
        pagePid: c.pagePid,
        tid: c.tid,
        zaloId: /^zlw\d+$/.test(c.tid) ? c.tid.slice(3) : c.tid,
        isGroup: c.isGroup,
        name: c.name || lead.name,
        platform: c.platform,
      },
      userId
    );
    st.setOpen(true);
  };
  const remove = async (c: LeadConversation) => {
    const ok = await confirmAction(`Gỡ hội thoại ${platformLabel(c.platform)} "${c.name ?? c.tid}" khỏi lead?`, {
      title: "Gỡ kênh kết nối",
      confirmText: "Gỡ",
      danger: true,
    });
    if (!ok) return;
    await leadsApi.removeConversation(lead.id, c.id);
    queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
  };

  if (!lead.conversations.length) {
    return (
      <p className="text-sm text-gray-500">
        Chưa có kênh kết nối. Mở hội thoại của khách trong khung chat (Facebook, Tiktok, Zalo…) rồi bấm “Tạo lead”
        để kết nối.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {lead.conversations.map((c) => (
        <li key={c.id} className="flex items-center gap-2 rounded border px-3 py-2">
          {c.platform === "facebook" ? (
            <ThreadKindLogo isComment={c.tid.includes("_")} className="h-4 w-4" />
          ) : (
            <MessageCircle className="h-4 w-4 text-brand" />
          )}
          <span className="min-w-0 flex-1 truncate">
            {platformLabel(c.platform)} · {c.name || c.tid}
          </span>
          <button onClick={() => open(c)} className="rounded px-2 py-1 text-brand hover:bg-cyan-bg">
            Mở trong khung chat
          </button>
          {canUpdate && (
            <button onClick={() => remove(c)} aria-label="Gỡ" className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function HistoryTab({ lead }: { lead: LeadDetail }) {
  const queryClient = useQueryClient();
  const canAssign = useCan("leads", "assign");
  const retry = useMutation({
    mutationFn: (id: number) => leadsApi.retryHandover(id),
    onSuccess: ({ done }) => {
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      if (done) toast.success("Đã gửi lại xong các bước lỗi");
      else toast.warning("Vẫn còn bước lỗi");
    },
    onError: (e: Error) => toast.error(e.message || "Không gửi lại được"),
  });

  if (!lead.handovers.length) return <p className="text-sm text-gray-500">Chưa chuyển giao lần nào.</p>;
  return (
    <ul className="flex flex-col gap-3 text-sm">
      {lead.handovers.map((h) => (
        <li key={h.id} className="rounded border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">→ {h.salePicName ?? `Sale #${h.salePicId}`}</span>
            <span className="text-xs text-gray-500">
              {new Date(h.createdAt).toLocaleString("vi-VN")} · bởi {h.createdByName ?? "—"}
            </span>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                h.status === "done" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
              {h.status === "done" ? "Hoàn tất" : "Có bước lỗi"}
            </span>
          </div>
          <div className="mt-2 grid gap-1">
            {(Object.keys(HANDOVER_STEP_LABEL) as HandoverStepKey[]).map((k) => {
              const s = h.steps[k];
              return (
                <div key={k} className="flex items-start gap-2">
                  {s?.status === "ok" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  ) : s?.status === "failed" ? (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  ) : s?.status === "skipped" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  <span>
                    {HANDOVER_STEP_LABEL[k]}
                    {s?.status === "skipped" && <span className="text-xs text-amber-600"> · bỏ qua — Sale nhắn sau khi khách đồng ý kết bạn</span>}
                    {s?.error && (
                      <span className={`block whitespace-pre-wrap text-xs ${s.status === "skipped" ? "text-gray-500" : "text-red-600"}`}>
                        {s.error}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          {h.note && <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600">Ghi chú: {h.note}</p>}
          {canAssign && h.status !== "done" && (
            <button
              onClick={async () => {
                const ok = await confirmAction("Gửi lại các bước lỗi? Bước đã thành công không gửi lại.", {
                  title: "Gửi lại chuyển giao",
                  confirmText: "Gửi lại",
                });
                if (ok) retry.mutate(h.id);
              }}
              disabled={retry.isPending}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-brand hover:bg-cyan-bg disabled:opacity-50">
              {retry.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi lại bước lỗi
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
