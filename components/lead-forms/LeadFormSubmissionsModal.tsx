"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Inbox, Loader2, X } from "lucide-react";
import { leadFormsApi } from "@/lib/api/leadForms";
import { LEAD_STATUS_COLOR, LEAD_STATUS_LABEL, leadCode, leadHref } from "@/lib/leads/constants";
import { TablePagination } from "@/components/shared/TablePagination";
import type { LeadForm } from "@/lib/types/leadForm";

/** Các lượt khách gửi form: câu trả lời + lead được tạo / gộp. */
export function LeadFormSubmissionsModal({ form, onClose }: { form: LeadForm; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, isLoading } = useQuery({
    queryKey: ["leadFormSubmissions", form.id, page],
    queryFn: () => leadFormsApi.submissions(form.id, page, limit),
  });

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Inbox className="w-5 h-5 text-brand" />
            Lượt gửi — {form.name}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Thời gian</th>
                <th className="px-4 py-2.5 font-medium">Câu trả lời</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Lead</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    <Loader2 className="inline h-4 w-4 animate-spin" /> Đang tải…
                  </td>
                </tr>
              )}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    Chưa có lượt gửi nào
                  </td>
                </tr>
              )}
              {data?.data.map((s) => (
                <tr key={s.id} className="border-b align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                    {new Date(s.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-2.5">
                    {s.answers.map((a) => (
                      <div key={a.key}>
                        <span className="text-gray-500">{a.label}:</span> {a.value}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {s.lead ? (
                      <div className="space-y-1">
                        <Link href={leadHref(s.lead.id)} className="font-medium text-brand hover:underline">
                          {leadCode(s.lead.id)}
                        </Link>
                        <div className="text-gray-700">{s.lead.name}</div>
                        <div className="flex gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLOR[s.lead.status]}`}>
                            {LEAD_STATUS_LABEL[s.lead.status]}
                          </span>
                          {s.merged && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              Gộp lead trùng SĐT
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Lead đã xoá</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={page}
          totalPages={Math.max(1, Math.ceil((data?.total ?? 0) / limit))}
          total={data?.total ?? 0}
          limit={limit}
          limitOptions={[limit]}
          unit="lượt gửi"
          onPageChange={setPage}
          onLimitChange={() => {}}
        />
      </div>
    </div>,
    document.body
  );
}
