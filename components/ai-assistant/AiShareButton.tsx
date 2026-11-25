"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Check, Copy, Link2Off, Loader2, Share2, X } from "lucide-react";
import { aiAssistantApi } from "@/lib/api/aiAssistant";
import { aiShareUrl } from "@/lib/ai/ai-chat";

/** Chép chữ vào clipboard; trả về false khi trình duyệt chặn. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Nút "Chia sẻ" hội thoại: bấm là tạo link (hoặc dời bản chụp tới tin mới nhất, giữ nguyên link),
 * rồi mở hộp thoại để chép link / thu hồi. Người nhận cần đăng nhập POS.
 */
export function AiShareButton({ conversationId, tone }: { conversationId: number | null; tone: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<"share" | "revoke" | null>(null);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const copyRef = useRef<HTMLButtonElement>(null);

  const start = async () => {
    if (conversationId === null) return;
    setOpen(true);
    setFailed(null);
    setCopied(false);
    setBusy("share");
    try {
      const link = await aiAssistantApi.share(conversationId);
      setToken(link.token);
    } catch (e) {
      setFailed(e instanceof Error && e.message ? e.message : "Không tạo được link chia sẻ");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (open && token && !busy) copyRef.current?.focus();
  }, [open, token, busy]);

  const copy = async () => {
    if (!token) return;
    if (await copyText(aiShareUrl(token))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else toast.error("Trình duyệt chặn sao chép, hãy chép link thủ công");
  };

  const revoke = async () => {
    if (conversationId === null) return;
    setBusy("revoke");
    try {
      await aiAssistantApi.unshare(conversationId);
      setToken(null);
      setOpen(false);
      toast.success("Đã thu hồi link chia sẻ");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Không thu hồi được link");
    } finally {
      setBusy(null);
    }
  };

  const buttonClass =
    tone === "dark"
      ? "chat-tap flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/35 hover:bg-white/10 disabled:opacity-40"
      : "flex h-8 items-center gap-1.5 rounded-lg border border-brand-border px-2.5 text-sm font-medium text-brand-deep hover:bg-cyan-bg disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        onClick={() => void start()}
        disabled={conversationId === null}
        aria-label="Chia sẻ hội thoại"
        title={conversationId === null ? "Hỏi ít nhất một câu để chia sẻ" : "Chia sẻ hội thoại"}
        className={buttonClass}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        {tone === "light" && "Chia sẻ"}
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
            onKeyDown={(event) => {
              // preventDefault: panel trợ lý (cha qua portal) không đóng theo Esc này
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-share-title"
              className="w-full max-w-[460px] rounded-xl bg-white p-5 shadow-xl"
            >
              <div className="mb-2 flex items-center gap-2">
                <h2 id="ai-share-title" className="m-0 flex-1 text-base font-semibold text-brand-dark">
                  Chia sẻ hội thoại
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="m-0 mb-3 text-sm leading-normal text-gray-600">
                Ai có link và đã đăng nhập POS đều xem được hội thoại này tới thời điểm chia sẻ, kể cả số liệu ngoài quyền
                của họ. Câu hỏi sau này chỉ hiện khi bạn bấm chia sẻ lại.
              </p>
              {busy === "share" ? (
                <p className="m-0 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> Đang tạo link…
                </p>
              ) : failed ? (
                <p className="m-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {failed}
                </p>
              ) : token ? (
                <>
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor="ai-share-url">
                      Link chia sẻ
                    </label>
                    <input
                      id="ai-share-url"
                      readOnly
                      value={aiShareUrl(token)}
                      onFocus={(event) => event.currentTarget.select()}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-brand-border px-2.5 text-sm text-gray-700 outline-none focus:border-brand"
                    />
                    <button
                      ref={copyRef}
                      type="button"
                      onClick={() => void copy()}
                      className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-brand-deep px-3 text-sm font-medium text-white hover:bg-brand-dark"
                    >
                      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                      {copied ? "Đã chép" : "Sao chép link"}
                    </button>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void revoke()}
                      disabled={busy !== null}
                      className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Link2Off className="h-4 w-4" aria-hidden />
                      {busy === "revoke" ? "Đang thu hồi…" : "Thu hồi link"}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
