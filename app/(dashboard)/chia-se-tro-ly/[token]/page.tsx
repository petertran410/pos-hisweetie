"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { TurnView } from "@/components/ai-assistant/AiAssistantChat";
import { aiAssistantApi } from "@/lib/api/aiAssistant";
import { turnsFromStored } from "@/lib/ai/ai-chat";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Hội thoại Trợ lý AI được chia sẻ (/chia-se-tro-ly/<token>): chỉ đọc, cần đăng nhập POS,
 * không cần quyền dùng trợ lý. Chỉ có các tin tới lúc chia sẻ.
 */
export default function SharedAssistantPage() {
  const { token } = useParams<{ token: string }>();
  const shared = useQuery({
    queryKey: ["aiShared", token],
    queryFn: () => aiAssistantApi.shared(token),
    retry: false,
  });
  const turns = useMemo(() => (shared.data ? turnsFromStored(shared.data.messages) : []), [shared.data]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-ai-surface">
      <header className="flex shrink-0 items-center gap-3 border-b bg-white px-4 py-3 sm:px-6">
        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-dark text-[#7fdbe6]">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate text-base font-semibold text-brand-dark">{shared.data?.title ?? "Hội thoại Trợ lý AI"}</h1>
          {shared.data && (
            <p className="m-0 text-xs text-gray-500">
              {shared.data.ownerName} chia sẻ · bản chụp lúc {formatDateTime(shared.data.sharedAt)} · chỉ xem
            </p>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[900px] flex-col gap-4 px-4 py-5 sm:px-6">
          {shared.isLoading ? (
            <p className="m-0 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> Đang tải…
            </p>
          ) : shared.isError ? (
            <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {shared.error instanceof Error && shared.error.message
                ? shared.error.message
                : "Không mở được hội thoại được chia sẻ."}{" "}
              <Link href="/" className="underline">
                Về trang chủ
              </Link>
            </p>
          ) : (
            turns.map((turn) => <TurnView key={turn.id} turn={turn} />)
          )}
        </div>
      </div>
    </div>
  );
}
