"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, RefreshCw, XCircle } from "lucide-react";
import { confirmAction } from "@/lib/chat/confirm";
import { useClearSmaxUserToken, useSaveSmaxUserToken, useSmaxUserToken } from "@/lib/hooks/useSmax";

const fmt = (d: string) =>
  new Date(d).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

const DAY = 24 * 60 * 60 * 1000;

/**
 * Token đăng nhập Smax (thay SMAX_USER_TOKEN trong .env): xem tình trạng, nhập token mới
 * (backend thử với Smax trước khi lưu, lưu mã hoá, dùng ngay), xoá để quay về .env.
 */
export function SmaxUserTokenPanel() {
  const { data: s, isLoading, isFetching, error, refetch, dataUpdatedAt } = useSmaxUserToken();
  const save = useSaveSmaxUserToken();
  const clear = useClearSmaxUserToken();
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    save.mutate(token, { onSuccess: () => setToken("") });
  };

  // So với lúc kiểm tra (dataUpdatedAt) — trang này luôn tải lại khi mở
  const expires = s?.expiresAt ? new Date(s.expiresAt).getTime() : null;
  const expired = expires !== null && expires < dataUpdatedAt;
  const expiringSoon = expires !== null && !expired && expires - dataUpdatedAt < 7 * DAY;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl rounded-lg border bg-white">
        <div className="border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <KeyRound className="h-4 w-4 text-brand" aria-hidden />
            Token đăng nhập Smax
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Dùng cho các tính năng Partner API của Smax chưa có: thả cảm xúc, thu hồi / xoá tin, đổi tên hội
            thoại, Thư viện Smax, bật / tắt Meta AI và tên gợi nhớ Zalo trong khung chat.
          </p>
        </div>

        {/* Tình trạng hiện tại */}
        <div className="border-b p-4">
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra token với Smax…
            </p>
          ) : error ? (
            <p className="text-sm text-red-600">{(error as Error).message || "Không tải được tình trạng token"}</p>
          ) : s ? (
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge valid={s.valid} hasToken={!!s.source} />
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                  Kiểm tra lại
                </button>
              </div>
              {s.error && (
                <p className="flex gap-2 rounded bg-red-50 px-3 py-2 text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {s.error}
                </p>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <dt className="text-gray-500">Nguồn</dt>
                <dd>
                  {s.source === "db"
                    ? "Lưu trên POS (trang này)"
                    : s.source === "env"
                      ? "File .env của backend (SMAX_USER_TOKEN)"
                      : "Chưa có"}
                </dd>
                {s.last4 && (
                  <>
                    <dt className="text-gray-500">Token</dt>
                    <dd className="font-mono">••••••••{s.last4}</dd>
                  </>
                )}
                {s.expiresAt && (
                  <>
                    <dt className="text-gray-500">Hết hạn</dt>
                    <dd className={expired ? "font-medium text-red-600" : expiringSoon ? "font-medium text-amber-700" : ""}>
                      {fmt(s.expiresAt)}
                      {expired ? " · đã hết hạn" : expiringSoon ? " · sắp hết hạn" : ""}
                    </dd>
                  </>
                )}
                {s.source === "db" && s.updatedAt && (
                  <>
                    <dt className="text-gray-500">Cập nhật</dt>
                    <dd>
                      {fmt(s.updatedAt)}
                      {s.updatedBy ? ` · ${s.updatedBy}` : ""}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          ) : null}
        </div>

        {/* Nhập token mới */}
        <form onSubmit={submit} className="flex flex-col gap-2 p-4">
          <label htmlFor="smax-user-token" className="text-sm font-medium">
            Token mới
          </label>
          <div className="relative">
            <input
              id="smax-user-token"
              type={show ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Dán token đăng nhập Smax"
              aria-describedby="smax-user-token-help"
              className="w-full rounded-md border px-3 py-2 pr-10 font-mono text-sm outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? "Ẩn token" : "Hiện token"}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-gray-500 hover:bg-gray-100">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p id="smax-user-token-help" className="text-xs text-gray-500">
            Token được thử với Smax trước khi lưu (sai thì không lưu), lưu mã hoá trong cơ sở dữ liệu và có hiệu lực
            ngay — không cần sửa .env hay khởi động lại backend. Token lưu ở đây được dùng thay cho token trong .env.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={!token.trim() || save.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-bright disabled:opacity-40">
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {save.isPending ? "Đang kiểm tra…" : "Kiểm tra & lưu"}
            </button>
            {s?.source === "db" && (
              <button
                type="button"
                disabled={clear.isPending}
                onClick={async () => {
                  const ok = await confirmAction(
                    s.envConfigured
                      ? "Xoá token đã lưu trên POS? Hệ thống sẽ dùng lại SMAX_USER_TOKEN trong .env."
                      : "Xoá token đã lưu trên POS? Trong .env không có token nên các tính năng thả cảm xúc, thu hồi, đổi tên, Thư viện… sẽ ngừng hoạt động.",
                    { title: "Xoá token đăng nhập Smax", confirmText: "Xoá", danger: true }
                  );
                  if (ok) clear.mutate();
                }}
                className="ml-auto rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40">
                {s.envConfigured ? "Xoá, dùng lại token .env" : "Xoá token"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusBadge({ valid, hasToken }: { valid: boolean | null; hasToken: boolean }) {
  if (!hasToken)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
        Chưa cấu hình
      </span>
    );
  if (valid)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Đang hoạt động
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
      <XCircle className="h-3.5 w-3.5" aria-hidden /> Không dùng được
    </span>
  );
}
