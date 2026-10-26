"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Search, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { confirmAction } from "@/lib/chat/confirm";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import {
  useSmaxZaloChannels,
  useLinkSmaxChannel,
  useUnlinkSmaxChannel,
} from "@/lib/hooks/useSmax";
import { useUsers } from "@/lib/hooks/useUsers";

const TABS = [{ key: "zalo-user", label: "Zalo User" }] as const;

const PLATFORM_LABEL: Record<string, string> = {
  zalo: "Zalo OA",
  zaloweb: "Zalo cá nhân",
};

function ZaloUserTab() {
  const [search, setSearch] = useState("");
  const { data: channels, isLoading, error } = useSmaxZaloChannels();
  const { data: users, isLoading: loadingUsers } = useUsers();
  const linkMutation = useLinkSmaxChannel();
  const unlinkMutation = useUnlinkSmaxChannel();

  const userOptions = useMemo(
    () =>
      (users || []).map((u: any) => ({
        value: u.id.toString(),
        label: `${u.name}${u.email ? ` — ${u.email}` : ""}`,
      })),
    [users]
  );

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return channels || [];
    return (channels || []).filter(
      (c) =>
        c.name.toLowerCase().includes(kw) ||
        c.users.some((u) => u.name?.toLowerCase().includes(kw))
    );
  }, [channels, search]);

  // Thêm 1 người dùng vào kênh (1 kênh gắn được nhiều người dùng POS)
  const handleAdd = (pagePid: string, value: string) => {
    if (value) linkMutation.mutate({ pagePid, userId: Number(value) });
  };

  if (error) {
    return (
      <div className="m-6 p-4 border border-amber-300 bg-amber-50 rounded-lg text-sm text-amber-800 flex gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">
            Không tải được danh sách kênh từ Smax
          </p>
          <p className="mt-1">{(error as any).message}</p>
          <p className="mt-1 text-amber-700">
            Kiểm tra biến <code>SMAX_API_TOKEN</code> (và{" "}
            <code>SMAX_BIZ_ALIAS</code>) trong .env của backend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-6 pt-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên kênh hoặc người dùng..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Kênh Zalo
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  page_pid
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Trạng thái
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 w-[360px]">
                  Người dùng POS
                </th>
                <th className="w-14 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(isLoading || loadingUsers) && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!isLoading && !loadingUsers && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    Không có kênh Zalo nào
                  </td>
                </tr>
              )}
              {!isLoading &&
                !loadingUsers &&
                filtered.map((c) => (
                  <tr
                    key={c.pagePid}
                    className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">{c.name}</div>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 text-xs rounded ${
                          c.platform === "zalo"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-brand-soft text-brand-dark"
                        }`}>
                        {PLATFORM_LABEL[c.platform] || c.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-xs text-gray-600">
                      {c.pagePid}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {c.missing ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Không còn trên Smax
                        </span>
                      ) : c.connectionError ? (
                        <div className="text-xs text-red-600">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Mất kết nối
                          </span>
                          <div className="text-gray-500 mt-0.5">
                            {c.connectionError.note ||
                              "Token lỗi — làm mới kết nối trên Smax"}
                          </div>
                          <div className="text-gray-400">
                            Từ{" "}
                            {new Date(c.connectionError.at).toLocaleString(
                              "vi-VN"
                            )}
                          </div>
                        </div>
                      ) : c.active ? (
                        <span className="text-xs text-green-700">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Ngừng hoạt động
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1.5">
                        {c.users.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {c.users.map((u) => (
                              <span
                                key={u.id}
                                title={u.email}
                                className="inline-flex items-center gap-1 rounded-full border bg-gray-50 py-0.5 pl-2.5 pr-1 text-xs">
                                {u.name}
                                <button
                                  onClick={() => {
                                    confirmAction(`Gỡ ${u.name} khỏi kênh "${c.name}"?`, {
                                      title: "Gỡ người dùng",
                                      confirmText: "Gỡ",
                                      danger: true,
                                    }).then(
                                      (ok) => ok && unlinkMutation.mutate({ pagePid: c.pagePid, userId: u.id })
                                    );
                                  }}
                                  disabled={unlinkMutation.isPending}
                                  className="rounded-full p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                  title="Gỡ người dùng khỏi kênh">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {!c.missing && (
                          <SearchableSelect
                            options={userOptions.filter(
                              (o) => !c.users.some((u) => String(u.id) === o.value)
                            )}
                            value=""
                            onChange={(v) => handleAdd(c.pagePid, v)}
                            placeholder={c.users.length ? "+ Thêm người dùng" : "— Chưa liên kết —"}
                            searchPlaceholder="Tìm theo tên hoặc email..."
                            disabled={linkMutation.isPending}
                            size="sm"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {c.missing && c.users.length > 0 && (
                        <button
                          onClick={() => {
                            confirmAction(`Gỡ tất cả người dùng khỏi kênh "${c.name}" (không còn trên Smax)?`, {
                              title: "Gỡ liên kết",
                              confirmText: "Gỡ tất cả",
                              danger: true,
                            }).then((ok) => ok && unlinkMutation.mutate({ pagePid: c.pagePid }));
                          }}
                          disabled={unlinkMutation.isPending}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-40"
                          title="Gỡ tất cả liên kết của kênh đã mất">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function SmaxSettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("zalo-user");

  return (
    <PagePermissionGuard resource="settings" action="update">
      <div className="flex flex-col h-full">
        <div className="px-6 pt-6 border-b bg-white">
          <h1 className="text-2xl font-bold">Smax</h1>
          <p className="text-gray-600 mt-1">
            Liên kết kênh Zalo trên Smax.AI với tài khoản người dùng (sale) để
            dùng các tính năng Smax ngay trên POS.
          </p>
          <div className="flex gap-1 mt-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === t.key
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {tab === "zalo-user" && <ZaloUserTab />}
      </div>
    </PagePermissionGuard>
  );
}
