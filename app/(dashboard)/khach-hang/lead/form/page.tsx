"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Inbox, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { LeadFormEditor } from "@/components/lead-forms/LeadFormEditor";
import { LeadFormShareModal } from "@/components/lead-forms/LeadFormShareModal";
import { LeadFormSubmissionsModal } from "@/components/lead-forms/LeadFormSubmissionsModal";
import { leadFormsApi } from "@/lib/api/leadForms";
import { confirmAction } from "@/lib/chat/confirm";
import { LEAD_SOURCE_LABEL } from "@/lib/leads/constants";
import type { LeadForm } from "@/lib/types/leadForm";

/** Form thu thập lead: tạo / sửa, bật tắt, chia sẻ (link, iframe, QR), xem lượt gửi. */
export default function LeadFormsPage() {
  const queryClient = useQueryClient();
  const { data: forms, isLoading } = useQuery({ queryKey: ["leadForms"], queryFn: () => leadFormsApi.list() });
  const [editing, setEditing] = useState<LeadForm | "new" | null>(null);
  const [sharing, setSharing] = useState<LeadForm | null>(null);
  const [viewing, setViewing] = useState<LeadForm | null>(null);

  const toggle = useMutation({
    mutationFn: (f: LeadForm) => leadFormsApi.update(f.id, { isActive: !f.isActive }),
    onSuccess: (f) => {
      queryClient.invalidateQueries({ queryKey: ["leadForms"] });
      toast.success(f.isActive ? "Đã mở form" : "Đã tắt form");
    },
    onError: (e: Error) => toast.error(e.message || "Không đổi được trạng thái"),
  });
  const remove = useMutation({
    mutationFn: (f: LeadForm) => leadFormsApi.remove(f.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadForms"] });
      toast.success("Đã xoá form");
    },
    onError: (e: Error) => toast.error(e.message || "Không xoá được form"),
  });

  const th = "px-4 py-3 font-medium whitespace-nowrap";
  const td = "px-4 py-2.5 whitespace-nowrap";

  return (
    <PagePermissionGuard resource="leads" action="update">
      <div className="flex h-full border-t" style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex-1 min-w-0 flex flex-col m-4 rounded-xl border bg-white shadow-xl overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <Link href="/khach-hang/lead" className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Về danh sách lead">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-semibold">Form thu thập lead</h1>
            <button
              onClick={() => setEditing("new")}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Tạo form
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className={th}>Tên form</th>
                  <th className={th}>Đường dẫn</th>
                  <th className={th}>Nguồn · Kênh</th>
                  <th className={th}>Lượt gửi</th>
                  <th className={th}>Đang mở</th>
                  <th className={th}>Ngày tạo</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Đang tải…
                    </td>
                  </tr>
                )}
                {forms?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Chưa có form nào — bấm “Tạo form” để bắt đầu
                    </td>
                  </tr>
                )}
                {forms?.map((f) => (
                  <tr key={f.id} className="border-b hover:bg-gray-50">
                    <td className={td}>
                      <div className="font-medium">{f.name}</div>
                      {f.title !== f.name && <div className="text-xs text-gray-500">{f.title}</div>}
                    </td>
                    <td className={td}>
                      <a href={`/f/${f.slug}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        /f/{f.slug}
                      </a>
                    </td>
                    <td className={td}>
                      {LEAD_SOURCE_LABEL[f.source]}
                      {f.channelName && <span className="text-gray-500"> · {f.channelName}</span>}
                    </td>
                    <td className={td}>
                      <button onClick={() => setViewing(f)} className="inline-flex items-center gap-1 text-brand hover:underline">
                        <Inbox className="h-3.5 w-3.5" /> {f.submissionCount}
                      </button>
                    </td>
                    <td className={td}>
                      <button
                        role="switch"
                        aria-checked={f.isActive}
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate(f)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          f.isActive ? "bg-brand" : "bg-gray-300"
                        }`}>
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            f.isActive ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className={`${td} text-gray-600`}>
                      {new Date(f.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className={`${td} text-right`}>
                      <div className="inline-flex gap-1">
                        <button onClick={() => setSharing(f)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Chia sẻ">
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditing(f)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Sửa">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {f.submissionCount === 0 && (
                          <button
                            onClick={async () => {
                              const ok = await confirmAction(`Xoá form "${f.name}"?`, {
                                title: "Xoá form",
                                confirmText: "Xoá",
                                danger: true,
                              });
                              if (ok) remove.mutate(f);
                            }}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600"
                            title="Xoá">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {editing && <LeadFormEditor form={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {sharing && <LeadFormShareModal form={sharing} onClose={() => setSharing(null)} />}
      {viewing && <LeadFormSubmissionsModal form={viewing} onClose={() => setViewing(null)} />}
    </PagePermissionGuard>
  );
}
