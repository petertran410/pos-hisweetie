"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { LeadCard } from "@/components/reports/lead/leadUi";
import { confirmAction } from "@/lib/chat/confirm";
import { useIntelExclusions, useIntelThreadSearch, useToggleIntelExclusion } from "@/lib/hooks/useMessageIntel";
import { Empty } from "./IntelOverviewTab";

const dt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

/**
 * Hội thoại loại trừ khỏi phân loại tin: tin của các hội thoại này không gửi AI. Nhóm có ở nhiều kênh: loại
 * trừ 1 kênh = loại trừ cả nhóm. Thêm ở đây (tìm theo tên) hoặc chuột phải hội thoại trong khung chat.
 */
export function IntelExclusionsTab() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTerm(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  const list = useIntelExclusions();
  const search = useIntelThreadSearch(term);
  const toggle = useToggleIntelExclusion();
  const busyKey = toggle.isPending ? toggle.variables : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_3fr]">
      <LeadCard
        title="Thêm hội thoại"
        subtitle="Tìm theo tên hội thoại / nhóm. Nhóm có ở nhiều kênh: loại trừ 1 kênh là loại trừ cả nhóm.">
        <label className="relative block mb-3">
          <span className="sr-only">Tìm hội thoại theo tên</span>
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--dt-text-muted)" }} aria-hidden />
          <input
            className="dt-input dt-input-sm w-full pl-8"
            placeholder="Nhập ít nhất 2 ký tự, vd: Báo đơn"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        {term.trim().length < 2 ? (
          <p className="text-[12.5px]" style={{ color: "var(--dt-text-muted)" }}>
            Cũng có thể chuột phải vào hội thoại trong khung chat → <b>Không gửi phân tích AI</b>.
          </p>
        ) : search.isLoading ? (
          <p className="flex items-center gap-2 text-[13px]" style={{ color: "var(--dt-text-muted)" }}>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm…
          </p>
        ) : !search.data?.length ? (
          <Empty text="Không tìm thấy hội thoại nào." />
        ) : (
          <ul className={`divide-y text-[13px] ${search.isFetching ? "opacity-70" : ""}`} style={{ borderColor: "var(--dt-border)" }}>
            {search.data.map((t) => (
              <li key={`${t.pagePid}:${t.tid}`} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    {t.isGroup && <Users className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dt-text-muted)" }} aria-label="Nhóm" />}
                    <span className="truncate">{t.name || t.tid}</span>
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
                    {t.channel} · tin cuối {dt(t.lastMessageAt)}
                  </div>
                </div>
                {t.excluded ? (
                  <span className="shrink-0 text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
                    Đã loại trừ
                  </span>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border px-2.5 py-1 text-[12.5px] font-medium hover:bg-gray-50 disabled:opacity-50"
                    style={{ borderColor: "var(--dt-border)" }}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ exclude: true, pagePid: t.pagePid, tid: t.tid })}>
                    Loại trừ
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </LeadCard>

      <LeadCard
        title={`Danh sách loại trừ${list.data ? ` (${list.data.length})` : ""}`}
        subtitle="Tin mới của các hội thoại này không gửi AI phân loại. Bỏ loại trừ thì tin đã bỏ qua được phân loại lại.">
        {list.error ? (
          <Empty text={(list.error as Error).message} />
        ) : list.isLoading ? (
          <p className="flex items-center gap-2 text-[13px]" style={{ color: "var(--dt-text-muted)" }}>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </p>
        ) : !list.data?.length ? (
          <Empty text="Chưa có hội thoại nào bị loại trừ." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left" style={{ color: "var(--dt-text-muted)" }}>
                  <th className="py-2 pr-3 font-medium">Hội thoại</th>
                  <th className="py-2 pr-3 font-medium">Kênh</th>
                  <th className="py-2 pr-3 font-medium whitespace-nowrap">Người thêm</th>
                  <th className="py-2 pr-3 font-medium whitespace-nowrap">Thời gian</th>
                  <th className="py-2 font-medium" aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {list.data.map((g) => (
                  <tr key={g.groupKey} className="border-t align-top" style={{ borderColor: "var(--dt-border)" }}>
                    <td className="py-2 pr-3 font-medium">{g.name || g.threads[0]?.tid}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {g.threads.map((t) => (
                          <span
                            key={`${t.pagePid}:${t.tid}`}
                            className="rounded border px-1.5 text-[12px]"
                            style={{ borderColor: "var(--dt-border)" }}
                            title={t.name || t.tid}>
                            {t.channel}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{g.createdByName ?? "—"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{dt(g.createdAt)}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] font-medium text-red-600 hover:underline disabled:opacity-50"
                        disabled={toggle.isPending}
                        onClick={async () => {
                          const ok = await confirmAction(
                            `Bỏ "${g.name || "hội thoại"}" khỏi danh sách loại trừ? Tin của ${
                              g.threads.length > 1 ? `${g.threads.length} kênh cùng nhóm` : "hội thoại"
                            } sẽ được gửi AI phân loại trở lại (kể cả tin đã bỏ qua).`
                          );
                          if (ok) toggle.mutate({ exclude: false, groupKey: g.groupKey });
                        }}>
                        {busyKey && !busyKey.exclude && busyKey.groupKey === g.groupKey && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        Bỏ loại trừ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LeadCard>
    </div>
  );
}
